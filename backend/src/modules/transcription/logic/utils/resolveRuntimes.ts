import { WhisperDevice, type WhisperDeviceValues } from '../constants';
import type { WhisperRuntime } from '../../types';

type ResolveRuntimesProps = {
  runtimes: Array<WhisperRuntime>;
  device: WhisperDeviceValues;
};

/**
 * Orders a model's runtimes by the configured device preference. Runtimes for other devices stay as fallbacks,
 * so a missing GPU never makes a model unusable.
 */
export function resolveRuntimes(props: ResolveRuntimesProps): Array<WhisperRuntime> {
  const { runtimes, device } = props;

  if (device === WhisperDevice.Auto) return runtimes;

  const preferredRuntimes = runtimes.filter((runtime) => runtime.device === device);
  const fallbackRuntimes = runtimes.filter((runtime) => runtime.device !== device);

  return [...preferredRuntimes, ...fallbackRuntimes];
}
