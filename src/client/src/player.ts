import { Sprite, Container, Text } from "pixi.js";
import { GameContext } from "./main";

export type AttackMove = "none" | "rock" | "paper" | "scissors";
export interface PlayerData {
  id: number;
  name: string;
  appearance: number;
  x: number;
  y: number;
  state: "idle" | "battling" | "dead";
  killerId: number | null;
  chosenMove: AttackMove;
  battlingPlayerId: number;
  battleScore: number;
  totalWins: number;
}

export interface Player extends PlayerData {
  sprite: Sprite;
  container: Container; // holds the sprite and name label. Use this for positioning the player
  nameLabel: Text;
}

export const createPlayer = (data: PlayerData, context: GameContext) => {
  const { assets, app } = context;

  const playerContainer = new Container();
  const frames = Object.keys(assets.characterSheet.textures);
  const sprite = new Sprite(
    assets.characterSheet.textures[frames[data.appearance]]
  );
  const nameLabel = new Text({ text: data.name });
  console.log("Creating player " + data.id);
  const obj = {
    ...data,
    container: playerContainer,
    sprite,
    nameLabel,
  };
  sprite.anchor._x = 0.5;
  sprite.anchor._y = 0.5;
  sprite.scale.set(0.5, 0.5);
  nameLabel.anchor._x = 0.5;
  nameLabel.anchor._y = 0.5;
  nameLabel.y = 25;
  nameLabel.style.fontSize = 12;
  playerContainer.addChild(sprite);
  playerContainer.addChild(nameLabel);
  playerContainer.x = data.x;
  playerContainer.y = data.y;
  app.stage.addChild(playerContainer);

  return obj as Player;
};
