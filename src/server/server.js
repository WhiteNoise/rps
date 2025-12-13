import express from "express";
import path from "path";
import WebSocket, { WebSocketServer } from "ws";
import websocketSettings from "./websocket.settings.js";

const app = express();
const PORT = 8079;

// For hosting the static content:
app.use(express.static("src/client/dist"));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Web socket server

const players = {};
let currentPlayerId = 0;

const wss = new WebSocketServer(websocketSettings);
const broadcastAll = (msg) => {
  wss.clients.forEach(function each(ws) {
    ws.send(JSON.stringify(msg));
  });
};
const createNewPlayer = () => {
  currentPlayerId += 1;
  return {
    id: currentPlayerId,
    name: "Joe",
    x: Math.random() * 100,
    y: Math.random() * 100,
    state: "idle",
    chosenMove: "none",
    battlingPlayerId: null,
    battleScore: 0,
    totalWins: 0,
  };
};

const playerDisconnected = (id) => {
  console.log("Player disconnected " + id);
  broadcastAll({
    type: "left",
    id,
  });
};

function heartbeat() {
  this.isAlive = true;
}

wss.on("connection", function connection(ws) {
  const thisPlayer = createNewPlayer();
  players[thisPlayer.id] = thisPlayer;
  ws.playerId = thisPlayer.id;

  ws.isAlive = true;
  console.log("Player connected " + thisPlayer.id);

  broadcastAll({
    type: "joined",
    player: thisPlayer,
  });

  ws.on("error", console.error);

  ws.on("message", function message(data) {
    try {
      const msg = JSON.parse(data);
      if (msg.type == "move") {
        if (typeof players[msg.id] !== "undefined") {
          players[msg.id].x = msg.x;
          players[msg.id].y = msg.y;

          broadcastAll(msg);
        }
      }
    } catch (e) {
      console.log(e);
    }
  });
  ws.on("pong", heartbeat);
  ws.on("close", function close() {
    playerDisconnected(thisPlayer.id);
  });

  Object.keys(players).forEach((key) => {
    ws.send(
      JSON.stringify({
        type: "joined",
        player: players[key],
      })
    );
  });

  ws.send(
    JSON.stringify({
      type: "setplayer",
      id: thisPlayer.id,
    })
  );
});

const interval = setInterval(function ping() {
  //   console.log("polling..");
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      playerDisconnected(ws.playerId);
      return ws.terminate();
    }

    ws.isAlive = false;

    ws.ping();
  });
}, 5000);

wss.on("close", function close() {
  clearInterval(interval);
});
