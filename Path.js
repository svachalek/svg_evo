import Point from "./Point.js";
import { between } from "./math.js";
import { attempt } from "./stats.js";

const RADIAL_SORT = true;
const POINTS_MIN = 6;

export default class Path {
  constructor(points, center) {
    this.points = points != null ? points : [];
    this.center = center != null ? center : new Point();
    if (this.points.length < POINTS_MIN) {
      while (this.points.length < POINTS_MIN) {
        this.points.push(this.center.mutate());
      }
      this.sort();
    }
  }

  paint(ctx) {
    const first = this.points[0];
    ctx.moveTo(first.x, first.y);
    let i = 1;
    const len = this.points.length;
    while (i <= len) {
      const control = this.points[i++];
      const point = this.points[i++ % len];
      ctx.quadraticCurveTo(control.x, control.y, point.x, point.y);
    }
  }

  sort() {
    if (RADIAL_SORT) {
      this.points.sort((a, b) => {
        return a.angle(this.center) - b.angle(this.center);
      });
    }
  }

  mutate() {
    const roll = between(0, 9);
    const child = new Path(this.points.slice(0), this.center);
    if (roll < 7) {
      const index = between(0, child.points.length - 1);
      child.points[index] = child.points[index].mutate();
      child.sort();
      attempt("move-point");
    } else if (roll < 8 && this.points.length >= POINTS_MIN + 2) {
      const index = between(0, child.points.length / 2 - 1);
      child.points.splice(index * 2, 1);
      if (index === 0) {
        child.points.pop();
      } else {
        child.points.splice(index * 2 - 1, 1);
      }
      attempt("remove-point");
    } else if (roll < 9) {
      child.center = child.center.mutate();
      child.sort();
      attempt("move-center");
    } else {
      const p = new Point();
      child.points.push(p);
      child.points.push(p.mutate());
      child.sort();
      attempt("add-point");
    }
    return child;
  }

  svg() {
    const first = this.points[0];
    let svg = "M" + first.svg();
    let i = 1;
    const len = this.points.length;
    while (i <= len) {
      const control = this.points[i++];
      const point = this.points[i++ % len];
      svg += `Q${control.svg()} ${point.svg()}`;
    }
    return svg;
  }

  cost() {
    return this.points.length * 2;
  }
}
