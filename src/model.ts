import WebSocket = require("ws");
interface Game {
  gameId: string;
  name: string;
  boardSize: number;
  positions: string[][];
  playerCount: number;
  players: string[];
  winner: string;
  winningSequence: string;
  status: GameStatus;
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
  transition: (message: Message) => void;
  notify: (message: Message) => void;
  notifyError: (error: GameError) => void;
}

// Incoming messages - optional properties enriched by server

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
  connection?: WebSocket;
  playerId?: string;
  gameId?: string;
}

interface JoinGameMessage {
  type: MessageTypes.JOIN_GAME;
  gameId: string;
  connection?: WebSocket;
  playerId?: string;
}

interface MakeMoveMessage {
  type: MessageTypes.MAKE_MOVE;
  coordinateX: number;
  coordinateY: number;
  gameId: string;
  connection?: WebSocket;
  playerId?: string;
}

type Message =
  | RegisterPlayerMessage
  | StartGameMessage
  | JoinGameMessage
  | MakeMoveMessage;

// Responses

interface RegisterPlayerResponse extends Player {
  type: MessageTypes.REGISTER_PLAYER;
}

interface GameActionResponse extends GameState {
  type:
    | MessageTypes.START_GAME
    | MessageTypes.JOIN_GAME
    | MessageTypes.MAKE_MOVE;
}

type Response = RegisterPlayerResponse | GameActionResponse;

interface GameError {
  error: ErrorCodes;
  message: Message;
}

enum MessageTypes {
  REGISTER_PLAYER = "REGISTER_PLAYER",
  START_GAME = "START_GAME",
  JOIN_GAME = "JOIN_GAME",
  MAKE_MOVE = "MAKE_MOVE",
}

enum ErrorCodes {
  GAME_NOT_FOUND = "GAME_NOT_FOUND",
  PLAYER_ALREADY_PART_OF_GAME = "PLAYER_ALREADY_PART_OF_GAME",
  GAME_ALREADY_IN_PROGRESS = "GAME_ALREADY_IN_PROGRESS",
  MOVE_OUT_OF_TURN = "MOVE_OUT_OF_TURN",
  INVALID_MOVE = "INVALID_MOVE",
  BAD_REQUEST = "BAD_REQUEST",
  BOARD_SIZE_LESS_THAN_2 = "BOARD_SIZE_LESS_THAN_2",
  PLAYER_COUNT_LESS_THAN_2 = "PLAYER_COUNT_LESS_THAN_2",
}

enum GameStatus {
  WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS",
  GAME_IN_PROGRESS = "GAME_IN_PROGRESS",
  GAME_WON = "GAME_WON",
  GAME_ENDS_IN_A_DRAW = "GAME_ENDS_IN_A_DRAW",
}

export {
  Game,
  Player,
  GameStore,
  PlayerStore,
  GameEngine,
  GameError,
  MessageTypes,
  ErrorCodes,
  GameStatus,
  ConnectedPlayer,
  GameState,
  Message,
  RegisterPlayerResponse,
  GameActionResponse,
  Response,
};
