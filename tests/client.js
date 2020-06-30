const WebSocket = require("ws");
const { read } = require("fs");

const ws = new WebSocket("ws://192.168.1.8:8080");

const clientData = {
  player: {
    id: null,
    name: "",
  },
  spectators: {},
  players: {},
  game: {},
};

const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

ws.on("open", function open() {
  log("Connected to server");
  readline.question(`What's your player handle?\n`, (name) => {
    send({ type: "REGISTER_PLAYER", name });
  });
});

ws.on("close", function open() {
  log("Server closed connection");
  readline.close();
  ws.terminate();
});

ws.on("message", function incoming(d) {
  const data = JSON.parse(d);
  if (data.error) {
    log(JSON.stringify(data));
  } else {
    switch (data.type) {
      case "REGISTER_PLAYER": {
        log(`Welcome ${data.name}`);
        clientData.player.id = data.playerId;
        clientData.player.name = data.name;
        readline.question(
          `1. Start a new game\n2. Join an existing game\n3. Spectate Game\n4. Exit\n`,
          (answer) => {
            switch (answer) {
              case "1": {
                readline.question(
                  `What would you like to call the match?\n`,
                  (name) => {
                    readline.question(
                      `What should the board size be?\n`,
                      (boardSize) => {
                        readline.question(
                          `How many players should the match have?\n`,
                          (playerCount) => {
                            send({
                              type: "START_GAME",
                              name,
                              boardSize: parseInt(boardSize),
                              playerCount: parseInt(playerCount),
                            });
                          }
                        );
                      }
                    );
                  }
                );
                break;
              }
              case "2": {
                readline.question(
                  `Provide game id of game you would like to join?\n`,
                  (gameId) => {
                    send({ type: "JOIN_GAME", gameId });
                  }
                );
                break;
              }
              case "3": {
                readline.question(
                  `Provide game id of game you would like to spectate?\n`,
                  (gameId) => {
                    send({ type: "SPECTATE_GAME", gameId });
                  }
                );
                break;
              }
              case "4": {
                ws.terminate();
                readline.close();
                break;
              }
            }
          }
        );
        break;
      }
      case "START_GAME": {
        clientData.game = { ...data.game };
        clientData.players = { ...data.players };
        clientData.spectators = { ...data.spectators };
        logGameStatus(`Game started`, clientData);
        break;
      }
      case "JOIN_GAME": {
        clientData.game = { ...data.game };
        clientData.players = { ...data.players };
        clientData.spectators = { ...data.spectators };
        logGameStatus(`Game joined`, clientData);
        if (clientData.game.turn === clientData.player.id) {
          readline.question(
            `Its your turn make a move - specify the X & Y coordinates. Example 01\n`,
            (coordinates) => {
              send({
                type: "MAKE_MOVE",
                gameId: clientData.game.gameId,
                coordinateX: coordinates[0],
                coordinateY: coordinates[1],
              });
            }
          );
        }
        break;
      }
      case "SPECTATE_GAME": {
        clientData.game = { ...data.game };
        clientData.players = { ...data.players };
        clientData.spectators = { ...data.spectators };
        logGameStatus(`Spectating Game`, clientData);
        break;
      }
      case "MAKE_MOVE": {
        clientData.game = { ...data.game };
        clientData.players = { ...data.players };
        clientData.spectators = { ...data.spectators };
        logGameStatus(`Move made`, clientData);
        if (clientData.game.turn === clientData.player.id) {
          readline.question(
            `Its your turn make a move - specify the X & Y coordinates. Example 01\n`,
            (coordinates) => {
              send({
                type: "MAKE_MOVE",
                gameId: clientData.game.gameId,
                coordinateX: coordinates[0],
                coordinateY: coordinates[1],
              });
            }
          );
        }
        break;
      }
      case "GAME_COMPLETE": {
        clientData.game = { ...data.game };
        clientData.players = { ...data.players };
        clientData.spectators = { ...data.spectators };
        log(
          `Game completes with status: ${
            clientData.game.status
          }\nWinning sequence was ${clientData.game.winningSequence}\nWinner: ${
            clienData.players[clientData.game.winner].name
          }\nThanks for playing / spectating :)`
        );
        console.table(clientData.game.positions);
        readline.close();
        ws.terminate();
        break;
      }
    }
  }
});

const logGameStatus = (message, clientData) => {
  log(`
${message}
Game Id: ${clientData.game.gameId}
Current status: ${clientData.game.status}
Active Players: ${Object.values(clientData.players)
    .map((each) => each.name)
    .join(", ")}
Active Spectators: ${Object.values(clientData.spectators)
    .map((each) => each.name)
    .join(", ")}`);
  console.table(clientData.game.positions);
};

const send = (message) => ws.send(JSON.stringify(message));
const log = (message) => {
  console.clear();
  console.log(`
/$$$$$$$$ /$$$$$$  /$$$$$$  /$$$$$$    /$$$$$$$$ /$$$$$$   /$$$$$$   /$$$$$$       /$$$$$$$$ /$$$$$$  /$$$$$$$$ /$$     /$$
|__ $$__/|_  $$_/ /$$__  $$|_  $$_/   |__  $$__//$$__  $$ /$$__  $$ /$$__  $$     |__  $$__//$$__  $$| $$_____/|  $$   /$$/
  | $$     | $$  | $$  \__/  | $$        | $$  | $$  \ $$| $$  \__/| $$  \ $$        | $$  | $$  \ $$| $$       \  $$ /$$/ 
  | $$     | $$  | $$        | $$ /$$$$$$| $$  | $$$$$$$$| $$      | $$$$$$$$ /$$$$$$| $$  | $$  | $$| $$$$$     \  $$$$/  
  | $$     | $$  | $$        | $$|______/| $$  | $$__  $$| $$      | $$__  $$|______/| $$  | $$  | $$| $$__/      \  $$/   
  | $$     | $$  | $$    $$  | $$        | $$  | $$  | $$| $$    $$| $$  | $$        | $$  | $$  | $$| $$          | $$    
  | $$    /$$$$$$|  $$$$$$/ /$$$$$$      | $$  | $$  | $$|  $$$$$$/| $$  | $$        | $$  |  $$$$$$/| $$$$$$$$    | $$    
  |__/   |______/ \______/ |______/      |__/  |__/  |__/ \______/ |__/  |__/        |__/   \______/ |________/    |__/    

${message}
  `);
};
