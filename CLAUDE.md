# Mental Health Practice for Claude Code: operating instructions

This file is the brain. Claude Code reads it at the start of every session. It says who this is for, how work gets done, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR PRACTICE] (the demo is Northside Minds, fictional)
- **Operator:** [YOUR NAME], [your role]
- **What matters most:** [the one or two outcomes you care about]

Fill this in once. A worker with context knows. A worker without it guesses.

## How to work

1. **Take a brief, not a script.** The operator describes the outcome. You run the right command and present the answer.
2. **Read before you write.** Before drafting anything about a record, read its full history first.
3. **Plain language.** Short sentences. No filler. Numbers in tables.
4. **Silent success, loud problems.** No play-by-play. Say what broke and what you did about it.
5. **Stop at the line.** Anything that sends, deletes, or faces a customer waits for a yes in this session.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| The Monday list: intake waiting, notes, courses, reports, debts, payouts, cancellations, outcomes, consent. | `/attention`: `node scripts/practice.mjs attention` |
| The client list. | `/clients`: `node scripts/practice.mjs clients` |
| One client: intake, referrals, sessions, outcomes, accounts and activity. | `/client`: `node scripts/practice.mjs client "CLIENT"` |
| Practitioners, discipline, split, capacity and registration review dates. | `/team`: `node scripts/practice.mjs team` |
| Sites and rooms. | `/sites`: `node scripts/practice.mjs sites` |
| The fee schedule with MBS item numbers the practice bills. | `/services`: `node scripts/practice.mjs services` |
| The diary from a week ago forward. | `/diary`: `node scripts/practice.mjs diary` |
| Today by practitioner, with site and room. | `/day-sheet`: `node scripts/practice.mjs day-sheet` |
| New clients waiting to be allocated, longest and priority first. | `/intake`: `node scripts/practice.mjs intake` |
| Who can take a new client: booked load next seven days against weekly capacity. | `/caseload`: `node scripts/practice.mjs caseload` |
| Room bookings and hours over the next seven days. | `/rooms`: `node scripts/practice.mjs rooms` |
| All referral courses with sessions used and remaining. | `/referrals`: `node scripts/practice.mjs referrals` |
| Courses with one or no funded sessions left, or approval ending in 14 days. | `/referrals-due`: `node scripts/practice.mjs referrals-due` |
| Better Access courses finished or closed with no report to the referrer recorded. | `/reports-due`: `node scripts/practice.mjs reports-due` |
| Referrers ranked by courses, with reports outstanding. | `/referrers`: `node scripts/practice.mjs referrers` |
| Completed sessions without a finalised note, oldest first. | `/notes-due`: `node scripts/practice.mjs notes-due` |
| Latest recorded score per measure and its review date. | `/outcomes`: `node scripts/practice.mjs outcomes` |
| Better Access individual sessions used this year, here and elsewhere. | `/annual-allowance`: `node scripts/practice.mjs annual-allowance` |
| Late cancellations and no-shows in the last 90 days with the fee decision. | `/cancellations`: `node scripts/practice.mjs cancellations` |
| Missed appointments by client. | `/no-shows`: `node scripts/practice.mjs no-shows` |
| Clients seen with nothing booked next. | `/rebooking`: `node scripts/practice.mjs rebooking` |
| Invoices with paid and balance. | `/invoices`: `node scripts/practice.mjs invoices` |
| What clients and payers owe, oldest first. | `/debtors`: `node scripts/practice.mjs debtors` |
| Billed, received and owing by payer and currency. | `/takings`: `node scripts/practice.mjs takings` |
| Completed sessions and fees by practitioner and service over 90 days. | `/service-mix`: `node scripts/practice.mjs service-mix` |
| Every receipt split between practitioner and practice, and which payout covered it. | `/split`: `node scripts/practice.mjs split` |
| What each practitioner is owed from fees received and not yet paid out. | `/payouts-due`: `node scripts/practice.mjs payouts-due` |
| Payout history. | `/payouts`: `node scripts/practice.mjs payouts` |
| CPD and peer consultation hours this registration year against the target. | `/cpd`: `node scripts/practice.mjs cpd` |
| The practice rules the commands read (caps, CPD hours, late-cancel window). | `/settings`: `node scripts/practice.mjs settings` |
| Inventory of preserved Coreplus source rows. | `/archive`: `node scripts/practice.mjs archive` |
| Record checks against the cited rules in docs/compliance.md. | `/compliance`: `node scripts/practice.mjs compliance` |
| Add a client, practitioner, site, room, service, referral or intake. | `/add`: `node scripts/practice.mjs add intake --client="CLIENT" --source="GP referral" --concern="WHAT THEY ASKED FOR" [--urgency=priority] [--site=SITE] [--discipline=Psychologist]` |
| Allocate a waiting client to a practitioner, checking new-client status, capacity and requested discipline. | `/allocate-intake`: `node scripts/practice.mjs allocate-intake "CLIENT" --practitioner="PRACTITIONER" [--override]` |
| Close an intake request without allocating it. | `/close-intake`: `node scripts/practice.mjs close-intake "CLIENT" --reason="WHY"` |
| Book a session with clash checks on client, practitioner and room, and funding checks. | `/book`: `node scripts/practice.mjs book --client="CLIENT" --practitioner="PRACTITIONER" --room=ROOM --service=BA-PSY-50 [--referral=REFERRAL] --at=2026-10-14T10:00:00+11:00` |
| Mark a booked session attended. | `/complete`: `node scripts/practice.mjs complete SESSION-ID` |
| Cancel a session and record when the practice was told. | `/cancel`: `node scripts/practice.mjs cancel SESSION-ID [--notified=2026-10-13T08:00:00+11:00]` |
| Record a no-show. | `/dna`: `node scripts/practice.mjs dna SESSION-ID` |
| Waive the fee for a late cancellation or no-show, with the reason logged. | `/waive`: `node scripts/practice.mjs waive SESSION-ID --reason="WHY" --author="WHO"` |
| Attach an imported or private session to a referral course. | `/allocate`: `node scripts/practice.mjs allocate SESSION-ID --referral="REFERRAL"` |
| Write or update a draft session note. | `/note`: `node scripts/practice.mjs note SESSION-ID --text="PRACTITIONER WORDS" --author="PRACTITIONER"` |
| Lock a reviewed note. | `/finalise`: `node scripts/practice.mjs finalise NOTE-ID` |
| Add a dated correction to a finalised note. | `/addendum`: `node scripts/practice.mjs addendum NOTE-ID --text="CORRECTION" --author="PRACTITIONER"` |
| Record a measure score (K10, DASS-21 or the practice own). | `/outcome`: `node scripts/practice.mjs outcome "CLIENT" --instrument=K10 --score=24 --date=2026-10-07 --review=2026-11-04` |
| Invoice a session (fee from the session) or raise a standalone invoice. | `/invoice`: `node scripts/practice.mjs invoice --name=INV-2001 --session=SESSION-ID --due=2026-10-21 [--cents=11000 for a late-cancel fee]` |
| Record a receipt already in the bank. | `/pay`: `node scripts/practice.mjs pay "INVOICE" --cents=23000 --reference="BANK REF" --date=2026-10-07` |
| Record a practitioner payout covering their share of receipts up to a date. | `/payout`: `node scripts/practice.mjs payout "PRACTITIONER" --name=PO-0002 --through=2026-10-06 --date=2026-10-07 --reference="EFT REF"` |
| Log CPD or peer consultation hours. | `/cpd-log`: `node scripts/practice.mjs cpd-log "PRACTITIONER" --date=2026-10-07 --hours=1.5 --kind="peer consultation" --activity="WHAT"` |
| Append a note of a conversation to a client. | `/log`: `node scripts/practice.mjs log "CLIENT" --text="WHAT HAPPENED" --author="WHO"` |
| Record verified consent and contact permission. | `/consent`: `node scripts/practice.mjs consent "CLIENT" --date=2026-10-07 --contact=true` |
| Record Better Access sessions the client had elsewhere this year, as checked. | `/annual-use`: `node scripts/practice.mjs annual-use "CLIENT" --year=2026 --external=2 --checked=2026-10-07` |
| Record the date a person sent the course report to the referrer. | `/report-sent`: `node scripts/practice.mjs report-sent "REFERRAL" --date=2026-10-07` |
| Close a finished or interrupted course. | `/close-referral`: `node scripts/practice.mjs close-referral "REFERRAL"` |
| Record evidence of a security review. | `/security-review`: `node scripts/practice.mjs security-review --name="backup restore" --date=2026-10-07 --evidence="WHAT WAS CHECKED"` |
| Draft an appointment reminder to drafts/. | `/draft-reminder`: `node scripts/practice.mjs draft-reminder SESSION-ID` |
| Draft the course report to the referrer for the practitioner to complete. | `/draft-gp-letter`: `node scripts/practice.mjs draft-gp-letter "REFERRAL"` |
| Import a Coreplus data backup: preview first, then import. | `/import`: `node scripts/practice.mjs import coreplus --dir="EXTRACTED BACKUP" --map=docs/coreplus-columns.example.json --utc-offset=+10:00 --dry-run` |
| Export every table to JSON in a private folder. | `/export`: `node scripts/practice.mjs export --dir="PRIVATE FOLDER"` |
| Search the preserved Coreplus rows. | `/archive-search`: `node scripts/practice.mjs archive-search --text="CLIENT IDENTIFIER"` |
| The Monday review: one decision list from attention, caseload, intake, payouts and compliance. | `/weekly-review` |
| Add a field or change a practice rule in plain language; writes and applies the migration. | `/customise` |
| Add a branded read-only page of your records. | `/new-view` |

If an ask fits nothing here, run the CLI directly (`npm run <cli> -- --help`) and then propose a new command for it.

## Hard rules

- Never claim from Medicare or DVA, charge a card or move money. `pay` and `payout` record what already happened.
- Never write clinical content or interpret a score. Notes are the practitioner's words; drafts leave clinical sections blank.
- Keep finalised notes intact. Corrections use `addendum`.
- A funding warning is billing administration, never a reason to refuse care.
- Every timestamp carries its offset (+10:00 or +11:00). Every amount is integer cents with its currency; never mix AUD and NZD.
- Never commit health records, exports, rendered documents or drafts. Tests use fictional data only.
- Rule numbers (annual cap, CPD hours, late-cancel window) live in the `settings` table. Change them with `/customise`, with the source.

- Never send email or messages from here. Draft to `drafts/`, a person sends.
- Never delete records without an explicit yes in this session. Prefer marking closed or archived.
- Never invent a record. If a name is ambiguous, list the candidates and ask.
- The database is the source of truth. If the answer is not in it, say so.

## Where things live

- `scripts/` the CLI. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the schema, plain SQL. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `docs/` the thesis and the guide for moving off Coreplus.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/coreplus
