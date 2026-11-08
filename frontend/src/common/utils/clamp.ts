type ClampProps = {
  value: number;
  min: number;
  max: number;
};

export function clamp(props: ClampProps): number {
  const { value, min, max } = props;

  return Math.min(max, Math.max(min, value));
}
