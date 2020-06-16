import { GameEngine, MessageTypes, GameStatus, Message } from "./model";

class TiciTacaToeyGameEngine implements GameEngine {
  games;
  players;

  constructor() {
    this.games = {};
    this.players = {};
  }

  play(message) {
    this.validate(message)
      .then((message) => this.transition(message))
      .catch((error) => {});
    return this;
  }

  validate(message) {
    return new Promise<Message>((resolve, reject) => {
      resolve(message);
    });
  }

  transition(message) {
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
          status: GameStatus.WAITING_FOR_PLAYERS,
        };
        this.games = {
          ...this.games,
          [message.gameId]: game,
        };
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
      }
    }
    return this;
  }

  notify(message) {
    // check for winner and self play winning move
    return this;
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

const generateBoard = (boardSize) => {
  // possibly unnecessary
  const arr = [];
  for (let i = 0; i < boardSize; i++) {
    const innerArr = [];
    for (let j = 0; j < boardSize; j++) {
      innerArr.push("-");
    }
    arr.push(innerArr);
  }
  return arr;
};

export default TiciTacaToeyGameEngine;
