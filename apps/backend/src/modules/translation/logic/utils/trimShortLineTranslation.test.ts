import { trimShortLineTranslation } from './trimShortLineTranslation';

describe('trimShortLineTranslation', () => {
  it('keeps only the first clause when a one-word line comes back with more', () => {
    const actualResult = trimShortLineTranslation({ text: 'Yes!', translation: 'כן, אני יודע.' });

    const expectedResult = 'כן.';
    expect(actualResult).toBe(expectedResult);
  });

  it("ends the kept clause with the translation's own sentence punctuation", () => {
    const actualResult = [
      trimShortLineTranslation({ text: 'Yes!', translation: '¡Sí, es cierto!' }),
      trimShortLineTranslation({ text: 'Okay.', translation: 'בסדר, אני...' }),
      trimShortLineTranslation({ text: 'はい。', translation: 'Yes, I know.' }),
    ];

    const expectedResult = ['¡Sí!', 'בסדר.', 'Yes.'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('leaves translations of short lines that have nothing after their first clause', () => {
    const actualResult = [
      trimShortLineTranslation({ text: 'Okay.', translation: 'Está bien.' }),
      trimShortLineTranslation({ text: 'Hey everyone,', translation: 'היי כולם,' }),
    ];

    const expectedResult = ['Está bien.', 'היי כולם,'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('leaves lines with more than one clause', () => {
    const actualResult = trimShortLineTranslation({ text: 'Wow, really?', translation: 'וואו, באמת?' });

    const expectedResult = 'וואו, באמת?';
    expect(actualResult).toBe(expectedResult);
  });

  it('leaves lines longer than two words', () => {
    const actualResult = trimShortLineTranslation({
      text: 'Pour it slowly.',
      translation: 'Viértelo despacio, muy despacio.',
    });

    const expectedResult = 'Viértelo despacio, muy despacio.';
    expect(actualResult).toBe(expectedResult);
  });
});
