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

interface GameEngine {
  games: GameStore;
  players: PlayerStore;
  play: (message: Message) => GameEngine;
  validate: (message: Message) => Promise<Message>;
  transition: (message: Message) => GameEngine;
  notify: (message: Message) => GameEngine;
}

// Incoming Messages

interface RegisterPlayerMessage {
  type: MessageTypes.REGISTER_PLAYER;
  name: string;
  connection: WebSocket;
  playerId?: string;
  gameId?: string;
}

interface StartGameMessage {
  type: MessageTypes.START_GAME;
  name: string;
  boardSize: number;
  playerCount: number;
  playerId?: string;
  gameId?: string;
}

interface JoinGameMessage {
  type: MessageTypes.JOIN_GAME;
  gameId: string;
  playerId?: string;
}

interface MakeMoveMessage {
  type: MessageTypes.MAKE_MOVE;
  coordinateX: number;
  coordinateY: number;
  gameId: string;
  playerId?: string;
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
  GAME_COMPLETE = "GAME_COMPLETE",
}

export {
  Game,
  Player,
  GameStore,
  PlayerStore,
  GameEngine,
  MessageTypes,
  ErrorCodes,
  GameStatus,
  ConnectedPlayer,
  GameState,
  Message,
};
