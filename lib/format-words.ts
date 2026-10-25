const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** Capitalised English word for small counts ("Five"), digits beyond ten. */
export function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}
