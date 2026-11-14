import { getEntranceTransform, getWordPopScale } from './animations';
import { hexToRgba } from './colors';
import { BOX_HALF_HEIGHT_RATIO, type CaptionLayout, type CaptionLine, type PositionedToken } from './layoutCaption';
import { BackgroundModes, HighlightModes, type Canvas2D, type SubtitleStyle, type TextAlignValues } from './types';

type DrawCaptionProps = {
  ctx: Canvas2D;
  layout: CaptionLayout;
  style: SubtitleStyle;
  time: number;
  cueStart: number;
};

const WordStates = {
  Spoken: 'spoken',
  Active: 'active',
  Upcoming: 'upcoming',
} as const;

type WordStateValues = (typeof WordStates)[keyof typeof WordStates];

/**
 * Which part of a line stays put while its spoken word grows: the left edge, the middle or the right edge.
 */
const ALIGN_ANCHORS: Record<TextAlignValues, number> = { left: 0, center: 0.5, right: 1 };

/**
 * How a line's words move at a moment in time. A growing word pushes its neighbors aside instead of covering them.
 */
type LineMotion = {
  /**
   * Per token, in the line's order.
   */
  scales: Array<number>;
  /**
   * How far each token moves sideways, per token.
   */
  shifts: Array<number>;
  left: number;
  right: number;
};

/**
 * Draws a laid-out caption at `time`. Expects the caption font to be set on the context.
 */
export function drawCaption(props: DrawCaptionProps) {
  const { ctx, layout, style, time, cueStart } = props;

  if (layout.lines.length === 0) return;

  const { fontSize, scale, bounds } = layout;
  const transform = getEntranceTransform({ animation: style.animation, elapsed: time - cueStart });
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const motions = layout.lines.map((line) => getLineMotion({ line, style, time }));

  ctx.save();
  ctx.globalAlpha *= transform.opacity;
  ctx.translate(centerX, centerY + transform.offsetY * fontSize);
  ctx.scale(transform.scale, transform.scale);
  ctx.translate(-centerX, -centerY);

  drawBackground({ ctx, layout, style, motions });

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  layout.lines.forEach((line, lineIndex) => {
    const motion = motions[lineIndex]!;

    line.tokens.forEach((token, tokenIndex) => {
      const state = getWordState({ token, time });

      if (style.highlightMode === HighlightModes.Reveal && state === WordStates.Upcoming) return;

      drawToken({
        ctx,
        token,
        centerY: line.centerY,
        state,
        style,
        fontSize,
        scale,
        tokenScale: motion.scales[tokenIndex]!,
        shiftX: motion.shifts[tokenIndex]!,
      });
    });
  });

  ctx.restore();
}

function getLineMotion(props: { line: CaptionLine; style: SubtitleStyle; time: number }): LineMotion {
  const { line, style, time } = props;

  const anchor = ALIGN_ANCHORS[style.align];
  const scales = line.tokens.map((token) => {
    const isActive = getWordState({ token, time }) === WordStates.Active;

    return isActive ? getWordPopScale({ elapsed: time - token.start, targetScale: style.activeWordScale }) : 1;
  });
  const extraWidths = line.tokens.map((token, index) => token.width * (scales[index]! - 1));
  const totalExtraWidth = extraWidths.reduce((sum, extraWidth) => sum + extraWidth, 0);
  let extraWidthBefore = 0;

  const shifts = extraWidths.map((extraWidth) => {
    const shift = extraWidthBefore + extraWidth / 2 - totalExtraWidth * anchor;
    extraWidthBefore += extraWidth;

    return shift;
  });

  const motion = {
    scales,
    shifts,
    left: line.x - totalExtraWidth * anchor,
    right: line.x + line.width + totalExtraWidth * (1 - anchor),
  };

  return motion;
}

function getWordState(props: { token: PositionedToken; time: number }): WordStateValues {
  const { token, time } = props;

  if (time < token.start) return WordStates.Upcoming;

  return time < token.end ? WordStates.Active : WordStates.Spoken;
}

