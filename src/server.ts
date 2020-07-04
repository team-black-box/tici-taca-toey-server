import { v4 as uuid } from "uuid";
import WebSocket = require("ws");
import https = require("https");
import fs = require("fs");
import {
  ErrorCodes,
  Message,
  GameEngine,
  GameStatus,
  MessageTypes,
} from "./model";
import TiciTacaToeyGameEngine from "./TiciTacaToeyGameEngine";

const log = (engine: GameEngine) => {
  // console.clear();
  console.log(
    `
  /$$$$$$$$ /$$$$$$  /$$$$$$  /$$$$$$    /$$$$$$$$ /$$$$$$   /$$$$$$   /$$$$$$       /$$$$$$$$ /$$$$$$  /$$$$$$$$ /$$     /$$
  |__  $$__/|_  $$_/ /$$__  $$|_  $$_/   |__  $$__//$$__  $$ /$$__  $$ /$$__  $$     |__  $$__//$$__  $$| $$_____/|  $$   /$$/
     | $$     | $$  | $$  \__/  | $$        | $$  | $$  \ $$| $$  \__/| $$  \ $$        | $$  | $$  \ $$| $$       \  $$ /$$/ 
     | $$     | $$  | $$        | $$ /$$$$$$| $$  | $$$$$$$$| $$      | $$$$$$$$ /$$$$$$| $$  | $$  | $$| $$$$$     \  $$$$/  
     | $$     | $$  | $$        | $$|______/| $$  | $$__  $$| $$      | $$__  $$|______/| $$  | $$  | $$| $$__/      \  $$/   
     | $$     | $$  | $$    $$  | $$        | $$  | $$  | $$| $$    $$| $$  | $$        | $$  | $$  | $$| $$          | $$    
     | $$    /$$$$$$|  $$$$$$/ /$$$$$$      | $$  | $$  | $$|  $$$$$$/| $$  | $$        | $$  |  $$$$$$/| $$$$$$$$    | $$    
     |__/   |______/ \______/ |______/      |__/  |__/  |__/ \______/ |__/  |__/        |__/   \______/ |________/    |__/    
     
    Active Players Count: ${Object.values(engine.players).length}
    Active Players: ${Object.values(engine.players)
      .map((each) => each.name)
      .join(", ")}
    Active Games Count: ${Object.values(engine.games).length}
    Active Games: ${Object.values(engine.games)
      .filter((each) => each.status === GameStatus.GAME_IN_PROGRESS)
      .map((each) => each.name)
      .join(", ")}
  `
  );
};

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

log(engine);

wss.on("connection", (ws) => {
  const playerId = uuid();
  engine
    .play({
      type: MessageTypes.REGISTER_PLAYER,
      playerId,
      name: "",
      connection: ws,
    })
    .then(log);
  ws.on("message", (data: string) => {
    let message: Message = null;
    try {
      message = JSON.parse(data);
    } catch (exception) {
      ws.send(
        JSON.stringify({
          error: ErrorCodes.BAD_REQUEST,
          message: `Only valid JSON messages are supported. Please review your message and try again. Original Message: ${data}`,
        })
      );
    }

    const enrichedMessage: Message = {
      ...message,
      playerId,
      gameId: message.gameId ? message.gameId : uuid(), // nullish coalescing!!
      connection: ws,
    };

    engine.play(enrichedMessage).then(log);
  });

  ws.on("close", function close() {
    console.log("Player Disconnect - Update Game Engine State");
  });
});
