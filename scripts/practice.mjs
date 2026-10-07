#!/usr/bin/env node
// The one CLI for a mental health group practice. Human tables by default, --json for machines.
// Names match case-insensitively and by partial text or ID prefix; an ambiguous name lists the
// candidates and exits 1. Every write runs in one transaction. Nothing here sends, claims or pays.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv, pick } from './lib/csv.mjs';
import { table } from './lib/format.mjs';

export const reads = {
  attention: 'select * from v_attention order by kind,client',
  clients: 'select id,name,email,consent_on,contact_ok,active from clients order by name',
  team: 'select name,discipline,registration_due,split_pct,weekly_capacity,focus,takes_new,active from practitioners order by name',
  sites: 'select s.name site,r.name room,r.active from rooms r join sites s on s.id=r.site_id order by s.name,r.name',
  services: 'select code,name,item_number,minutes,fee_cents,currency,active from services order by code',
  diary: "select * from v_diary where starts_at>=current_date-7 order by starts_at",
  'day-sheet': "select practitioner,starts_at,client,site,room,service,funder,status from v_diary where starts_at::date=current_date order by practitioner,starts_at",
  intake: 'select * from v_intake order by urgency desc,days_waiting desc',
  caseload: 'select practitioner,discipline,focus,takes_new,weekly_capacity,booked_next_7,free_next_7,active_clients,new_last_30 from v_caseload order by takes_new desc,free_next_7 desc',
  rooms: 'select site,room,bookings_next_7,hours_next_7 from v_rooms order by site,room',
  referrals: 'select * from v_referrals order by name',
  'referrals-due': 'select name,client,funder,approved,prior_used,completed,booked,remaining from v_referrals where not closed and (remaining<=1 or valid_until<current_date+14) order by remaining,name',
  'reports-due': 'select name,client,referrer,completed,approved,closed from v_reports_due order by name',
  referrers: "select referrer,count(*)::integer courses,sum(completed)::integer sessions,sum(case when report_sent_on is null and funder='Better Access' and (closed or completed+prior_used>=approved) then 1 else 0 end)::integer reports_outstanding from v_referrals group by referrer order by courses desc,referrer",
  'notes-due': 'select client,practitioner,starts_at,note_status,days_since,id from v_notes_due order by days_since desc',
  outcomes: 'select client,instrument,score,measured_on,review_on,change_from_first from v_outcomes where latest=1 order by review_on',
  'annual-allowance': `select c.name client,u.year,u.external_individual,u.checked_on,
    (select count(*) from sessions s join referrals r on r.id=s.referral_id where s.client_id=c.id and s.funded and r.funder='Better Access' and s.status in ('completed','booked') and extract(year from s.service_on)=u.year)::integer here,
    setting('ba_annual_cap')::integer-u.external_individual-(select count(*) from sessions s join referrals r on r.id=s.referral_id where s.client_id=c.id and s.funded and r.funder='Better Access' and s.status in ('completed','booked') and extract(year from s.service_on)=u.year)::integer remaining
    from annual_usage u join clients c on c.id=u.client_id order by c.name,u.year`,
  cancellations: 'select client,practitioner,starts_at,kind,hours_notice,fee_decision,id from v_cancellations order by starts_at desc',
  'no-shows': "select c.name client,count(*)::integer missed,max(s.starts_at) last_missed from sessions s join clients c on c.id=s.client_id where s.status='dna' group by c.name order by missed desc",
  rebooking: "select c.name client,p.name practitioner,max(s.starts_at) last_visit from sessions s join clients c on c.id=s.client_id join practitioners p on p.id=s.practitioner_id where s.status='completed' and c.active and not exists(select 1 from sessions b where b.client_id=c.id and b.status='booked' and b.starts_at>now()) group by c.name,p.name order by last_visit",
  invoices: 'select name,client,payer,currency,amount_cents,paid_cents,balance_cents,due_on from v_debtors order by due_on',
  debtors: 'select name,client,payer,currency,balance_cents,days_overdue from v_debtors where balance_cents>0 order by days_overdue desc',
  takings: 'select currency,payer,sum(amount_cents)::integer billed_cents,sum(paid_cents)::integer paid_cents,sum(balance_cents)::integer owing_cents from v_debtors group by currency,payer order by currency,payer',
  'service-mix': "select p.name practitioner,coalesce(sv.code,'(none)') service,coalesce(sv.item_number,'') item,count(*)::integer sessions,sum(s.fee_cents)::integer fees_cents,s.currency from sessions s join practitioners p on p.id=s.practitioner_id left join services sv on sv.id=s.service_id where s.status='completed' and s.service_on>=current_date-90 group by p.name,sv.code,sv.item_number,s.currency order by p.name,sessions desc",
  split: 'select practitioner,invoice,client,paid_on,currency,amount_cents,split_pct,practitioner_cents as to_practitioner_cents,practice_cents as to_practice_cents,payout from v_split order by paid_on desc',
  'payouts-due': 'select practitioner,currency,receipts,received_cents,owed_cents,oldest_receipt from v_payouts_due order by practitioner',
  payouts: 'select po.name,p.name practitioner,po.through_on,po.currency,po.amount_cents,po.paid_on,po.reference,(select count(*) from payout_lines l where l.payout_id=po.id)::integer receipts from payouts po join practitioners p on p.id=po.practitioner_id order by po.paid_on desc',
  cpd: 'select practitioner,discipline,year_start,year_end,hours,peer_hours,target,peer_target,greatest(target-hours,0) hours_short,greatest(peer_target-peer_hours,0) peer_short from v_cpd order by hours_short desc,practitioner',
  settings: 'select key,value,note from settings order by key',
  archive: 'select source_file,count(*)::integer rows from import_rows group by source_file order by source_file',
  compliance: `select 'CONSENT' rule,name record,'No consent date recorded' finding from clients where active and consent_on is null
    union all select 'NOTE',client,'Completed session without a finalised note ('||days_since||' days)' from v_notes_due
    union all select 'COURSE',name,'Recorded and booked sessions exceed the approval' from v_referrals where remaining<0
    union all select 'REPORT',name,'Course ended; no report date recorded' from v_reports_due
    union all select 'ANNUAL',c.name,'No outside-provider check for this year' from clients c where exists(select 1 from referrals r where r.client_id=c.id and r.funder='Better Access' and not r.closed) and not exists(select 1 from annual_usage u where u.client_id=c.id and u.year=extract(year from current_date))
    union all select 'REGISTRATION',name,'Registration review date passed' from practitioners where active and registration_due<current_date
    union all select 'CPD',practitioner,hours||' of '||target||' hours, '||peer_hours||' of '||peer_target||' peer, year ends '||year_end from v_cpd where hours<target or peer_hours<peer_target
    union all select 'SECURITY',x.name,'No review evidence within '||setting('security_review_days')||' days (practice policy)' from (values ('access review'),('backup restore'),('device encryption'),('agent data agreement')) x(name) where not exists(select 1 from security_checks s where s.name=x.name and s.checked_on>=current_date-setting('security_review_days')::integer)`,
};

