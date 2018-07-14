export let attempts = {};
export let successes = {};
export let generationNumber = 0;
export let cumulativeTime = 0;

let attempted = [];

export function attempt(type) {
  attempts[type] = (attempts[type] || 0) + 1;
  attempted.push(type);
}

export function failure() {
  attempted = [];
}

export function success() {
  attempted.forEach(type => {
    successes[type] = (successes[type] || 0) + 1;
  });
  attempted = [];
}

export function resetStats() {
  cumulativeTime = 0;
  generationNumber = 0;
  attempts = {};
  successes = {};
}

export function newGeneration() {
  ++generationNumber;
}

export function incrementTime(ms) {
  cumulativeTime += ms;
}
