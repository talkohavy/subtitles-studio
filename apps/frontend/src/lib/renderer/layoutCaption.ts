import { getStyleScale } from './geometry';
import { getTextDirection, TextDirections, type TextDirectionValues } from './textDirection';
import { BackgroundModes, TextAligns, TextTransforms, type Rect, type SubtitleStyle } from './types';
import type { Word } from '@src/lib/subtitles/types';

export type MeasureText = (text: string) => number;

export type CaptionToken = {
  /**
   * The text to draw, without the whitespace before it.
   */
  text: string;
  /**
   * The word's position in the caption. Punctuation drawn apart from its word has the word's index.
   */
  index: number;
  hasSpaceBefore: boolean;
  forcesLineBreak: boolean;
  start: number;
  end: number;
  /**
   * The direction it's drawn in. Once laid out, that's its run's direction rather than its own.
   */
  isRtl: boolean;
  width: number;
};

export type PositionedToken = CaptionToken & {
  /**
   * The left edge in the frame.
   */
  x: number;
};

export type CaptionLine = {
  tokens: Array<PositionedToken>;
  /**
   * The left edge in the frame.
   */
  x: number;
  width: number;
  /**
   * The vertical middle of the line in the frame.
   */
  centerY: number;
};

export type CaptionLayout = {
  lines: Array<CaptionLine>;
  fontSize: number;
  scale: number;
  /**
   * The caption's area including its background padding, for hit testing.
   */
  bounds: Rect;
  isRtl: boolean;
};

type LayoutCaptionProps = {
  words: ReadonlyArray<Word>;
  style: SubtitleStyle;
  frameWidth: number;
  frameHeight: number;
  /**
   * Measures text with the caption font already set.
   */
  measure: MeasureText;
  language: string | null;
};

const BALANCE_ITERATIONS = 12;
/**
 * Keeps captions off the very edge of the frame.
 */
const FRAME_MARGIN_RATIO = 0.03;
/**
 * Half the height of a background box around a line, as a multiple of the font size (before padding).
 */
export const BOX_HALF_HEIGHT_RATIO = 0.62;

/**
 * Breaks a caption into evenly balanced lines and positions every word in the frame.
 */
export function layoutCaption(props: LayoutCaptionProps): CaptionLayout {
  const { words, style, frameWidth, frameHeight, measure, language } = props;

  const scale = getStyleScale({ frameWidth, frameHeight });
  const fontSize = style.fontSize * scale;
  const lineHeight = fontSize * style.lineHeight;
  const hasBackground = style.backgroundMode !== BackgroundModes.None;
  const paddingX = hasBackground ? style.backgroundPadding * scale : 0;
  const paddingY = hasBackground ? style.backgroundPadding * scale * 0.5 : 0;
  const textAreaWidth = (frameWidth * style.maxWidth) / 100;
  const maxLineWidth = Math.max(fontSize, textAreaWidth - paddingX * 2);
  const spaceWidth = measure(' ');

  const tokens = toCaptionTokens({ words, style, measure, language });
  const captionText = tokens.map((token) => token.text).join(' ');
  const isRtl = getTextDirection(captionText) === TextDirections.Rtl;
  const tokenLines = wrapTokens({ tokens, maxWidth: maxLineWidth, spaceWidth });

  const blockHeight = tokenLines.length * lineHeight;
  const frameMargin = frameHeight * FRAME_MARGIN_RATIO;
  const boxOverhang = hasBackground ? Math.max(0, fontSize * BOX_HALF_HEIGHT_RATIO + paddingY - lineHeight / 2) : 0;
  const desiredTop = (frameHeight * style.positionY) / 100 - blockHeight / 2;
  const minTop = frameMargin + boxOverhang;
  const maxTop = frameHeight - frameMargin - boxOverhang - blockHeight;
  const top = Math.max(minTop, Math.min(maxTop, desiredTop));
  const areaLeft = (frameWidth - textAreaWidth) / 2 + paddingX;
  const areaRight = frameWidth - areaLeft;

  const lines = tokenLines.map((lineTokens, lineIndex) => {
    const orderedTokens = orderTokensVisually({ tokens: lineTokens, isRtl, measure });
    const gaps = orderedTokens.map((token, index) => getVisualGap({ left: orderedTokens[index - 1], right: token }));
    const width = orderedTokens.reduce((sum, token, index) => sum + token.width + (gaps[index]! ? spaceWidth : 0), 0);
    const x = getLineX({ align: style.align, width, frameWidth, areaLeft, areaRight });

    let cursor = x;
    const positionedTokens = orderedTokens.map((token, index) => {
      cursor += gaps[index]! ? spaceWidth : 0;
      const positionedToken = { ...token, x: cursor };
      cursor += token.width;

      return positionedToken;
    });

    return { tokens: positionedTokens, x, width, centerY: top + lineHeight * (lineIndex + 0.5) };
  });

  const bounds = getCaptionBounds({ lines, fontSize, paddingX, paddingY, lineHeight, top, blockHeight });

  return { lines, fontSize, scale, bounds, isRtl };
}

