import {
  GameEngine,
  MessageTypes,
  GameStatus,
  Message,
  ErrorCodes,
  ConnectedPlayer,
  Game,
  Response,
  GameStore,
  COMPLETED_GAME_STATUS,
  CalculateWinnerInputType,
  CalculateWinnerOutputType,
  PlayerStore,
} from "./model";
import WebSocket = require("ws");
import uniq from "lodash.uniq";
import { Timer } from "./timer";

const EMPTY_POSITION = "-";
const DEFAULT_TIME_PER_PLAYER = 5000;
const DEFAULT_INCREMENT_PER_PLAYER = 1000;

const getTimerBaseFromGame = (game: Game) => {
  const base = Object.keys(game.timers).reduce((acc, playerId) => {
    acc[playerId] = {
      isRunning: game.timers[playerId].isRunning,
      timeLeft: game.timers[playerId].timeLeft,
    };
    return acc;
  }, {});
  return base;
};

const getConnectedPlayers = (players: PlayerStore, game: Game) => {
  const connectedPlayers: ConnectedPlayer[] = Object.values(players).filter(
    (each) => game.players.includes(each.playerId)
  );

  return connectedPlayers;
};
const getConnectedSpectators = (players: PlayerStore, game: Game) => {
  const connectedSpectators: ConnectedPlayer[] = Object.values(players).filter(
    (each) => game.spectators.includes(each.playerId)
  );

  return connectedSpectators;
};

const getPlayers = (connectedPlayers: ConnectedPlayer[]) => {
  return connectedPlayers.reduce((acc, each) => {
    acc[each.playerId] = {
      name: each.name,
      playerId: each.playerId,
    };
    return acc;
  }, {});
};

const sendResponseToPlayers = (
  response: Response,
  connectedPlayers: ConnectedPlayer[],
  connectedSpectators: ConnectedPlayer[]
) => {
  connectedPlayers.forEach((player) => {
    player.connection.send(JSON.stringify(response));
  });
  connectedSpectators.forEach((player) => {
    player.connection.send(
      JSON.stringify({
        ...response,
        type: MessageTypes.SPECTATE_GAME,
      })
    );
  });
};

const getFirstPlayerFromGame = (game: Game) => {
  return game.players[0];
};

class TiciTacaToeyGameEngine implements GameEngine {
  games;
  players;
  robots;

  constructor() {
    this.games = {};
    this.players = {};
    this.robots = {};
  }

  play(message: Message, notify = true) {
    return new Promise<GameEngine>((resolve) => {
      this.validate(message)
        .then((message) => {
          this.transition(message);
          if (notify) {
            this.notify(message);
          }
          resolve(this);
        })
        .catch((error) => {
          if (notify) {
            this.notifyError.bind(this)(error);
          }
        });
    });
  }

