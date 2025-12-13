import { Application, Assets } from "pixi.js";
import playerImgUrl from "../assets/player.png";
import { Player } from "./player";
import { handleMessage } from "./messages";

export type GameContext = {
  app: Application;
  currentPlayer: Player | null;
  players: Record<string, Player>;
  assets: any;
};

(async () => {
  // Create a new PIXI.js application
  const app = new Application();

  const context: GameContext = {
    app,
    currentPlayer: null,
    players: {},
    assets: {},
  };

  // Initialize the application
  await app.init({ background: "#1099bb", resizeTo: window });

  // Load the bunny texture
  context.assets = {
    playerTexture: await Assets.load(playerImgUrl),
  };
  console.log("Starting websocket");
  const socket = new WebSocket(`ws://${window.location.hostname}:8080`);
  // Executes when the connection is successfully established.
  socket.addEventListener("open", () => {
    console.log("WebSocket connection established!");
    // Sends a message to the WebSocket server.
    socket.send(JSON.stringify({ type: "hello" }));
  });
  // Listen for messages and executes when a message is received from the server.
  socket.addEventListener("message", (event) => {
    console.log("Message from server: ", event.data);
    try {
      const msg = JSON.parse(event.data);
      handleMessage(msg, context);
    } catch (e) {
      console.log(e);
    }
  });
  // Executes when the connection is closed, providing the close code and reason.
  socket.addEventListener("close", (event) => {
    console.log("WebSocket connection closed:", event.code, event.reason);
  });
  // Executes if an error occurs during the WebSocket communication.
  socket.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
  });

  // Append the application canvas to the document body
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  app.stage.hitArea = app.screen; // app.screen is a Rectangle object
  app.stage.interactive = true; // For older Pixi versions

  // Add a click listener (using the unified 'pointertap' event is recommended)
  app.stage.on("pointertap", (event) => {
    if (!context.currentPlayer) {
      return;
    }
    console.log("Stage clicked at:", event.global.x, event.global.y);
    socket.send(
      JSON.stringify({
        type: "move",
        id: context.currentPlayer.id,
        x: event.global.x,
        y: event.global.y,
      })
    );
  });

  // frame animation updates
  app.ticker.add((time) => {
    Object.values(context.players).forEach((player) => {
      player.sprite.x += (player.x - player.sprite.x) * 0.1 * time.deltaTime;
      player.sprite.y += (player.y - player.sprite.y) * 0.1 * time.deltaTime;
    });
  });
})();
