import { fetchTranscriptionOptions } from '@src/lib/api/transcriptionApi';
import { createServerOptionsHook } from '../../hooks/createServerOptionsHook';

/**
 * The transcription models and languages the server offers.
 */
export const useTranscriptionOptions = createServerOptionsHook(() => fetchTranscriptionOptions());