  // todo: unify the multiple switch cases below
  validate(message: Message) {
    return new Promise<Message>((resolve, reject) => {
      switch (message.type) {
        case MessageTypes.REGISTER_PLAYER:
          break;
        case MessageTypes.PLAYER_TIMEOUT:
          break;
        case MessageTypes.REGISTER_ROBOT:
          break;
        case MessageTypes.PLAY_WITH_ROBOT:
          break;
        case MessageTypes.PLAYER_DISCONNECT:
          break;
        case MessageTypes.NOTIFY_TIME:
          break;
        case MessageTypes.START_GAME: {
          if (message.boardSize < 2) {
            reject({ error: ErrorCodes.BOARD_SIZE_LESS_THAN_2, message });
          }
          if (message.playerCount < 2) {
            reject({ error: ErrorCodes.PLAYER_COUNT_LESS_THAN_2, message });
          }
          if (message.playerCount >= message.boardSize) {
            reject({
              error: ErrorCodes.PLAYER_COUNT_MUST_BE_LESS_THAN_BOARD_SIZE,
              message,
            });
          }
          if (message.boardSize > 12) {
            reject({
              error: ErrorCodes.BOARD_SIZE_CANNOT_BE_GREATER_THAN_12,
              message,
            });
          }
          if (message.playerCount > 10) {
            reject({
              error: ErrorCodes.PLAYER_COUNT_CANNOT_BE_GREATER_THAN_10,
              message,
            });
          }
          if (message.boardSize < message.winningSequenceLength) {
            reject({
              error:
                ErrorCodes.WIN_SEQ_LENGTH_MUST_BE_LESS_THAN_OR_EQUAL_TO_BOARD_SIZE,
              message,
            });
          }
          break;
        }
        case MessageTypes.SPECTATE_GAME: {
          if (
            !this.games[message.gameId] ||
            ![
              GameStatus.GAME_IN_PROGRESS,
              GameStatus.WAITING_FOR_PLAYERS,
            ].includes(this.games[message.gameId].status)
          ) {
            reject({ error: ErrorCodes.GAME_NOT_FOUND, message });
          }
          if (this.games[message.gameId].players.includes(message.playerId)) {
            reject({
              error: ErrorCodes.PLAYER_ALREADY_PART_OF_GAME,
              message,
            });
          }
          if (this.games[message.gameId].spectators.length >= 15) {
            reject({
              error: ErrorCodes.SPECTATOR_COUNT_CANNOT_BE_GREATER_THAN_10,
              message,
            });
          }
          break;
        }
        case MessageTypes.JOIN_GAME: {
          if (!this.games[message.gameId]) {
            reject({ error: ErrorCodes.GAME_NOT_FOUND, message });
          }
          if (this.games[message.gameId].players.includes(message.playerId)) {
            reject({
              error: ErrorCodes.PLAYER_ALREADY_PART_OF_GAME,
              message,
            });
          }
          if (
            this.games[message.gameId].status !== GameStatus.WAITING_FOR_PLAYERS
          ) {
            reject({ error: ErrorCodes.GAME_ALREADY_IN_PROGRESS, message });
          }
          break;
        }
        case MessageTypes.MAKE_MOVE: {
          if (
            this.games[message.gameId].status !== GameStatus.GAME_IN_PROGRESS
          ) {
            reject({ error: ErrorCodes.GAME_NOT_FOUND, message });
          }
          if (this.games[message.gameId].turn !== message.playerId) {
            reject({ error: ErrorCodes.MOVE_OUT_OF_TURN, message });
          }
          if (
            this.games[message.gameId].positions[message.coordinateX][
              message.coordinateY
            ] !== EMPTY_POSITION
          ) {
            reject({ error: ErrorCodes.INVALID_MOVE, message });
          }
          if (
            this.games[message.gameId].timers[message.playerId].timeLeft <= 0
          ) {
            reject({ error: ErrorCodes.PLAYER_TIME_OUT, message });
          }
          break;
        }
        default:
          reject({ error: ErrorCodes.BAD_REQUEST, message });
      }
      resolve(message);
    });
  }