export const writes = ['client', 'add', 'allocate-intake', 'close-intake', 'book', 'complete', 'cancel', 'dna', 'waive', 'allocate', 'note', 'finalise', 'addendum', 'outcome', 'invoice', 'pay', 'payout', 'cpd-log', 'log', 'consent', 'annual-use', 'report-sent', 'close-referral', 'security-review', 'draft-reminder', 'draft-gp-letter', 'import', 'export', 'archive-search'];
export const entities = ['settings', 'sites', 'rooms', 'practitioners', 'clients', 'intakes', 'referrals', 'annual_usage', 'services', 'sessions', 'notes', 'addenda', 'outcomes', 'invoices', 'payments', 'payouts', 'payout_lines', 'cpd', 'activity', 'import_rows', 'security_checks'];

function required(o, k) { if (o[k] === undefined || o[k] === '' || o[k] === true) throw Error(`Required --${k}=...`); return o[k]; }
function int(v, label, min = 0, max = 100000000) { if (!/^\d+$/.test(String(v)) || Number(v) < min || Number(v) > max) throw Error(`Invalid ${label}`); return Number(v); }
function num(v, label, min, max) { const n = Number(v); if (!Number.isFinite(n) || n < min || n > max) throw Error(`Invalid ${label}`); return n; }
function date(v) { if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) !== v) throw Error('Use a real date YYYY-MM-DD'); return v; }
function timestamp(v) { if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.test(v) || !Number.isFinite(Date.parse(v))) throw Error('Timestamp needs a date, time and offset, e.g. 2026-10-01T09:00:00+10:00'); return v; }
function bool(v) { if (!['true', 'false'].includes(String(v))) throw Error('Use true or false'); return String(v) === 'true'; }
const today = () => new Date().toISOString().slice(0, 10);

