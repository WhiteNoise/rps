import express from "express";
import { WebSocketServer } from "ws";
import websocketSettings from "./websocket.settings.js";

const app = express();
const PORT = 8080;

const players = {};
let currentPlayerId = 0;

// For hosting the static content:
app.use(express.static("src/client/dist"));
app.use(express.json({ extended: false}));
// app.listen(PORT, () => {
//   console.log(`Server running at http://localhost:${PORT}`);
// });

// Web socket server
const wss = new WebSocketServer({...websocketSettings, server: app.listen(PORT) });
const broadcastAll = (msg) => {
  wss.clients.forEach(function each(ws) {
    ws.send(JSON.stringify(msg));
  });
};
const createNewPlayer = () => {
  currentPlayerId += 1;
  return {
    id: currentPlayerId,
    name: "Player",
    appearance: 0,
    x: Math.random() * 500,
    y: Math.random() * 500,
    state: "idle",
    chosenMove: "none",
    battlingPlayerId: null,
    killerId: null,
    battleScore: 0,
    totalWins: 0,
  };
};

const playerDisconnected = (id) => {
  console.log("Player disconnected " + id);
  
  const disconnectedPlayer = players[id];
  if (disconnectedPlayer && disconnectedPlayer.state === "battling" && disconnectedPlayer.battlingPlayerId) {
    const opponent = players[disconnectedPlayer.battlingPlayerId];
    if (opponent) {
      opponent.state = "idle";
      opponent.battlingPlayerId = null;
      playerStateChanged(opponent.id);
    }
  }
  
  delete players[id];
  broadcastAll({
    type: "left",
    id,
  });
};

const playerStateChanged = (id) => {
  if (!players[id]) return;

  broadcastAll({
    type: "changed",
    player: players[id],
  });
};

const determineWinner = (move1, move2) => {
  if (move1 === move2) return 0; // tie
  if (
    (move1 === "rock" && move2 === "scissors") ||
    (move1 === "paper" && move2 === "rock") ||
    (move1 === "scissors" && move2 === "paper")
  ) {
    return 1; // player 1 wins
  }
  return 2; // player 2 wins
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
        if (
          typeof players[msg.id] !== "undefined" &&
          players[msg.id].state != "battling"
        ) {
          players[msg.id].x = msg.x;
          players[msg.id].y = msg.y;
          broadcastAll(msg);
        }
      }

      if (msg.type == "challenge") {
        const challenger = players[msg.challengerId];
        const challenged = players[msg.challengedId];

        if (
          challenger &&
          challenged &&
          challenger.state === "idle" &&
          challenged.state === "idle"
        ) {
          // Set both players to battling state
          challenger.state = "battling";
          challenged.state = "battling";
          challenger.battlingPlayerId = challenged.id;
          challenged.battlingPlayerId = challenger.id;
          challenger.battleScore = 0;
          challenged.battleScore = 0;
          challenger.chosenMove = "none";
          challenged.chosenMove = "none";

          // Move challenger 50 pixels below challenged player
          challenger.x = challenged.x;
          challenger.y = challenged.y + 75;

          playerStateChanged(challenger.id);
          playerStateChanged(challenged.id);

          setTimeout(() => {
            // Broadcast battle started message
            broadcastAll({
              type: "battlestarted",
              player1Id: challenger.id,
              player2Id: challenged.id,
            });
          }, 1000);
        }
      }

      if (msg.type == "choosemove") {
        const player = players[msg.playerId];
        if (player && player.state === "battling") {
          player.chosenMove = msg.move;

          const opponent = players[player.battlingPlayerId];
          if (opponent && opponent.chosenMove !== "none") {
            // Both players have chosen, resolve battle
            const winner = determineWinner(
              player.chosenMove,
              opponent.chosenMove
            );
            let winnerId = null;

            if (winner === 1) {
              player.battleScore++;
              winnerId = player.id;
            } else if (winner === 2) {
              opponent.battleScore++;
              winnerId = opponent.id;
            }

            const matchOver =
              player.battleScore >= 2 || opponent.battleScore >= 2;

            broadcastAll({
              type: "battleresult",
              player1Id: player.id,
              player2Id: opponent.id,
              player1Move: player.chosenMove,
              player2Move: opponent.chosenMove,
              winnerId,
              matchOver,
            });

            if (matchOver) {
              // End match
              if (player.battleScore >= 2) {
                player.state = "idle";
                player.totalWins++;
                opponent.state = "dead";
                opponent.killerId = player.id;
              } else {
                opponent.state = "idle";
                opponent.totalWins++;
                player.state = "dead";
                player.killerId = opponent.id;
              }

              player.battlingPlayerId = null;
              opponent.battlingPlayerId = null;
              playerStateChanged(player.id);
              playerStateChanged(opponent.id);
            } else {
              // Reset for next round
              player.chosenMove = "none";
              opponent.chosenMove = "none";
              playerStateChanged(player.id);
              playerStateChanged(opponent.id);
            }
          }
        }
      }

      if (msg.type == "setpreferences") {
        const player = players[msg.playerId];
        if (player) {
          player.name = msg.name;
          player.appearance = msg.appearance;
          playerStateChanged(player.id);
        }
      }

      if (msg.type == "chat") {
        const player = players[msg.playerId];
        if (player) {
          broadcastAll({
            type: "chat",
            playerId: msg.playerId,
            message: msg.message
          });
        }
      }
    } catch (e) {
      console.log(e);
    }
  });
  ws.on("pong", heartbeat);
  ws.on("close", function close() {
    playerDisconnected(thisPlayer.id);
    delete players[thisPlayer.id];
  });

  // send all player info to the new player
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

app.get("/reset", () => {
  Object.values(players).forEach((player) => {
    player.state = "idle";
    player.chosenMove = "none";
    player.battlingPlayerId = null;
    player.battleScore = 0;
    player.totalWins = 0;
    player.killerId = null;

    playerStateChanged(player.id);
  });
});
