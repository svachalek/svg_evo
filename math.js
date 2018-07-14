// randomly selects an integer in the range [min, max]
export function between(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// randomly selects an integer in the range [min, max] but weighted toward the higher end
export function betweenHigh(min, max) {
  return Math.floor(
    Math.sin((Math.random() * Math.PI) / 2) * (max - min + 1) + min
  );
}

export function randomByte() {
  return between(0, 255);
}

// if the number n is out of the range [min, max] return the closer end of the range, otherwise n
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
  return Math.random() < 0.5 ? between(min, max) : -between(min, max);
}
