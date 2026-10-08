import { parseFragment } from 'parse5';
import mammoth from 'mammoth';
import { digest } from './domain.mjs';
import { decodeFile, checkOfficeZip } from './imports.mjs';

const months = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];
const monthPattern = new RegExp(
  `^(${months.map((m) => m.toLocaleLowerCase('tr')).join('|')})\\s+(20\\d{2})$`,
);
const excluded = new Set([
  'script',
  'style',
  'iframe',
  'template',
  'noscript',
  'svg',
  'object',
]);
const blocks = new Set([
  'div',
  'p',
  'br',
  'li',
  'tr',
  'h1',
  'h2',
  'h3',
  'h4',
  'table',
]);
const normalize = (s) => s.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
function bounded(value, max, label) {
  if (value == null) return '';
  if (typeof value !== 'string' || value.length > max)
    throw new Error(`${label} çok uzun veya geçersiz.`);
  return value.replace(/\r\n?/g, '\n').trim();
}
function children(node) {
  return node.childNodes || [];
}
function rawText(node) {
  if (
    excluded.has(node.tagName) ||
    node.attrs?.some((a) => a.name === 'hidden')
  )
    return '';
  if (node.nodeName === '#text') return node.value;
  const inside = children(node).map(rawText).join('');
  return (
    inside +
    (blocks.has(node.tagName)
      ? '\n'
      : ['td', 'th'].includes(node.tagName)
        ? '\t'
        : '')
  );
}
function plain(node) {
  return rawText(node)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
function tree(html) {
  const root = parseFragment(bounded(html, 800000, 'Plan belgesi'));
  const queue = [[root, 0]];
  let count = 0;
  while (queue.length) {
    const [node, depth] = queue.pop();
    if (++count > 40000 || depth > 100)
      throw new Error(
        'Belge yapısı çok karmaşık. Daha sade bir plan kullanın.',
      );
    children(node).forEach((c) => queue.push([c, depth + 1]));
  }
  return root;
}
function monthValue(value) {
  const match = normalize(value).match(monthPattern);
  if (!match) return '';
  const index = months.findIndex((m) => normalize(m) === normalize(match[1]));
  return `${match[2]}-${String(index + 1).padStart(2, '0')}`;
}
function tableRows(table) {
  const rows = [];
  function walk(node) {
    if (node !== table && node.tagName === 'table') return;
    if (node.tagName === 'tr')
      rows.push(children(node).filter((c) => ['td', 'th'].includes(c.tagName)));
    else children(node).forEach(walk);
  }
  walk(table);
  return rows;
}

// Read only recognizable month headings and four-column activity tables.
// Calendars, general principles and progress remain in the full source text.
export function parsePlanHtml(html) {
  const root = tree(html),
    items = [],
    warnings = [];
  let month = '',
    theme = '';
  function walk(node) {
    if (excluded.has(node.tagName)) return;
    if (node.tagName === 'table') {
      const rows = tableRows(node),
        header = rows[0]?.map((c) => normalize(plain(c))) || [];
      const isPlan =
        header.length === 4 &&
        /gün|tarih/.test(header[0]) &&
        /faaliyet/.test(header[1]) &&
        /çıktı/.test(header[2]) &&
        /not/.test(header[3]);
      if (isPlan) {
        for (let line = 1; line < rows.length; line++) {
          const cells = rows[line];
          if (cells.length !== 4 || !month) {
            warnings.push(
              'Ayı veya dört sütunu belirlenemeyen bir satır yalnızca kaynak metninde korundu.',
            );
            continue;
          }
          const activity = plain(cells[1]).split('\n').filter(Boolean);
          if (!activity.length) continue;
          items.push({
            month,
            theme,
            dateLabel: plain(cells[0]),
            title: activity[0],
            description: activity.slice(1).join('\n'),
            expectedOutput: plain(cells[2]),
            implementationNote: plain(cells[3]),
            sourceRow: line + 1,
          });
        }
        return;
      }
      // The YEĞİTEK example uses a header table with the calendar in its second cell.
      const lines = rows[0]?.[0]
        ? plain(rows[0][0]).split('\n').filter(Boolean)
        : [];
      const index = lines.findIndex((v) => monthValue(v));
      if (index >= 0) {
        month = monthValue(lines[index]);
        theme = lines[index + 1] || '';
        return;
      }
    }
    if (['p', 'div', 'h1', 'h2', 'h3', 'h4'].includes(node.tagName)) {
      const value = plain(node);
      if (value.length < 40 && monthValue(value)) {
        month = monthValue(value);
        theme = '';
      }
    }
    children(node).forEach(walk);
  }
  walk(root);
  if (!items.length)
    warnings.push(
      'Aylık tablo otomatik ayrılamadı. Tam metin korunur; aylık maddeleri aşağıdan ekleyebilirsiniz.',
    );
  return {
    planText: bounded(plain(root), 200000, 'Plan metni'),
    items,
    warnings: [...new Set(warnings)],
  };
}

function cleanItems(input) {
  if (!Array.isArray(input) || input.length > 600)
    throw new Error('Plan en fazla 600 madde içerebilir.');
  const occurrences = new Map();
  return input.map((item) => {
    const row = Object.fromEntries(
      [
        'month',
        'theme',
        'dateLabel',
        'title',
        'description',
        'expectedOutput',
        'implementationNote',
      ].map((k) => [
        k,
        bounded(item[k], k === 'month' ? 7 : 12000, 'Plan alanı'),
      ]),
    );
    if (
      !/^20\d{2}-(0[1-9]|1[0-2])$/.test(row.month) ||
      !row.title ||
      !row.dateLabel
    )
      throw new Error(
        'Her plan maddesinde ay, çalışma günleri ve faaliyet adı gerekli.',
      );
    const key = digest([row.month, row.dateLabel, row.title]);
    const occurrence = (occurrences.get(key) || 0) + 1;
    occurrences.set(key, occurrence);
    return {
      ...row,
      id: digest([key, occurrence]).slice(0, 24),
      sourceRow:
        Number.isInteger(item.sourceRow) && item.sourceRow > 0
          ? item.sourceRow
          : null,
    };
  });
}
export function cleanPlan(input, settings) {
  const year = Number(input.year),
    title = bounded(input.title, 250, 'Plan başlığı');
  if (!Number.isInteger(year) || year < 2000 || year > 2099 || !title)
    throw new Error('Plan başlığı ve geçerli yıl gerekli.');
  let sourceUrl = bounded(input.sourceUrl, 2000, 'Kaynak bağlantısı');
  if (sourceUrl) {
    const url = new URL(sourceUrl);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error('Kaynak bağlantısı geçersiz.');
    sourceUrl = url.href;
  }
  const planText = bounded(input.planText, 200000, 'Plan metni'),
    progressText = bounded(input.progressText, 60000, 'İlerleme metni'),
    items = cleanItems(input.items || []);
  if (!planText && !items.length)
    throw new Error('Plan metni veya en az bir aylık madde gerekli.');
  return {
    title,
    year,
    province: settings.province,
    schoolYear: settings.year,
    sourceUrl,
    planText,
    progressText,
    items,
    parserVersion: 1,
  };
}
export async function previewPlan(store, input) {
  const settings = store.meta('settings');
  if (!settings) throw new Error('Önce çalışma alanını kurun.');
  let html = input.planHtml,
    planText = input.planText || '',
    warnings = [],
    items = input.items;
  if (input.file) {
    const { name, buffer } = decodeFile(input.file);
    if (/\.docx$/i.test(name)) {
      checkOfficeZip(buffer);
      html = (
        await mammoth.convertToHtml({ buffer }, { externalFileAccess: false })
      ).value;
    } else if (/\.html?$/i.test(name)) html = buffer.toString('utf8');
    else if (/\.txt$/i.test(name)) planText = buffer.toString('utf8');
    else throw new Error('Word (.docx), HTML veya metin (.txt) planı seçin.');
  }
  if (html) {
    const parsed = parsePlanHtml(html);
    planText = parsed.planText;
    warnings = parsed.warnings;
    if (!items) items = parsed.items;
  }
  const progressText = input.progressHtml
    ? bounded(plain(tree(input.progressHtml)), 60000, 'İlerleme metni')
    : input.progressText;
  const plan = cleanPlan({ ...input, planText, progressText, items }, settings);
  const id = digest([settings.province, plan.year]).slice(0, 32),
    existing = store.get('plans', id);
  if (input.id && (input.id !== id || input.version !== existing?.version))
    throw new Error(
      'Plan değişmiş veya yıl değiştirilmiş. Güncel planı yeniden açın.',
    );
  const sourceHash = digest(plan),
    version = existing?.version || 0;
  if (!plan.items.length && !warnings.length)
    warnings.push(
      'Aylık maddeler henüz eklenmedi; planın tam metni saklanacak.',
    );
  return {
    plan: { ...plan, id, sourceHash },
    version,
    action: existing
      ? existing.sourceHash === sourceHash
        ? 'unchanged'
        : 'update'
      : 'new',
    warnings,
    token: digest([store.fingerprint(), id, version, sourceHash]),
  };
}
export function commitPlan(store, preview, token) {
  if (
    token !== preview.token ||
    token !==
      digest([
        store.fingerprint(),
        preview.plan.id,
        preview.version,
        preview.plan.sourceHash,
      ])
  )
    throw new Error('Plan veya çalışma alanı değişti. Önizlemeyi yenileyin.');
  if (preview.action === 'unchanged')
    return store.get('plans', preview.plan.id);
  return store.transaction(() => {
    const saved = store.put(
      'plans',
      preview.plan.id,
      { ...preview.plan, updatedAt: new Date().toISOString() },
      preview.version,
    );
    store.log(
      `${saved.year} faaliyet planı ${preview.action === 'new' ? 'eklendi' : 'güncellendi'} (${saved.items.length} plan maddesi).`,
    );
    return saved;
  });
}