  transition(message: Message) {
    switch (message.type) {
      case MessageTypes.REGISTER_PLAYER: {
        this.players = addPlayer(
          this.players,
          message.playerId,
          message.name,
          message.connection
        );
        break;
      }
      case MessageTypes.REGISTER_ROBOT: {
        // const { type, ...robotData } = message;
        // this.robots = {
        //   ...this.robots,
        //   [message.playerId]: { ...robotData },
        // };
        // console.log(this.robots);
        this.players = addPlayer(
          this.players,
          message.playerId,
          message.name,
          message.connection
        );
        console.log("Players List", this.players);
        // want to change game status to GAME_IN_PROGRESS here
        // complete this this.games object, make similar to JOIN_GAME
        // this.games = {
        //   ...this.games,
        //   status: GameStatus.GAME_IN_PROGRESS,
        // };
        // console.log(this.games);

        break;
      }
      // Should be called after START_GAME
      case MessageTypes.PLAY_WITH_ROBOT: {
        const gameId = message.gameId;
        if (!(message.playerId in this.players)) {
          this.players = addPlayer(
            this.players,
            "robot" + message.playerId,
            "",
            message.connection
          );
        }
        const updatedPlayersList = uniq([
          ...this.games[gameId].players,
          "robot" + message.playerId,
        ]);
        console.log(updatedPlayersList);
        const gameReadyToStart =
          updatedPlayersList.length === this.games[gameId].playerCount;
        console.log("GAME READY TO START" + gameReadyToStart);

        // const game = {
        //   ...this.games[gameId],
        //   players: [...updatedPlayersList],
        //   status: gameReadyToStart
        //     ? GameStatus.GAME_IN_PROGRESS
        //     : GameStatus.WAITING_FOR_PLAYERS,
        //   turn: gameReadyToStart
        //     ? getFirstPlayerFromGame(this.games[gameId])
        //     : undefined,
        //   timers: {
        //     ...this.games[gameId].timers,
        //     [message.playerId]: new Timer(
        //       this.games[gameId].timePerPlayer,
        //       message.playerId,
        //       message.gameId
        //     ),
        //   },
        // };
        // this.games = {
        //   ...this.games,
        //   [message.gameId]: game,
        // };
        // if (gameReadyToStart) {
        //   this.games[gameId].timers[
        //     getFirstPlayerFromGame(this.games[gameId])
        //   ].start(this);
        // }
        console.log("Robot joined the game");
        break;
      }
      case MessageTypes.NOTIFY_TIME:
        break;
      case MessageTypes.PLAYER_DISCONNECT: {
        // Remove player from players list
        const { playerId } = message;
        const { [playerId]: omit, ...rest } = this.players;
        this.players = rest;
        // Transition games to GAME_ABANDONED state
        this.games = Object.values(this.games).reduce(
          (acc: GameStore, each: Game): GameStore => {
            if (
              each.players.includes(playerId) &&
              !COMPLETED_GAME_STATUS.includes(each.status)
            ) {
              acc[each.gameId] = {
                ...each,
                status: GameStatus.GAME_ABANDONED,
              };
            } else {
              acc[each.gameId] = each;
            }
            return acc;
          },
          {}
        );
        break;
      }
      case MessageTypes.START_GAME: {
        if (!(message.playerId in this.players)) {
          this.players = addPlayer(
            this.players,
            message.playerId,
            "",
            message.connection
          );
        }
        const timePerPlayer = message.timePerPlayer ?? DEFAULT_TIME_PER_PLAYER;
        const incrementPerPlayer =
          message.incrementPerPlayer ?? DEFAULT_INCREMENT_PER_PLAYER;

        const timers: Record<string, Timer> = {
          [message.playerId]: new Timer(
            timePerPlayer,
            message.playerId,
            message.gameId
          ),
        };
        const game = {
          gameId: message.gameId,
          name: message.name,
          boardSize: message.boardSize,
          positions: generateBoard(message.boardSize),
          playerCount: message.playerCount ? message.playerCount : 2,
          winningSequenceLength: message.winningSequenceLength
            ? message.winningSequenceLength
            : message.boardSize,
          players: [message.playerId],
          spectators: [],
          status: GameStatus.WAITING_FOR_PLAYERS,
          timers: timers,
          timePerPlayer: timePerPlayer,
          incrementPerPlayer: incrementPerPlayer,
        };
        this.games = {
          ...this.games,
          [message.gameId]: game,
        };

        break;
      }
      case MessageTypes.JOIN_GAME: {
        const gameId = message.gameId;
        if (!(message.playerId in this.players)) {
          this.players = addPlayer(
            this.players,
            message.playerId,
            "",
            message.connection
          );
        }
        const updatedPlayersList = uniq([
          ...this.games[gameId].players,
          message.playerId,
        ]);
        const gameReadyToStart =
          updatedPlayersList.length === this.games[gameId].playerCount;

        const game = {
          ...this.games[gameId],
          players: [...updatedPlayersList],
          status: gameReadyToStart
            ? GameStatus.GAME_IN_PROGRESS
            : GameStatus.WAITING_FOR_PLAYERS,
          turn: gameReadyToStart
            ? getFirstPlayerFromGame(this.games[gameId])
            : undefined,
          timers: {
            ...this.games[gameId].timers,
            [message.playerId]: new Timer(
              this.games[gameId].timePerPlayer,
              message.playerId,
              message.gameId
            ),
          },
        };
        this.games = {
          ...this.games,
          [message.gameId]: game,
        };
        if (gameReadyToStart) {
          this.games[gameId].timers[
            getFirstPlayerFromGame(this.games[gameId])
          ].start(this);
        }
        break;
      }
      case MessageTypes.SPECTATE_GAME: {
        const updatedSpectatorsList = uniq([
          ...this.games[message.gameId].spectators,
          message.playerId,
        ]);

        this.games = {
          ...this.games,
          [message.gameId]: {
            ...this.games[message.gameId],
            spectators: [...updatedSpectatorsList],
          },
        };
        break;
      }
      case MessageTypes.PLAYER_TIMEOUT: {
        const game = this.games[message.gameId];
        const nextPlayer = calculateNextTurn(game);
        this.games = {
          ...this.games,
          [game.gameId]: {
            ...game,
            turn: nextPlayer,
          },
        };

        let count = 0;
        let winner = "";
        game.players.forEach((player) => {
          if (game.timers[player].timeLeft > 0) {
            count++;
            winner = player;
          }
        });

        if (count == 1) {
          this.games = {
            ...this.games,
            [message.gameId]: {
              ...this.games[message.gameId],
              status: GameStatus.GAME_WON_BY_TIMEOUT,
              winner: winner,
              turn: "",
            },
          };
        }
        break;
      }
      case MessageTypes.MAKE_MOVE: {
        const game = this.games[message.gameId];

        game.timers[message.playerId].stop(game.incrementPerPlayer);

        const nextPlayer = calculateNextTurn(game);
        // If the next player's Id starts with 'robot', then place the sign randomly somewhere in positions available

        const positions = [...this.games[game.gameId].positions];
        positions[message.coordinateX][message.coordinateY] = message.playerId;
        this.games = {
          ...this.games,
          [game.gameId]: {
            ...game,
            positions,
            turn: nextPlayer,
          },
        };

        const winner = calculateWinnerV2({
          positions: game.positions,
          winningSequenceLength: game.winningSequenceLength,
          lastTurnPlayerId: message.playerId,
          lastTurnPosition: {
            x: message.coordinateX,
            y: message.coordinateY,
          },
        });
        const tie = checkForDraw(this.games[message.gameId]);

        if (winner) {
          this.games = {
            ...this.games,
            [message.gameId]: {
              ...this.games[message.gameId],
              status: GameStatus.GAME_WON,
              winner: winner.winner,
              turn: "",
              winningSequence: winner.winningSquence,
            },
          };
        } else if (tie) {
          this.games = {
            ...this.games,
            [message.gameId]: {
              ...this.games[message.gameId],
              turn: "",
              status: GameStatus.GAME_ENDS_IN_A_DRAW,
            },
          };
        } else {
          game.timers[nextPlayer].start(this);
        }
        break;
      }
    }
  }

