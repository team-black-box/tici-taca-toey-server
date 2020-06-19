import {
  GameEngine,
  MessageTypes,
  GameStatus,
  Message,
  ErrorCodes,
  ConnectedPlayer,
  Game,
  Response,
} from "./model";

const EMPTY_POSITION = "-";

class TiciTacaToeyGameEngine implements GameEngine {
  games;
  players;

  constructor() {
    this.games = {};
    this.players = {};
  }

  play(message: Message, notify: boolean = true) {
    return new Promise<GameEngine>((resolve, reject) => {
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
        case MessageTypes.START_GAME: {
          if (message.boardSize < 2) {
            reject({ error: ErrorCodes.BOARD_SIZE_LESS_THAN_2, message });
          }
          if (message.playerCount < 2) {
            reject({ error: ErrorCodes.PLAYER_COUNT_LESS_THAN_2, message });
          }
          break;
        }
        case MessageTypes.SPECTATE_GAME: {
          if (
            !this.games[message.gameId] &&
            this.games[message.gameId].status !== GameStatus.GAME_IN_PROGRESS
          ) {
            reject({ error: ErrorCodes.GAME_NOT_FOUND, message });
          }
          break;
        }
        case MessageTypes.JOIN_GAME: {
          if (
            !this.games[message.gameId] &&
            this.games[message.gameId].status !== GameStatus.GAME_IN_PROGRESS
          ) {
            reject({ error: ErrorCodes.GAME_NOT_FOUND, message });
          }
          if (this.games[message.gameId].players.includes(message.playerId)) {
            reject({ error: ErrorCodes.PLAYER_ALREADY_PART_OF_GAME, message });
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
        const { type, ...playerData } = message;
        this.players = {
          ...this.players,
          [message.playerId]: { ...playerData },
        };
        break;
      }
      case MessageTypes.START_GAME: {
        const game = {
          gameId: message.gameId,
          name: message.name,
          boardSize: message.boardSize,
          positions: generateBoard(message.boardSize),
          playerCount: message.playerCount ? message.playerCount : 2,
          players: [message.playerId],
          spectators: [],
          status: GameStatus.WAITING_FOR_PLAYERS,
        };
        this.games = {
          ...this.games,
          [message.gameId]: game,
        };
        break;
      }
      case MessageTypes.JOIN_GAME: {
        const gameId = message.gameId;
        const gameReadyToStart =
          this.games[gameId].players.length + 1 ===
          this.games[gameId].playerCount;

        const game = {
          ...this.games[gameId],
          players: [...this.games[gameId].players, message.playerId],
          status: gameReadyToStart
            ? GameStatus.GAME_IN_PROGRESS
            : GameStatus.WAITING_FOR_PLAYERS,
          turn: gameReadyToStart ? this.games[gameId].players[0] : undefined,
        };
        this.games = {
          ...this.games,
          [message.gameId]: game,
        };
        break;
      }
      case MessageTypes.SPECTATE_GAME: {
        this.games = {
          ...this.games,
          [message.gameId]: {
            ...this.games[message.gameId],
            spectators: [
              ...this.games[message.gameId].spectators,
              message.playerId,
            ],
          },
        };
        break;
      }
      case MessageTypes.MAKE_MOVE: {
        const game = this.games[message.gameId];
        const positions = [...this.games[game.gameId].positions];
        positions[message.coordinateX][message.coordinateY] = message.playerId;
        this.games = {
          ...this.games,
          [game.gameId]: {
            ...game,
            positions,
            turn: calculateNextTurn(game.players, game.turn, game.playerCount),
          },
        };

        const winner = calculateWinner(this.games[message.gameId]);
        const tie = checkForDraw(this.games[message.gameId]);

        if (winner) {
          this.games = {
            ...this.games,
            [message.gameId]: {
              ...this.games[message.gameId],
              status: GameStatus.GAME_WON,
              winner: winner.playerId,
              winningSequence: winner.sequence,
            },
          };
        } else if (tie) {
          this.games = {
            ...this.games,
            [message.gameId]: {
              ...this.games[message.gameId],
              status: GameStatus.GAME_ENDS_IN_A_DRAW,
            },
          };
        }

        break;
      }
    }
  }

  disconnectPlayer(playerId: string) {}

  // functions with side effects - websocket send operation

  notify(message: Message) {
    switch (message.type) {
      case MessageTypes.REGISTER_PLAYER:
        const response: Response = {
          type: message.type,
          name: message.name,
          playerId: message.playerId,
        };
        message.connection.send(JSON.stringify(response));
        break;
      case MessageTypes.START_GAME:
      case MessageTypes.JOIN_GAME:
      case MessageTypes.MAKE_MOVE: {
        const game = this.games[message.gameId];
        const connectedPlayers: ConnectedPlayer[] = Object.keys(this.players)
          .filter((each) => game.players.includes(each))
          .map((each) => this.players[each]);
        const connectedSpectators: ConnectedPlayer[] = Object.keys(this.players)
          .filter((each) => game.spectators.includes(each))
          .map((each) => this.players[each]);
        const response: Response = {
          type: [GameStatus.GAME_WON, GameStatus.GAME_ENDS_IN_A_DRAW].includes(
            game.status
          )
            ? MessageTypes.GAME_COMPLETE
            : message.type,
          game,
          players: connectedPlayers
            .map((each) => ({ name: each.name, playerId: each.playerId }))
            .reduce((acc, each) => {
              acc[each.playerId] = each;
              return acc;
            }, {}),
          spectators: connectedSpectators
            .map((each) => ({ name: each.name, playerId: each.playerId }))
            .reduce((acc, each) => {
              acc[each.playerId] = each;
              return acc;
            }, {}),
        };
        connectedPlayers.forEach((player) => {
          player.connection.send(JSON.stringify(response));
        });
        connectedSpectators.forEach((player) => {
          player.connection.send(JSON.stringify(response));
        });
        break;
      }
      default:
        break;
    }
  }

  notifyError(error) {
    const player: ConnectedPlayer = this.players[error.message.playerId];
    const { ["connection"]: omit, ...message } = error.message;
    player.connection.send(JSON.stringify({ ...error, message }));
  }
}

const calculateNextTurn = (
  players: string[],
  currentTurn: string,
  playerCount: number
): string => {
  const nextPlayerIndex = (players.indexOf(currentTurn) + 1) % playerCount;
  return players[nextPlayerIndex];
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

// todo: refactor
const calculateWinner = (
  game: Game
): { playerId: string; sequence: string } => {
  // check all rows
  for (let i = 0; i < game.boardSize; i++) {
    const row: string[] = game.positions[i];
    if (row.includes("-")) {
      continue;
    }
    const uniqueValuesInRow = [...new Set(row)];
    if (uniqueValuesInRow.length === 1) {
      return {
        playerId: uniqueValuesInRow[0], // winning player
        sequence: `row-${i}`,
      };
    }
  }
  // check all cols
  for (let i = 0; i < game.boardSize; i++) {
    const column = [];
    for (let j = 0; j < game.boardSize; j++) {
      column.push(game.positions[j][i]);
    }
    if (column.includes("-")) {
      continue;
    }
    const uniqueValuesInRow = [...new Set(column)];
    if (uniqueValuesInRow.length === 1) {
      return {
        playerId: uniqueValuesInRow[0], // winning player
        sequence: `column-${i}`,
      };
    }
  }
  // check diagonals
  const diagonalLTR = [];
  const diagonalRTL = [];
  for (let i = 0; i < game.boardSize; i++) {
    diagonalLTR.push(game.positions[i][i]);
    diagonalRTL.push(game.positions[i][game.boardSize - i]);
  }
  if (!diagonalLTR.includes("-")) {
    const uniqueDiagonalLTR = [...new Set(diagonalLTR)];
    if (uniqueDiagonalLTR.length === 1) {
      return {
        playerId: uniqueDiagonalLTR[0], // winning player
        sequence: `Diagonal LTR`,
      };
    }
  }
  if (!diagonalRTL.includes("-")) {
    const uniqueDiagonalRTL = [...new Set(diagonalRTL)];
    if (uniqueDiagonalRTL.length === 1) {
      return {
        playerId: uniqueDiagonalRTL[0], // winning player
        sequence: `Diagonal RTL`,
      };
    }
  }
  return null;
};

export default TiciTacaToeyGameEngine;
