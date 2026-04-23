export function shuffle<T>(values: readonly T[]) {
  const shuffledValues = [...values];

  for (let i = shuffledValues.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledValues[i], shuffledValues[j]] = [
      shuffledValues[j],
      shuffledValues[i],
    ];
  }

  return shuffledValues;
}