  disconnectPlayer(playerId: string) {
    console.log(`disconnecting player ${playerId}`);
  }

  // functions with side effects - websocket send operation

  notify(message: Message) {
    switch (message.type) {
      case MessageTypes.REGISTER_PLAYER: {
        const response: Response = {
          type: message.type,
          name: message.name,
          playerId: message.playerId,
        };
        message.connection.send(JSON.stringify(response));
        break;
      }
      case MessageTypes.REGISTER_ROBOT: {
        const response: Response = {
          type: message.type,
          name: message.name,
          playerId: message.playerId,
        };
        message.connection.send(JSON.stringify(response));
        break;
      }
      case MessageTypes.PLAY_WITH_ROBOT: {
        const response: Response = {
          type: message.type,
          name: message.name,
          playerId: message.playerId,
        };
        message.connection.send(JSON.stringify(response));
        break;
      }
      case MessageTypes.PLAYER_DISCONNECT:
        Object.values(this.games)
          .filter((each: Game) => each.players.includes(message.playerId))
          .forEach((game: Game) => {
            const connectedPlayers: ConnectedPlayer[] = Object.keys(
              this.players
            )
              .filter((each) => game.players.includes(each))
              .map((each) => this.players[each]);
            const connectedSpectators: ConnectedPlayer[] = Object.keys(
              this.players
            )
              .filter((each) => game.spectators.includes(each))
              .map((each) => this.players[each]);
            const response: Response = {
              type: message.type,
              game: {
                ...game,
                timers: getTimerBaseFromGame(game),
              },
              players: getPlayers(connectedPlayers),
              spectators: getPlayers(connectedSpectators),
            };
            sendResponseToPlayers(
              response,
              connectedPlayers,
              connectedSpectators
            );
          });
        break;
      case MessageTypes.START_GAME:
      case MessageTypes.JOIN_GAME:
      case MessageTypes.SPECTATE_GAME:
      case MessageTypes.PLAYER_TIMEOUT:
      case MessageTypes.NOTIFY_TIME:
      case MessageTypes.MAKE_MOVE: {
        const game = this.games[message.gameId];

        const connectedPlayers: ConnectedPlayer[] = getConnectedPlayers(
          this.players,
          game
        );

        const connectedSpectators: ConnectedPlayer[] = getConnectedSpectators(
          this.players,
          game
        );

        const response: Response = {
          type: [
            GameStatus.GAME_WON,
            GameStatus.GAME_ENDS_IN_A_DRAW,
            GameStatus.GAME_WON_BY_TIMEOUT,
          ].includes(game.status)
            ? MessageTypes.GAME_COMPLETE
            : message.type,
          game: {
            ...game,
            timers: getTimerBaseFromGame(game),
          },
          players: getPlayers(connectedPlayers),
          spectators: getPlayers(connectedSpectators),
        };
        sendResponseToPlayers(response, connectedPlayers, connectedSpectators);
        break;
      }
      default:
        break;
    }
  }

