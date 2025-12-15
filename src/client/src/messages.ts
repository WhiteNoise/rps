import { AnimatedText } from "./AnimatedText";
import { actionButtons, GameContext, RPSEmojis } from "./main";
import { AttackMove, createPlayer, PlayerData } from "./player";

const updateBattleScore = (context: GameContext) => {
  const scoreElement = document.getElementById("battleScore");
  if (
    scoreElement &&
    context.currentPlayer &&
    context.currentPlayer.state === "battling"
  ) {
    const opponent = context.players[context.currentPlayer.battlingPlayerId];
    if (opponent) {
      scoreElement.textContent = `Score: ${context.currentPlayer.battleScore} - ${opponent.battleScore}`;
    }
  }
};

export interface MessageBase {
  type: string;
}

export interface SetPlayerMessage extends MessageBase {
  type: "setplayer";
  id: number;
}

export interface JoinedMessage extends MessageBase {
  type: "joined";
  player: PlayerData;
}

export interface ChangedMessage extends MessageBase {
  type: "changed";
  player: PlayerData;
}

export interface MoveMessage extends MessageBase {
  type: "move";
  id: number;
  x: number;
  y: number;
}

export interface LeftMessage extends MessageBase {
  type: "left";
  id: number;
}

export interface ChallengeMessage extends MessageBase {
  type: "challenge";
  challengerId: number;
  challengedId: number;
}

export interface ChooseMoveMessage extends MessageBase {
  type: "choosemove";
  playerId: number;
  move: "rock" | "paper" | "scissors";
}

export interface BattleResultMessage extends MessageBase {
  type: "battleresult";
  player1Id: number;
  player2Id: number;
  player1Move: string;
  player2Move: string;
  winnerId: number | null;
  matchOver: boolean;
}

export interface SetPreferencesMessage extends MessageBase {
  type: "setpreferences";
  playerId: number;
  name: string;
  appearance: number;
}

export interface BattleStartedMessage extends MessageBase {
  type: "battlestarted";
  player1Id: number;
  player2Id: number;
}

export interface ChatMessage extends MessageBase {
  type: "chat";
  playerId: number;
  message: string;
}

export type Message =
  | SetPlayerMessage
  | JoinedMessage
  | MoveMessage
  | ChangedMessage
  | LeftMessage
  | ChallengeMessage
  | ChooseMoveMessage
  | BattleResultMessage
  | SetPreferencesMessage
  | BattleStartedMessage
  | ChatMessage;