// What a person types to find a record, per table.
const LABELS = {
  clients: 'name', practitioners: 'name', referrals: 'name', invoices: 'name', payouts: 'name', services: 'code', sites: 'name',
  rooms: "(select s.name from sites s where s.id=site_id)||' '||name", sessions: 'external_id', notes: 'author',
  intakes: '(select c.name from clients c where c.id=client_id)',
};
export async function resolve(db, entity, term) {
  const col = LABELS[entity];
  if (!col || !term || term === true) throw Error(`Supply a ${entity} name or ID`);
  let rows = await db.query(`select id,${col} as label from ${entity} where id::text=$1 or lower(coalesce(${col},''))=lower($1)`, [term]);
  if (!rows.length) rows = await db.query(`select id,${col} as label from ${entity} where starts_with(id::text,lower($1)) or strpos(lower(coalesce(${col},'')),lower($1))>0 order by 2`, [term]);
  if (rows.length !== 1) throw Error(`${rows.length ? 'Ambiguous' : 'No matching'} ${entity}: ${term}\n${rows.map((r) => `${r.id}  ${r.label || ''}`).join('\n')}`);
  return rows[0].id;
}
async function transaction(db, fn) { await db.exec('BEGIN'); try { const r = await fn(); await db.exec('COMMIT'); return r; } catch (e) { await db.exec('ROLLBACK'); throw e; } }
async function insert(db, t, values) { const keys = Object.keys(values); return db.query(`insert into ${t}(${keys.join(',')}) values(${keys.map((_, i) => '$' + (i + 1)).join(',')}) returning *`, Object.values(values)); }
async function setting(db, key) { return Number((await db.query('select value from settings where key=$1', [key]))[0].value); }

// A funded visit must fit the referral course and, for Better Access, the calendar-year cap.
async function fundingGate(db, client, referral, startsOn, exclude = null) {
  if (!referral) throw Error('A funded session needs --referral');
  const [r] = await db.query('select * from referrals where id=$1 for update', [referral]);
  if (!r || r.client_id !== client || r.closed) throw Error('Referral must be open and belong to this client');
  if (r.valid_until && startsOn > r.valid_until) throw Error('Funding approval expired');
  if (startsOn < r.received_on) throw Error('Session predates referral');
  const [{ n }] = await db.query("select count(*)::integer n from sessions where referral_id=$1 and funded and status in ('booked','completed') and ($2::uuid is null or id<>$2)", [referral, exclude]);
  if (n + r.prior_used >= r.approved) throw Error('Referral course has no funded sessions left; the client needs a GP review for more');
  if (r.funder === 'Better Access') {
    const year = Number(startsOn.slice(0, 4));
    const [u] = await db.query('select * from annual_usage where client_id=$1 and year=$2 for update', [client, year]);
    if (!u) throw Error('Record the checked outside-provider use (annual-use) before reserving Better Access sessions');
    const [{ n: used }] = await db.query("select count(*)::integer n from sessions s join referrals r on r.id=s.referral_id where s.client_id=$1 and r.funder='Better Access' and s.funded and s.status in ('booked','completed') and extract(year from s.service_on)=$2 and ($3::uuid is null or s.id<>$3)", [client, year, exclude]);
    if (u.external_individual + used >= await setting(db, 'ba_annual_cap')) throw Error('Better Access annual allowance used up; review funding, do not deny care');
  }
}

async function clash(db, { practitioner, client, room, starts, minutes, exclude = null }) {
  const hits = await db.query(`select id from sessions where status in ('booked','completed') and ($5::uuid is null or id<>$5)
    and (practitioner_id=$1 or client_id=$2 or ($6::uuid is not null and room_id=$6))
    and starts_at<$3::timestamptz+($4::integer*interval '1 minute') and starts_at+minutes*interval '1 minute'>$3::timestamptz`, [practitioner, client, starts, minutes, exclude, room]);
  if (hits.length) throw Error('Client, practitioner or room already booked in this time');
}

