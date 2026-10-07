#!/usr/bin/env node
// npm test: a fresh temporary database, migrate, seed twice, then every CLI command, the money
// and funding rules, note locking, a Coreplus import with preview and rollback, drafts and HTML.
// TEST_DATABASE_URL runs the same checks against a disposable Postgres (CI does this).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv } from './lib/csv.mjs';
import { migrate } from './migrate.mjs';
import { run, reads, writes, printResult } from './practice.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'group-practice-smoke-'));
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.DATA_DIR = path.join(temp, 'db');
process.env.OUTPUT_DIR = temp;
let db, checks = 0;
const seen = new Set();
const go = async (...args) => { seen.add(args[0]); checks++; return run(db, args); };
const fail = async (args, re) => { seen.add(args[0]); checks++; await assert.rejects(() => run(db, args), re); };
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

try {
  db = await getDb();
  if (process.env.DATABASE_URL) await db.exec('drop schema public cascade; create schema public;');
  await migrate(db);
  assert.equal((await migrate(db)).ran.length, 0); checks++;
  assert.equal(parseCsv('id,text\n1,"  kept  "')[0].text, '  kept  ');
  assert.throws(() => parseCsv('id,text\n1,"open'), /unclosed/);
  assert.throws(() => parseCsv('id,id\n1,2'), /unique/); checks += 3;

  const seed = fs.readFileSync(path.join(REPO_ROOT, 'supabase/seed.sql'), 'utf8');
  await db.exec(seed); await db.exec(seed);
  assert.equal((await go('clients')).length, 6);
  for (const cmd of Object.keys(reads)) { const rows = await go(cmd); assert.ok(Array.isArray(rows), cmd); assert.equal(typeof printResult(rows), 'string'); }

  // The seeded practice says what a Monday needs to hear.
  const attention = await go('attention');
  for (const kind of ['intake', 'notes', 'referral', 'report', 'debt', 'payout', 'cancel', 'outcome', 'consent']) assert.ok(attention.some((r) => r.kind === kind), `attention lacks ${kind}`);
  assert.equal((await go('referrals-due'))[0].remaining, 0);
  assert.equal((await go('debtors')).find((x) => x.name === 'INV-1002').balance_cents, 13000);
  const due = await go('payouts-due');
  assert.equal(due.find((x) => x.practitioner === 'Tom Reid').owed_cents, 21450);
  assert.equal(due.find((x) => x.practitioner === 'Dr Hannah Lee').owed_cents, 15600);
  assert.equal((await go('cpd')).find((x) => x.practitioner === 'Dr Hannah Lee').hours_short, '12.00');
  assert.equal((await go('cancellations')).length, 2);
  assert.equal(Number((await go('outcomes'))[0].change_from_first), -6);
  assert.ok((await go('compliance')).some((r) => r.rule === 'REGISTRATION' && r.record === 'Tom Reid'));
  const helpCommands = (await go('help'))[0].commands.split(', ');
  assert.equal((await go('client', 'aLeX mOrGaN')).client[0].name, 'Alex Morgan');
  await fail(['client', 'alex'], /Ambiguous[\s\S]*Alex Martin[\s\S]*Alex Morgan/);
  await fail(['client', 'nobody'], /No matching/);

  // Setup and intake allocation.
  const [site] = await go('add', 'site', '--name=Carlton');
  const [room] = await go('add', 'room', '--site=Carlton', '--name=Room 7');
  await go('add', 'service', '--code=TEST-50', '--name=Test session', '--item=80110', '--fee-cents=20000');
  const [p] = await go('add', 'practitioner', '--name=Test Clinician', '--discipline=Psychologist', '--registration-due=2030-01-01', '--split=70', '--capacity=1', '--focus=testing');
  const [c] = await go('add', 'client', '--name=Test Client', '--email=test@example.invalid');
  const [intake] = await go('add', 'intake', '--client=Test Client', '--source=GP referral', '--concern=Sleep', `--site=${site.id}`, '--discipline=Clinical psychologist');
  await fail(['allocate-intake', intake.id, '--practitioner=Test Clinician'], /asked for a Clinical psychologist/);
  await fail(['allocate-intake', 'Alex Martin', '--practitioner=Mei Tanaka'], /not taking new clients/);
  const [allocated] = await go('allocate-intake', intake.id, '--practitioner=Test Clinician', '--override');
  assert.equal(allocated.allocated_to, p.id);
  await go('close-intake', 'Casey Nguyen', '--reason=Referred to public service');
  assert.equal((await go('intake')).length, 1);

  // Funding, booking and clash rules.
  const [r] = await go('add', 'referral', '--client=Test Client', '--name=TEST-R', '--funder=Better Access', '--referrer=Demo GP', `--received=${day(-30)}`, '--approved=6', '--initial=true');
  const at = `${day(-2)}T10:00:00+10:00`;
  const booking = ['book', '--client=Test Client', '--practitioner=Test Clinician', `--room=${room.id}`, '--service=TEST-50', '--referral=TEST-R', `--at=${at}`];
  await fail(booking, /outside-provider use/);
  await go('annual-use', 'Test Client', `--year=${day(-2).slice(0, 4)}`, '--external=0', `--checked=${day(-3)}`);
  await go('annual-use', 'Test Client', `--year=${day(4).slice(0, 4)}`, '--external=0', `--checked=${day(-3)}`);
  const [s] = await go(...booking);
  assert.equal(s.fee_cents, 20000); assert.equal(s.funded, true);
  await fail(booking, /already booked/);
  await fail(['book', '--client=Jamie Patel', '--practitioner=Mei Tanaka', `--room=${room.id}`, `--at=${day(-2)}T10:30:00+10:00`, '--fee-cents=1'], /room already booked|already booked/);
  await fail(['complete', s.id], /consent/);
  await go('consent', 'Test Client', `--date=${day(-10)}`, '--contact=true');
  assert.equal((await go('complete', s.id))[0].status, 'completed');
  await fail(['book', '--client=Alex Morgan', '--practitioner=Dr Hannah Lee', '--referral=AM-BA-1', `--at=${day(5)}T09:00:00+10:00`, '--fee-cents=1'], /GP review/);
  await fail(['book', '--client=Test Client', '--practitioner=Test Clinician', `--at=${day(3)} 10:00`, '--fee-cents=1'], /offset/);

  // Notes lock; corrections append.
  const [note] = await go('note', s.id, '--text=Demo <script> note', '--author=Test Clinician');
  await go('finalise', note.id);
  await fail(['note', s.id, '--text=overwrite', '--author=Test'], /immutable/);
  await go('addendum', note.id, '--text=Dated correction', '--author=Test Clinician');
  await assert.rejects(() => db.query('delete from notes where id=$1', [note.id]), /immutable/); checks++;
  await go('outcome', 'Test Client', '--instrument=K10', '--score=30', `--date=${day(-2)}`, `--review=${day(20)}`);

  // Late cancellation, no-show, fee decisions.
  const later = booking.map((a) => a.startsWith('--at=') ? `--at=${day(-1)}T15:00:00+10:00` : a);
  const [late] = await go(...later);
  await go('cancel', late.id, `--notified=${day(-1)}T09:00:00+10:00`);
  const [noShow] = await go(...booking.map((a) => a.startsWith('--at=') ? `--at=${day(-1)}T17:00:00+10:00` : a));
  await go('dna', noShow.id);
  await go('waive', noShow.id, '--reason=Hospital admission', '--author=Practice manager');
  await go('invoice', '--name=TEST-LATE', `--session=${late.id}`, '--cents=10000', `--due=${day(7)}`);
  const decided = await go('cancellations');
  assert.equal(decided.find((x) => x.id === late.id).fee_decision, 'invoiced');
  assert.equal(decided.find((x) => x.id === noShow.id).fee_decision, 'waived');
  await fail(['waive', s.id, '--reason=x', '--author=y'], /late cancellation or no-show/);

  // Money: invoice, receipts, the split and a payout that cannot be paid twice.
  await go('invoice', '--name=TEST-I', `--session=${s.id}`, `--due=${day(5)}`);
  await go('pay', 'TEST-I', '--cents=5000', '--reference=TEST-P1', `--date=${day(-1)}`);
  await go('pay', 'TEST-I', '--cents=15000', '--reference=TEST-P2', `--date=${day(0)}`);
  await fail(['pay', 'TEST-I', '--cents=1', '--reference=OVER', `--date=${day(0)}`], /exceeds/);
  await go('invoice', '--name=TEST-PRIVATE', '--client=Test Client', '--payer=Employer', '--cents=5000', `--due=${day(5)}`);
  const [po] = await go('payout', 'Test Clinician', '--name=PO-TEST', `--through=${day(-1)}`, `--date=${day(0)}`, '--reference=EFT-1');
  assert.equal(po.amount_cents, 3500); assert.equal(po.receipts, 1);
  const [po2] = await go('payout', 'Test Clinician', '--name=PO-TEST-2', `--through=${day(0)}`, `--date=${day(0)}`, '--reference=EFT-2');
  assert.equal(po2.amount_cents, 10500);
  await fail(['payout', 'Test Clinician', '--name=PO-TEST-3', `--through=${day(0)}`, `--date=${day(0)}`, '--reference=EFT-3'], /No unpaid receipts/);
  await assert.rejects(() => db.query('update payouts set amount_cents=0 where name=$1', ['PO-TEST']), /Append-only/); checks++;
  assert.ok((await go('payouts')).some((x) => x.name === 'PO-TEST-2'));

  // Allocation of an unfunded visit, records and drafts.
  const [privateVisit] = await go('book', '--client=Test Client', '--practitioner=Test Clinician', `--at=${day(4)}T10:00:00+10:00`, '--fee-cents=20000');
  assert.equal(privateVisit.funded, false);
  await go('allocate', privateVisit.id, '--referral=TEST-R');
  await go('cpd-log', 'Test Clinician', `--date=${day(0)}`, '--hours=2', '--kind=peer consultation', '--activity=Peer group');
  await go('log', 'Test Client', '--text=Called about parking', '--author=Reception');
  await go('security-review', '--name=backup restore', `--date=${day(0)}`, '--evidence=Restore tested');
  await go('report-sent', 'JP-BA-1', `--date=${day(0)}`);
  await go('close-referral', 'RK-EAP-1');
  const [reminder] = await go('draft-reminder', privateVisit.id);
  assert.match(fs.readFileSync(reminder.draft, 'utf8'), /DRAFT ONLY/);
  const [letter] = await go('draft-gp-letter', 'AM-BA-1');
  assert.match(fs.readFileSync(letter.draft, 'utf8'), /practitioner to complete/);

  // Coreplus import: preview rolls back, repeat imports add nothing, a bad row undoes the file.
  const imports = path.join(temp, 'import'); fs.mkdirSync(imports);
  fs.writeFileSync(path.join(imports, 'Clients.csv'), '﻿Client ID,First Name,Last Name,Email,Date of Birth,Mobile\r\n501,"Kim, Jo",Lane,kim@example.invalid,04/07/1990,0400000000\r\n');
  fs.writeFileSync(path.join(imports, 'Case Notes.csv'), 'Note ID,Client ID,Text\n1,501,"Line one\nLine two, with comma"\n');
  fs.writeFileSync(path.join(imports, 'Appointments.csv'), 'Appointment ID,Client ID,Start,Practitioner,Status\n9,501,2026-08-01 10:00,TC,Attended\n');
  fs.writeFileSync(path.join(imports, 'Invoices.csv'), 'Invoice Number,Client ID,Appointment ID\n77,501,9\n');
  fs.writeFileSync(path.join(imports, 'Payments.csv'), 'Receipt,Invoice Number\n3,77\n');
  const map = path.join(temp, 'map.json');
  fs.writeFileSync(map, JSON.stringify({ files: {
    'Appointments.csv': { entity: 'sessions', columns: { id: 'Appointment ID', client_id: 'Client ID', at: 'Start', practitioner: 'Practitioner', status: 'Status' }, defaults: { minutes: 50, fee_cents: 22000, currency: 'AUD' }, statuses: { Attended: 'completed' }, practitioners: { TC: 'Test Clinician' } },
    'Invoices.csv': { entity: 'invoices', columns: { id: 'Invoice Number', client_id: 'Client ID', session_id: 'Appointment ID' }, defaults: { payer: 'Client', amount_cents: 22000, currency: 'AUD', due: '2026-08-01' } },
    'Payments.csv': { entity: 'payments', columns: { id: 'Receipt', invoice_id: 'Invoice Number' }, defaults: { amount_cents: 22000, date: '2026-08-02' } },
  } }));
  const imp = ['import', 'coreplus', `--dir=${imports}`, `--map=${map}`, '--utc-offset=+10:00'];
  await go(...imp, '--dry-run');
  assert.equal((await go('archive')).length, 0);
  const first = await go(...imp);
  assert.equal(first.find((x) => x.file === 'Clients.csv').new_clients, 1);
  assert.equal((await go('archive')).length, 5);
  const repeat = await go(...imp);
  assert.equal(repeat.reduce((a, x) => a + x.new_clients + x.new_archive_rows + x.new_records, 0), 0);
  assert.equal((await go('archive-search', '--text=Line two')).length, 1);
  assert.equal((await db.query("select dob from clients where external_id='coreplus:501'"))[0].dob, '1990-07-04'); checks++;
  assert.ok((await go('split')).some((x) => x.invoice === 'coreplus:77' && x.practitioner === 'Test Clinician'));
  fs.writeFileSync(path.join(imports, 'Clients.csv'), 'Client ID,First Name\n502,Rollback\n,Invalid\n');
  await fail(imp, /client ID and name required/);
  assert.equal((await db.query("select * from clients where external_id='coreplus:502'")).length, 0); checks++;
  await go('export', `--dir=${path.join(temp, 'export')}`);
  assert.ok(JSON.parse(fs.readFileSync(path.join(temp, 'export', 'payout_lines.json'), 'utf8')).length >= 3); checks++;

  for (const cmd of helpCommands) assert.ok(seen.has(cmd), `Command not exercised: ${cmd}`);
  assert.deepEqual([...new Set(helpCommands)].sort(), [...Object.keys(reads), ...writes].sort());
  await db.close(); db = null;

  // Rendered paperwork and views, then the real CLI's exit code on an ambiguous name.
  for (const script of ['view.mjs', 'docs.mjs']) {
    const res = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', script)], { env: process.env, encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr); checks++;
  }
  const remittance = fs.readdirSync(path.join(temp, 'docs-out', 'remittance')).find((f) => /^po-test-2-[0-9a-f]{8}-/.test(f));
  assert.match(fs.readFileSync(path.join(temp, 'docs-out', 'remittance', remittance), 'utf8'), /105\.00|10500/); checks++;
  const summary = fs.readdirSync(path.join(temp, 'docs-out', 'session-summary')).map((f) => fs.readFileSync(path.join(temp, 'docs-out', 'session-summary', f), 'utf8')).join('');
  assert.match(summary, /&lt;script&gt;/); assert.ok(!summary.includes('<script>')); checks++;
  assert.match(fs.readFileSync(path.join(temp, 'views', 'week.html'), 'utf8'), /Casey Nguyen|Alex Martin/); checks++;
  const cli = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'practice.mjs'), 'client', 'Alex', '--json'], { env: process.env, encoding: 'utf8' });
  assert.equal(cli.status, 1); assert.match(cli.stderr, /Alex Morgan/); checks++;

  console.log(`PASS: ${checks} checks, ${seen.size} CLI commands exercised (${process.env.DATABASE_URL ? 'postgres' : 'pglite'}): intake, funding caps, clashes, notes, fee splits, payouts, Coreplus import, drafts and HTML`);
} finally {
  await db?.close();
  fs.rmSync(temp, { recursive: true, force: true });
}
