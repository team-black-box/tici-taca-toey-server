import WebSocket = require("ws");
import TiciTacaToeyGameEngine from "./TiciTacaToeyGameEngine";
import { TimerBase } from "./timer";

interface Game {
  gameId: string;
  name: string;
  boardSize: number;
  positions: string[][];
  playerCount: number;
  players: string[];
  spectators: string[];
  winner: string;
  winningSequence: WinningSequence[];
  winningSequenceLength: number;
  status: GameStatus;
  turn: string;
  timers: Record<string, TimerBase>;
  timePerPlayer: number;
  incrementPerPlayer: number;
}

interface Player {
  name: string;
  playerId: string;
}

interface ConnectedPlayer extends Player {
  connection: WebSocket;
}

interface RobotPlayer extends ConnectedPlayer {
  maxGames: number;
}

interface GameStore {
  [key: string]: Game;
}

interface GameState {
  game: Game;
  players: {
    [key: string]: Player;
  };
  spectators: {
    [key: string]: Player;
  };
}

interface PlayerStore {
  [key: string]: ConnectedPlayer;
}

interface RobotStore {
  [key: string]: RobotPlayer;
}

interface GameEngine {
  games: GameStore;
  players: PlayerStore;
  robots: RobotStore;
  play: (message: Message, notify: boolean) => Promise<GameEngine>;
  validate: (message: Message) => Promise<Message>;
  transition: (message: Message) => void;
  disconnectPlayer: (playerId: string) => void;
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

interface RegisterRobotMessage {
  type: MessageTypes.REGISTER_ROBOT;
  name: string;
  maxGames: number;
  connection: WebSocket;
  playerId?: string;
  gameId?: string;
}

interface StartGameMessage {
  type: MessageTypes.START_GAME;
  name: string;
  boardSize: number;
  playerCount: number;
  winningSequenceLength?: number;
  connection?: WebSocket;
  playerId?: string;
  gameId?: string;
  timePerPlayer?: number;
  incrementPerPlayer?: number;
}

interface JoinGameMessage {
  type: MessageTypes.JOIN_GAME;
  gameId: string;
  connection?: WebSocket;
  playerId?: string;
}

interface UpdateTimeMessage {
  type: MessageTypes.NOTIFY_TIME;
  gameId: string;
  connection?: WebSocket;
  playerId?: string;
}

interface SpectateGameMessage {
  type: MessageTypes.SPECTATE_GAME;
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

interface PlayerDisconnectMessage {
  type: MessageTypes.PLAYER_DISCONNECT;
  playerId: string;
  gameId?: string; // todo: this is really not required :(
  connection?: WebSocket; // todo: this is really not required :(
}

interface PlayerTimeoutMessage {
  type: MessageTypes.PLAYER_TIMEOUT;
  playerId: string;
  gameId: string;
  connection?: WebSocket;
}

type Message =
  | RegisterPlayerMessage
  | RegisterRobotMessage
  | StartGameMessage
  | JoinGameMessage
  | SpectateGameMessage
  | MakeMoveMessage
  | PlayerDisconnectMessage
  | UpdateTimeMessage
  | PlayerTimeoutMessage;

// Responses

interface RegisterPlayerResponse extends Player {
  type: MessageTypes.REGISTER_PLAYER;
}

interface RegisterRobotResponse extends Player {
  type: MessageTypes.REGISTER_ROBOT;
}

interface GameActionResponse extends GameState {
  type:
    | MessageTypes.START_GAME
    | MessageTypes.JOIN_GAME
    | MessageTypes.MAKE_MOVE
    | MessageTypes.SPECTATE_GAME
    | MessageTypes.PLAYER_DISCONNECT
    | MessageTypes.GAME_COMPLETE
    | MessageTypes.NOTIFY_TIME
    | MessageTypes.PLAYER_TIMEOUT;
}

type Response =
  | RegisterPlayerResponse
  | RegisterRobotResponse
  | GameActionResponse;

interface GameError {
  error: ErrorCodes;
  message: Message;
}

enum MessageTypes {
  REGISTER_PLAYER = "REGISTER_PLAYER",
  REGISTER_ROBOT = "REGISTER_ROBOT",
  START_GAME = "START_GAME",
  JOIN_GAME = "JOIN_GAME",
  MAKE_MOVE = "MAKE_MOVE",
  SPECTATE_GAME = "SPECTATE_GAME",
  GAME_COMPLETE = "GAME_COMPLETE", // response only
  PLAYER_DISCONNECT = "PLAYER_DISCONNECT",
  PLAYER_TIMEOUT = "PLAYER_TIMEOUT",
  NOTIFY_TIME = "NOTIFY_TIME",
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
  PLAYER_COUNT_MUST_BE_LESS_THAN_BOARD_SIZE = "PLAYER_COUNT_MUST_BE_LESS_THAN_BOARD_SIZE",
  WIN_SEQ_LENGTH_MUST_BE_LESS_THAN_OR_EQUAL_TO_BOARD_SIZE = "WINNING_SEQUENCE_LENGTH_MUST_BE_LESS_THAN_OR_EQUAL_TO_BOARD_SIZE",
  BOARD_SIZE_CANNOT_BE_GREATER_THAN_12 = "BOARD_SIZE_CANNOT_BE_GREATER_THAN_12",
  PLAYER_COUNT_CANNOT_BE_GREATER_THAN_10 = "PLAYER_COUNT_CANNOT_BE_GREATER_THAN_10",
  SPECTATOR_COUNT_CANNOT_BE_GREATER_THAN_10 = "SPECTATOR_COUNT_CANNOT_BE_GREATER_THAN_10",
  PLAYER_TIME_OUT = "PLAYER_TIME_OUT",
}

enum GameStatus {
  WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS",
  GAME_IN_PROGRESS = "GAME_IN_PROGRESS",
  GAME_WON = "GAME_WON",
  GAME_ENDS_IN_A_DRAW = "GAME_ENDS_IN_A_DRAW",
  GAME_ABANDONED = "GAME_ABANDONED",
  GAME_WON_BY_TIMEOUT = "GAME_WON_BY_TIMEOUT",
}

const COMPLETED_GAME_STATUS = [
  GameStatus.GAME_ABANDONED,
  GameStatus.GAME_ENDS_IN_A_DRAW,
  GameStatus.GAME_WON,
  GameStatus.GAME_WON_BY_TIMEOUT,
];

// Winner Calculation Enhancements

interface CalculateWinnerInputType {
  positions: string[][];
  winningSequenceLength: number;
  lastTurnPlayerId: string;
  lastTurnPosition: WinningSequence;
}

interface WinningSequence {
  x: number;
  y: number;
}

interface CalculateWinnerOutputType {
  winner: string;
  winningSquence: WinningSequence[];
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
  PlayerDisconnectMessage,
  COMPLETED_GAME_STATUS,
  CalculateWinnerInputType,
  WinningSequence,
  CalculateWinnerOutputType,
  PlayerTimeoutMessage,
  UpdateTimeMessage,
};
