const paintingBaseSize = 100;
const testScale = 1;
const weightMin = 0.02;
const radialSort = true;
const costScoreRatio = 1000;
const alphaMin = 30;
const alphaMax = 60;
const pointsMin = 6;
const generationKeep = 4;
const generationMutate = 16;
const generationCross = 1;
let generationNumber = 0;
let cumulativeTime = 0;
const storageKey = "paintings";
let imageSource = null;
let target = null;
let targetData = null;
let weightMap = null;
let weightAverage = null;
let showIndex = 0;
let lastShownIndex = -1;
let paintingWidth = paintingBaseSize;
let paintingHeight = paintingBaseSize;
let paintings = [];
const survivorBoxes = [];
const mutantBoxes = [];
const crossBoxes = [];
let attempts = {};
let successes = {};

function onSvgImproved() {}

function onGenerationComplete() {}

function onScalePaintings() {}

let attempted = [];

const attempt = function(type) {
  attempts[type] = (attempts[type] || 0) + 1;
  attempted.push(type);
};

const failure = function() {
  attempted = [];
};

const success = function() {
  attempted.forEach(type => {
    successes[type] = (successes[type] || 0) + 1;
  });
  attempted = [];
};

function between(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function betweenHigh(min, max) {
  return Math.floor(
    Math.sin((Math.random() * Math.PI) / 2) * (max - min + 1) + min
  );
}

function randomByte() {
  return between(0, 255);
}

function randomPainting() {
  return between(0, paintings.length - 1);
}

function randomSign() {
  if (Math.random() < 0.5) {
    return -1;
  } else {
    return 1;
  }
}

function clamp(min, n, max) {
  if (n < min) {
    return min;
  } else if (n > max) {
    return max;
  } else {
    return n;
  }
}

function plusOrMinus(min, max) {
  return randomSign() * between(max, min);
}

function setText(element, text) {
  return (element.innerText = element.textContent = text);
}

function diffPoint(d, x1, y1, x2, y2) {
  let b1 = (x1 + y1 * target.width) * 4;
  let b2 = (x2 + y2 * target.width) * 4;
  const dr = d[b1++] - d[b2++];
  const dg = d[b1++] - d[b2++];
  const db = d[b1] - d[b2];
  return Math.sqrt((dr * dr + dg * dg + db * db) / 0x30000);
}

function stringifier(key, val) {
  if (val && typeof val === "object") {
    val._ = val.constructor.name;
  }
  if (key === "canvas") {
    return undefined;
  }
  return val;
}

function reviver(key, val) {
  if (val && val._) {
    val.constructor = eval(val._);
    val.__proto__ = val.constructor.prototype;
  }
  return val;
}

class Point {
  constructor(x, y) {
    this.x = x != null ? x : between(0, paintingWidth - 1);
    this.y = y != null ? y : between(0, paintingHeight - 1);
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

class Color {
  constructor(r, g, b, a) {
    this.r = r != null ? r : randomByte();
    this.g = g != null ? g : randomByte();
    this.b = b != null ? b : randomByte();
    this.a = a != null ? a : between(alphaMin, alphaMax);
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
        child.a = clamp(alphaMin, this.a + plusOrMinus(1, 5), alphaMax);
        attempt("alpha");
    }
    child.setFillStyle();
    return child;
  }
}

class Painting {
  constructor(shapes) {
    this.shapes = shapes != null ? shapes : [new Shape()];
    this.score = 1 / 0;
  }

  paint(canvas, opaque) {
    let ctx, i$, ref$, len$, shape;
    ctx = canvas.getContext("2d");
    if (opaque) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, paintingWidth, paintingHeight);
    } else {
      ctx.clearRect(0, 0, paintingWidth, paintingHeight);
    }
    for (i$ = 0, len$ = (ref$ = this.shapes).length; i$ < len$; ++i$) {
      shape = ref$[i$];
      shape.paint(ctx);
    }
  }

  show(box) {
    const canvas = box.children[0];
    if (this.canvas !== canvas) {
      this.paint(canvas, true);
      this.diffScore(canvas);
      this.canvas = canvas;
    }
    if (this.age) {
      const label = `~${this.scoreError.toPrecision(
        5
      )} $${this.scoreCost.toFixed(2)}`;
      return setText(box.children[1], label);
    }
  }

  diffScore(canvas) {
    const ctx = canvas.getContext("2d");
    let score = 0;
    const data = ctx.getImageData(0, 0, target.width, target.height).data;
    let w = weightMap.length;
    let i = data.length;
    while (i) {
      --i;
      const db = data[--i] - targetData[i];
      const dg = data[--i] - targetData[i];
      const dr = data[--i] - targetData[i];
      score += (dr * dr + dg * dg + db * db) * weightMap[--w];
    }
    this.scoreError = score / (target.width * target.height);
    this.scoreCost =
      (this.cost() * costScoreRatio * weightAverage) /
      (target.width * target.height);
    return (this.score = this.scoreError + this.scoreCost);
  }

  paintDiffMap(canvas) {
    this.paint(canvas);
    const ctx = canvas.getContext("2d");
    const testData = ctx.getImageData(0, 0, target.width, target.height).data;
    const diffData = ctx.createImageData(target.width, target.height);
    const ddd = diffData.data;
    let i = ddd.length;
    while (i) {
      ddd[--i] = 255;
      ddd[--i] = Math.abs(testData[i] - targetData[i]);
      ddd[--i] = Math.abs(testData[i] - targetData[i]);
      ddd[--i] = Math.abs(testData[i] - targetData[i]);
    }
    return ctx.putImageData(diffData, 0, 0);
  }

  mutate() {
    const child = new Painting(this.shapes.slice(0));
    const roll = between(0, 99);
    if (roll < 1 && this.shapes.length > 1) {
      attempt("remove-shape");
      const index = betweenHigh(0, this.shapes.length - 1);
      child.shapes.splice(index, 1);
    } else if (roll < 2) {
      attempt("add-shape");
      child.shapes.push(new Shape());
    } else if (roll < 5 && this.shapes.length >= 2) {
      attempt("reorder-shapes");
      const index = betweenHigh(0, this.shapes.length - 2);
      const tmp = this.shapes[index];
      child.shapes[index] = this.shapes[index + 1];
      child.shapes[index + 1] = tmp;
    } else {
      const index = betweenHigh(0, this.shapes.length - 1);
      child.shapes[index] = this.shapes[index].mutate();
    }
    return child;
  }

  cross(other) {
    const len = Math.min(this.shapes.length, other.shapes.length);
    const i = between(1, len - 2);
    const j = between(i + 1, len - 1);
    let shapes = this.shapes
      .slice(0, i)
      .concat(other.shapes.slice(i, j))
      .concat(this.shapes.slice(j));
    attempt("crossover");
    return new Painting(shapes);
  }

  svg() {
    const w = paintingWidth;
    const h = paintingHeight;
    return `
      <svg xmlns='http://www.w3.org/2000/svg' 
          width='${w * 10}px' height='${h * 10}px' 
          viewBox='0 0 ${w} ${paintingHeight}'>
        <title>Generated by SVG Evo at http://svachalek.github.com/svg_evo</title>
        <desc>Original image: ${storageKey}</desc>
        <defs>
          <clipPath id='clip'>
            <path d='M-1,-1L${w + 1},-1L${w + 1},${h + 1}L-1,${h + 1}Z'/>
          </clipPath>
        </defs>
        <g clip-path='url(#clip)'>
           ${this.shapes.map(shape => shape.svg()).join("")}
        </g>
      </svg>`;
  }

  cost() {
    return this.shapes
      .map(shape => shape.cost())
      .reduce((sum, cost) => sum + cost, 0);
  }
}

