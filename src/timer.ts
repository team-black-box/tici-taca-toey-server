import TiciTacaToeyGameEngine from "./TiciTacaToeyGameEngine";
import { MessageTypes, PlayerTimeoutMessage, UpdateTimeMessage } from "./model";

export interface TimerBase {
  isRunning: boolean;
  timeLeft: number;
}

export class Timer implements TimerBase {
  isRunning: boolean;
  #startTime: number;
  timeLeft: number;
  #intervalID;
  #playerId: string;
  #gameId: string;

  constructor(allotedTime: number, playerId: string, gameId: string) {
    this.#playerId = playerId;
    this.#gameId = gameId;
    this.reset(allotedTime);
  }

  #getTimeElapsedSinceLastStart() {
    return this.#startTime === 0 ? 0 : Date.now() - this.#startTime;
  }

  start(engine: TiciTacaToeyGameEngine) {
    if (this.isRunning) {
      return "Timer is already running";
    }

    this.isRunning = true;
    this.#startTime = Date.now();

    this.#intervalID = setInterval(() => {
      this.timeLeft = Math.max(
        0,
        this.timeLeft - this.#getTimeElapsedSinceLastStart()
      );
      this.#startTime = Date.now();
      if (this.timeLeft <= 0) {
        const playerTimeoutMessage: PlayerTimeoutMessage = {
          type: MessageTypes.PLAYER_TIMEOUT,
          gameId: this.#gameId,
          playerId: this.#playerId,
        };
        engine.play(playerTimeoutMessage);
        this.stop(0); // no increment if the player timedout
        return;
      }
      const timeUpdateMessage: UpdateTimeMessage = {
        type: MessageTypes.NOTIFY_TIME,
        gameId: this.#gameId,
      };
      engine.play(timeUpdateMessage); // notifying the client every 100 ms
    }, 100);
  }

  stop(increment: number) {
    if (!this.isRunning) {
      return;
    }
    this.timeLeft = this.timeLeft - this.#getTimeElapsedSinceLastStart();
    this.timeLeft = this.timeLeft + increment;
    this.isRunning = false;
    clearInterval(this.#intervalID);
  }

  reset(allotedTime: number) {
    this.isRunning = false;
    this.#startTime = 0;
    this.timeLeft = allotedTime;
    if (this.isRunning) {
      this.#startTime = Date.now();
      return;
    }
  }
}
