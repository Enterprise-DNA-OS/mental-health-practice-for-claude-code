<h1 align="center">Mental Health Practice for Claude Code</h1>

<p align="center">
  <strong>The open-source mental health and psychology group practice system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your Coreplus data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=coreplus">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/coreplus?utm_source=github&utm_medium=readme&utm_campaign=coreplus">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-coreplus">Instead of Coreplus</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Mental Health Practice for Claude Code does the job you pay Coreplus for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query and answers the question you actually asked.

Coreplus lists CORE at A$35 and PLUS at A$49 per user per month, excluding GST, with GROUP quoted for 8 or more practitioners and SMS charged per message ([pricing](https://www.corepluspm.com/pricing), checked 7 October 2026). Ten practitioners on PLUS is A$5,880 a year before SMS and add-ons. That is not a five-figure bill, so the case for this repo is ownership and fit, not a big saving.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=coreplus).

It is built for a group mental health practice: several psychologists, counsellors or social workers across one or more sites, paid as contractors on a fee split. It covers intake and allocation by capacity, rooms, Better Access referral courses and the calendar-year cap, session notes that lock, outcome scores, invoices and receipts, practitioner payouts with remittance statements, CPD hours and late-cancellation fees. It records money but never claims from Medicare, charges a card or moves a payment, and it never interprets a score.

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no tiers, no add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/mental-health-practice-for-claude-code.git
cd mental-health-practice-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type a slash command. Start with `/attention`, then `/caseload` and `/payouts-due`. The fictional practice, Northside Minds, has two clients waiting for allocation, two Better Access courses at zero, a report owed to a GP, a draft and a missing note, an overdue account, two practitioners owed their share, a late cancellation and a no-show with no fee decision, a psychologist short of CPD hours and a registration review that has passed. Dates move with the day you seed it.

```bash
npm test        # fresh temporary database, every command exercised
npm run view    # views/week.html, team.html, money.html
npm run docs    # remittance statements, referrer report drafts, statements, session records
```

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

Every read takes `--json`. Names match without case and by partial text or ID prefix; an ambiguous name lists the candidates and exits 1. Full syntax is in [CLAUDE.md](CLAUDE.md).

| Command | What it does |
|---|---|
| `/attention` | The Monday list: intake waiting, notes, courses, reports, debts, payouts, cancellations, outcomes, consent. |
| `/clients` | The client list. |
| `/client` | One client: intake, referrals, sessions, outcomes, accounts and activity. |
| `/team` | Practitioners, discipline, split, capacity and registration review dates. |
| `/sites` | Sites and rooms. |
| `/services` | The fee schedule with MBS item numbers the practice bills. |
| `/diary` | The diary from a week ago forward. |
| `/day-sheet` | Today by practitioner, with site and room. |
| `/intake` | New clients waiting to be allocated, longest and priority first. |
| `/caseload` | Who can take a new client: booked load next seven days against weekly capacity. |
| `/rooms` | Room bookings and hours over the next seven days. |
| `/referrals` | All referral courses with sessions used and remaining. |
| `/referrals-due` | Courses with one or no funded sessions left, or approval ending in 14 days. |
| `/reports-due` | Better Access courses finished or closed with no report to the referrer recorded. |
| `/referrers` | Referrers ranked by courses, with reports outstanding. |
| `/notes-due` | Completed sessions without a finalised note, oldest first. |
| `/outcomes` | Latest recorded score per measure and its review date. |
| `/annual-allowance` | Better Access individual sessions used this year, here and elsewhere. |
| `/cancellations` | Late cancellations and no-shows in the last 90 days with the fee decision. |
| `/no-shows` | Missed appointments by client. |
| `/rebooking` | Clients seen with nothing booked next. |
| `/invoices` | Invoices with paid and balance. |
| `/debtors` | What clients and payers owe, oldest first. |
| `/takings` | Billed, received and owing by payer and currency. |
| `/service-mix` | Completed sessions and fees by practitioner and service over 90 days. |
| `/split` | Every receipt split between practitioner and practice, and which payout covered it. |
| `/payouts-due` | What each practitioner is owed from fees received and not yet paid out. |
| `/payouts` | Payout history. |
| `/cpd` | CPD and peer consultation hours this registration year against the target. |
| `/settings` | The practice rules the commands read (caps, CPD hours, late-cancel window). |
| `/archive` | Inventory of preserved Coreplus source rows. |
| `/compliance` | Record checks against the cited rules in docs/compliance.md. |
| `/add` | Add a client, practitioner, site, room, service, referral or intake. |
| `/allocate-intake` | Allocate a waiting client to a practitioner, checking new-client status, capacity and requested discipline. |
| `/close-intake` | Close an intake request without allocating it. |
| `/book` | Book a session with clash checks on client, practitioner and room, and funding checks. |
| `/complete` | Mark a booked session attended. |
| `/cancel` | Cancel a session and record when the practice was told. |
| `/dna` | Record a no-show. |
| `/waive` | Waive the fee for a late cancellation or no-show, with the reason logged. |
| `/allocate` | Attach an imported or private session to a referral course. |
| `/note` | Write or update a draft session note. |
| `/finalise` | Lock a reviewed note. |
| `/addendum` | Add a dated correction to a finalised note. |
| `/outcome` | Record a measure score (K10, DASS-21 or the practice own). |
| `/invoice` | Invoice a session (fee from the session) or raise a standalone invoice. |
| `/pay` | Record a receipt already in the bank. |
| `/payout` | Record a practitioner payout covering their share of receipts up to a date. |
| `/cpd-log` | Log CPD or peer consultation hours. |
| `/log` | Append a note of a conversation to a client. |
| `/consent` | Record verified consent and contact permission. |
| `/annual-use` | Record Better Access sessions the client had elsewhere this year, as checked. |
| `/report-sent` | Record the date a person sent the course report to the referrer. |
| `/close-referral` | Close a finished or interrupted course. |
| `/security-review` | Record evidence of a security review. |
| `/draft-reminder` | Draft an appointment reminder to drafts/. |
| `/draft-gp-letter` | Draft the course report to the referrer for the practitioner to complete. |
| `/import` | Import a Coreplus data backup: preview first, then import. |
| `/export` | Export every table to JSON in a private folder. |
| `/archive-search` | Search the preserved Coreplus rows. |
| `/weekly-review` | The Monday review: one decision list from attention, caseload, intake, payouts and compliance. |
| `/customise` | Add a field or change a practice rule in plain language; writes and applies the migration. |
| `/new-view` | Add a branded read-only page of your records. |

## Ten questions, one command each

Each runs today on the demo data. Coreplus has its own reports; these put the group-practice questions (capacity, splits, courses, CPD) one plain question away.

1. Which practitioners have room for a new client next week, and are taking them? `/caseload`
2. Who on the intake list has waited longest, and what did they ask for? `/intake`
3. What does each practitioner get from fees received but not yet paid out? `/payouts-due`
4. Which Better Access courses have no funded sessions left once bookings count? `/referrals-due`
5. Which finished courses still need a report to the GP? `/reports-due`
6. Which completed sessions lack a finalised note, by practitioner and days since? `/notes-due`
7. Which psychologists are short of CPD or peer consultation hours this registration year? `/cpd`
8. How many bookings and hours does each room have over the next seven days? `/rooms`
9. Which late cancellations and no-shows have no fee decision yet? `/cancellations`
10. Which services and item numbers did each practitioner deliver in the last 90 days? `/service-mix`

## Your first hour: ten things to ask for

1. What needs my attention this week, grouped by who owns it?
2. Who can take Casey Nguyen, who asked for a psychologist at Northcote?
3. Show Tom Reid's share of fees received since his last payout, receipt by receipt.
4. Record Tom's payout through yesterday, then make his remittance statement.
5. Which Better Access clients need a GP review before their next session?
6. Draft the report to Dr Lin for Jamie Patel's course, leaving the clinical sections blank.
7. Jordan Blake cancelled with eight hours' notice. Invoice the late fee or waive it with a reason.
8. Change our late-cancellation window to 48 hours.
9. Add a field for each client's preferred pronouns and show it on the client record.
10. Make a page showing each room's bookings by day for the next fortnight.

## Instead of Coreplus

Run a Coreplus data backup (Setup > Settings > Data Backup; CSV in a password-protected archive). Then preview and import:

```bash
node scripts/practice.mjs import coreplus --dir="../coreplus-backup" --map=private-coreplus-map.json --utc-offset=+10:00 --dry-run
node scripts/practice.mjs import coreplus --dir="../coreplus-backup" --map=private-coreplus-map.json --utc-offset=+10:00
```

Clients come across on common header names. Appointments, invoices and receipts come across through a column map you check once ([example](docs/coreplus-columns.example.json)). Every row of every file is kept in a searchable archive, so nothing is lost even where it does not map. Case notes stay in that archive rather than being re-signed. [The full guide](docs/replace-coreplus.md) covers what maps, what does not and the cutover checks.

## Rules and limits

[docs/compliance.md](docs/compliance.md) sets out each check and its source: Better Access course and calendar-year limits and reports to the referrer, Psychology Board CPD hours, consent, locked notes and security evidence. These are record checks, not legal advice. The local version has no user login or role separation: read the security section before putting real health information in it.

## Architecture

```
mental-health-practice-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/                  the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     the thesis and the migration guide
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Mental Health Practice for Claude Code for your business, migrates your Coreplus data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=coreplus)
- Read more: [enterprisedna.co/omni/instead-of/coreplus](https://enterprisedna.co/omni/instead-of/coreplus?utm_source=github&utm_medium=readme&utm_campaign=coreplus)

## License

MIT. Copyright (c) 2026 Enterprise DNA.
