import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewsDraft, instagramAccounts } from '../lib/news-draft.mjs';

test('eksik bilgilerle haber uydurmaz', () => {
  const result = createNewsDraft({ title: '', date: '', result: '' });
  assert.equal(result.ok, false);
  assert.match(result.error, /faaliyet adı/);
  assert.match(result.error, /gerçekleşme tarihi/);
  assert.match(result.error, /gerçekleşen sonuç/);
});

test('verilen faaliyet bilgilerini değiştirmeden kullanır', () => {
  const result = createNewsDraft({ title: 'Mentör Buluşması', date: '2026-09-14', result: '32 öğretmen bilgilendirildi' });
  assert.equal(result.ok, true);
  assert.match(result.text, /Mentör Buluşması/);
  assert.match(result.text, /14\.09\.2026/);
  assert.match(result.text, /32 öğretmen bilgilendirildi/);
});

test('onaylanan Instagram hesaplarının tamamını ekler', () => {
  const result = createNewsDraft({ title: 'Çalıştay', date: '2026-09-14', result: 'çalışma tamamlandı' });
  for (const account of instagramAccounts) assert.match(result.text, new RegExp(account.replace('.', '\\.')));
});

test('kanıtlanmamış kişi, sayı veya kurum üretmez', () => {
  const result = createNewsDraft({ title: 'Çalıştay', date: '2026-09-14', result: 'çalışma tamamlandı' });
  assert.doesNotMatch(result.text, /katılımcı sayısı|proje sayısı|başarı oranı/i);
});
