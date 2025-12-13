import { Sprite } from "pixi.js";
import { GameContext } from "./main";

export interface PlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  state: "waiting" | "battling" | "dead";
  chosenMove: "rock" | "paper" | "scissors";
}

export interface Player extends PlayerData {
  sprite: Sprite;
}

export const createPlayer = (data: PlayerData, context: GameContext) => {
  const { assets, app } = context;

  console.log("Creating player " + data.id);
  const obj = {
    ...data,
    sprite: new Sprite(assets.playerTexture),
  };
  (obj.sprite as Sprite).anchor._x = 0.5;
  (obj.sprite as Sprite).anchor._y = 0.5;
  app.stage.addChild(obj.sprite);
  obj.sprite.x = data.x;
  obj.sprite.y = data.y;
  return obj as Player;
};
