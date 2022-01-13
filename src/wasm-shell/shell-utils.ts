
export interface ActiveCharPrompt {
  promptPrefix: string;
  promise: Promise<any>;
  resolve?: (what: string) => any;
  reject?: (error: Error) => any;
}

export interface ActivePrompt extends ActiveCharPrompt {
  continuationPromptPrefix: string;
}

/**
 * Detects all the word boundaries on the given input
 */
export function wordBoundaries(input: string, leftSide: boolean = true) {
  let match;
  const words = [];
  const rx = /\w+/g;

  match = rx.exec(input);
  while (match) {
    if (leftSide) {
      words.push(match.index);
    } else {
      words.push(match.index + match[0].length);
    }

    match = rx.exec(input);
  }

  return words;
}

/**
 * The closest left (or right) word boundary of the given input at the
 * given offset.
 */
export function closestLeftBoundary(input: string, offset: number) {
  const found = wordBoundaries(input, true)
    .reverse()
    .find((x) => x < offset);
  return found === undefined ? 0 : found;
}
export function closestRightBoundary(input: string, offset: number) {
  const found = wordBoundaries(input, false).find((x) => x > offset);
  return found === undefined ? input.length : found;
}

/**
 * Checks if there is an incomplete input
 *
 * An incomplete input is considered:
 * - An input that contains unterminated single quotes
 * - An input that contains unterminated double quotes
 * - An input that ends with "\"
 * - An input that has an incomplete boolean shell expression (&& and ||)
 * - An incomplete pipe expression (|)
 */
export function isIncompleteInput(input: string) {
  // Empty input is not incomplete
  if (input.trim() === "") {
    return false;
  }

  // Check for dangling single-quote strings
  if ((input.match(/'/g) || []).length % 2 !== 0) {
    return true;
  }
  // Check for dangling double-quote strings
  if ((input.match(/"/g) || []).length % 2 !== 0) {
    return true;
  }
  // Check for dangling boolean or pipe operations
  if ((input.split(/(\|\||\||&&)/g).pop() as string).trim() === "") {
    return true;
  }
  // Check for tailing slash
  if (input.endsWith("\\") && !input.endsWith("\\\\")) {
    return true;
  }

  return false;
}

/**
 * Returns true if the expression ends on a tailing whitespace
 */
export function hasTrailingWhitespace(input: string) {
  return input.match(/[^\\][ \t]$/m) !== null;
}
