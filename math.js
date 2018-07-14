export function between(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function betweenHigh(min, max) {
  return Math.floor(
    Math.sin((Math.random() * Math.PI) / 2) * (max - min + 1) + min
  );
}

export function randomByte() {
  return between(0, 255);
}

export function randomSign() {
  if (Math.random() < 0.5) {
    return -1;
  } else {
    return 1;
  }
}

export function clamp(min, n, max) {
  if (n < min) {
    return min;
  } else if (n > max) {
    return max;
  } else {
    return n;
  }
}

export function plusOrMinus(min, max) {
  return randomSign() * between(max, min);
}
