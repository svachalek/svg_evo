import Path from "./Path.js";
import Color from "./Color.js";
import { between } from "./math.js";

export default class Shape {
  constructor(color, path) {
    this.color = color != null ? color : new Color();
    this.path = path != null ? path : new Path();
  }

  paint(ctx) {
    ctx.fillStyle = this.color.fillStyle;
    ctx.beginPath();
    this.path.paint(ctx);
    ctx.fill();
  }
  mutate() {
    const roll = between(0, 5);
    const child = new Shape(this.color, this.path);
    if (roll > 0) {
      child.path = this.path.mutate();
    } else {
      child.color = this.color.mutate();
    }
    return child;
  }
  svg() {
    return (
      "<path fill='" + this.color.fillStyle + "' d='" + this.path.svg() + "'/>"
    );
  }
  cost() {
    return this.path.cost() + 4;
  }
}
