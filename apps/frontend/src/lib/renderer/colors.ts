/**
 * `#7c3aed` + 0.5 → `rgba(124, 58, 237, 0.5)`. Accepts 3- and 6-digit hex colors.
 */
export function hexToRgba(props: { hex: string; alpha: number }): string {
  const { hex, alpha } = props;

  const digits = hex.replace('#', '');
  const fullDigits = digits.length === 3 ? Array.from(digits, (digit) => `${digit}${digit}`).join('') : digits;
  const value = Number.parseInt(fullDigits, 16);

  if (fullDigits.length !== 6 || Number.isNaN(value)) return `rgba(0, 0, 0, ${alpha})`;

  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
