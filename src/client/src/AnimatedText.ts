import { Text, Application } from "pixi.js";

export class AnimatedText {
  private text: Text;
  private app: Application;

  constructor(
    app: Application,
    x: number,
    y: number,
    content: string,
    size: number = 24,
    delay: number = 0
  ) {
    this.app = app;
    this.text = new Text({
      text: content,
      style: { fontSize: size, fill: 0xffffff },
    });

    this.text.anchor.set(0.5);
    this.text.x = x;
    this.text.y = y;
    this.text.scale.set(0);

    this.app.stage.addChild(this.text);

    if (delay > 0) {
      setTimeout(() => this.animate(), delay);
    } else {
      this.animate();
    }
  }

  private animate() {
    // Pop in
    this.app.ticker.add(this.popIn);
  }

  private popIn = (time: any) => {
    this.text.scale.x += 0.1 * time.deltaTime;
    this.text.scale.y += 0.1 * time.deltaTime;

    if (this.text.scale.x >= 1) {
      this.text.scale.set(1);
      this.app.ticker.remove(this.popIn);
      setTimeout(() => {
        this.app.ticker.add(this.popOut);
      }, 2000);
    }
  };

  private popOut = (time: any) => {
    this.text.scale.x -= 0.1 * time.deltaTime;
    this.text.scale.y -= 0.1 * time.deltaTime;

    if (this.text.scale.x <= 0) {
      this.cleanup();
    }
  };

  private cleanup() {
    this.app.ticker.remove(this.popOut);
    this.app.stage.removeChild(this.text);
    this.text.destroy();
  }
}