export function handleMessage(msg: Message, context: GameContext) {
  const { players, app } = context;

  if (!app) return;

  try {
    if (msg.type == "setplayer") {
      context.currentPlayer = players[msg.id];
      if (context.currentPlayer == null) {
        console.log("Error, player not joined");
      } else {
        // Show setup dialog with saved settings
        const savedName = localStorage.getItem("playerName") || "";
        const savedAppearance = parseInt(
          localStorage.getItem("playerAppearance") || "0"
        );

        const nameInput = document.getElementById(
          "nameInput"
        ) as HTMLInputElement;
        nameInput.value = savedName;

        // Set appearance selection
        const appearanceGrid = document.getElementById("appearanceGrid")!;
        appearanceGrid
          .querySelectorAll(".appearance-slot")
          .forEach((slot, index) => {
            if (index === savedAppearance) {
              slot.classList.add("selected");
            } else {
              slot.classList.remove("selected");
            }
          });

        document.getElementById("setupDialog")!.style.display = "block";
      }
    }
    if (msg.type == "joined") {
      if (!players[msg.player.id]) {
        players[msg.player.id] = createPlayer(msg.player, context);
      } else {
        const player = players[msg.player.id];
        player.x = msg.player.x;
        player.y = msg.player.y;
      }
    }
    if (msg.type == "changed") {
      if (!players[msg.player.id]) {
        console.error("player not found " + msg.player.id);
      } else {
        const id = msg.player.id;
        // players[msg.player.id]
        Object.keys(msg.player).forEach((key) => {
          // @ts-ignore
          players[id][key as keyof PlayerData] =
            msg.player[key as keyof PlayerData];
        });
        players[id].nameLabel.text = msg.player.name;
        const appearanceFrame = `tile${String(msg.player.appearance).padStart(3, "0")}`;
        players[id].sprite.texture =
          context.assets.characterSheet.textures[appearanceFrame];
        // Show action UI if current player enters battling state
        if (
          context.currentPlayer &&
          id === context.currentPlayer.id &&
          msg.player.state === "battling"
        ) {
          const actionUI = document.getElementById("actionUI");
          if (actionUI) actionUI.style.display = "block";
          updateBattleScore(context);
        }
      }
    }
    if (msg.type == "move" && typeof players[msg.id] !== "undefined") {
      players[msg.id].x = msg.x;
      players[msg.id].y = msg.y;
    }

    if (msg.type == "left") {
      app.stage.removeChild(players[msg.id].container);
      delete players[msg.id];
    }

    if (msg.type == "battleresult") {
      actionButtons.forEach((btn) => {
        btn!.style.border = "none";
      });

      new AnimatedText(
        app,
        players[msg.player1Id].x,
        players[msg.player1Id].y,
        RPSEmojis[msg.player1Move as AttackMove],
        32
      );

      new AnimatedText(
        app,
        players[msg.player2Id].x,
        players[msg.player2Id].y,
        RPSEmojis[msg.player2Move as AttackMove],
        32
      );

      console.log(
        `Battle result: Player ${msg.player1Id} chose ${msg.player1Move}, Player ${msg.player2Id} chose ${msg.player2Move}`
      );

      // if this is a match the current player is playing..
      if (
        context.currentPlayer &&
        (context.currentPlayer.id == msg.player1Id ||
          context.currentPlayer.id == msg.player2Id)
      ) {
        const resultStr =
          msg.winnerId == context.currentPlayer.id
            ? "You win!"
            : !msg.winnerId
              ? "Tie!"
              : "You lost!";

        new AnimatedText(
          app,
          context.currentPlayer.x,
          context.currentPlayer.y - 25,
          resultStr,
          32,
          1000
        );

        setTimeout(() => {
          updateBattleScore(context);
        }, 1000);

        // new AnimatedText(
        //   app,
        //   context.currentPlayer.x,
        //   context.currentPlayer.y - 25,
        //   `${players[msg.player1Id].name}: ${players[msg.player1Id].battleScore}\n${players[msg.player2Id].name}: ${players[msg.player2Id].battleScore}`,
        //   16,
        //   3000
        // );
      } else {
        // general message
        if (msg.winnerId) {
          new AnimatedText(
            app,
            players[msg.winnerId].x,
            players[msg.winnerId].y - 25,
            `${players[msg.winnerId]} won!`,
            32,
            1000
          );
        }
      }

      if (msg.matchOver) {
        console.log("Match is over!");
        // Hide action UI if current player was in this battle
        if (
          context.currentPlayer &&
          (context.currentPlayer.id === msg.player1Id ||
            context.currentPlayer.id === msg.player2Id)
        ) {
          const actionUI = document.getElementById("actionUI");
          if (actionUI) actionUI.style.display = "none";
        }
      }
    }

    if (msg.type == "battlestarted") {
      const player1 = players[msg.player1Id];
      const player2 = players[msg.player2Id];

      if (player1 && player2) {
        const midX = (player1.x + player2.x) / 2;
        const midY = (player1.y + player2.y) / 2;

        new AnimatedText(
          app,
          midX,
          midY,
          `${player1.name} challenged ${player2.name}`,
          20
        );
      }
    }

    if (msg.type == "chat") {
      const player = players[msg.playerId];
      if (player) {
        new AnimatedText(app, player.x, player.y - 40, msg.message, 16);
      }
    }
  } catch (e) {
    console.error(e);
  }
}
