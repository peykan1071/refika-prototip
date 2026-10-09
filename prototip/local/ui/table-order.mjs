const alphabet = new Intl.Collator('tr', {
  sensitivity: 'base',
  numeric: true,
});
const name = (row) => (row.name || row.school || row.title || '').trim();
const addedAt = (row) => Date.parse(row.recordedAt || row.createdAt || '') || 0;

export function sortTableRows(rows, order = 'added') {
  return [...rows].sort((a, b) => {
    const byName = alphabet.compare(name(a), name(b));
    const byDate = addedAt(b) - addedAt(a);
    return (
      (order === 'alphabetical' ? byName || byDate : byDate || byName) ||
      alphabet.compare(a.id || '', b.id || '')
    );
  });
}