  notifyError(error) {
    const player: ConnectedPlayer = this.players[error.message.playerId];
    const { ["connection"]: omit, ...message } = error.message;
    player.connection.send(
      JSON.stringify({ ...error, message, type: "ERROR" })
    );
  }
}

const addPlayer = (
  players: {
    [key: string]: ConnectedPlayer;
  },
  playerId: string,
  name: string,
  connection: WebSocket
): any => {
  return {
    ...players,
    [playerId]: {
      playerId: playerId,
      name: name,
      connection: connection,
    },
  };
};

const calculateNextTurn = (game: Game): string => {
  const nextPlayerIndex =
    (game.players.indexOf(game.turn) + 1) % game.playerCount;
  return game.timers[game.players[nextPlayerIndex]].timeLeft <= 0
    ? calculateNextTurn(game)
    : game.players[nextPlayerIndex];
};

const generateBoard = (boardSize: number): string[][] => {
  // todo: refactor
  const arr = [];
  for (let i = 0; i < boardSize; i++) {
    const innerArr = [];
    for (let j = 0; j < boardSize; j++) {
      innerArr.push(EMPTY_POSITION);
    }
    arr.push(innerArr);
  }
  return arr;
};

const checkForDraw = (game: Game): boolean => {
  for (let i = 0; i < game.boardSize; i++) {
    for (let j = 0; j < game.boardSize; j++) {
      if (game.positions[i][j] === "-") {
        return false;
      }
    }
  }
  return true;
};