class Shape {
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

class Path {
  constructor(points, center) {
    this.points = points != null ? points : [];
    this.center = center != null ? center : new Point();
    if (this.points.length < pointsMin) {
      while (this.points.length < pointsMin) {
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
    if (radialSort) {
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
    } else if (roll < 8 && this.points.length >= pointsMin + 2) {
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

function mutate() {
  const mutationRate = Math.max(
    1,
    5 - Math.floor(Math.log(generationNumber) / Math.LN10)
  );
  for (let i = 0; i < generationMutate; ++i) {
    const n = i % paintings.length;
    const parent = paintings[n];
    let child = parent;
    let j = mutationRate;
    while (j--) {
      child = child.mutate();
    }
    child.show(mutantBoxes[i]);
    if (child.score < parent.score) {
      paintings[n] = child;
      success();
    } else {
      failure();
    }
  }
}

function crossover() {
  for (let i = 0; i < generationCross; i++) {
    const m = randomPainting();
    let d = randomPainting();
    while (m === d) {
      d = randomPainting();
    }
    const mom = paintings[m];
    const dad = paintings[d];
    const child = mom.cross(dad);
    child.show(crossBoxes[i]);
    if (child.score < mom.score && child.score < dad.score) {
      paintings[mom.score < dad.score ? d : m] = child;
      success();
    } else {
      failure();
    }
  }
}

function breed() {
  const startTime = Date.now();
  ++generationNumber;
  const previousPaintings = paintings.slice(0);
  mutate();
  crossover();
  if (
    showIndex !== lastShownIndex ||
    paintings[showIndex] !== previousPaintings[showIndex]
  ) {
    lastShownIndex = showIndex;
    onSvgImproved();
  }
  onGenerationComplete();
  if (generationNumber % 100 === 0) {
    sessionStorage.setItem(storageKey, JSON.stringify(paintings, stringifier));
  }
  cumulativeTime = cumulativeTime + Date.now() - startTime;
  setTimeout(breed, 0);
}

function generateWeightMap() {
  const edgeMap = generateEdgeMap();
  const histoMap = generateHistoMap();
  let i = edgeMap.length;
  weightMap = new Array(i);
  let weightTotal = 0;
  while (i--) {
    weightTotal += weightMap[i] = clamp(weightMin, edgeMap[i] + histoMap[i], 1);
  }
  weightAverage = weightTotal / weightMap.length;
}

function generateEdgeMap() {
  const edgeMap = new Array(target.height * target.width);
  let i = edgeMap.length;
  let y = target.height;
  while (y--) {
    let x = target.width;
    while (x--) {
      const u = Math.max(y - 1, 0);
      const l = Math.max(x - 1, 0);
      const r = Math.min(x + 1, target.width - 1);
      const d = Math.min(y + 1, target.height - 1);
      const edge =
        diffPoint(targetData, x, y, l, u) +
        diffPoint(targetData, x, y, x, u) +
        diffPoint(targetData, x, y, r, u) +
        diffPoint(targetData, x, y, l, y) +
        diffPoint(targetData, x, y, r, y) +
        diffPoint(targetData, x, y, l, d) +
        diffPoint(targetData, x, y, x, d) +
        diffPoint(targetData, x, y, r, d);
      edgeMap[--i] = clamp(0, edge / 4, 1);
    }
  }
  return edgeMap;
}

function generateHistoMap() {
  const histogram = [];
  let i = targetData.length;
  let max = 0;
  while (i) {
    --i; // ignore alpha
    const b = targetData[--i];
    const g = targetData[--i];
    const r = targetData[--i];
    const color = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    histogram[color] = (histogram[color] || 0) + 1;
    if (histogram[color] > max) {
      max = histogram[color];
    }
  }
  const histoMap = new Array(targetData.length / 4);
  i = targetData.length;
  while (i) {
    --i; // ignore alpha
    const b = targetData[--i];
    const g = targetData[--i];
    const r = targetData[--i];
    const color = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const rarity =
      (histogram[color] / (target.width * target.height)) * histogram.length;
    histoMap[i / 4] = clamp(0, 1 - rarity, 1);
  }
  return histoMap;
}

function resetStats() {
  cumulativeTime = 0;
  generationNumber = 0;
  attempts = {};
  successes = {};
}

function restart() {
  resetStats();
  for (let i = 0; i < generationKeep; ++i) {
    paintings.push(new Painting());
  }
}

function createBox(cls, text) {
  const canvas = document.createElement("canvas");
  const box = document.createElement("div");
  const label = document.createElement("p");
  box.className = "box " + cls;
  box.appendChild(canvas);
  box.appendChild(label);
  setText(label, text);
  return box;
}

function scaleBox(box) {
  const canvas = box.children[0];
  canvas.width = target.width;
  canvas.height = target.height;
  return canvas
    .getContext("2d")
    .setTransform(
      canvas.width / paintingWidth,
      0,
      0,
      canvas.height / paintingHeight,
      0,
      0
    );
}

function scalePaintings() {
  let i$, ref$, len$, box;
  if (imageSource.width > imageSource.height) {
    paintingWidth = Math.floor(
      (imageSource.width / imageSource.height) * paintingBaseSize
    );
    paintingHeight = paintingBaseSize;
  } else {
    paintingHeight = Math.floor(
      (imageSource.height / imageSource.width) * paintingBaseSize
    );
    paintingWidth = paintingBaseSize;
  }
  target.width = paintingWidth * testScale;
  target.height = paintingHeight * testScale;
  const ctx = target.getContext("2d");
  ctx.drawImage(imageSource, 0, 0, target.width, target.height);
  targetData = ctx.getImageData(0, 0, target.width, target.height).data;
  generateWeightMap();
  for (
    i$ = 0,
      len$ = (ref$ = survivorBoxes.concat(mutantBoxes).concat(crossBoxes))
        .length;
    i$ < len$;
    ++i$
  ) {
    box = ref$[i$];
    scaleBox(box);
  }
  return onScalePaintings();
}

window.addEventListener("load", () => {
  let boxesElement, i, i$, ref$, len$, n, box;
  boxesElement = document.getElementById("boxes");
  target = document.getElementById("target");
  for (let i = 0; i < generationKeep; ++i) {
    box = createBox("survivor", "Survivor");
    boxesElement.appendChild(box);
    survivorBoxes.push(box);
    box.dataIndex = i;
    box.addEventListener("click", () => {
      showIndex = this.dataIndex;
    });
  }
  for (let i = 0; i < generationMutate; ++i) {
    box = createBox("mutant", "Mutation");
    boxesElement.appendChild(box);
    mutantBoxes.push(box);
  }
  for (let i = 0; i < generationCross; ++i) {
    box = createBox("crossover", "Crossover");
    boxesElement.appendChild(box);
    crossBoxes.push(box);
  }
  imageSource = new Image();
  imageSource.addEventListener("load", () => {
    scalePaintings();
    if (window.__proto__ && sessionStorage.getItem(storageKey)) {
      paintings = JSON.parse(sessionStorage.getItem(storageKey), reviver)
        .concat(paintings)
        .slice(0, generationKeep);
      resetStats();
    } else {
      restart();
    }
    setTimeout(breed, 0);
  });
});
