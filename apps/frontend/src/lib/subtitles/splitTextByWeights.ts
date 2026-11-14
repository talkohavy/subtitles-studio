import { endsClause, endsSentence, getDisplayLength, isDanglingWord } from './breakRules';
import { joinWords, tokenizeText } from './tokenizeText';

type SplitTextByWeightsProps = {
  text: string;
  /**
   * How big each piece should be, relative to the others. One piece is returned per weight.
   */
  weights: ReadonlyArray<number>;
  language: string | null;
};

/**
 * The costs below decide where the text breaks; the breaks with the lowest total win. Each break is charged for how
 * far it lands from its proportional spot, measured in average pieces, plus the cost of what it breaks after.
 * Breaking after punctuation is free.
 */
const PLAIN_BREAK_COST = 0.25;
const DANGLING_WORD_COST = 0.6;
/**
 * Charged for each empty piece, so pieces are only left empty when there are fewer words than pieces.
 */
const EMPTY_PIECE_COST = 10;

/**
 * Splits text into pieces sized in proportion to `weights`, breaking between words and preferably after
 * punctuation: `"Hello there, my friend"` with weights `[1, 1]` → `["Hello there,", "my friend"]`.
 */
export function splitTextByWeights(props: SplitTextByWeightsProps): Array<string> {
  const { text, weights, language } = props;

  const tokens = tokenizeText({ text, language });
  const pieceCount = weights.length;

  if (pieceCount <= 1) return weights.map(() => joinTokens(tokens));

  const breakPositions = findBreakPositions({ tokens, weights });
  const pieces = weights.map((_weight, index) => {
    const pieceTokens = tokens.slice(breakPositions[index], breakPositions[index + 1]);

    return joinTokens(pieceTokens);
  });

  return pieces;
}

type FindBreakPositionsProps = {
  tokens: ReadonlyArray<string>;
  weights: ReadonlyArray<number>;
};

/**
 * Returns where each piece starts, plus the token count at the end: piece `i` is `tokens[positions[i]..positions[i + 1])`.
 */
function findBreakPositions(props: FindBreakPositionsProps): Array<number> {
  const { tokens, weights } = props;

  const tokenCount = tokens.length;
  const pieceCount = weights.length;
  const offsets = getTokenOffsets(tokens);
  const totalLength = offsets[tokenCount]!;
  const averagePieceLength = Math.max(1, totalLength / pieceCount);
  const targetOffsets = getTargetOffsets({ weights, totalLength });

  function getBreakCost(props: { breakIndex: number; position: number }): number {
    const { breakIndex, position } = props;

    const distance = Math.abs(offsets[position]! - targetOffsets[breakIndex]!) / averagePieceLength;
    const lastToken = tokens[position - 1];
    const isInsideText = position > 0 && position < tokenCount;

    if (!isInsideText || endsSentence(lastToken!) || endsClause(lastToken!)) return distance;

    return distance + (isDanglingWord(lastToken!) ? DANGLING_WORD_COST : PLAIN_BREAK_COST);
  }

  // `cheapest[position]` is the cheapest way to place the breaks so far with the latest one at `position`;
  // `previousPositions[b][position]` is where break `b` sits on that cheapest way, given break `b + 1` at `position`.
  let cheapest = Array.from({ length: tokenCount + 1 }, (_value, position) =>
    position === 0 ? 0 : Number.POSITIVE_INFINITY,
  );
  const previousPositions: Array<Array<number>> = [];

  for (let breakIndex = 1; breakIndex < pieceCount; breakIndex++) {
    const nextCheapest: Array<number> = [];
    const choices: Array<number> = [];

    for (let position = 0; position <= tokenCount; position++) {
      const breakCost = getBreakCost({ breakIndex, position });
      let bestCost = Number.POSITIVE_INFINITY;
      let bestPrevious = 0;

      for (let previous = 0; previous <= position; previous++) {
        const emptyPieceCost = previous === position ? EMPTY_PIECE_COST : 0;
        const cost = cheapest[previous]! + emptyPieceCost + breakCost;

        if (cost < bestCost) {
          bestCost = cost;
          bestPrevious = previous;
        }
      }

      nextCheapest.push(bestCost);
      choices.push(bestPrevious);
    }

    previousPositions.push(choices);
    cheapest = nextCheapest;
  }

  const finalCosts = cheapest.map((cost, position) => cost + (position === tokenCount ? EMPTY_PIECE_COST : 0));
  const lastBreak = finalCosts.indexOf(Math.min(...finalCosts));
  const positions = [lastBreak, tokenCount];

  for (let breakIndex = pieceCount - 1; breakIndex >= 1; breakIndex--) {
    positions.unshift(previousPositions[breakIndex - 1]![positions[0]!]!);
  }

  return positions;
}

/**
 * `offsets[i]` is the display length of the first `i` tokens.
 */
function getTokenOffsets(tokens: ReadonlyArray<string>): Array<number> {
  const offsets = [0];

  tokens.forEach((token) => offsets.push(offsets.at(-1)! + getDisplayLength(token)));

  return offsets;
}

/**
 * `targets[b]` is where break `b` would fall if the text split exactly in proportion to the weights.
 */
function getTargetOffsets(props: { weights: ReadonlyArray<number>; totalLength: number }): Array<number> {
  const { weights, totalLength } = props;

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let weightSoFar = 0;

  return weights.map((weight) => {
    const target = totalWeight > 0 ? (totalLength * weightSoFar) / totalWeight : 0;
    weightSoFar += weight;

    return target;
  });
}

function joinTokens(tokens: ReadonlyArray<string>): string {
  const words = tokens.map((token) => ({ text: token }));

  return joinWords(words);
}
