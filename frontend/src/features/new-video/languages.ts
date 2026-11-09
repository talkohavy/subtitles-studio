import type { SelectOption } from '../../components/ui/SelectField';

/**
 * Whisper uses a few codes that aren't standard, and some browsers have no English name for a few rare languages.
 */
const LANGUAGE_NAME_OVERRIDES: Readonly<Record<string, string>> = {
  jw: 'Javanese',
  ba: 'Bashkir',
  bo: 'Tibetan',
};

let displayNames: Intl.DisplayNames | null = null;

export function getLanguageName(code: string): string {
  const override = LANGUAGE_NAME_OVERRIDES[code];

  if (override) return override;

  try {
    displayNames ??= new Intl.DisplayNames(['en'], { type: 'language' });

    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * The languages as select options, sorted by name.
 */
export function getLanguageOptions(codes: ReadonlyArray<string>): Array<SelectOption<string>> {
  const options = codes.map((code) => ({ value: code, label: getLanguageName(code) }));
  const sortedOptions = options.sort((a, b) => a.label.localeCompare(b.label));

  return sortedOptions;
}
