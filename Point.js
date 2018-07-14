import { between } from "./math.js";
import Painting from "./Painting.js";

export default class Point {
  constructor(x, y) {
    this.x = x != null ? x : between(0, Painting.width - 1);
    this.y = y != null ? y : between(0, Painting.height - 1);
  }

  mutate() {
    const dx = between(-2, +2);
    const dy = between(-2, +2);
    return new Point(this.x + dx, this.y + dy);
  }

  angle(p) {
    return (
      (Math.atan2(this.y - p.y, this.x - p.x) + 2 * Math.PI) % (2 * Math.PI)
    );
  }

  svg() {
    return this.x + "," + this.y;
  }
}
