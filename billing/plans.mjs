export const plans = Object.freeze({
  basic: { name: 'Basic', amount: '9.99', firstAmount: '4.99', words: 60000 },
  pro: { name: 'Pro', amount: '29.99', firstAmount: '14.99', words: 260000 },
});

// ICU word segmentation handles Japanese without assuming spaces between words.
const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
export function countWords(text) {
  return [...segmenter.segment(text)].filter(part => part.isWordLike).length;
}
