import ExcelJS from 'exceljs';
import mammoth from 'mammoth';
import {
  digest,
  fields,
  parseDelimited,
  suggestMapping,
  text,
  validateActivity,
  validateRecord,
} from './domain.mjs';

export function decodeFile(input) {
  const name = text(input.name, 200);
  if (
    typeof input.data !== 'string' ||
    input.data.length > 8 * 1024 * 1024 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(input.data)
  )
    throw new Error('Dosya en fazla 5 MB olabilir.');
  const buffer = Buffer.from(input.data, 'base64');
  if (!buffer.length || buffer.length > 5 * 1024 * 1024)
    throw new Error('Boş veya çok büyük dosya.');
  return { name, buffer };
}
// Check expanded ZIP size before handing OOXML to a document parser.
export function checkOfficeZip(buffer) {
  let eocd = -1;
  for (
    let i = buffer.length - 22;
    i >= Math.max(0, buffer.length - 65557);
    i--
  ) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Office dosyası okunamadı.');
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16),
    total = 0;
  if (count > 2000) throw new Error('Dosyada çok fazla bileşen var.');
  for (let i = 0; i < count; i++) {
    if (
      offset + 46 > buffer.length ||
      buffer.readUInt32LE(offset) !== 0x02014b50
    )
      throw new Error('Dosya arşiv yapısı geçersiz.');
    total += buffer.readUInt32LE(offset + 24);
    if (total > 40 * 1024 * 1024)
      throw new Error('Açılmış belge boyutu 40 MB sınırını aşıyor.');
    offset +=
      46 +
      buffer.readUInt16LE(offset + 28) +
      buffer.readUInt16LE(offset + 30) +
      buffer.readUInt16LE(offset + 32);
  }
}
// Read literal links exported by Google Sheets without executing Excel formulas.
function literalHyperlink(formula) {
  if (typeof formula !== 'string') return null;
  const match = formula.match(
    /^=?\s*HYPERLINK\(\s*"((?:[^"]|"")*)"\s*[,;]\s*"((?:[^"]|"")*)"\s*\)\s*$/i,
  );
  return match
    ? {
        hyperlink: match[1].replaceAll('""', '"'),
        text: match[2].replaceAll('""', '"'),
      }
    : null;
}
export async function readInput(input) {
  const { name, buffer } = decodeFile(input),
    extension = name.toLowerCase().split('.').pop();
  if (['csv', 'tsv', 'txt'].includes(extension))
    return { ...parseDelimited(buffer.toString('utf8')), sheets: [] };
  if (extension === 'xlsx') {
    checkOfficeZip(buffer);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheets = workbook.worksheets.map((s) => s.name),
      sheet = input.sheet
        ? workbook.getWorksheet(input.sheet)
        : workbook.getWorksheet(input.preferredSheet || '') ||
          workbook.worksheets.find(
            (s) => s.state !== 'hidden' && s.state !== 'veryHidden',
          ) ||
          workbook.worksheets[0];
    if (!sheet || sheet.rowCount > 10001 || sheet.columnCount > 100)
      throw new Error(
        'Çalışma sayfası bulunamadı veya 10.000 satır / 100 sütun sınırını aşıyor.',
      );
    const rows = [],
      hyperlinks = [];
    sheet.eachRow((row) => {
      const values = [],
        links = [];
      for (let i = 1; i <= sheet.columnCount; i++) {
        const c = row.getCell(i);
        const link = literalHyperlink(c.value?.formula);
        links.push(
          typeof c.value?.hyperlink === 'string'
            ? c.value.hyperlink
            : link?.hyperlink || '',
        );
        values.push(
          c.value instanceof Date
            ? c.value.toISOString().slice(0, 10)
            : (link?.text ?? c.text),
        );
      }
      if (values.some((v) => v.trim())) {
        rows.push(values);
        hyperlinks.push(links);
      }
    });
    if (rows.length < 2) throw new Error('Başlık ve veri satırı gerekli.');
    return {
      headers: rows[0],
      rows: rows.slice(1),
      hyperlinks: hyperlinks.slice(1),
      sheets,
      sheet: sheet.name,
    };
  }
  if (extension === 'docx') {
    checkOfficeZip(buffer);
    const { value } = await mammoth.extractRawText({ buffer });
    if (value.length > 30000)
      throw new Error(
        'Belge 30.000 karakteri aşıyor. Planı daha küçük bölümlere ayırın.',
      );
    return { document: value };
  }
  throw new Error(
    'Excel (.xlsx), CSV/TSV veya Word (.docx) seçin. Eski .xls/.doc dosyasını yeni biçimde kaydedin.',
  );
}
export function previewRows(
  store,
  { kind, headers, rows, mapping, name, sourceHash },
) {
  if (
    !['records', 'plan'].includes(kind) ||
    !Array.isArray(headers) ||
    !Array.isArray(rows) ||
    rows.length > 10000
  )
    throw new Error('Aktarım türü veya satırlar geçersiz.');
  const settings = store.meta('settings');
  if (!settings) throw new Error('Önce çalışma alanını oluşturun.');
  mapping = mapping || suggestMapping(headers, kind);
  for (const [key] of fields[kind])
    if (
      mapping[key] !== undefined &&
      (!Number.isInteger(mapping[key]) ||
        mapping[key] < -1 ||
        mapping[key] >= headers.length)
    )
      throw new Error('Sütun eşleştirmesi geçersiz.');
  const table = kind === 'records' ? 'records' : 'activities',
    existing = new Map(store.list(table).map((r) => [r.id, r]));
  const occurrences = new Map(),
    items = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (!Array.isArray(row)) throw new Error('Geçersiz satır.');
    let values, id;
    try {
      const mapped = Object.fromEntries(
        fields[kind].map(([key]) => [
          key,
          mapping[key] >= 0 ? (row[mapping[key]] ?? '') : '',
        ]),
      );
      values =
        kind === 'records'
          ? validateRecord(mapped, settings.province)
          : validateActivity({ ...mapped, status: 'planned' });
      id = digest(
        kind === 'records'
          ? [settings.province, values.accountId, values.schoolId]
          : [
              settings.province,
              settings.year,
              values.planCode || `${values.title}|${values.startDate}`,
            ],
      );
      const old = existing.get(id);
      let action = 'new';
      if (old) {
        const keys = Object.keys(values);
        const changed = keys.some(
          (key) =>
            JSON.stringify(old[key] ?? '') !==
            JSON.stringify(values[key] ?? ''),
        );
        action = changed ? 'update' : 'unchanged';
        if (kind === 'plan' && old.status === 'completed') action = 'locked';
        if (kind === 'records' && old.status === 'completed' && changed)
          action = 'locked';
      }
      const item = {
        line: index + 2,
        id,
        values,
        action,
        error:
          action === 'locked'
            ? 'Sonuçlandırılmış kayıt korunuyor; değişikliği kaydın içinden inceleyin.'
            : '',
      };
      items.push(item);
      if (occurrences.has(id)) {
        item.action = 'invalid';
        item.error =
          'Aynı öğretmen/okul veya faaliyet birden fazla satırda var.';
        const first = occurrences.get(id);
        first.action = 'invalid';
        first.error = item.error;
      } else occurrences.set(id, item);
    } catch (error) {
      items.push({
        line: index + 2,
        action: 'invalid',
        error: error.message,
        label: text(row[0] || '', 200),
      });
    }
  }
  const counts = Object.fromEntries(
    ['new', 'update', 'unchanged', 'invalid', 'locked'].map((key) => [
      key,
      items.filter((i) => i.action === key).length,
    ]),
  );
  const token = digest({
    kind,
    headers,
    rows,
    mapping,
    sourceHash,
    state: store.fingerprint(),
  });
  return { kind, headers, mapping, items, counts, name, sourceHash, token };
}
export async function previewImport(store, input) {
  const parsed = await readInput(input);
  if (parsed.document !== undefined) return parsed;
  return {
    ...previewRows(store, {
      ...parsed,
      kind: input.kind,
      mapping: input.mapping,
      name: input.name,
      sourceHash: digest(Buffer.from(input.data, 'base64').toString('base64')),
    }),
    sheets: parsed.sheets,
    sheet: parsed.sheet,
  };
}
export function commitPreview(store, preview, input) {
  if (input.token !== preview.token)
    throw new Error('Önizleme değişti. Güncel önizlemeyi tekrar kontrol edin.');
  if (
    (preview.counts.invalid || preview.counts.locked) &&
    input.skipInvalid !== true
  )
    throw new Error(
      'Sorunlu satırları düzeltin veya yalnız geçerli satırları aktarmayı seçin.',
    );
  const table = preview.kind === 'records' ? 'records' : 'activities';
  store.transaction(() => {
    for (const item of preview.items.filter((x) =>
      ['new', 'update'].includes(x.action),
    )) {
      const old = store.get(table, item.id),
        at = new Date().toISOString();
      store.put(
        table,
        item.id,
        {
          ...item.values,
          status: preview.kind === 'records' ? 'review' : 'planned',
          note: old?.note || '',
          createdAt: old?.createdAt || at,
          updatedAt: at,
          source: {
            name: text(preview.name, 200),
            line: item.line,
            hash: preview.sourceHash,
            at,
          },
        },
        old?.version || 0,
      );
    }
    store.log(
      `${preview.kind === 'records' ? 'ESEP listesi' : 'Faaliyet planı'} alındı: ${preview.counts.new} yeni, ${preview.counts.update} güncelleme, ${preview.counts.invalid + preview.counts.locked} ayrılan satır.`,
    );
  });
  return preview.counts;
}
export async function workbookBuffer(headers, rows) {
  const book = new ExcelJS.Workbook();
  book.creator = 'REFİKA';
  const sheet = book.addWorksheet('REFİKA');
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row.map((v) => v ?? ''));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF182A49' },
  };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.columns.forEach((column) => {
    column.width = 25;
    column.alignment = { vertical: 'top', wrapText: true };
  });
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, rows.length + 1), column: headers.length },
  };
  return Buffer.from(await book.xlsx.writeBuffer());
}
