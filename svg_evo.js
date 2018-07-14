import { encode } from "./base64.js";
import Path from "./Path.js";
import Point from "./Point.js";
import Painting, { paintingBaseSize } from "./Painting.js";
import Shape from "./Shape.js";
import Color from "./Color.js";
import { between } from "./math.js";
import {
  failure,
  success,
  attempts,
  successes,
  resetStats,
  generationNumber,
  cumulativeTime,
  newGeneration,
  incrementTime
} from "./stats.js";
import { generateWeightMap, paintWeightMap } from "./weightMap.js";

const testScale = 1;
const generationKeep = 4;
const generationMutate = 16;
const generationCross = 1;
const storageKey = "paintings";
let imageSource = null;
let target = null;
let targetData = null;
let showIndex = 0;
let lastShownIndex = -1;
let paintings = [];
const survivorBoxes = [];
const mutantBoxes = [];
const crossBoxes = [];

function randomPainting() {
  return between(0, paintings.length - 1);
}

function setText(element, text) {
  element.innerText = element.textContent = text;
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
  const constructors = {
    Point,
    Path,
    Color,
    Shape,
    Painting
  };
  if (val && val._) {
    val.constructor = constructors[val._];
    val.__proto__ = val.constructor.prototype;
  }
  return val;
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
    child.show(mutantBoxes[i], targetData);
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
    child.show(crossBoxes[i], targetData);
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
  newGeneration();
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
  incrementTime(Date.now() - startTime);
  setTimeout(breed, 0);
}

function restart() {
  resetStats();
  paintings = [];
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
      canvas.width / Painting.width,
      0,
      0,
      canvas.height / Painting.height,
      0,
      0
    );
}

function scalePaintings() {
  if (imageSource.width > imageSource.height) {
    Painting.width = Math.floor(
      (imageSource.width / imageSource.height) * paintingBaseSize
    );
    Painting.height = paintingBaseSize;
  } else {
    Painting.height = Math.floor(
      (imageSource.height / imageSource.width) * paintingBaseSize
    );
    Painting.width = paintingBaseSize;
  }
  target.width = Painting.width * testScale;
  target.height = Painting.height * testScale;
  const ctx = target.getContext("2d");
  ctx.drawImage(imageSource, 0, 0, target.width, target.height);
  targetData = ctx.getImageData(0, 0, target.width, target.height).data;
  generateWeightMap(targetData);
  [...survivorBoxes, ...mutantBoxes, ...crossBoxes].forEach(box =>
    scaleBox(box)
  );
  onScalePaintings();
}

window.addEventListener("load", () => {
  const boxesElement = document.getElementById("boxes");
  target = document.getElementById("target");
  for (let i = 0; i < generationKeep; ++i) {
    const box = createBox("survivor", "Survivor");
    boxesElement.appendChild(box);
    survivorBoxes.push(box);
    box.dataIndex = i;
    box.addEventListener("click", () => {
      showIndex = this.dataIndex;
    });
  }
  for (let i = 0; i < generationMutate; ++i) {
    const box = createBox("mutant", "Mutation");
    boxesElement.appendChild(box);
    mutantBoxes.push(box);
  }
  for (let i = 0; i < generationCross; ++i) {
    const box = createBox("crossover", "Crossover");
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

let improved = true;

const updateFrequency = 10;

window.addEventListener("load", () => {
  imageSource.onError = () => {
    alert(
      "Failed to load the selected image. It is likely that the image server does not allow Cross-Origin Resource Sharing."
    );
  };
  const imageSelect = document.getElementById("imageSelect");
  const imageText = document.getElementById("imageText");
  if (sessionStorage.getItem("url")) {
    imageSelect.selectedIndex = 0;
    imageText.value = sessionStorage.getItem("url");
  } else {
    imageSelect.selectedIndex = between(1, imageSelect.options.length - 1);
    imageText.value = "images/" + imageSelect.value;
  }
  imageSource.crossOrigin = "";
  imageSource.src = imageText.value;
  imageSelect.addEventListener("change", () => {
    if (imageSelect.selectedIndex > 0) {
      imageText.value = imageSource.src = "images/" + imageSelect.value;
      return imageText.value;
    } else {
      imageText.value = "";
      return imageText.focus();
    }
  });
  imageText.addEventListener("change", () => {
    imageSelect.selectedIndex = 0;
    imageSource.crossOrigin = "";
    imageSource.src = imageText.value;
    return imageSource.src;
  });
  const textureSelect = document.getElementById("textureSelect");
  textureSelect.addEventListener("change", () => {
    const bestLarge = document.getElementById("best-large");
    bestLarge.style.backgroundImage = `url(textures/${textureSelect.value})`;
    return bestLarge.style.backgroundImage;
  });
  document.getElementById("restart").addEventListener("click", restart);
  imageSource.addEventListener("load", () => {
    sessionStorage.setItem("url", imageSource.src);
    const targetLarge = document.getElementById("target-large");
    const bestLarge = document.getElementById("best-large");
    targetLarge.src = imageSource.src;
    targetLarge.style.width = `${Painting.width * 3}px`;
    bestLarge.style.width = targetLarge.style.width;
    targetLarge.style.height = `${Painting.height * 3}px`;
    bestLarge.style.height = targetLarge.style.height;
  });
});

function onScalePaintings() {
  const weights = document.getElementById("weights");
  weights.width = target.width;
  weights.height = target.height;
  paintWeightMap();
  const diff = document.getElementById("diff");
  diff.width = target.width;
  diff.height = target.height;
  diff
    .getContext("2d")
    .setTransform(
      target.width / Painting.width,
      0,
      0,
      target.height / Painting.height,
      0,
      0
    );
  if (paintings[showIndex]) {
    paintings[showIndex].paintDiffMap(diff, targetData);
  }
  paintings.forEach((painting, index) => {
    painting.canvas = null;
    painting.show(survivorBoxes[index], targetData);
  });
}

function onSvgImproved() {
  improved = true;
}

function onGenerationComplete() {
  paintings.forEach(painting => {
    painting.age = (painting.age || 0) + 1;
  });
  if (improved || generationNumber % updateFrequency === 0) {
    paintings.forEach((painting, index) =>
      painting.show(survivorBoxes[index], targetData)
    );
    setText(
      document.getElementById("speed"),
      (generationNumber / (cumulativeTime / 1000)).toFixed(2)
    );
    setText(
      document.getElementById("time"),
      `${Math.floor(cumulativeTime / 1000)}s`
    );
    setText(document.getElementById("generation"), generationNumber);
    if (improved) {
      document.getElementById("best-large").src =
        "data:image/svg+xml;base64," + encode(paintings[showIndex].svg());
      paintings[showIndex].paintDiffMap(
        document.getElementById("diff"),
        targetData
      );
      improved = false;
    }
    Object.entries(attempts).forEach(([key, val]) => {
      const percent = (((successes[key] || 0) / val) * 100).toFixed(2) + "%";
      const fraction = (successes[key] || 0) + "/" + val;
      setText(
        document.getElementById("success-" + key),
        `${fraction} (${percent})`
      );
    });
  }
}
