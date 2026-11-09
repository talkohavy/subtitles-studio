import { fetchTranslationOptions } from '@src/lib/api/translationApi';
import { createServerOptionsHook } from '../../hooks/createServerOptionsHook';

/**
 * The translation model and the languages it translates between.
 */
export const useTranslationOptions = createServerOptionsHook(() => fetchTranslationOptions());
