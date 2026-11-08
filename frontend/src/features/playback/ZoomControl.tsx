import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { clamp } from '@src/common/utils/clamp';
import { IconButton } from '../../components/ui/Button';
import { SliderControl } from '../../components/ui/SliderField';
import { useAppDispatch } from '../../store';
import { timelineZoomChanged } from '../../store/slices/ui.slice';
import { sliderValueToZoom, zoomToSliderValue } from '../timeline/timelineScale';

export type ZoomState = {
  pxPerSec: number;
  fitPxPerSec: number;
  maxPxPerSec: number;
};

const ZOOM_STEP_FACTOR = 1.6;

export function ZoomControl(props: { zoom: ZoomState; disabled?: boolean }) {
  const { zoom, disabled } = props;

  const dispatch = useAppDispatch();
  const { pxPerSec, fitPxPerSec, maxPxPerSec } = zoom;

  const canZoom = !disabled && fitPxPerSec > 0 && maxPxPerSec > fitPxPerSec;
  const sliderValue = zoomToSliderValue({ pxPerSec, fitPxPerSec, maxPxPerSec });

  function setZoom(nextPxPerSec: number) {
    const clampedPxPerSec = clamp({ value: nextPxPerSec, min: fitPxPerSec, max: maxPxPerSec });
    const isFit = clampedPxPerSec <= fitPxPerSec * 1.001;

    dispatch(timelineZoomChanged(isFit ? null : clampedPxPerSec));
  }

  function handleSliderChange(values: Array<number>) {
    const [value] = values;

    if (value !== undefined) setZoom(sliderValueToZoom({ value, fitPxPerSec, maxPxPerSec }));
  }

  return (
    <div className='flex items-center gap-1'>
      <IconButton
        label='Zoom out'
        icon={<ZoomOut className='size-4' />}
        disabled={!canZoom || sliderValue <= 0}
        onClick={() => setZoom(pxPerSec / ZOOM_STEP_FACTOR)}
      />
      <SliderControl
        label='Timeline zoom'
        value={sliderValue}
        min={0}
        max={100}
        step={1}
        onValueChange={handleSliderChange}
        disabled={!canZoom}
        className='w-24'
      />
      <IconButton
        label='Zoom in'
        icon={<ZoomIn className='size-4' />}
        disabled={!canZoom || sliderValue >= 100}
        onClick={() => setZoom(pxPerSec * ZOOM_STEP_FACTOR)}
      />
      <IconButton
        label='Fit the whole video'
        icon={<Maximize2 className='size-4' />}
        disabled={!canZoom || sliderValue <= 0}
        onClick={() => dispatch(timelineZoomChanged(null))}
      />
    </div>
  );
}
