import ExcelJS from 'exceljs';
import { digest } from './domain.mjs';
import { googleFileId } from './google-auth.mjs';
import {
  previewValidationBatch,
  commitValidationBatch,
  validationIdentity,
} from './validation-batches.mjs';
import { caseKinds, caseStatuses } from './validation.mjs';
import { outcomeLabels } from './validation-periods.mjs';

const fields = [
  'name',
  'accountId',
  'school',
  'schoolId',
  'profileUrl',
  'schoolUrl',
  'district',
  'email',
  'reason',
  'requestedAction',
  'retainedProfile',
  'relatedProfiles',
  'mergeSchool',
  'mergeSchoolId',
  'mergeSchoolUrl',
  'evidenceUrl',
  'holdReason',
];
const valuesOf = (row) =>
  Object.fromEntries(fields.map((key) => [key, row[key] || '']));
const quote = (name) => "'" + name.replaceAll("'", "''") + "'";
export class GoogleSheetsClient {
  constructor(auth, fetcher = fetch) {
    this.auth = auth;
    this.fetcher = fetcher;
  }
  async request(fileId, suffix = '', options = {}) {
    const token = await this.auth.accessToken(fileId);
    const response = await this.fetcher(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(fileId)}${suffix}`,
      {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: AbortSignal.timeout(30000),
        redirect: 'error',
      },
    );
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? 'Google işlem sınırına ulaşıldı. Bir sonraki eşitlemede yeniden denenecek.'
          : [401, 403].includes(response.status)
            ? 'Google erişimi doğrulanamadı. Dosya iznini ve Google bağlantısını kontrol edin.'
            : 'Google E-Tablo okunamadı veya güncellenemedi. Kayıtlarınız korunuyor.',
      );
    const result = await response.text();
    if (result.length > 12000000)
      throw new Error(
        'Google tablosu bu aktarım için fazla büyük. Daha küçük bir sekme seçin.',
      );
    return JSON.parse(result);
  }
  metadata(fileId) {
    return this.request(
      fileId,
      '?fields=spreadsheetId,properties(title),sheets(properties)',
    );
  }
  async read(fileId, sheetId) {
    const metadata = await this.metadata(fileId);
    const sheet = metadata.sheets.find(
      (s) => s.properties.sheetId === sheetId,
    )?.properties;
    if (!sheet || sheet.sheetType !== 'GRID')
      throw new Error('Bağlı çalışma sayfası bulunamadı; yeniden seçin.');
    const columns = Math.min(sheet.gridProperties?.columnCount || 26, 100);
    const endColumn =
      columns <= 26
        ? String.fromCharCode(64 + columns)
        : String.fromCharCode(64 + Math.floor((columns - 1) / 26)) +
          String.fromCharCode(65 + ((columns - 1) % 26));
    const range = `${quote(sheet.title)}!A1:${endColumn}${sheet.gridProperties?.rowCount || 1000}`;
    const query = new URLSearchParams({
      ranges: range,
      includeGridData: 'true',
      fields:
        'sheets(data(startRow,rowData(values(formattedValue,effectiveValue,userEnteredValue,hyperlink,textFormatRuns,userEnteredFormat(textFormat(link))))))',
    });
    const data = await this.request(fileId, '?' + query);
    const rows = data.sheets?.[0]?.data?.[0]?.rowData || [];
    const cells = rows.map((row) =>
      (row.values || []).map((cell) => {
        const text =
          cell.formattedValue ??
          cell.effectiveValue?.stringValue ??
          cell.userEnteredValue?.stringValue ??
          String(cell.effectiveValue?.numberValue ?? '');
        const links = [
          ...new Set(
            [
              cell.hyperlink,
              cell.userEnteredFormat?.textFormat?.link?.uri,
              ...(cell.textFormatRuns || []).map((r) => r.format?.link?.uri),
            ].filter(Boolean),
          ),
        ];
        if (links.length > 1)
          throw new Error(
            'Bir hücrede birden fazla farklı profil bağlantısı var; ilgili hücreyi düzeltin.',
          );
        return text && links[0]
          ? { text: String(text), hyperlink: links[0] }
          : String(text);
      }),
    );
    while (cells.length && !cells.at(-1).some(Boolean)) cells.pop();
    if (cells.length > 2001)
      throw new Error(
        'Otomatik eşitleme sekmesi en fazla 2.000 kayıt içerebilir. Arşivi ayrı sekmede tutun.',
      );
    const book = new ExcelJS.Workbook();
    book.creator = 'REFİKA';
    const page = book.addWorksheet(sheet.title.slice(0, 31));
    cells.forEach((row) => page.addRow(row));
    return {
      metadata,
      sheet,
      cells,
      hash: digest(cells),
      input: {
        name: 'Google-E-Tablo.xlsx',
        data: Buffer.from(await book.xlsx.writeBuffer()).toString('base64'),
      },
    };
  }
  async createResultSheet(fileId, title) {
    const response = await this.request(fileId, ':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title,
                gridProperties: {
                  rowCount: 20002,
                  columnCount: 12,
                  frozenRowCount: 1,
                },
              },
            },
          },
        ],
      }),
    });
    return response.replies[0].addSheet.properties;
  }
  async readResultRows(fileId, title) {
    const data = await this.request(
      fileId,
      '/values/' + encodeURIComponent(`${quote(title)}!A1:L20002`),
    );
    return data.values || [];
  }
  async appendResults(fileId, title, rows) {
    return this.request(
      fileId,
      '/values/' +
        encodeURIComponent(`${quote(title)}!A:L`) +
        ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
      { method: 'POST', body: JSON.stringify({ values: rows }) },
    );
  }
}

export class GoogleSync {
  constructor(store, client) {
    this.store = store;
    this.client = client;
    this.busy = false;
  }
  status() {
    const data = this.store.meta('googleSync') || {};
    return {
      ...data,
      bindings: undefined,
      busy: this.busy,
      pending: (data.pending || []).map((p) => {
        const row = p.caseId && this.store.validation.get(p.caseId);
        return {
          ...p,
          ...(row && p.incoming
            ? {
                local: valuesOf(row),
                fields: fields.filter(
                  (field) => (row[field] || '') !== p.incoming[field],
                ),
              }
            : {}),
          version: row?.version,
          protected: ['waiting', 'completed'].includes(row?.status),
          remoteHash: p.incoming && digest(p.incoming),
        };
      }),
    };
  }
  fileId() {
    return googleFileId(this.store.meta('settings')?.contacts?.sheetUrl);
  }
  async inspect(sheetId, defaultKind = '') {
    const fileId = this.fileId();
    if (!fileId || !Number.isInteger(Number(sheetId)))
      throw new Error('E-Tablo ve çalışma sayfasını seçin.');
    const source = await this.client.read(fileId, Number(sheetId));
    const preview = await previewValidationBatch(this.store, {
      ...source.input,
      defaultKind,
    });
    const token = digest([
      fileId,
      Number(sheetId),
      defaultKind,
      source.hash,
      preview.items,
      this.store.meta('revision'),
    ]);
    return { fileId, source, preview, token, defaultKind };
  }
  async exclusive(fn) {
    if (this.closed || this.busy)
      throw new Error('Eşitleme sürüyor veya uygulama kapanıyor.');
    this.busy = true;
    this.flight = Promise.resolve().then(fn);
    try {
      return await this.flight;
    } finally {
      this.busy = false;
    }
  }
  async close() {
    this.closed = true;
    await this.flight?.catch(() => {});
  }
  assertActive(config) {
    const current = this.store.meta('googleSync');
    if (
      this.fileId() !== config.fileId ||
      current?.sheetId !== config.sheetId ||
      !current?.enabled
    )
      throw new Error('Eşitleme bağlantısı değişti veya duraklatıldı.');
  }
  async start(input) {
    return this.exclusive(async () => {
      const plan = await this.inspect(input.sheetId, input.defaultKind);
      if (input.token !== plan.token || input.confirmed !== true)
        throw new Error(
          'Tablo değişti veya önizleme onaylanmadı. Yeniden önizleyin.',
        );
      if (plan.preview.empty)
        throw new Error('Seçilen sekme boş; dolu çalışma sayfasını seçin.');
      if (plan.preview.counts.invalid || plan.preview.counts.duplicate)
        throw new Error(
          'İlk eşitlemeden önce hatalı ve tekrarlanan satırları düzeltin.',
        );
      const old = this.store.meta('googleSync');
      const same =
        old?.fileId === plan.fileId && old?.sheetId === Number(input.sheetId);
      const config = {
        ...(same
          ? old
          : old?.fileId === plan.fileId
            ? { outputSheetId: old.outputSheetId, outputTitle: old.outputTitle }
            : {}),
        fileId: plan.fileId,
        sheetId: Number(input.sheetId),
        sheetName: plan.source.sheet.title,
        defaultKind: plan.defaultKind,
        enabled: true,
        pushEnabled: same && old.pushEnabled === true,
        bindings: same ? old.bindings : {},
      };
      this.store.setMeta('googleSync', config);
      await this.apply(plan, config);
      return this.status();
    });
  }
  async apply(plan, config) {
    // A user can disconnect or change the linked file while Google is responding.
    this.assertActive(config);
    const before = this.store.validation.list();
    const bound = new Map();
    before.forEach((r) => {
      if (!bound.has(validationIdentity(r)))
        bound.set(validationIdentity(r), r);
    });
    let created = 0,
      updated = 0;
    if (plan.preview.counts.new) {
      const result = commitValidationBatch(this.store, plan.preview, {
        ...plan.source.input,
        token: plan.preview.token,
        confirmed: true,
        skipInvalid: true,
      });
      created = result.created;
      this.store.validation.list().forEach((r) => {
        if (!bound.has(validationIdentity(r)))
          bound.set(validationIdentity(r), r);
      });
    }
    const bindings = { ...config.bindings },
      pending = [];
    for (const item of plan.preview.items) {
      if (!['new', 'existing'].includes(item.action)) {
        pending.push({
          key: 'line-' + item.line,
          line: item.line,
          message: item.message,
        });
        continue;
      }
      const key = validationIdentity(item.values),
        binding = bindings[key],
        row = binding?.caseId
          ? this.store.validation.get(binding.caseId)
          : bound.get(key);
      if (!row || validationIdentity(row) !== key) {
        pending.push({
          key: 'line-' + item.line,
          line: item.line,
          message:
            'Eşleşen kayıt kimliği REFİKA’da değişmiş. Kimlikleri kontrol edip bağlantıyı yeniden önizleyin.',
        });
        continue;
      }
      const incoming = valuesOf(item.values),
        local = valuesOf(row);
      const changed = fields.filter(
        (field) => incoming[field] !== local[field],
      );
      if (!changed.length || item.action === 'new') {
        bindings[key] = {
          caseId: row.id,
          base: incoming,
          ignored: binding?.ignored,
        };
        continue;
      }
      if (binding?.ignored === digest(incoming)) continue;
      if (binding && digest(incoming) === digest(binding.base)) continue;
      const conflicts =
        !binding ||
        ['waiting', 'completed'].includes(row.status) ||
        changed.some(
          (field) =>
            incoming[field] !== binding.base[field] &&
            local[field] !== binding.base[field] &&
            local[field] !== incoming[field],
        );
      if (conflicts) {
        pending.push({
          key,
          caseId: row.id,
          title: row.name || row.school,
          line: item.line,
          message: !binding
            ? 'Mevcut kayıt ile E-Tablo farklı; ilk eşleştirmede seçiminiz gerekli.'
            : ['waiting', 'completed'].includes(row.status)
              ? 'Gönderilmiş veya sonuçlanmış kaydın içeriği korunuyor.'
              : 'Aynı alan hem REFİKA’da hem E-Tabloda değişti.',
          incoming,
          local,
          fields: changed,
        });
        continue;
      }
      const patch = Object.fromEntries(
        fields
          .filter((field) => incoming[field] !== binding.base[field])
          .map((field) => [field, incoming[field]]),
      );
      if (Object.keys(patch).length) {
        this.store.validation.save({
          ...row,
          ...patch,
          status: 'review',
          checks: {},
          reviewedOn: '',
          reviewNote: 'Google E-Tablo değişikliği alındı; yeniden inceleyin.',
        });
        updated++;
      }
      bindings[key] = { caseId: row.id, base: incoming };
    }
    const next = {
      ...config,
      bindings,
      pending,
      lastSync: new Date().toISOString(),
      lastCounts: {
        created,
        updated,
        existing: plan.preview.counts.existing,
        issues: pending.length,
      },
      error: '',
    };
    this.store.setMeta('googleSync', next);
    if (next.pushEnabled) await this.push(next);
  }
  async synchronize() {
    return this.exclusive(async () => {
      const config = this.store.meta('googleSync');
      if (!config?.enabled) return this.status();
      try {
        const plan = await this.inspect(config.sheetId, config.defaultKind);
        await this.apply(plan, config);
      } catch (e) {
        const current = this.store.meta('googleSync');
        this.store.setMeta('googleSync', { ...current, error: e.message });
        throw e;
      }
      return this.status();
    });
  }
  pause() {
    const config = this.store.meta('googleSync') || {};
    this.store.setMeta('googleSync', { ...config, enabled: false });
  }
  resolve(input) {
    if (this.busy) throw new Error('Eşitlemenin bitmesini bekleyin.');
    const config = this.store.meta('googleSync'),
      item = config?.pending?.find((p) => p.key === input.key);
    if (!item?.caseId || !['local', 'remote'].includes(input.choice))
      throw new Error('Geçerli bir değişiklik seçin.');
    const row = this.store.validation.get(item.caseId);
    if (
      input.version !== row.version ||
      input.remoteHash !== digest(item.incoming)
    )
      throw new Error(
        'Kayıt veya E-Tablo değişikliği yenilendi; yeniden inceleyin.',
      );
    if (input.choice === 'remote') {
      if (['waiting', 'completed'].includes(row.status))
        throw new Error(
          'Gönderilmiş veya sonuçlanmış dosya otomatik değiştirilemez. Dosyayı kendi inceleme ekranından ele alın.',
        );
      this.store.validation.save({
        ...row,
        ...item.incoming,
        status: 'review',
        checks: {},
        reviewedOn: '',
        reviewNote: 'E-Tablo değişikliği koordinatör tarafından seçildi.',
      });
    }
    config.bindings[item.key] = {
      caseId: row.id,
      base: item.incoming,
      ...(input.choice === 'local' ? { ignored: digest(item.incoming) } : {}),
    };
    config.pending = config.pending.filter((p) => p.key !== item.key);
    this.store.setMeta('googleSync', config);
    return this.status();
  }
  async enablePush(input) {
    return this.exclusive(async () => {
      const config = this.store.meta('googleSync');
      if (
        !config?.enabled ||
        input.fileId !== config.fileId ||
        input.confirmed !== true
      )
        throw new Error('Bağlı tabloya sonuç aktarımını teyit edin.');
      config.pushEnabled = true;
      this.store.setMeta('googleSync', config);
      try {
        await this.push(config);
      } catch (e) {
        this.store.setMeta('googleSync', {
          ...this.store.meta('googleSync'),
          error: e.message,
        });
        throw e;
      }
      return this.status();
    });
  }
  async push(config) {
    this.assertActive(config);
    // Append an immutable event journal to our own tab. Never overwrite the user's input cells.
    const installation = this.store.meta('installationId');
    const title = `REFIKA Sonuçları ${installation.slice(0, 8)}`;
    const metadata = await this.client.metadata(config.fileId);
    this.assertActive(config);
    if (config.outputSheetId === undefined) {
      if (metadata.sheets.some((s) => s.properties.title === title))
        throw new Error(
          'Sonuç sekmesi zaten var ama bağlantısı kayıtlı değil. Yeniden bağlama için kontrol gerekli.',
        );
      const created = await this.client.createResultSheet(config.fileId, title);
      this.assertActive(config);
      config.outputSheetId = created.sheetId;
      this.store.setMeta('googleSync', config);
    }
    const meta = await this.client.metadata(config.fileId);
    const sheet = meta.sheets.find(
      (s) => s.properties.sheetId === config.outputSheetId,
    )?.properties;
    if (!sheet)
      throw new Error(
        'REFİKA sonuç sekmesi kaldırılmış. Otomatik olarak yeniden oluşturulmadı.',
      );
    const existing = await this.client.readResultRows(
      config.fileId,
      sheet.title,
    );
    this.assertActive(config);
    const headers = [
      'İşlem anahtarı',
      'REFİKA kayıt no',
      'Kişi / okul',
      'Talep türü',
      'Kişi ID',
      'Okul ID',
      'İşlem',
      'Tarih',
      'Sonuç no',
      'Sonuç / açıklama',
      'Kaynak bağlantısı',
      'Aktarım zamanı',
    ];
    if (
      existing.length &&
      JSON.stringify(existing[0]) !== JSON.stringify(headers)
    )
      throw new Error(
        'REFİKA sonuç sekmesinin başlıkları değişmiş; aktarım durduruldu.',
      );
    const known = new Set(existing.slice(1).map((row) => row[0])),
      rows = [];
    const linkedCases = new Set(
      Object.values(config.bindings || {}).map((b) => b.caseId),
    );
    for (const row of this.store.validation
      .list()
      .filter((r) => linkedCases.has(r.id))) {
      for (const event of this.store.validation
        .events(row.id)
        .filter(
          (e) =>
            e.type === 'result' ||
            (e.type === 'sent' && e.purpose !== 'information'),
        )) {
        const key = installation + '/' + event.id;
        if (known.has(key)) continue;
        const snapshot = event.snapshot || row;
        rows.push([
          key,
          row.id,
          snapshot.name || snapshot.school,
          caseKinds[snapshot.kind],
          snapshot.accountId || '',
          snapshot.schoolId || '',
          event.type === 'result' ? 'Sonuç' : 'Gönderim',
          event.happenedAt || event.at,
          event.resultNumber
            ? 'SON-' + String(event.resultNumber).padStart(6, '0')
            : '',
          [
            outcomeLabels[event.outcome],
            event.note || event.body || row.result || caseStatuses[row.status],
          ]
            .filter(Boolean)
            .join(' — '),
          event.messageUrl || event.evidenceUrl || '',
          new Date().toISOString(),
        ]);
      }
    }
    if (existing.length + rows.length > 20000)
      throw new Error(
        'Sonuç sekmesi 20.000 satır sınırına ulaştı; arşivleme gerekli.',
      );
    if (rows.length || !existing.length)
      await this.client.appendResults(config.fileId, sheet.title, [
        ...(!existing.length ? [headers] : []),
        ...rows,
      ]);
    this.assertActive(config);
    this.store.setMeta('googleSync', {
      ...this.store.meta('googleSync'),
      lastPush: new Date().toISOString(),
      outputTitle: sheet.title,
      error: '',
    });
  }
}
