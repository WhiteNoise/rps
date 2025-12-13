import { GameContext } from "./main";
import { createPlayer, PlayerData } from "./player";

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

export type Message =
  | SetPlayerMessage
  | JoinedMessage
  | MoveMessage
  | LeftMessage;

export function handleMessage(msg: Message, context: GameContext) {
  const { players, app } = context;

  if (!app) return;

  if (msg.type == "setplayer") {
    context.currentPlayer = players[msg.id];
    if (context.currentPlayer == null) {
      console.log("Error, player not joined");
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

  if (msg.type == "move" && typeof players[msg.id] !== "undefined") {
    players[msg.id].x = msg.x;
    players[msg.id].y = msg.y;
  }

  if (msg.type == "left") {
    app.stage.removeChild(players[msg.id].sprite);
    delete players[msg.id];
  }
}
