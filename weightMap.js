import { clamp } from "./math.js";

const weightMin = 0.02;
export let weightMap = null;
export let weightAverage = null;

function diffPoint(d, x1, y1, x2, y2) {
  let b1 = (x1 + y1 * target.width) * 4;
  let b2 = (x2 + y2 * target.width) * 4;
  const dr = d[b1++] - d[b2++];
  const dg = d[b1++] - d[b2++];
  const db = d[b1] - d[b2];
  return Math.sqrt((dr * dr + dg * dg + db * db) / 0x30000);
}

function generateEdgeMap(targetData) {
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

function generateHistoMap(targetData) {
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

export function generateWeightMap(targetData) {
  const edgeMap = generateEdgeMap(targetData);
  const histoMap = generateHistoMap(targetData);
  let i = edgeMap.length;
  weightMap = new Array(i);
  let weightTotal = 0;
  while (i--) {
    weightTotal += weightMap[i] = clamp(weightMin, edgeMap[i] + histoMap[i], 1);
  }
  weightAverage = weightTotal / weightMap.length;
}

export function paintWeightMap() {
  const weights = document.getElementById("weights");
  const ctx = weights.getContext("2d");
  const imageData = ctx.createImageData(target.width, target.height);
  const data = imageData.data;
  let i = 0;
  weightMap.forEach(weight => {
    const color = Math.floor((1 - weight) * 255);
    data[i++] = color;
    data[i++] = color;
    data[i++] = color;
    data[i++] = 255;
  });
  ctx.putImageData(imageData, 0, 0);
}