export const calculateWinnerV2 = (
  input: CalculateWinnerInputType
): CalculateWinnerOutputType => {
  let start = 0;
  let end = 0;
  let count = 0;
  let winningSquence = [];
  const size = input.positions.length;
  const seqLength = input.winningSequenceLength;
  const x = input.lastTurnPosition.x;
  const y = input.lastTurnPosition.y;

  //check horizontal
  start = y - (seqLength - 1) < 0 ? 0 : y - (seqLength - 1);
  end = y + (seqLength - 1) > size - 1 ? size - 1 : y + (seqLength - 1);
  for (let i = start; i <= end; i++) {
    if (!(input.lastTurnPlayerId === input.positions[x][i])) {
      count = 0;
      continue;
    } else {
      count++;
      winningSquence.push({ x: x, y: i });
    }
    if (count === seqLength) {
      return {
        winner: input.lastTurnPlayerId, // winning player
        winningSquence: winningSquence,
      };
    }
  }

  //check vertical
  count = 0;
  winningSquence = [];
  start = x - (seqLength - 1) < 0 ? 0 : x - (seqLength - 1);
  end = x + (seqLength - 1) > size - 1 ? size - 1 : x + (seqLength - 1);
  for (let i = start; i <= end; i++) {
    if (!(input.lastTurnPlayerId === input.positions[i][y])) {
      count = 0;
      continue;
    } else {
      count++;
      winningSquence.push({ x: i, y: y });
    }
    if (count == seqLength) {
      return {
        winner: input.lastTurnPlayerId, // winning player
        winningSquence: winningSquence,
      };
    }
  }

  //check right diagonal
  count = 1;
  winningSquence = [{ x: x, y: y }];
  let xPosLeft = x - 1;
  let yPosLeft = y - 1;
  while (xPosLeft >= 0 && yPosLeft >= 0) {
    if (!(input.lastTurnPlayerId === input.positions[xPosLeft][yPosLeft])) {
      break;
    } else {
      count++;
      winningSquence.push({ x: xPosLeft, y: yPosLeft });
    }
    xPosLeft--;
    yPosLeft--;
    if (count == seqLength) {
      return {
        winner: input.lastTurnPlayerId, // winning player
        winningSquence: winningSquence,
      };
    }
  }
  let xPosRight = x + 1;
  let yPosRight = y + 1;
  while (xPosRight < size && yPosRight < size) {
    if (!(input.lastTurnPlayerId === input.positions[xPosRight][yPosRight])) {
      break;
    } else {
      count++;
      winningSquence.push({ x: xPosRight, y: yPosRight });
    }
    xPosRight--;
    xPosRight--;
    if (count == seqLength) {
      return {
        winner: input.lastTurnPlayerId, // winning player
        winningSquence: winningSquence,
      };
    }
  }

  //check left diagonal
  count = 1;
  winningSquence = [{ x: x, y: y }];
  xPosLeft = x + 1;
  xPosRight = x - 1;
  yPosLeft = y - 1;
  yPosRight = y + 1;
  while (xPosLeft < size && yPosLeft >= 0) {
    if (!(input.lastTurnPlayerId === input.positions[xPosLeft][yPosLeft])) {
      break;
    } else {
      count++;
      winningSquence.push({ x: xPosLeft, y: yPosLeft });
    }
    xPosLeft++;
    yPosLeft--;
    if (count == seqLength) {
      return {
        winner: input.lastTurnPlayerId, // winning player
        winningSquence: winningSquence,
      };
    }
  }
  while (xPosRight >= 0 && yPosRight < size) {
    if (!(input.lastTurnPlayerId === input.positions[xPosRight][yPosRight])) {
      break;
    } else {
      count++;
      winningSquence.push({ x: xPosRight, y: yPosRight });
    }
    xPosRight--;
    yPosRight++;
    if (count == seqLength) {
      return {
        winner: input.lastTurnPlayerId, // winning player
        winningSquence: winningSquence,
      };
    }
  }
  return null;
};

export default TiciTacaToeyGameEngine;
