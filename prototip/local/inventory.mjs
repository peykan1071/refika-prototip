import { digest, normalize, provinceCode, provinces, text } from './domain.mjs';
import { decodeFile, readInput, workbookBuffer } from './imports.mjs';
import { approvedAccounts } from './validation-batches.mjs';
import {
  inventoryFields,
  inventoryKinds,
  inventoryToday,
  threeMonthsAfter,
  activityLabels,
  validationLabels,
  affiliationLabels,
} from './inventory-fields.mjs';

const aliases = {
  recordId: [
    'id',
    'esep id',
    'hesap id',
    'kişi id',
    'öğretmen id',
    'etwinner id',
    'user id',
    'school id',
    'okul id',
    'organisation id',
  ],
  name: [
    'name',
    'isim',
    'ad soyad',
    'kişi',
    'öğretmen adı',
    'kişi adı',
    'okul adı',
    'school name',
    'organisation name',
  ],
  province: ['il', 'province', 'region', 'bölge'],
  status: ['status', 'durum', 'esep durumu', 'esep durum metni'],
  activity: [
    'membership status',
    'account activity',
    'aktif dormant',
    'aktif / dormant durumu',
    'hesap etkinliği',
    'üyelik durumu',
  ],
  validation: ['validation', 'validation status', 'onay durumu', 'doğrulama'],
  affiliation: [
    'il ilişkisi',
    'güncel / geçmiş il ilişkisi',
    'province affiliation',
  ],
  district: ['district', 'ilçe'],
  schoolId: ['school id', 'okul id', 'ilişkili okul id'],
  school: ['school', 'okul', 'okul adı', 'school name', 'ilişkili okul adı'],
  profileUrl: ['profil', 'profile url', 'profil bağlantısı'],
  schoolUrl: ['okul bağlantısı', 'school url'],
};
const cleanId = (value) => {
  const id = text(value, 80);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(id))
    throw new Error('Geçerli, sabit ESEP ID gerekli.');
  return id;
};
function profile(value) {
  if (!value) return '';
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'school-education.ec.europa.eu' ||
    url.username ||
    url.password
  )
    throw new Error('Profil bağlantısı resmi ESEP adresi olmalı.');
  return url.href;
}
function day(value) {
  if (
    !/^20\d{2}-\d{2}-\d{2}$/.test(value || '') ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new Error('Geçerli kaynak tarihi gerekli.');
  return value;
}
function statusKey(value, category) {
  const key = normalize(value);
  const sets =
    category === 'activity'
      ? {
          active: ['active', 'aktif'],
          dormant: ['dormant', 'uykuda', 'pasif'],
          deactivated: [
            'deactivated',
            'deactivated by user',
            'kullanıcı tarafından devre dışı bırakıldı',
            'devre dışı',
          ],
          blocked: ['blocked', 'engelli', 'engellendi'],
          anonymised: ['anonymised', 'anonymized', 'anonimleştirildi'],
        }
      : category === 'validation'
        ? {
            validated: [
              'validated',
              'etwinning validated',
              'onaylı',
              'onaylandı',
              'etwinning onaylandı',
              'doğrulandı',
            ],
            pending: [
              'pending',
              'requested validation',
              'awaiting etwinning validation',
              'onay bekliyor',
              'eTwinning onayının beklenmesi',
              'doğrulama bekleniyor',
            ],
            registered: [
              'registered',
              'esep registered',
              'esep kayıtlı',
              'esep kaydı',
              'non etwinning',
            ],
            not_validated: [
              'not validated',
              'not_validated',
              'onaysız',
              'doğrulanmadı',
            ],
          }
        : {
            current: ['current', 'güncel', 'güncel il ilişkisi'],
            historical: ['historical', 'geçmiş', 'geçmiş il ilişkisi'],
          };
  return (
    Object.entries(sets).find(([k, values]) =>
      [k, ...values].some((v) => normalize(v) === key),
    )?.[0] || 'unknown'
  );
}
const snapshotRows = (store) =>
  store.db
    .prepare('SELECT body FROM inventory_imports ORDER BY rowid')
    .all()
    .map((r) => JSON.parse(r.body));
const emptyRow = (kind, recordId, province) => ({
  kind,
  recordId,
  province,
  name: '',
  district: '',
  profileUrl: '',
  sourceStatus: '',
  activity: 'unknown',
  validation: 'unknown',
  affiliation: 'unknown',
  schools: [],
});
const content = (row) =>
  Object.fromEntries(
    Object.keys(emptyRow(row.kind, row.recordId, row.province)).map((k) => [
      k,
      row[k],
    ]),
  );

export class InventoryStore {
  constructor(store) {
    this.store = store;
    this.db = store.db;
  }
  archive() {
    return { imports: snapshotRows(this.store) };
  }
  imported() {
    const entries = new Map();
    for (const batch of snapshotRows(this.store)) {
      const seen = new Set(batch.rows.map((r) => r.recordId));
      if (batch.complete) {
        for (const [id, old] of entries) {
          if (
            old.kind === batch.kind &&
            !seen.has(old.recordId) &&
            !old.missingSince
          ) {
            old.missingSince = batch.observedOn;
            old.changes.push({
              on: batch.observedOn,
              message:
                'Son tam listede görülmedi; hesap silinmedi veya dormant sayılmadı.',
            });
            entries.set(id, old);
          }
        }
      }
      for (const row of batch.rows) {
        const id = row.kind + ':' + row.recordId,
          old = entries.get(id);
        const changes = old?.changes || [];
        if (old) {
          const differences = Object.keys(content(row)).filter(
            (k) => JSON.stringify(row[k]) !== JSON.stringify(old[k]),
          );
          if (differences.length)
            changes.push({
              on: batch.observedOn,
              fields: differences,
              before: Object.fromEntries(differences.map((k) => [k, old[k]])),
              after: Object.fromEntries(differences.map((k) => [k, row[k]])),
              message:
                old.name !== row.name
                  ? `Ad değişikliği: ${old.name} → ${row.name}`
                  : 'ESEP bilgileri güncellendi.',
            });
          if (old.missingSince)
            changes.push({
              on: batch.observedOn,
              message: 'Yeniden listede görüldü.',
            });
        }
        entries.set(id, {
          ...row,
          id,
          observedOn: batch.observedOn,
          sourceName: batch.name,
          createdAt: old?.createdAt || batch.importedAt,
          missingSince: '',
          imported: true,
          changes,
        });
      }
    }
    return [...entries.values()];
  }
  reminders(now = new Date()) {
    const imports = snapshotRows(this.store);
    return Object.keys(inventoryKinds).map((kind) => {
      const last = imports.filter((b) => b.kind === kind && b.complete).at(-1);
      const dueOn = last ? threeMonthsAfter(last.observedOn) : '';
      return {
        kind,
        lastOn: last?.observedOn || '',
        dueOn,
        due: !last || dueOn <= inventoryToday(now),
      };
    });
  }
  view() {
    const rows = new Map(this.imported().map((row) => [row.id, row]));
    const approvals = approvedAccounts(this.store);
    for (const approval of approvals.filter((a) => a.kind !== 'membership')) {
      const recordId =
        approval.kind === 'person' ? approval.accountId : approval.schoolId;
      const id = approval.kind + ':' + recordId;
      const old = rows.get(id);
      rows.set(id, {
        ...(old || {
          ...emptyRow(
            approval.kind,
            recordId,
            this.store.meta('settings')?.province,
          ),
          id,
          name: approval.kind === 'person' ? approval.name : approval.school,
          profileUrl:
            approval.kind === 'person'
              ? approval.profileUrl
              : approval.schoolUrl,
          createdAt: approval.recordedAt,
          imported: false,
          changes: [],
          schools:
            approval.kind === 'person' && approval.schoolId
              ? [
                  {
                    id: approval.schoolId,
                    name: approval.school,
                    url: approval.schoolUrl || '',
                  },
                ]
              : [],
        }),
        approval: {
          caseId: approval.caseId,
          approvedAt: approval.approvedAt,
          resultNumber: approval.resultNumber,
          evidenceUrl: approval.evidenceUrl,
        },
      });
    }
    const all = [...rows.values()];
    // A school renamed under the same ESEP ID is also displayed with its current name in person rows.
    for (const row of all)
      row.schools = row.schools.map((s) => {
        const school = rows.get('school:' + s.id);
        return school?.imported && !school.missingSince
          ? { ...s, name: school.name, url: school.profileUrl || s.url }
          : s;
      });
    return {
      rows: all,
      reminders: this.reminders(),
      statistics: Object.fromEntries(
        Object.keys(inventoryKinds).map((kind) => {
          const relevant = all.filter((r) => r.kind === kind),
            present = relevant.filter((r) => r.imported && !r.missingSince);
          const count = (field, key) =>
            present.filter((r) => r[field] === key).length;
          return [
            kind,
            {
              imported: present.length,
              validationOnly: relevant.filter((r) => !r.imported).length,
              missing: relevant.filter((r) => r.missingSince).length,
              activity: Object.fromEntries(
                Object.keys(activityLabels).map((k) => [
                  k,
                  count('activity', k),
                ]),
              ),
              validation: Object.fromEntries(
                Object.keys(validationLabels).map((k) => [
                  k,
                  count('validation', k),
                ]),
              ),
              affiliation: Object.fromEntries(
                Object.keys(affiliationLabels).map((k) => [
                  k,
                  count('affiliation', k),
                ]),
              ),
            },
          ];
        }),
      ),
      imports: snapshotRows(this.store)
        .map(({ rows: entries, ...batch }) => ({
          ...batch,
          count: entries.length,
        }))
        .reverse(),
      membershipApprovals: approvals.filter((a) => a.kind === 'membership')
        .length,
    };
  }
  validateArchive(data, province, initialCounts = {}) {
    if (!data || !Array.isArray(data.imports) || data.imports.length > 10000)
      throw new Error('Envanter yedeği geçersiz.');
    const ids = new Set(),
      dates = {},
      counts = { ...initialCounts };
    for (const batch of data.imports) {
      if (
        !batch ||
        ids.has(batch.id) ||
        !/^[a-f0-9]{64}$/.test(batch.id || '') ||
        !Object.hasOwn(inventoryKinds, batch.kind) ||
        batch.province !== province ||
        typeof batch.complete !== 'boolean' ||
        typeof batch.name !== 'string' ||
        batch.name.length > 200 ||
        !Number.isFinite(Date.parse(batch.importedAt)) ||
        !Array.isArray(batch.rows) ||
        !batch.rows.length ||
        batch.rows.length > 10000
      )
        throw new Error('Envanter aktarımı geçersiz.');
      day(batch.observedOn);
      if (
        Object.keys(batch).some(
          (k) =>
            ![
              'id',
              'kind',
              'province',
              'observedOn',
              'complete',
              'name',
              'rows',
              'importedAt',
              'ordinal',
            ].includes(k),
        ) ||
        batch.id !==
          digest({
            kind: batch.kind,
            province: batch.province,
            observedOn: batch.observedOn,
            complete: batch.complete,
            name: undefined,
            rows: batch.rows,
            ordinal: batch.ordinal,
          })
      )
        throw new Error('Envanter bütünlük kontrolü geçersiz.');
      if (batch.ordinal !== (counts[batch.kind] || 0))
        throw new Error('Envanter aktarım sırası geçersiz.');
      counts[batch.kind] = batch.ordinal + 1;
      if (dates[batch.kind] > batch.observedOn)
        throw new Error('Envanter kaynak tarihleri geçersiz.');
      dates[batch.kind] = batch.observedOn;
      const rowIds = new Set();
      for (const row of batch.rows) {
        cleanId(row.recordId);
        if (
          rowIds.has(row.recordId) ||
          row.kind !== batch.kind ||
          row.province !== province ||
          !row.name ||
          row.name !== text(row.name, 300) ||
          row.district !== text(row.district, 150) ||
          row.sourceStatus !== text(row.sourceStatus, 250) ||
          !Object.hasOwn(activityLabels, row.activity) ||
          !Object.hasOwn(validationLabels, row.validation) ||
          !Object.hasOwn(affiliationLabels, row.affiliation) ||
          !Array.isArray(row.schools) ||
          row.schools.length > 100 ||
          profile(row.profileUrl) !== row.profileUrl ||
          Object.keys(row).some(
            (k) =>
              !Object.hasOwn(emptyRow(row.kind, row.recordId, province), k),
          )
        )
          throw new Error('Envanter kaydı geçersiz.');
        for (const s of row.schools) {
          if (s.id) cleanId(s.id);
          if (
            !s.name ||
            s.name !== text(s.name, 300) ||
            profile(s.url) !== s.url ||
            Object.keys(s).some((k) => !['id', 'name', 'url'].includes(k))
          )
            throw new Error('Envanter okul ilişkisi geçersiz.');
        }
        rowIds.add(row.recordId);
      }
      ids.add(batch.id);
    }
  }
  restore(data) {
    this.db.exec('DELETE FROM inventory_imports');
    const insert = this.db.prepare(
      'INSERT INTO inventory_imports VALUES (?,?)',
    );
    for (const batch of data.imports)
      insert.run(batch.id, JSON.stringify(batch));
  }
}

export async function previewInventory(store, input) {
  const province = store.meta('settings')?.province;
  if (!province || input.province !== province)
    throw new Error(
      'Dosyanın çalışma alanınızdaki ile ait olduğunu doğrulayın.',
    );
  if (!Object.hasOwn(inventoryKinds, input.kind))
    throw new Error('Kişi veya okul listesi seçin.');
  const observedOn = day(input.observedOn);
  if (observedOn > inventoryToday())
    throw new Error('Kaynak tarihi gelecekte olamaz.');
  const past = snapshotRows(store).filter((b) => b.kind === input.kind);
  if (past.some((b) => b.observedOn > observedOn))
    throw new Error('Daha eski dosya güncel envanterin üzerine yazılamaz.');
  const parsed = await readInput({ ...input, allowEmpty: true });
  if (!parsed.headers || !parsed.rows?.length)
    throw new Error('Başlık ve en az bir kayıt içeren Excel / CSV gerekli.');
  if (parsed.rows.length > 10000)
    throw new Error('En fazla 10.000 satır yükleyin.');
  const idAliases =
    input.kind === 'person'
      ? aliases.recordId.filter(
          (a) => !['school id', 'okul id', 'organisation id'].includes(a),
        )
      : ['id', 'esep id', 'school id', 'okul id', 'organisation id'];
  const mapping = Object.fromEntries(
    inventoryFields.map(([key]) => [
      key,
      input.mapping?.[key] ??
        parsed.headers.findIndex((h) =>
          [key, ...(key === 'recordId' ? idAliases : aliases[key])].some(
            (a) => normalize(a) === normalize(h),
          ),
        ),
    ]),
  );
  if (input.kind === 'school') {
    mapping.school = -1;
    mapping.schoolId = -1;
    mapping.schoolUrl = -1;
  }
  if (
    Object.values(mapping).some(
      (v) => !Number.isInteger(v) || v < -1 || v >= parsed.headers.length,
    )
  )
    throw new Error('Sütun eşleştirmesi geçersiz.');
  const items = [],
    byId = new Map();
  parsed.rows.forEach((raw, index) => {
    const get = (k) =>
      mapping[k] >= 0 ? text(raw[mapping[k]], k === 'status' ? 250 : 300) : '';
    try {
      const recordId = cleanId(get('recordId')),
        name = get('name');
      if (!name) throw new Error('Kişi / okul adı gerekli.');
      if (get('province') && provinceCode(get('province')) !== province)
        throw new Error(
          'Başka il veya tanınmayan bölge; il sütununu kontrol edin.',
        );
      const status = get('status');
      const row = {
        ...emptyRow(input.kind, recordId, province),
        name,
        district: text(get('district'), 150),
        sourceStatus: status,
        activity: statusKey(get('activity') || status, 'activity'),
        validation: statusKey(get('validation') || status, 'validation'),
        affiliation: statusKey(get('affiliation'), 'affiliation'),
        profileUrl: profile(
          get('profileUrl') || parsed.hyperlinks?.[index]?.[mapping.name] || '',
        ),
        schools:
          input.kind === 'person' && get('school')
            ? [
                {
                  id: get('schoolId') ? cleanId(get('schoolId')) : '',
                  name: get('school'),
                  url: profile(
                    get('schoolUrl') ||
                      parsed.hyperlinks?.[index]?.[mapping.school] ||
                      '',
                  ),
                },
              ]
            : [],
      };
      const old = byId.get(recordId);
      if (old) {
        if (
          digest({ ...old.values, schools: [] }) !==
          digest({ ...row, schools: [] })
        )
          throw new Error(
            'Aynı ID için çelişen ad veya durum var; satırları düzeltin.',
          );
        for (const s of row.schools) {
          const match = old.values.schools.find((other) =>
            s.id ? other.id === s.id : other.name === s.name,
          );
          if (match && digest(match) !== digest(s))
            throw new Error('Aynı okul ID için çelişen okul bilgisi var.');
          if (!match) old.values.schools.push(s);
        }
        return;
      }
      const item = { line: index + 2, values: row };
      byId.set(recordId, item);
      items.push(item);
    } catch (error) {
      items.push({ line: index + 2, error: error.message });
    }
  });
  const existing = new Map(
    store.inventory
      .imported()
      .filter((r) => r.kind === input.kind)
      .map((r) => [r.recordId, r]),
  );
  for (const item of items.filter((i) => !i.error)) {
    item.values.schools.sort((a, b) =>
      (a.id + a.name).localeCompare(b.id + b.name),
    );
    const old = existing.get(item.values.recordId);
    item.action = !old
      ? 'new'
      : old.missingSince || digest(content(old)) !== digest(item.values)
        ? 'update'
        : 'unchanged';
    item.previousName = old?.name || '';
  }
  const rows = items.filter((i) => !i.error).map((i) => i.values);
  const complete = input.complete === true;
  const missing = complete
    ? [...existing.values()]
        .filter((r) => !byId.has(r.recordId) && !r.missingSince)
        .map((r) => ({ id: r.recordId, name: r.name }))
    : [];
  const { name, buffer } = decodeFile(input);
  const batch = {
    kind: input.kind,
    province,
    observedOn,
    complete,
    name,
    rows,
  };
  const ordinal = past.length;
  const id = digest({ ...batch, name: undefined, ordinal });
  const latest = past.at(-1);
  const duplicate =
    !!latest &&
    digest({
      kind: latest.kind,
      province: latest.province,
      observedOn: latest.observedOn,
      complete: latest.complete,
      name: undefined,
      rows: latest.rows,
    }) === digest({ ...batch, name: undefined });
  const error =
    complete && Number(input.expectedCount) !== rows.length
      ? 'Tam listede ESEP toplamı, dosyadaki benzersiz ID sayısıyla eşleşmeli.'
      : '';
  return {
    ...batch,
    id,
    ordinal,
    mapping,
    sheets: parsed.sheets,
    sheet: parsed.sheet,
    headers: parsed.headers,
    items,
    missing,
    error,
    duplicate,
    fingerprint: store.fingerprint(),
    token: digest([
      id,
      digest(buffer),
      store.fingerprint(),
      mapping,
      input.expectedCount,
    ]),
    counts: {
      new: items.filter((i) => i.action === 'new').length,
      update: items.filter((i) => i.action === 'update').length,
      unchanged: items.filter((i) => i.action === 'unchanged').length,
      invalid: items.filter((i) => i.error).length,
      missing: missing.length,
    },
  };
}
export function commitInventory(store, preview, input) {
  if (
    input.token !== preview.token ||
    preview.fingerprint !== store.fingerprint()
  )
    throw new Error('Önizleme değişti. Yeniden önizleyin.');
  if (preview.error || preview.counts.invalid || !preview.rows.length)
    throw new Error(
      preview.error || 'Hatalı satırları düzeltip yeniden önizleyin.',
    );
  if (preview.missing.length && input.confirmMissing !== true)
    throw new Error(
      'Tam listede bulunmayan kayıtların listesini inceleyip onaylayın.',
    );
  if (preview.duplicate) return { count: 0, duplicate: true };
  const batch = Object.fromEntries(
    [
      'id',
      'kind',
      'province',
      'observedOn',
      'complete',
      'name',
      'rows',
      'ordinal',
    ].map((k) => [k, preview[k]]),
  );
  batch.importedAt = new Date().toISOString();
  store.inventory.validateArchive({ imports: [batch] }, batch.province, {
    [batch.kind]: snapshotRows(store).filter((b) => b.kind === batch.kind)
      .length,
  });
  return store.transaction(() => {
    store.db
      .prepare('INSERT INTO inventory_imports VALUES (?,?)')
      .run(batch.id, JSON.stringify(batch));
    store.log(
      `${inventoryKinds[batch.kind]} ESEP envanteri güncellendi: ${batch.rows.length} kayıt, kaynak ${batch.observedOn}.`,
    );
    return { count: batch.rows.length };
  });
}
export async function inventoryWorkbook(store, kind) {
  if (!Object.hasOwn(inventoryKinds, kind))
    throw new Error('Envanter türü geçersiz.');
  const headers = [
    'ESEP ID',
    'İsim',
    'İl',
    'Aktif / dormant durumu',
    'Onay durumu',
    'İl ilişkisi',
    'İlçe',
    'Profil bağlantısı',
    'İlişkili okul ID',
    'İlişkili okul adı',
    'Okul bağlantısı',
    'Kaynak tarihi',
    'Son tam listede yok',
    'Kaynak',
  ];
  const rows = store.inventory
    .view()
    .rows.filter((r) => r.kind === kind)
    .flatMap((r) =>
      (r.schools.length ? r.schools : [{}]).map((s) => [
        r.recordId,
        r.name,
        provinces[Number(r.province) - 1],
        activityLabels[r.activity],
        validationLabels[r.validation],
        affiliationLabels[r.affiliation],
        r.district,
        r.profileUrl,
        s.id || '',
        s.name || '',
        s.url || '',
        r.observedOn || '',
        r.missingSince || '',
        r.imported
          ? 'ESEP dosyası'
          : 'Validasyon; ESEP listesinde kontrol bekliyor',
      ]),
    );
  return workbookBuffer(headers, rows);
}