type DrawBackgroundProps = {
  ctx: Canvas2D;
  layout: CaptionLayout;
  style: SubtitleStyle;
  motions: ReadonlyArray<LineMotion>;
};

function drawBackground(props: DrawBackgroundProps) {
  const { ctx, layout, style, motions } = props;

  if (style.backgroundMode === BackgroundModes.None) return;

  const { lines, fontSize, scale } = layout;
  const paddingX = style.backgroundPadding * scale;
  const paddingY = style.backgroundPadding * scale * 0.5;
  const halfHeight = fontSize * BOX_HALF_HEIGHT_RATIO + paddingY;
  const radius = style.backgroundRadius * scale;

  ctx.fillStyle = hexToRgba({ hex: style.backgroundColor, alpha: style.backgroundOpacity });
  ctx.beginPath();

  if (style.backgroundMode === BackgroundModes.Block) {
    const left = Math.min(...motions.map((motion) => motion.left)) - paddingX;
    const right = Math.max(...motions.map((motion) => motion.right)) + paddingX;
    const top = lines[0]!.centerY - halfHeight;
    const bottom = lines.at(-1)!.centerY + halfHeight;
    ctx.roundRect(left, top, right - left, bottom - top, radius);
  } else {
    lines.forEach((line, index) => {
      const { left, right } = motions[index]!;
      ctx.roundRect(left - paddingX, line.centerY - halfHeight, right - left + paddingX * 2, halfHeight * 2, radius);
    });
  }

  ctx.fill();
}

type DrawTokenProps = {
  ctx: Canvas2D;
  token: PositionedToken;
  centerY: number;
  state: WordStateValues;
  style: SubtitleStyle;
  fontSize: number;
  scale: number;
  tokenScale: number;
  shiftX: number;
};

function drawToken(props: DrawTokenProps) {
  const { ctx, token, centerY, state, style, fontSize, scale, tokenScale, shiftX } = props;

  const isHighlighted = state === WordStates.Active && style.highlightMode !== HighlightModes.None;
  const isBoxed = isHighlighted && style.highlightMode === HighlightModes.Box;
  const tokenCenterX = token.x + token.width / 2;

  ctx.save();
  ctx.translate(tokenCenterX + shiftX, centerY);
  ctx.scale(tokenScale, tokenScale);
  ctx.translate(-tokenCenterX, -centerY);

  if (isBoxed) {
    const paddingX = fontSize * 0.18;
    const halfHeight = fontSize * 0.6;
    ctx.fillStyle = style.highlightColor;
    ctx.beginPath();
    ctx.roundRect(
      token.x - paddingX,
      centerY - halfHeight,
      token.width + paddingX * 2,
      halfHeight * 2,
      fontSize * 0.18,
    );
    ctx.fill();
  }

  const textColor = getTokenColor({ style, isHighlighted });
  // A boxed word gets its contrast from the box; an outline would smear its letters together.
  const hasOutline = style.outlineWidth > 0 && !isBoxed;
  const hasShadow = (style.shadowBlur > 0 || style.shadowOffsetY !== 0) && !isBoxed;

  ctx.direction = token.isRtl ? 'rtl' : 'ltr';

  if (hasShadow) {
    ctx.shadowColor = style.shadowColor;
    ctx.shadowBlur = style.shadowBlur * scale;
    ctx.shadowOffsetY = style.shadowOffsetY * scale;
  }

  if (hasOutline) {
    ctx.lineWidth = style.outlineWidth * scale * 2;
    ctx.strokeStyle = style.outlineColor;
    ctx.strokeText(token.text, token.x, centerY);
    ctx.shadowColor = 'transparent';
  }

  ctx.fillStyle = textColor;
  ctx.fillText(token.text, token.x, centerY);
  ctx.restore();
}

function getTokenColor(props: { style: SubtitleStyle; isHighlighted: boolean }): string {
  const { style, isHighlighted } = props;

  if (!isHighlighted) return style.textColor;

  if (style.highlightMode === HighlightModes.Color) return style.highlightColor;

  if (style.highlightMode === HighlightModes.Box) return style.highlightTextColor;

  return style.textColor;
}
