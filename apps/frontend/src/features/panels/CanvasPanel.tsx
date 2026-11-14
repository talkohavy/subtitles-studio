import { computeOutputSize } from '@src/lib/renderer/geometry';
import {
  AspectRatios,
  CanvasFills,
  type AspectRatioValues,
  type CanvasFillValues,
  type CanvasSettings,
} from '@src/lib/renderer/types';
import { ChoiceGrid, type Choice } from '../../components/ui/ChoiceGrid';
import { ColorField } from '../../components/ui/ColorField';
import { PanelSection } from '../../components/ui/PanelSection';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectCanvasSettings, selectIsEditable, selectVideoInfo } from '../../store/selectors';
import { canvasChanged } from '../../store/slices/project.slice';
import { PanelBody, PanelLayout } from '../side-panel/PanelLayout';

const ASPECT_RATIO_SHAPES: Record<AspectRatioValues, { width: number; height: number }> = {
  original: { width: 22, height: 16 },
  '9:16': { width: 12, height: 21 },
  '1:1': { width: 18, height: 18 },
  '4:5': { width: 16, height: 20 },
  '16:9': { width: 24, height: 13.5 },
};

function AspectRatioIcon(props: { aspectRatio: AspectRatioValues }) {
  const { aspectRatio } = props;

  const shape = ASPECT_RATIO_SHAPES[aspectRatio];
  const isOriginal = aspectRatio === AspectRatios.Original;

  return (
    <span className='flex h-6 items-center justify-center'>
      <span
        className={
          isOriginal ? 'rounded-sm border-2 border-dashed border-current' : 'rounded-sm border-2 border-current'
        }
        style={{ width: shape.width, height: shape.height }}
      />
    </span>
  );
}

const ASPECT_RATIO_CHOICES: ReadonlyArray<Choice<AspectRatioValues>> = [
  { value: AspectRatios.Original, label: 'Original', description: 'As recorded' },
  { value: AspectRatios.Portrait, label: '9:16', description: 'TikTok, Reels, Shorts' },
  { value: AspectRatios.Square, label: '1:1', description: 'Square post' },
  { value: AspectRatios.Vertical, label: '4:5', description: 'Portrait post' },
  { value: AspectRatios.Landscape, label: '16:9', description: 'YouTube' },
].map((choice) => ({ ...choice, icon: <AspectRatioIcon aspectRatio={choice.value} /> }));

const FILL_OPTIONS: ReadonlyArray<{ value: CanvasFillValues; label: string }> = [
  { value: CanvasFills.Blur, label: 'Blurred video' },
  { value: CanvasFills.Color, label: 'Color' },
];

export function CanvasPanel() {
  const dispatch = useAppDispatch();
  const canvas = useAppSelector(selectCanvasSettings);
  const videoInfo = useAppSelector(selectVideoInfo);
  const isEditable = useAppSelector(selectIsEditable);

  const outputSize = videoInfo
    ? computeOutputSize({
        sourceWidth: videoInfo.width,
        sourceHeight: videoInfo.height,
        aspectRatio: canvas.aspectRatio,
      })
    : null;
  const isReframed = canvas.aspectRatio !== AspectRatios.Original;

  function setCanvas(partialCanvas: Partial<CanvasSettings>) {
    dispatch(canvasChanged(partialCanvas));
  }

  return (
    <PanelLayout title='Canvas'>
      <PanelBody>
        <PanelSection title='Aspect ratio'>
          <ChoiceGrid
            label='Aspect ratio'
            value={canvas.aspectRatio}
            choices={ASPECT_RATIO_CHOICES}
            onChange={(aspectRatio) => setCanvas({ aspectRatio })}
            disabled={!isEditable}
          />
          {outputSize && (
            <p className='text-xs text-zinc-500'>
              Exported at{' '}
              <span className='text-zinc-300 tabular-nums'>
                {outputSize.width}×{outputSize.height}
              </span>
            </p>
          )}
        </PanelSection>
        {isReframed && (
          <PanelSection title='Around the video'>
            <SegmentedControl
              ariaLabel='Around the video'
              value={canvas.fill}
              options={FILL_OPTIONS}
              onChange={(fill) => setCanvas({ fill })}
              disabled={!isEditable}
            />
            {canvas.fill === CanvasFills.Color && (
              <ColorField
                label='Fill color'
                value={canvas.fillColor}
                onChange={(fillColor) => setCanvas({ fillColor })}
                disabled={!isEditable}
              />
            )}
          </PanelSection>
        )}
      </PanelBody>
    </PanelLayout>
  );
}