// Coreplus data backup (Setup > Settings > Data Backup) gives CSV files. Every row lands in the
// source archive; clients become records on aliases below; appointments, invoices and receipts
// need a reviewed mapping file because column names vary by backup and practice settings.
async function importCoreplus(db, o) {
  const dir = path.resolve(required(o, 'dir'));
  const rank = (f) => (/client/i.test(f) && !/appoint|invoice|payment|note|letter/i.test(f) ? 0 : /appoint|booking/i.test(f) ? 1 : /invoice/i.test(f) ? 2 : /payment|receipt/i.test(f) ? 3 : 4);
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.csv')).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  if (!files.length) throw Error('No CSV files; extract the Coreplus backup archive first');
  const mapping = o.map ? JSON.parse(fs.readFileSync(o.map, 'utf8')) : {};
  return transaction(db, async () => {
    const report = [];
    for (const file of files) {
      const rows = parseCsv(fs.readFileSync(path.join(dir, file), 'utf8'));
      let clients = 0, archived = 0, operational = 0;
      const spec = mapping.files?.[file];
      const isClients = spec ? spec.entity === 'clients' : rank(file) === 0;
      for (let i = 0; i < rows.length; i++) {
        const raw = rows[i];
        const where = `${file} row ${i + 2}`;
        const fingerprint = createHash('sha256').update(file + '\n' + JSON.stringify(raw)).digest('hex');
        archived += (await db.query('insert into import_rows(source_file,fingerprint,payload) values($1,$2,$3) on conflict(fingerprint) do nothing returning id', [file, fingerprint, JSON.stringify(raw)])).length;
        const col = (k, ...aliases) => pick(raw, ...(spec?.columns?.[k] ? [spec.columns[k]] : aliases));
        if (isClients) {
          const ext = col('id', 'Client ID', 'ClientID', 'Client Id', 'Client Number', 'File Number', 'ID');
          const name = col('name', 'Client Name', 'Name', 'Full Name') || [col('first', 'First Name', 'FirstName', 'Given Name'), col('last', 'Last Name', 'LastName', 'Surname', 'Family Name')].filter(Boolean).join(' ');
          if (!ext || !name) throw Error(`${where}: client ID and name required; use --map=columns.json`);
          let dob = col('dob', 'Date of Birth', 'DOB', 'Birth Date');
          if (dob && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dob)) { const [d, m, y] = dob.split('/'); dob = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; }
          if (dob) date(dob);
          clients += (await db.query('insert into clients(external_id,name,email,phone,dob) values($1,$2,$3,$4,$5) on conflict(external_id) do nothing returning id',
            [`coreplus:${ext}`, name, col('email', 'Email', 'Email Address') || null, col('phone', 'Mobile', 'Mobile Phone', 'Phone') || null, dob || null])).length;
          continue;
        }
        if (!spec) continue;
        const v = (k) => { const c = spec.columns?.[k]; return c ? pick(raw, c) : spec.defaults?.[k]; };
        const req = (k) => { const val = v(k); if (val === undefined || val === '') throw Error(`${where}: mapped ${k} required`); return String(val); };
        const client = async () => { const [c] = await db.query('select id from clients where external_id=$1', [`coreplus:${req('client_id')}`]); if (!c) throw Error(`${where}: unknown client`); return c.id; };
        if (spec.entity === 'sessions') {
          const ext = `coreplus:${req('id')}`;
          if ((await db.query('select id from sessions where external_id=$1', [ext])).length) continue;
          const status = spec.statuses?.[req('status')];
          if (!['booked', 'completed', 'cancelled', 'dna'].includes(status)) throw Error(`${where}: map appointment status "${v('status')}" in statuses`);
          let at = req('at');
          if (!/(Z|[+-]\d\d:\d\d)$/.test(at) && o['utc-offset']) at = at.replace(' ', 'T') + o['utc-offset'];
          timestamp(at);
          const name = spec.practitioners?.[req('practitioner')];
          if (!name) throw Error(`${where}: add "${v('practitioner')}" to practitioners in the mapping`);
          const pid = await resolve(db, 'practitioners', name), cid = await client();
          const minutes = int(req('minutes'), 'minutes', 5, 240);
          if (['booked', 'completed'].includes(status)) await clash(db, { practitioner: pid, client: cid, room: null, starts: at, minutes });
          await insert(db, 'sessions', { external_id: ext, client_id: cid, practitioner_id: pid, starts_at: at, service_on: at.slice(0, 10), minutes, status, fee_cents: int(req('fee_cents'), 'fee_cents'), currency: req('currency'), funded: false });
          operational++;
        } else if (spec.entity === 'invoices') {
          const name = `coreplus:${req('id')}`;
          if ((await db.query('select id from invoices where name=$1', [name])).length) continue;
          const sessionExt = v('session_id');
          const [s] = sessionExt ? await db.query('select id from sessions where external_id=$1', [`coreplus:${sessionExt}`]) : [];
          await insert(db, 'invoices', { name, client_id: await client(), session_id: s?.id || null, payer: req('payer'), amount_cents: int(req('amount_cents'), 'amount_cents', 1), currency: req('currency'), due_on: date(req('due')) });
          operational++;
        } else if (spec.entity === 'payments') {
          const reference = `coreplus:${req('id')}`;
          if ((await db.query('select id from payments where reference=$1', [reference])).length) continue;
          const [inv] = await db.query('select * from v_debtors where name=$1', [`coreplus:${req('invoice_id')}`]);
          if (!inv) throw Error(`${where}: invoice missing`);
          const cents = int(req('amount_cents'), 'amount_cents', 1);
          if (cents > inv.balance_cents) throw Error(`${where}: payment exceeds balance`);
          await insert(db, 'payments', { invoice_id: inv.id, reference, amount_cents: cents, paid_on: date(req('date')) });
          operational++;
        } else throw Error(`${file}: unsupported mapped entity ${spec.entity}`);
      }
      report.push({ file, rows: rows.length, new_clients: clients, new_archive_rows: archived, new_records: operational, mode: o['dry-run'] ? 'preview (rolled back)' : 'imported' });
    }
    if (o['dry-run']) { await db.exec('ROLLBACK'); await db.exec('BEGIN'); }
    return report;
  });
}

