import ExcelJS from 'exceljs';
import {
  batchFields,
  templateFields,
  validationTemplates,
} from './validation-batch-content.mjs';
import { caseStatuses, safeLink } from './validation.mjs';

const linked = {
  name: 'profileUrl',
  school: 'schoolUrl',
  mergeSchool: 'mergeSchoolUrl',
};
function addSheet(book, kind, rows, template = false) {
  const definition = validationTemplates[kind];
  const fields = definition
    ? templateFields(kind)
    : batchFields.filter(([key]) =>
        ['name', 'accountId', 'school', 'schoolId', 'reason'].includes(key),
      );
  const columns = template
    ? fields
    : [
        ['number', 'Sıra no'],
        ...fields,
        ['requestedAction', 'Talep edilen işlem'],
        ['status', 'Süreç durumu'],
      ];
  const sheet = book.addWorksheet(definition?.sheet || 'Genel destek');
  sheet.addRow(columns.map(([, label]) => label));
  for (const [index, row] of rows.entries()) {
    sheet.addRow(
      columns.map(([key]) => {
        if (key === 'number') return index + 1;
        if (key === 'status')
          return caseStatuses[row.status] || 'Kaydedilmemiş önizleme';
        const value =
          row[key] || (key === 'mergeSchool' ? row.relatedProfiles : '') || '';
        const url = linked[key] && row[linked[key]];
        return value && url
          ? { text: String(value), hyperlink: safeLink(url) }
          : value;
      }),
    );
  }
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF182A49' },
  };
  sheet.getRow(1).height = 32;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.columns.forEach((column, index) => {
    const [key] = columns[index];
    column.width =
      key === 'number'
        ? 9
        : key.endsWith('Id')
          ? 17
          : ['reason', 'requestedAction'].includes(key)
            ? 42
            : 29;
    column.alignment = { vertical: 'top', wrapText: true };
    if (key.endsWith('Id')) column.numFmt = '@';
  });
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    row.eachCell((cell) => {
      if (cell.value?.hyperlink)
        cell.font = { color: { argb: 'FF0563C1' }, underline: true };
    });
  });
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, rows.length + 1), column: columns.length },
  };
  sheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };
  sheet.pageSetup.printTitlesRow = '1:1';
  return sheet;
}
export async function validationTemplateWorkbook(kind = 'person') {
  if (!Object.hasOwn(validationTemplates, kind))
    throw new Error('Excel şablon türünü seçin.');
  const book = new ExcelJS.Workbook();
  book.creator = 'REFİKA';
  addSheet(book, kind, [], true);
  return Buffer.from(await book.xlsx.writeBuffer());
}
export async function validationBatchWorkbook(rows) {
  const book = new ExcelJS.Workbook();
  book.creator = 'REFİKA';
  const kinds = [...new Set(rows.map((r) => r.kind))];
  for (const kind of kinds.length ? kinds : ['person'])
    addSheet(
      book,
      kind,
      rows.filter((r) => r.kind === kind),
    );
  return Buffer.from(await book.xlsx.writeBuffer());
}
