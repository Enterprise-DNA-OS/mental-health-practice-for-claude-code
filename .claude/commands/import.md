---
description: Import a Coreplus data backup: preview first, then import.
---

Run `node scripts/practice.mjs import coreplus --dir="EXTRACTED BACKUP" --map=docs/coreplus-columns.example.json --utc-offset=+10:00 --dry-run`. Add `--json` when you need to work with the rows.

Always run --dry-run first and show the report. Follow docs/replace-coreplus.md.

Present the result as a short table in plain words. Amounts are in the currency shown. Never mix AUD and NZD.