function draft(name, id, text) {
  const dir = path.join(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}-${id}-${Date.now()}.txt`);
  fs.writeFileSync(file, text, { mode: 0o600 });
  return [{ draft: file, sent: false }];
}

export async function run(db, argv) {
  const o = {}, pos = [];
  for (const a of argv) { if (a.startsWith('--')) { const i = a.indexOf('='); o[a.slice(2, i < 0 ? undefined : i)] = i < 0 ? true : a.slice(i + 1); } else pos.push(a); }
  const [cmd = 'help', arg] = pos;
  if (cmd === 'help') return [{ commands: [...Object.keys(reads), ...writes].join(', ') }];
  if (reads[cmd]) return db.query(reads[cmd]);
  if (cmd === 'client') {
    const id = await resolve(db, 'clients', arg);
    const q = (sql) => db.query(sql, [id]);
    return {
      client: await q('select * from clients where id=$1'),
      intake: await q('select received_on,source,concern,urgency,allocated_on,closed_reason from intakes where client_id=$1'),
      referrals: await q('select name,funder,referrer,approved,prior_used,completed,booked,remaining,closed from v_referrals where id in (select id from referrals where client_id=$1)'),
      sessions: await q('select v.starts_at,v.practitioner,v.room,v.service,v.status,v.funded from v_diary v join sessions s on s.id=v.id where s.client_id=$1 order by v.starts_at'),
      outcomes: await q('select instrument,score,measured_on,review_on from outcomes where client_id=$1 order by measured_on'),
      accounts: await q('select name,payer,currency,balance_cents,due_on from v_debtors where id in (select id from invoices where client_id=$1)'),
      activity: await q('select created_at,author,body from activity where client_id=$1 order by created_at'),
    };
  }
  if (cmd === 'import') { if (arg !== 'coreplus') throw Error('Use: import coreplus --dir=<extracted backup> [--map=columns.json] [--dry-run]'); return importCoreplus(db, o); }
  if (cmd === 'archive-search') return db.query('select source_file,payload from import_rows where strpos(lower(payload::text),lower($1))>0 limit 100', [required(o, 'text')]);
  if (cmd === 'export') {
    const dir = path.resolve(required(o, 'dir'));
    fs.mkdirSync(dir, { recursive: true });
    const report = [];
    await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');
    try {
      for (const e of entities) { const rows = await db.query(`select * from ${e} order by created_at,1`); fs.writeFileSync(path.join(dir, e + '.json'), JSON.stringify(rows, null, 2) + '\n', { mode: 0o600 }); report.push({ entity: e, rows: rows.length }); }
      await db.exec('COMMIT');
    } catch (e) { await db.exec('ROLLBACK'); throw e; }
    return report;
  }
  return transaction(db, async () => {
    if (cmd === 'add') {
      if (arg === 'client') return insert(db, 'clients', { name: required(o, 'name'), email: o.email || null, phone: o.phone || null });
      if (arg === 'practitioner') return insert(db, 'practitioners', { name: required(o, 'name'), discipline: required(o, 'discipline'), registration_due: o['registration-due'] ? date(o['registration-due']) : null, split_pct: num(o.split ?? 60, 'split', 0, 100), weekly_capacity: int(o.capacity ?? 20, 'capacity', 0, 60), focus: o.focus || '', takes_new: bool(o['takes-new'] ?? 'true') });
      if (arg === 'site') return insert(db, 'sites', { name: required(o, 'name') });
      if (arg === 'room') return insert(db, 'rooms', { site_id: await resolve(db, 'sites', required(o, 'site')), name: required(o, 'name') });
      if (arg === 'service') return insert(db, 'services', { code: required(o, 'code'), name: required(o, 'name'), item_number: o.item || null, minutes: int(o.minutes ?? 50, 'minutes', 5, 240), fee_cents: int(required(o, 'fee-cents'), 'fee-cents'), currency: o.currency || 'AUD' });
      if (arg === 'referral') return insert(db, 'referrals', { client_id: await resolve(db, 'clients', required(o, 'client')), name: required(o, 'name'), funder: required(o, 'funder'), referrer: required(o, 'referrer'), received_on: date(required(o, 'received')), approved: int(required(o, 'approved'), 'approved', 1, 1000), initial_course: bool(o.initial ?? 'false'), prior_used: int(o['prior-used'] ?? 0, 'prior-used'), valid_until: o.until ? date(o.until) : null });
      if (arg === 'intake') return insert(db, 'intakes', { client_id: await resolve(db, 'clients', required(o, 'client')), source: required(o, 'source'), concern: required(o, 'concern'), urgency: o.urgency || 'routine', preferred_site_id: o.site ? await resolve(db, 'sites', o.site) : null, preferred_discipline: o.discipline || null, received_on: o.received ? date(o.received) : today() });
      throw Error('add client|practitioner|site|room|service|referral|intake');
    }
    if (cmd === 'allocate-intake') {
      const id = await resolve(db, 'intakes', arg);
      const [i] = await db.query('select * from intakes where id=$1 for update', [id]);
      if (i.allocated_to || i.closed_reason) throw Error('Intake already allocated or closed');
      const pid = await resolve(db, 'practitioners', required(o, 'practitioner'));
      const [p] = await db.query('select * from v_caseload where id=$1', [pid]);
      if (!p) throw Error('Practitioner inactive');
      if (!o.override) {
        if (!p.takes_new) throw Error(`${p.practitioner} is not taking new clients; add --override if agreed`);
        if (p.free_next_7 <= 0) throw Error(`${p.practitioner} has no free capacity in the next seven days; add --override if agreed`);
        if (i.preferred_discipline && i.preferred_discipline !== p.discipline) throw Error(`Client asked for a ${i.preferred_discipline}; add --override if agreed`);
      }
      return db.query('update intakes set allocated_to=$2,allocated_on=current_date where id=$1 returning *', [id, pid]);
    }
    if (cmd === 'close-intake') return db.query('update intakes set closed_reason=$2 where id=$1 and allocated_to is null and closed_reason is null returning *', [await resolve(db, 'intakes', arg), required(o, 'reason')]);
    if (cmd === 'book') {
      const c = await resolve(db, 'clients', required(o, 'client')), p = await resolve(db, 'practitioners', required(o, 'practitioner'));
      const room = o.room ? await resolve(db, 'rooms', o.room) : null;
      const service = o.service ? await resolve(db, 'services', o.service) : null;
      const [sv] = service ? await db.query('select * from services where id=$1', [service]) : [];
      const starts = timestamp(required(o, 'at')), minutes = int(o.minutes ?? sv?.minutes ?? 50, 'minutes', 5, 240), funded = bool(o.funded ?? (o.referral ? 'true' : 'false'));
      await db.query('select id from clients where id=$1 for update', [c]);
      await db.query('select id from practitioners where id=$1 for update', [p]);
      const [{ active }] = await db.query('select active from practitioners where id=$1', [p]);
      if (!active) throw Error('Practitioner inactive');
      await clash(db, { practitioner: p, client: c, room, starts, minutes });
      const r = o.referral ? await resolve(db, 'referrals', o.referral) : null;
      if (funded) await fundingGate(db, c, r, starts.slice(0, 10));
      const fee = o['fee-cents'] !== undefined ? int(o['fee-cents'], 'fee-cents') : sv ? sv.fee_cents : int(required(o, 'fee-cents'), 'fee-cents');
      return insert(db, 'sessions', { client_id: c, practitioner_id: p, room_id: room, referral_id: r, service_id: service, starts_at: starts, service_on: starts.slice(0, 10), minutes, fee_cents: fee, currency: o.currency || sv?.currency || 'AUD', funded });
    }
    if (['complete', 'cancel', 'dna'].includes(cmd)) {
      const id = await resolve(db, 'sessions', arg);
      const [s] = await db.query('select * from sessions where id=$1 for update', [id]);
      if (s.status !== 'booked') throw Error('Only a booked session can change state');
      if (cmd === 'complete') {
        const [c] = await db.query('select * from clients where id=$1 for update', [s.client_id]);
        if (!c.consent_on || c.consent_on > s.service_on) throw Error('Record consent valid at the session before completing it');
        if (new Date(s.starts_at) > new Date()) throw Error('Cannot complete a future session');
        if (s.funded) await fundingGate(db, s.client_id, s.referral_id, s.service_on, id);
        return db.query("update sessions set status='completed' where id=$1 returning *", [id]);
      }
      if (cmd === 'cancel') return db.query("update sessions set status='cancelled',cancelled_at=$2,funded=false where id=$1 returning *", [id, o.notified ? timestamp(o.notified) : new Date().toISOString()]);
      return db.query("update sessions set status='dna',funded=false where id=$1 returning *", [id]);
    }
    if (cmd === 'waive') {
      const id = await resolve(db, 'sessions', arg);
      const [s] = await db.query('select * from v_cancellations where id=$1', [id]);
      if (!s) throw Error('Only a late cancellation or no-show can have its fee waived');
      if (s.fee_decision === 'invoiced') throw Error('A fee is already invoiced for this session');
      await insert(db, 'activity', { client_id: (await db.query('select client_id from sessions where id=$1', [id]))[0].client_id, body: `Fee waived for ${s.kind} on ${new Date(s.starts_at).toISOString().slice(0, 10)}: ${required(o, 'reason')}`, author: required(o, 'author') });
      return db.query('update sessions set fee_waived=true where id=$1 returning id,status,fee_waived', [id]);
    }
    if (cmd === 'allocate') {
      const id = await resolve(db, 'sessions', arg);
      const [s] = await db.query('select * from sessions where id=$1 for update', [id]);
      if (!['booked', 'completed'].includes(s.status)) throw Error('Only booked or completed sessions can be allocated to funding');
      const ref = await resolve(db, 'referrals', required(o, 'referral'));
      await fundingGate(db, s.client_id, ref, s.service_on, id);
      return db.query('update sessions set referral_id=$2,funded=true where id=$1 returning *', [id, ref]);
    }
    if (cmd === 'note') {
      const s = await resolve(db, 'sessions', arg);
      const [session] = await db.query('select status from sessions where id=$1', [s]);
      if (session.status !== 'completed') throw Error('Complete the session before recording a note');
      return db.query('insert into notes(session_id,body,author) values($1,$2,$3) on conflict(session_id) do update set body=excluded.body,author=excluded.author returning *', [s, required(o, 'text'), required(o, 'author')]);
    }
    if (cmd === 'finalise') return db.query('update notes set finalised_at=now() where id=$1 returning *', [await resolve(db, 'notes', arg)]);
    if (cmd === 'addendum') {
      const id = await resolve(db, 'notes', arg);
      const [n] = await db.query('select finalised_at from notes where id=$1', [id]);
      if (!n.finalised_at) throw Error('Finalise the note before adding a correction');
      return insert(db, 'addenda', { note_id: id, body: required(o, 'text'), author: required(o, 'author') });
    }
    if (cmd === 'outcome') return insert(db, 'outcomes', { client_id: await resolve(db, 'clients', arg), instrument: required(o, 'instrument'), score: num(required(o, 'score'), 'score', -1000, 1000), measured_on: date(required(o, 'date')), review_on: date(required(o, 'review')), comment: o.comment || '' });
    if (cmd === 'invoice') {
      let client, session = null, cents, currency;
      if (o.session) {
        session = await resolve(db, 'sessions', o.session);
        const [s] = await db.query('select s.*,c.name client from sessions s join clients c on c.id=s.client_id where s.id=$1', [session]);
        if (s.status === 'booked') throw Error('Invoice a session after it happens');
        if (s.status === 'cancelled' && !(await db.query('select 1 from v_cancellations where id=$1', [session])).length) throw Error('A cancellation with notice carries no fee');
        client = s.client_id; cents = o.cents ? int(o.cents, 'cents', 1) : s.fee_cents; currency = s.currency;
        o.payer ??= s.client;
      } else { client = await resolve(db, 'clients', required(o, 'client')); cents = int(required(o, 'cents'), 'cents', 1); currency = o.currency || 'AUD'; }
      return insert(db, 'invoices', { name: required(o, 'name'), client_id: client, session_id: session, payer: required(o, 'payer'), amount_cents: cents, currency, due_on: date(required(o, 'due')) });
    }
    if (cmd === 'pay') {
      const id = await resolve(db, 'invoices', arg);
      await db.query('select id from invoices where id=$1 for update', [id]);
      const [i] = await db.query('select balance_cents from v_debtors where id=$1', [id]);
      const cents = int(required(o, 'cents'), 'cents', 1);
      if (cents > i.balance_cents) throw Error('Payment exceeds balance');
      return insert(db, 'payments', { invoice_id: id, reference: required(o, 'reference'), amount_cents: cents, paid_on: date(required(o, 'date')) });
    }
    if (cmd === 'payout') {
      const pid = await resolve(db, 'practitioners', arg);
      await db.query('select id from practitioners where id=$1 for update', [pid]);
      const through = date(required(o, 'through'));
      const lines = await db.query('select * from v_split where practitioner_id=$1 and payout is null and paid_on<=$2 order by paid_on', [pid, through]);
      if (!lines.length) throw Error('No unpaid receipts for this practitioner up to that date');
      const currencies = [...new Set(lines.map((l) => l.currency))];
      if (currencies.length > 1) throw Error('Receipts in more than one currency; run one payout per currency with --through dates that separate them');
      const amount = lines.reduce((a, l) => a + Number(l.practitioner_cents), 0);
      const [po] = await insert(db, 'payouts', { name: required(o, 'name'), practitioner_id: pid, through_on: through, amount_cents: amount, currency: currencies[0], paid_on: date(required(o, 'date')), reference: required(o, 'reference') });
      for (const l of lines) await insert(db, 'payout_lines', { payout_id: po.id, payment_id: l.payment_id, split_pct: l.split_pct, practitioner_cents: l.practitioner_cents });
      return [{ ...po, receipts: lines.length }];
    }
    if (cmd === 'cpd-log') return insert(db, 'cpd', { practitioner_id: await resolve(db, 'practitioners', arg), done_on: date(required(o, 'date')), hours: num(required(o, 'hours'), 'hours', 0.25, 40), kind: o.kind || 'cpd', activity: required(o, 'activity') });
    if (cmd === 'log') return insert(db, 'activity', { client_id: await resolve(db, 'clients', arg), body: required(o, 'text'), author: required(o, 'author') });
    if (cmd === 'consent') {
      const on = date(required(o, 'date'));
      if (on > today()) throw Error('Consent date cannot be in the future');
      return db.query('update clients set consent_on=$2,contact_ok=$3 where id=$1 returning *', [await resolve(db, 'clients', arg), on, bool(required(o, 'contact'))]);
    }
    if (cmd === 'annual-use') return db.query('insert into annual_usage(client_id,year,external_individual,checked_on) values($1,$2,$3,$4) on conflict(client_id,year) do update set external_individual=excluded.external_individual,checked_on=excluded.checked_on returning *', [await resolve(db, 'clients', arg), int(required(o, 'year'), 'year', 2000, 2200), int(required(o, 'external'), 'external', 0, 50), date(required(o, 'checked'))]);
    if (cmd === 'report-sent') return db.query('update referrals set report_sent_on=$2 where id=$1 returning *', [await resolve(db, 'referrals', arg), date(required(o, 'date'))]);
    if (cmd === 'close-referral') return db.query('update referrals set closed=true where id=$1 returning *', [await resolve(db, 'referrals', arg)]);
    if (cmd === 'security-review') return db.query('insert into security_checks(name,checked_on,evidence) values($1,$2,$3) on conflict(name) do update set checked_on=excluded.checked_on,evidence=excluded.evidence returning *', [required(o, 'name'), date(required(o, 'date')), required(o, 'evidence')]);
    if (cmd === 'draft-reminder') {
      const id = await resolve(db, 'sessions', arg);
      const [s] = await db.query('select v.*,c.email,c.contact_ok from v_diary v join sessions x on x.id=v.id join clients c on c.id=x.client_id where v.id=$1', [id]);
      if (!s.contact_ok) throw Error('No contact permission recorded');
      if (s.status !== 'booked') throw Error('A reminder needs a booked session');
      return draft('reminder', id, `DRAFT ONLY. Check the recipient and local time before sending.\nTo: ${s.email || '[verify address]'}\n\nHello ${s.client},\n\nThis is a reminder of your appointment with ${s.practitioner} at ${new Date(s.starts_at).toISOString().replace('T', ' ').slice(0, 16)} UTC${s.site ? `, ${s.site} ${s.room}` : ''}.\nIf you need to change it, please call the practice at least 24 hours before.\n`);
    }
    if (cmd === 'draft-gp-letter') {
      const id = await resolve(db, 'referrals', arg);
      const [r] = await db.query('select * from v_referrals where id=$1', [id]);
      return draft('gp-letter', id, `DRAFT ONLY. The treating practitioner completes, checks consent to disclose and approves.\nTo: ${r.referrer}\nClient: ${r.client}\nCourse: ${r.name} (${r.funder})\nSessions recorded this course: ${r.completed}; before this practice: ${r.prior_used}\n\nAssessments: [practitioner to complete]\nTreatment provided: [practitioner to complete]\nRecommendations: [practitioner to complete]\n`);
    }
    throw Error(`Unknown command ${cmd}; run help`);
  });
}

export function printResult(result, json = false) {
  if (json) return JSON.stringify(result, null, 2);
  if (!Array.isArray(result)) return Object.entries(result).map(([name, rows]) => `${name}\n${printResult(rows)}`).join('\n\n');
  if (!result.length) return '(none)';
  const rows = result.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [
    k.endsWith('_cents') ? k.slice(0, -6) : k,
    k.endsWith('_cents') && v !== null ? `${r.currency || ''} ${(Number(v) / 100).toFixed(2)}`.trim()
      : v instanceof Date ? v.toISOString().slice(0, 16).replace('T', ' ')
        : v && typeof v === 'object' ? JSON.stringify(v) : v,
  ])));
  return table(rows, Object.keys(rows[0]).map((key) => ({ key, label: key, width: key === 'id' ? 10 : 60 })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let db;
  try { db = await getDb(); console.log(printResult(await run(db, process.argv.slice(2)), process.argv.includes('--json'))); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
  finally { await db?.close(); }
}
