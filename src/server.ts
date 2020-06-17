import { v4 as uuid } from "uuid";
import WebSocket = require("ws");
import { ErrorCodes, Message } from "./model";
import TiciTacaToeyGameEngine from "./TiciTacaToeyGameEngine";

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
     
    Server ready to accept incoming connections
  `
);

const wss = new WebSocket.Server({ port: 8080 });

const engine = new TiciTacaToeyGameEngine();

wss.on("connection", (ws) => {
  const playerId = uuid();
  ws.on("message", (data: string) => {
    // data can be an array buffer or string
    console.log(`Received message, parsing now`);

    let message: Message = null;

    try {
      message = JSON.parse(data);
    } catch (exception) {
      console.log(`Error parsing exception`);
      ws.send(
        JSON.stringify({
          error: ErrorCodes.BAD_REQUEST,
          message: `Only valid JSON messages are supported. Please review your message and try again. Original Message: ${data}`,
        })
      );
    }

    console.log(`Parsed message: ${JSON.stringify(message)}`);

    const enrichedMessage: Message = {
      ...message,
      playerId,
      gameId: message.gameId ? message.gameId : uuid(), // nullish coalescing!!
      connection: ws,
    };

    engine.play(enrichedMessage);
  });
});
