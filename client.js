const WebSocket = require("ws");

const ws = new WebSocket("ws://localhost:8080");

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

  // ws.send(
  //   JSON.stringify({
  //     type: "START_GAME",
  //     name: "Challenge #1",
  //     boardSize: 3,
  //     playerCount: 2,
  //   })
  // );
});

ws.on("message", function incoming(d) {
  log(d);
  const data = JSON.parse(d);
  switch (data.type) {
    case "REGISTER_PLAYER": {
      log(`Welcome ${data.name}`);
      clientData.player.id = data.id;
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
        `Game started with id ${clientData.game.gameId}\nCurrent status: ${clientData.game.status}`
      );
      break;
    }
    case "JOIN_GAME": {
      clientData.game = { ...data };
      log(
        `Game joined with id ${clientData.game.gameId}\nCurrent status: ${clientData.game.status}`
      );
      break;
    }
  }
});

const send = (message) => ws.send(JSON.stringify(message));
const log = (message) => {
  console.clear();
  console.log(`
/$$$$$$$$ /$$$$$$  /$$$$$$  /$$$$$$    /$$$$$$$$ /$$$$$$   /$$$$$$   /$$$$$$       /$$$$$$$$ /$$$$$$  /$$$$$$$$ /$$     /$$
|__  $$__/|_  $$_/ /$$__  $$|_  $$_/   |__  $$__//$$__  $$ /$$__  $$ /$$__  $$     |__  $$__//$$__  $$| $$_____/|  $$   /$$/
  | $$     | $$  | $$  \__/  | $$        | $$  | $$  \ $$| $$  \__/| $$  \ $$        | $$  | $$  \ $$| $$       \  $$ /$$/ 
  | $$     | $$  | $$        | $$ /$$$$$$| $$  | $$$$$$$$| $$      | $$$$$$$$ /$$$$$$| $$  | $$  | $$| $$$$$     \  $$$$/  
  | $$     | $$  | $$        | $$|______/| $$  | $$__  $$| $$      | $$__  $$|______/| $$  | $$  | $$| $$__/      \  $$/   
  | $$     | $$  | $$    $$  | $$        | $$  | $$  | $$| $$    $$| $$  | $$        | $$  | $$  | $$| $$          | $$    
  | $$    /$$$$$$|  $$$$$$/ /$$$$$$      | $$  | $$  | $$|  $$$$$$/| $$  | $$        | $$  |  $$$$$$/| $$$$$$$$    | $$    
  |__/   |______/ \______/ |______/      |__/  |__/  |__/ \______/ |__/  |__/        |__/   \______/ |________/    |__/    

${message}
  `);
};
