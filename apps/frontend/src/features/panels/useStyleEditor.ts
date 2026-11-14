import { useAppDispatch, useAppSelector } from '../../store';
import { selectIsEditable, selectStyle } from '../../store/selectors';
import { styleChanged } from '../../store/slices/project.slice';
import type { SubtitleStyle } from '@src/lib/renderer/types';

export function useStyleEditor() {
  const dispatch = useAppDispatch();
  const style = useAppSelector(selectStyle);
  const isEditable = useAppSelector(selectIsEditable);

  function setStyle(partialStyle: Partial<SubtitleStyle>) {
    dispatch(styleChanged(partialStyle));
  }

  return { style, setStyle, isEditable };
}
