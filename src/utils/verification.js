export function getVerificationIndices(phraseLength = 12, numWords = 3) {
  // Get random unique indices from the phrase
  const indices = new Set();
  while (indices.size < numWords) {
    const index = Math.floor(Math.random() * phraseLength); // crypto.getRandomValues() not supported
    indices.add(index);
  }
  return Array.from(indices).sort((a, b) => a - b);
}

export function validateWord(input, target) {
  if (!input || !target) return null;
  return input.trim().toLowerCase() === target.toLowerCase();
}

export function checkAllWords(inputs, targets, requiredIndices) {
  return requiredIndices.every(index =>
    validateWord(inputs[index], targets[index])
  );
}