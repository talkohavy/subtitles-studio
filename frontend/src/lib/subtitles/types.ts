export type Word = {
  /**
   * May start with whitespace separating it from the previous word. A `\n` in it forces a line break.
   */
  text: string;
  start: number;
  end: number;
};

export type Cue = {
  id: string;
  start: number;
  end: number;
  /**
   * What the user sees and edits.
   */
  text: string;
  /**
   * `text` split into timed words, used for word highlighting. Always derived from `text`.
   */
  words: Array<Word>;
};
