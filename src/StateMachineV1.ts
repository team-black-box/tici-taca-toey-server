import { StateMachine, GameState, Message, MessageTypes } from "./model";

class StateMachineV1 implements StateMachine {
  games;
  players;

  constructor() {
    this.games = {};
    this.players = {};
  }

  transition(message) {
    switch (message.type) {
      case MessageTypes.REGISTER_PLAYER: {
      }
      case MessageTypes.START_GAME: {
      }
      case MessageTypes.JOIN_GAME: {
      }
      case MessageTypes.MAKE_MOVE: {
      }
    }
    return this;
  }

  getGameState(gameId: string): GameState {
    return null;
  }
}

export default StateMachineV1;
