import { Application, Assets, Spritesheet, Text } from "pixi.js";
import charactersImgUrl from "../assets/people.png";
import charactersJson from "../assets/people.json";

import mainFont from "../assets/ComicRelief-Regular.ttf";
import { AttackMove, Player } from "./player";
import { handleMessage } from "./messages";

export type GameContext = {
  app: Application;
  currentPlayer: Player | null;
  players: Record<number, Player>;
  assets: any;
};

export const actionButtons = [
  document.getElementById("rockBtn"),
  document.getElementById("paperBtn"),
  document.getElementById("scissorsBtn"),
];

export const RPSEmojis = {
  rock: "✊ Rock",
  paper: "🖐 Paper",
  scissors: "✌️ Scissors",
  none: "",
};

export const moveToBtn: Record<AttackMove, HTMLElement | null> = {
  rock: document.getElementById("rockBtn"),
  paper: document.getElementById("paperBtn"),
  scissors: document.getElementById("scissorsBtn"),
  none: null,
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
  await app.init({ background: "#1099bb", width: 1280, height: 720 });
  const charactersTexture = await Assets.load(charactersImgUrl);
  console.log({ charactersJson });
  const characterSheet = new Spritesheet(charactersTexture, charactersJson);
  await characterSheet.parse();

  // Load textures and fonts etc.
  context.assets = {
    font: await Assets.load({
      src: mainFont,
      data: {
        family: "ComicRelief",
      },
    }),
    characterSheet,
  };

  const chooseMove = (move: AttackMove) => {
    if (!context.currentPlayer) return;

    context.currentPlayer.chosenMove = move;
    socket.send(
      JSON.stringify({
        type: "choosemove",
        playerId: context.currentPlayer.id,
        move: move,
      })
    );

    actionButtons.forEach((btn) => {
      btn!.style.border = "none";
    });

    if (move != "none") {
      moveToBtn[move]!.style.border = "3px solid red";
    }
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

  // Create appearance grid slots
  const appearanceGrid = document.getElementById("appearanceGrid")!;
  let selectedAppearance = 0;
  for (let i = 0; i < 24; i++) {
    const slot = document.createElement("div");
    const imgName = `tile${String(i).padStart(3, "0")}.png`;
    slot.className = "appearance-slot";
    slot.style.backgroundImage = `url(/assets/people/${imgName})`;
    slot.dataset.index = i.toString();
    slot.addEventListener("click", () => {
      // Remove selection from all slots
      appearanceGrid
        .querySelectorAll(".appearance-slot")
        .forEach((s) => s.classList.remove("selected"));
      // Select this slot
      slot.classList.add("selected");
      selectedAppearance = i;
    });
    if (i === 0) slot.classList.add("selected"); // Default selection
    appearanceGrid.appendChild(slot);
  }

  // Setup dialog OK button
  document.getElementById("setupOkBtn")!.addEventListener("click", () => {
    const name =
      (document.getElementById("nameInput") as HTMLInputElement).value ||
      "Player";
    selectedAppearance = parseInt(
      document
        .querySelector(".appearance-slot.selected")
        ?.getAttribute("data-index") || "0"
    );

    // Save to localStorage
    localStorage.setItem("playerName", name);
    localStorage.setItem("playerAppearance", selectedAppearance.toString());

    socket.send(
      JSON.stringify({
        type: "setpreferences",
        playerId: context.currentPlayer?.id,
        name,
        appearance: selectedAppearance,
      })
    );
    document.getElementById("setupDialog")!.style.display = "none";
  });

  // Add action UI event listeners
  document.getElementById("rockBtn")!.addEventListener("click", () => {
    chooseMove("rock");
  });

  document.getElementById("paperBtn")!.addEventListener("click", () => {
    chooseMove("paper");
  });

  document.getElementById("scissorsBtn")!.addEventListener("click", () => {
    chooseMove("scissors");
  });

  app.stage.hitArea = app.screen; // app.screen is a Rectangle object
  app.stage.interactive = true; // For older Pixi versions

  const statusDisplay = new Text();
  app.stage.addChild(statusDisplay);

  // Add a click listener (using the unified 'pointertap' event is recommended)
  app.stage.on("pointertap", (event) => {
    if (!context.currentPlayer) {
      return;
    }

    // Check if clicking on another player for challenge
    const clickedPlayer = Object.values(context.players).find((player) => {
      const dx = player.container.x - event.global.x;
      const dy = player.container.y - event.global.y;
      return Math.sqrt(dx * dx + dy * dy) < 30; // 30px radius
    });

    if (
      clickedPlayer &&
      clickedPlayer.id !== context.currentPlayer.id &&
      context.currentPlayer.state === "idle" &&
      clickedPlayer.state === "idle"
    ) {
      // Challenge another player
      socket.send(
        JSON.stringify({
          type: "challenge",
          challengerId: context.currentPlayer.id,
          challengedId: clickedPlayer.id,
        })
      );
    } else if (context.currentPlayer.state !== "battling") {
      // Move player
      console.log("Stage clicked at:", event.global.x, event.global.y);
      socket.send(
        JSON.stringify({
          type: "move",
          id: context.currentPlayer.id,
          x: event.global.x,
          y: event.global.y,
        })
      );
    }
  });

  // frame animation updates
  app.ticker.add((time) => {
    Object.values(context.players).forEach((player) => {
      player.container.x +=
        (player.x - player.container.x) * 0.1 * time.deltaTime;
      player.container.y +=
        (player.y - player.container.y) * 0.1 * time.deltaTime;

      if (player.state === "dead") {
        player.container.alpha = 0.5;
      }
    });

    //     if (context.currentPlayer) {
    //       statusDisplay.text = `ID: ${context.currentPlayer.id}
    // State: ${context.currentPlayer.state}
    // Wins: ${context.currentPlayer.totalWins}
    // ChosenMove: ${context.currentPlayer.chosenMove}
    // BattleScore ${context.currentPlayer.battleScore}
    // `;
    //     }
    if (context.currentPlayer) {
      statusDisplay.text = `Name: ${context.currentPlayer.name}
Wins: ${context.currentPlayer.totalWins}`;
    }
  });

  // Chat functionality
  const sendChat = () => {
    const chatInput = document.getElementById("chatInput") as HTMLInputElement;
    const message = chatInput.value.trim();
    if (message && context.currentPlayer) {
      socket.send(
        JSON.stringify({
          type: "chat",
          playerId: context.currentPlayer.id,
          message,
        })
      );
      chatInput.value = "";
    }
  };

  document.getElementById("chatSend")!.addEventListener("click", sendChat);
  document.getElementById("chatInput")!.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendChat();
  });
})();
