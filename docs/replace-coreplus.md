# Moving from Coreplus

Plan a day for a small group practice: an hour to export, a few hours to map and check, and a cutover once both systems agree. Keep Coreplus running until the owner signs off.

## 1. Export

A user with Supervisor access runs **Setup > Settings > Data Backup > Run New Backup** ([Coreplus help: data backup on a PC](https://help.corepluspm.com/en/articles/1399679-data-backup-on-a-pc), or [on a Mac](https://help.corepluspm.com/en/articles/1154042-data-backup-on-a-mac)). The backup is CSV in a password-protected archive; the password arrives by SMS. It can take 12 to 24 hours and stays downloadable for 24 hours, so schedule it. Client, personal, shared and referral files come as separate jobs, one file category per backup.

Reports under **Reports > Financial** (invoice, debtors, client breakdown) and **Reports > Calendar** download as CSV too and are useful for checking totals after the move.

Extract the archive into a private folder outside this repository.

## 2. Preview

```bash
cp docs/coreplus-columns.example.json private-coreplus-map.json   # edit the header names to match your files
node scripts/practice.mjs import coreplus --dir="../coreplus-backup" --map=private-coreplus-map.json --utc-offset=+10:00 --dry-run
```

The preview rolls back. It reports, per file, rows read, new clients, rows archived and records created. Fix the map until every file previews without an error. Use the offset for the practice's local time (+10:00 or +11:00 in Melbourne and Sydney depending on daylight saving; split the appointment file at the change if needed).

## 3. Import

Run the same command without `--dry-run`. It is all or nothing: one bad row and nothing from that run is kept. Running it again adds nothing new.

## What maps

| Coreplus | Here | Notes |
|---|---|---|
| Client details | `clients` | ID, name, email, mobile, date of birth (DD/MM/YYYY accepted). Client IDs are kept as `coreplus:<id>`. |
| Appointments | `sessions` | Needs the status and practitioner maps. Imported sessions start unfunded; `allocate` them to a referral once checked. |
| Invoices | `invoices` | Link to the appointment for fee splits to work. Amounts in cents. |
| Receipts | `payments` | Cannot exceed the invoice balance. |
| Everything else | `import_rows` | Every row of every CSV is kept as it was and searchable with `archive-search`. |

## What does not carry over automatically

- **Case notes and letters.** They stay in the source archive as text, not re-signed as new notes. Uploaded files stay in the extracted folders; keep them in restricted storage.
- **Referral courses and outside use.** Re-enter open referrals from the signed referral (`add referral`) and the checked outside-provider count (`annual-use`). Do not trust a count you cannot see the source for.
- **Practitioner splits.** Enter each contractor's split from their agreement (`add practitioner --split=`).
- **Medicare and DVA claims.** This system records fees and receipts; claiming stays with Coreplus or your claiming service until Enterprise DNA connects one for you.
- **Online booking, SMS reminders and telehealth.** Not in the free version.

## Cutover checks

1. Client count matches the Coreplus client report.
2. `debtors` total matches the Coreplus debtors report on the same day.
3. Next week's `diary` matches the Coreplus calendar.
4. Every open Better Access course shows the right `remaining`.
5. `payouts-due` matches what each practitioner expects from their last remittance.
6. The owner signs off; then stop new bookings in Coreplus.
