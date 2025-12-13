import { Application, Assets, Container, Sprite } from "pixi.js";
import playerImgUrl from "../assets/player.png";
import rockImgUrl from "../assets/fist.png";
import paperImgUrl from "../assets/palm.png";
import scissorsImgUrl from "../assets/scissors.png";
import mainFont from "../assets/ComicRelief-Regular.ttf";
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

  // Load textures and fonts etc.
  context.assets = {
    font: await Assets.load({
      src: mainFont,
      data: {
        family: "ComicRelief",
      },
    }),
    playerTexture: await Assets.load(playerImgUrl),
    rock: await Assets.load(rockImgUrl),
    paper: await Assets.load(paperImgUrl),
    scissors: await Assets.load(scissorsImgUrl),
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
  const actionUI = new Container();
  // Create rock, paper, scissors sprites in a row, centered
  const rockSprite = new Sprite(context.assets.rock);
  const paperSprite = new Sprite(context.assets.paper);
  const scissorsSprite = new Sprite(context.assets.scissors);

  const spacing = 150;
  const centerX = app.screen.width / 2;
  const centerY = app.screen.height / 2;

  rockSprite.anchor.set(0.5);
  paperSprite.anchor.set(0.5);
  scissorsSprite.anchor.set(0.5);
  rockSprite.scale.set(0.1, 0.1);
  paperSprite.scale.set(0.1, 0.1);
  scissorsSprite.scale.set(0.1, 0.1);

  actionUI.visible = false;
  actionUI.position.set(centerX, centerY);
  rockSprite.position.set(-spacing, 0);
  paperSprite.position.set(0, 0);
  scissorsSprite.position.set(+spacing, 0);

  actionUI.addChild(rockSprite, paperSprite, scissorsSprite);
  app.stage.addChild(actionUI);
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

    if (context.currentPlayer) {
      actionUI.position.set(
        context.currentPlayer?.sprite.x,
        context.currentPlayer?.sprite.y + 100
      );
    }
  });
})();
