const WebSocket = require("ws");

const ws = new WebSocket("ws://13.233.244.240:8080/app");

const clientData = {
  player: {
    id: null,
    name: "",
  },
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

ws.on("message", function incoming(d) {
  const data = JSON.parse(d);
  switch (data.type) {
    case "REGISTER_PLAYER": {
      log(`Welcome ${data.name}`);
      clientData.player.id = data.playerId;
      clientData.player.name = data.name;
      readline.question(
        `1. Start a new game\n2. Join an existing game\n3. Exit\n`,
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
      clientData.game = { ...data };
      log(
        `Game started with id ${clientData.game.gameId}\nCurrent status: ${clientData.game.status}\nActive Players: ${clientData.game.players.length}`
      );
      console.table(clientData.game.positions);
      break;
    }
    case "JOIN_GAME": {
      clientData.game = { ...data };
      log(
        `Game joined with id ${clientData.game.gameId}\nCurrent status: ${clientData.game.status}\nActive Players: ${clientData.game.players.length}`
      );
      console.table(clientData.game.positions);
      break;
    }
    case "GAME_STARTED": {
      clientData.game = { ...data };
      log(
        `Game Started ${clientData.game.gameId}\nCurrent status: ${clientData.game.status}\nActive Players: ${clientData.game.players.length}`
      );
      console.table(clientData.game.positions);
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
    case "MAKE_MOVE": {
      clientData.game = { ...data };
      log(
        `Move made ${clientData.game.gameId}\nCurrent status: ${clientData.game.status}\nActive Players: ${clientData.game.players.length}`
      );
      console.table(clientData.game.positions);
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
      const winner = { ...data };
      log(
        `Game complete ${clientData.game.gameId}\nWinner: ${winner.playerId}`
      );
      console.table(clientData.game.positions);
      clientData.game = {};
      ws.terminate();
      readline.close();
      break;
    }
  }
});

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
