interface Game {
  gameId: string;
  name: string;
  boardSize: number;
  positions: string[][];
  playerCount: number;
  players: string[];
  status: string;
  turn: string;
}

interface Player {
  name: string;
  playerId: string;
}

interface ConnectedPlayer extends Player {
  connection: WebSocket;
}

interface GameStore {
  [key: string]: Game;
}

interface GameState {
  game: Game;
  players: {
    [key: string]: Player;
  };
}

interface PlayerStore {
  [key: string]: ConnectedPlayer;
}

interface StateMachine {
  games: GameStore;
  players: PlayerStore;
  transition: (message: Message) => StateMachine;
}

// Messages

interface RegisterPlayerMessage {
  type: MessageTypes.REGISTER_PLAYER;
  name: string;
}

interface StartGameMessage {
  type: MessageTypes.START_GAME;
  name: string;
  boardSize: number;
  playerCount: number;
}

interface JoinGameMessage {
  type: MessageTypes.JOIN_GAME;
  gameId: string;
}

interface MakeMoveMessage {
  type: MessageTypes.MAKE_MOVE;
  gameId: string;
  coordinateX: number;
  coordinateY: number;
}

// Union types require usage of the "type" keyword over interface

type Message =
  | RegisterPlayerMessage
  | StartGameMessage
  | JoinGameMessage
  | MakeMoveMessage;

// adding string values to support incoming message deserialization from string

enum MessageTypes {
  REGISTER_PLAYER = "REGISTER_PLAYER",
  START_GAME = "START_GAME",
  JOIN_GAME = "JOIN_GAME",
  MAKE_MOVE = "MAKE_MOVE",
}

enum ErrorCodes {
  GAME_NOT_FOUND = "GAME_NOT_FOUND",
  PLAYER_ALREADY_PART_OF_GAME = "PLAYER_ALREADY_PART_OF_GAME",
  GAME_IN_PROGRESS = "GAME_IN_PROGRESS",
  MOVE_OUT_OF_TURN = "MOVE_OUT_OF_TURN",
  INVALID_MOVE = "INVALID_MOVE",
  BAD_REQUEST = "BAD_REQUEST",
}

enum GameStatus {
  WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS",
  GAME_IN_PROGRESS = "GAME_IN_PROGRESS",
}

export {
  Game,
  Player,
  GameStore,
  PlayerStore,
  StateMachine,
  MessageTypes,
  ErrorCodes,
  GameStatus,
  ConnectedPlayer,
  GameState,
  Message,
};
