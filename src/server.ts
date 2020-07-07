import { v4 as uuid } from "uuid";
import WebSocket = require("ws");
import https = require("https");
import fs = require("fs");
import {
  ErrorCodes,
  Message,
  MessageTypes,
  PlayerDisconnectMessage,
} from "./model";
import TiciTacaToeyGameEngine from "./TiciTacaToeyGameEngine";
const { createLogger, format, transports } = require("winston");

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [new transports.File({ filename: "log.txt" })],
});

logger.info("Tici Taca Toey Server is in startup");

const serverArgs: string[] = process.argv.slice(2);

let wss;

if (serverArgs.length !== 3) {
  wss = new WebSocket.Server({ port: 8080 });
} else {
  const server = https.createServer({
    cert: fs.readFileSync(serverArgs[0]),
    key: fs.readFileSync(serverArgs[1]),
  });
  wss = new WebSocket.Server({ server });
  server.listen(serverArgs[2]);
}

const engine = new TiciTacaToeyGameEngine();

wss.on("connection", (ws, req) => {
  const playerId = uuid();
  const playerLogger = logger.child({ playerId, ip: req.socket.remoteAddress });
  playerLogger.info("Player Connected");
  engine.play({
    type: MessageTypes.REGISTER_PLAYER,
    playerId,
    name: "",
    connection: ws,
  });
  ws.on("message", (data: string) => {
    let message: Message = null;
    try {
      message = JSON.parse(data);
    } catch (exception) {
      playerLogger.error(`Error Parsing Message: ${data}`, exception);
      ws.send(
        JSON.stringify({
          error: ErrorCodes.BAD_REQUEST,
          message: `Only valid JSON messages are supported. Please review your message and try again. Original Message: ${data}`,
        })
      );
    }

    playerLogger.info("Message Received", message);

    const enrichedMessage: Message = {
      ...message,
      playerId,
      gameId: message && message.gameId ? message.gameId : uuid(), // nullish coalescing!!
      connection: ws,
    };

    engine.play(enrichedMessage);
  });

  ws.on("close", function close() {
    ws.terminate();
    const playerDisconnectMessage: PlayerDisconnectMessage = {
      type: MessageTypes.PLAYER_DISCONNECT,
      playerId,
    };
    playerLogger.info("Player Disconnected");
    engine.play(playerDisconnectMessage);
  });
});
