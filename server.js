const WebSocket = require("ws");
const http = require("http");
const url = require("url");
const uuid = require("uuid").v4;

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

let store = {
  game: {},
  player: {},
};

const server = http.createServer();

const wss = new WebSocket.Server({ noServer: true });

server.on("upgrade", function upgrade(request, socket, head) {
  const pathname = url.parse(request.url).pathname;

  if (pathname === "/app") {
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(8080);

wss.on("connection", function connection(ws) {
  const playerId = uuid();
  const log = loggerGenerator(playerId);
  const send = wsSendProxy(ws);

  log(
    `Received connection request - client must register within 5 seconds or the connection will be terminated`
  );

  const timeout = setTimeout(terminateConnectionProxy(playerId, ws), 5000);

  ws.on("message", function incoming(msg) {
    log(`Received message, parsing now`);

    const message = JSON.parse(msg);

    log(`Message parsed, processing action ${message.type}`);

    switch (message.type) {
      case "REGISTER_PLAYER": {
        // { type: 'REGISTER_PLAYER', name: 'example'  };
        log(`Registering user`);
        store = {
          ...store,
          player: {
            ...store.player,
            [playerId]: { connection: ws, name: message.name, playerId },
          },
        };
        send({ type: message.type, playerId, name: message.name });
        log(`User registered!`);
        clearTimeout(timeout);
        log(`Termination timeout cleared`);
        break;
      }

      case "START_GAME": {
        // ; // default player count is 2 if not specified
        const gameId = uuid();
        log(`Starting game with id: ${gameId}`);

        const game = {
          gameId,
          name: message.name,
          boardSize: message.boardSize,
          positions: generateBoard(message.boardSize),
          playerCount: message.playerCount ? message.playerCount : 2,
          players: [playerId],
          status: "WAITING_FOR_PLAYERS",
        };
        store = {
          ...store,
          game: {
            ...store.game,
            [gameId]: game,
          },
        };
        log(
          `Game started - total active games: ${Object.keys(store.game).length}`
        );
        send({ type: message.type, ...game });
        break;
      }

      case "JOIN_GAME": {
        // { type: 'JOIN_GAME', gameId: '123' };
        const gameId = message.gameId;
        if (!store.game[gameId]) {
          log(`Game not found with id: ${gameId}`);
          send({ error: "GAME_NOT_FOUND", gameId });
          break;
        }
        if (store.game[gameId].players.includes(playerId)) {
          log(`Player already part of game: ${gameId}`);
          send({
            error: "PLAYER_ALREADY_PART_OF_GAME",
            gameId,
          });
          break;
        }
        if (store.game[gameId].status !== "WAITING_FOR_PLAYERS") {
          log(`Game already in progress: ${gameId}`);
          send({
            error: "GAME_IN_PROGRESS",
            gameId,
          });
          break;
        }

        log(`Adding player to game with id: ${gameId}`);

        const gameReadyToStart =
          [...store.game[gameId].players, playerId].length ===
          store.game[gameId].playerCount;

        const game = {
          ...store.game[gameId],
          players: [...store.game[gameId].players, playerId],
          status: gameReadyToStart ? "GAME_IN_PROGRESS" : "WAITING_FOR_PLAYERS",
          turn: gameReadyToStart ? store.game[gameId].players[0] : undefined,
        };

        store = {
          ...store,
          game: {
            ...store.game,
            [gameId]: game,
          },
        };

        log(
          `Joined game - total active games: ${Object.keys(store.game).length}`
        );

        store.game[message.gameId].players.forEach((playerId) => {
          store.player[playerId].connection.send(
            JSON.stringify({
              type: gameReadyToStart ? "GAME_STARTED" : message.type,
              ...game,
            })
          );
        });
        break;
      }

      case "MAKE_MOVE": {
        // { type: 'MAKE_MOVE', gameId: '123', coordinateX: 0, coordinateY: 0 };
        const gameId = message.gameId;
        log(`Validating move for game: ${gameId}`);
        if (store.game[gameId].status !== "GAME_IN_PROGRESS") {
          send({ error: "GAME_INACTIVE", gameId });
        }
        if (store.game[gameId].turn !== playerId) {
          send({ error: "MOVE_OUT_OF_TURN", gameId });
        }
        if (
          store.game[gameId].positions[message.coordinateX][message.coordinateY]
        ) {
          send({ error: "INVALID_MOVE", gameId });
        }
        const positions = [...store.game[gameId]];
        positions[message.coordinateX][message.coordinateY] = playerId;
        store = {
          ...store,
          game: {
            ...store.game,
            [gameId]: {
              ...store.game[gameId],
              positions, // turn calculator
            },
          },
        };
        log(
          `Coordinate (${message.coordinateX},${message.coordinateY}) made successfully`
        );
        send({ type: message.type, ...store.game[gameId] });
        break;
      }

      default: {
        log(
          `Invalid message type '${message.type}' received, terminating user connection`
        );
        terminateConnectionProxy(playerId, ws)();
      }
    }
  });

  ws.on("close", function close() {
    log(`Connection lost updating state`);
    terminateConnectionProxy(playerId, ws)();
  });
});

const terminateConnectionProxy = (playerId, ws) => () => {
  const log = loggerGenerator(playerId);
  log(`Terminating connection for player`);
  ws.terminate();
  log(`Connection terminated`);
  // remove player from store
  // pause all games
};

const generateBoard = (boardSize) => {
  // possibly unnecessary
  const arr = [];
  for (let i = 0; i < boardSize; i++) {
    const innerArr = [];
    for (let j = 0; j < boardSize; j++) {
      innerArr.push("-");
    }
    arr.push(innerArr);
  }
  return arr;
};

const loggerGenerator = (playerId) => (message) =>
  console.log(`${new Date().toISOString()} [${playerId}]: ${message}`);

const wsSendProxy = (ws) => (message) => ws.send(JSON.stringify(message));