type ToCaptionTokensProps = {
  words: ReadonlyArray<Word>;
  style: SubtitleStyle;
  measure: MeasureText;
  language: string | null;
};

function toCaptionTokens(props: ToCaptionTokensProps): Array<CaptionToken> {
  const { words, style, measure, language } = props;

  return words
    .map((word, index) => {
      const leadingWhitespace = word.text.match(/^\s*/u)?.[0] ?? '';
      const text = applyTextTransform({ text: word.text.slice(leadingWhitespace.length), style, language });

      return {
        text,
        index,
        hasSpaceBefore: leadingWhitespace.length > 0,
        forcesLineBreak: leadingWhitespace.includes('\n'),
        start: word.start,
        end: word.end,
        isRtl: getTextDirection(text) === TextDirections.Rtl,
        width: measure(text),
      };
    })
    .filter((token) => token.text.length > 0);
}

export function applyTextTransform(props: { text: string; style: SubtitleStyle; language: string | null }): string {
  const { text, style, language } = props;

  const locale = language ?? undefined;

  if (style.textTransform === TextTransforms.Uppercase) return text.toLocaleUpperCase(locale);

  if (style.textTransform === TextTransforms.Lowercase) return text.toLocaleLowerCase(locale);

  return text;
}

type WrapTokensProps = {
  tokens: Array<CaptionToken>;
  maxWidth: number;
  spaceWidth: number;
};

/**
 * Wraps into as few lines as fit, then narrows the lines as much as possible without adding one,
 * so a two-line caption doesn't end with a lonely word.
 */
export function wrapTokens(props: WrapTokensProps): Array<Array<CaptionToken>> {
  const { tokens, maxWidth, spaceWidth } = props;

  const greedyLines = wrapGreedily({ tokens, maxWidth, spaceWidth });

  if (greedyLines.length <= 1) return greedyLines;

  const totalWidth = tokens.reduce((sum, token) => sum + token.width + spaceWidth, 0);
  let low = totalWidth / greedyLines.length / 2;
  let high = maxWidth;

  for (let iteration = 0; iteration < BALANCE_ITERATIONS; iteration++) {
    const middle = (low + high) / 2;
    const lineCount = wrapGreedily({ tokens, maxWidth: middle, spaceWidth }).length;

    if (lineCount <= greedyLines.length) {
      high = middle;
    } else {
      low = middle;
    }
  }

  return wrapGreedily({ tokens, maxWidth: high, spaceWidth });
}

function wrapGreedily(props: WrapTokensProps): Array<Array<CaptionToken>> {
  const { tokens, maxWidth, spaceWidth } = props;

  const lines: Array<Array<CaptionToken>> = [];
  let currentLine: Array<CaptionToken> = [];
  let currentWidth = 0;

  tokens.forEach((token) => {
    const gap = currentLine.length > 0 && token.hasSpaceBefore ? spaceWidth : 0;
    const overflows = currentLine.length > 0 && currentWidth + gap + token.width > maxWidth;

    if (token.forcesLineBreak || overflows) {
      if (currentLine.length > 0) lines.push(currentLine);
      currentLine = [token];
      currentWidth = token.width;
      return;
    }

    currentLine.push(token);
    currentWidth += gap + token.width;
  });

  if (currentLine.length > 0) lines.push(currentLine);

  return lines;
}

type OrderTokensVisuallyProps = {
  tokens: Array<CaptionToken>;
  isRtl: boolean;
  measure: MeasureText;
};

/**
 * Lays words out right-to-left in RTL captions, keeping runs of left-to-right words (and vice versa) in reading order.
 * Words are drawn in their run's direction; numbers and punctuation on their own take the caption's.
 */
function orderTokensVisually(props: OrderTokensVisuallyProps): Array<CaptionToken> {
  const { tokens, isRtl, measure } = props;

  const captionDirection = isRtl ? TextDirections.Rtl : TextDirections.Ltr;
  const runs: Array<Array<CaptionToken>> = [];

  tokens.forEach((token) => {
    const currentRun = runs.at(-1);
    const tokenDirection = getTextDirection(token.text);
    const runDirection = currentRun ? getRunDirection(currentRun) : null;
    const continuesRun = currentRun && (tokenDirection === TextDirections.Neutral || tokenDirection === runDirection);

    if (continuesRun) {
      currentRun.push(token);
    } else {
      runs.push([token]);
    }
  });

  const orderedRuns = runs.map((run) => {
    const ownDirection = getRunDirection(run);
    const runDirection = ownDirection === TextDirections.Neutral ? captionDirection : ownDirection;
    const runIsRtl = runDirection === TextDirections.Rtl;
    const { leading, core, trailing } =
      runDirection === captionDirection
        ? { leading: [], core: run, trailing: [] }
        : detachEdgePunctuation({ tokens: run, isRtl, measure });
    const directedCore = core.map((token) => ({ ...token, isRtl: runIsRtl }));
    const visualCore = runIsRtl ? directedCore.reverse() : directedCore;

    return isRtl ? [...[...trailing].reverse(), ...visualCore, ...leading] : [...leading, ...visualCore, ...trailing];
  });

  if (isRtl) orderedRuns.reverse();

  return orderedRuns.flat();
}

