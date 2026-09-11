import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAccountReview, applyAccountReview, accountReviewDraft, accountReviewText, reviewRecommendation } from './account-review.mjs';

test('same-school evidence leaves identity pending and draft requests confirmation', () => {
  const review = initialAccountReview();
  assert.equal(review.identity, 'pending');
  assert.match(accountReviewDraft(review), /Her iki hesap da size mi ait/);
  assert.match(accountReviewText(review), /Kimlik doğrulaması bekleniyor/);
  assert.match(reviewRecommendation(review), /hesap seçmeyin/);
});
test('a definitive identity finding needs a dated evidence note', () => {
  for (const identity of ['same', 'different', 'sourceError']) assert.throws(() => applyAccountReview({ ...initialAccountReview(), identity }), /dayanağını/);
  assert.throws(() => applyAccountReview({ ...initialAccountReview(), identity: 'invented' }));
  const applied = applyAccountReview({ ...initialAccountReview(), identity: 'same', access: 'both', evidence: 'Deneme teyidi, 7 Eylül 2026' });
  const draft = accountReviewDraft({ ...initialAccountReview(), applied });
  assert.match(draft, /NSO yetkilisi/);
  assert.match(draft, /silme veya birleştirme talebi değildir/);
});
test('different people and source errors never produce a duplicate-account request', () => {
  for (const identity of ['different', 'sourceError']) {
    const applied = applyAccountReview({ ...initialAccountReview(), identity, access: 'both', evidence: 'Deneme kaynağı, 7 Eylül 2026' });
    assert.equal(applied.access, 'unknown');
    assert.match(accountReviewDraft({ applied }), /İç inceleme notu/);
    assert.doesNotMatch(accountReviewDraft({ applied }), /Alıcı: NSO/);
  }
});
test('unapplied selections cannot become confirmed evidence in a draft or export', () => {
  const review = { ...initialAccountReview(), identity: 'same', access: 'both', evidence: 'Henüz uygulanmamış seçim' };
  assert.match(accountReviewDraft(review), /Her iki hesap da size mi ait/);
  assert.match(accountReviewText(review), /Kimlik doğrulaması bekleniyor/);
});
