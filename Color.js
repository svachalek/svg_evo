import { between, clamp, plusOrMinus, randomByte } from "./math.js";
import { attempt } from "./stats.js";

const ALPHA_MIN = 30;
const ALPHA_MAX = 60;

export default class Color {
  constructor(r, g, b, a) {
    this.r = r != null ? r : randomByte();
    this.g = g != null ? g : randomByte();
    this.b = b != null ? b : randomByte();
    this.a = a != null ? a : between(ALPHA_MIN, ALPHA_MAX);
    this.setFillStyle();
  }

  setFillStyle() {
    return (this.fillStyle = `rgba(${this.r},${this.g},${this.b},${this.a /
      100})`);
  }

  mutate() {
    const child = new Color(this.r, this.g, this.b, this.a);
    switch (between(1, 4)) {
      case 1:
        child.r = clamp(0, this.r + plusOrMinus(1, 16), 255);
        attempt("rgb");
        break;
      case 2:
        child.g = clamp(0, this.g + plusOrMinus(1, 16), 255);
        attempt("rgb");
        break;
      case 3:
        child.b = clamp(0, this.b + plusOrMinus(1, 16), 255);
        attempt("rgb");
        break;
      case 4:
        child.a = clamp(ALPHA_MIN, this.a + plusOrMinus(1, 5), ALPHA_MAX);
        attempt("alpha");
    }
    child.setFillStyle();
    return child;
  }
}