function getRunDirection(run: ReadonlyArray<CaptionToken>): TextDirectionValues {
  const runText = run.map((token) => token.text).join('');
  const runDirection = getTextDirection(runText);

  return runDirection;
}

/**
 * Anything but letters, digits and the signs that stay with a number (`50%`, `$5`).
 */
const LEADING_PUNCTUATION = /^[^\p{L}\p{M}\p{N}\p{Sc}%‰°#+]+/u;
const TRAILING_PUNCTUATION = /[^\p{L}\p{M}\p{N}\p{Sc}%‰°#+]+$/u;

type DetachEdgePunctuationProps = {
  /**
   * A run in the other direction than the caption's, in reading order.
   */
  tokens: ReadonlyArray<CaptionToken>;
  /**
   * The caption's direction.
   */
  isRtl: boolean;
  measure: MeasureText;
};

type DetachedRun = {
  leading: Array<CaptionToken>;
  core: Array<CaptionToken>;
  /**
   * In reading order.
   */
  trailing: Array<CaptionToken>;
};

/**
 * Punctuation at the edges of a run in the other direction follows the caption's direction, as in a browser: the
 * period after an English word that ends a Hebrew sentence goes at the far left, outside the English run. Each piece
 * keeps its word's timing, so it lights up with the word.
 */
function detachEdgePunctuation(props: DetachEdgePunctuationProps): DetachedRun {
  const { tokens, isRtl, measure } = props;

  const core = [...tokens];
  const leading: Array<CaptionToken> = [];
  const trailing: Array<CaptionToken> = [];

  while (core.length > 1 && TRAILING_PUNCTUATION.exec(core.at(-1)!.text)?.[0] === core.at(-1)!.text) {
    trailing.unshift({ ...core.pop()!, isRtl });
  }

  const lastToken = core.at(-1)!;
  const trailingText = TRAILING_PUNCTUATION.exec(lastToken.text)?.[0];

  if (trailingText && trailingText !== lastToken.text) {
    const coreText = lastToken.text.slice(0, -trailingText.length);
    core[core.length - 1] = { ...lastToken, text: coreText, width: measure(coreText) };
    trailing.unshift({ ...lastToken, text: trailingText, width: measure(trailingText), hasSpaceBefore: false, isRtl });
  }

  const firstToken = core[0]!;
  const leadingText = LEADING_PUNCTUATION.exec(firstToken.text)?.[0];

  if (leadingText && leadingText !== firstToken.text) {
    const coreText = firstToken.text.slice(leadingText.length);
    core[0] = { ...firstToken, text: coreText, width: measure(coreText), hasSpaceBefore: false };
    leading.push({ ...firstToken, text: leadingText, width: measure(leadingText), isRtl });
  }

  return { leading, core, trailing };
}

/**
 * Whether to put a space between two neighboring words, as they appear on screen.
 */
function getVisualGap(props: { left: CaptionToken | undefined; right: CaptionToken }): boolean {
  const { left, right } = props;

  if (!left) return false;

  // Pieces of one word, split by `detachEdgePunctuation`.
  if (left.index === right.index) return false;

  if (left.index + 1 === right.index) return right.hasSpaceBefore;

  if (right.index + 1 === left.index) return left.hasSpaceBefore;

  return true;
}

type GetLineXProps = {
  align: SubtitleStyle['align'];
  width: number;
  frameWidth: number;
  areaLeft: number;
  areaRight: number;
};

function getLineX(props: GetLineXProps): number {
  const { align, width, frameWidth, areaLeft, areaRight } = props;

  if (align === TextAligns.Left) return areaLeft;

  if (align === TextAligns.Right) return areaRight - width;

  return (frameWidth - width) / 2;
}

type GetCaptionBoundsProps = {
  lines: Array<CaptionLine>;
  fontSize: number;
  paddingX: number;
  paddingY: number;
  lineHeight: number;
  top: number;
  blockHeight: number;
};

function getCaptionBounds(props: GetCaptionBoundsProps): Rect {
  const { lines, fontSize, paddingX, paddingY, lineHeight, top, blockHeight } = props;

  if (lines.length === 0) return { x: 0, y: top, width: 0, height: 0 };

  const left = Math.min(...lines.map((line) => line.x)) - paddingX;
  const right = Math.max(...lines.map((line) => line.x + line.width)) + paddingX;
  const overhang = Math.max(0, fontSize * BOX_HALF_HEIGHT_RATIO + paddingY - lineHeight / 2);

  return { x: left, y: top - overhang, width: right - left, height: blockHeight + overhang * 2 };
}
