---
description: Record a practitioner payout covering their share of receipts up to a date.
---

Run `node scripts/practice.mjs payout "PRACTITIONER" --name=PO-0002 --through=2026-10-06 --date=2026-10-07 --reference="EFT REF"` after saying back in one line what will change. It writes to the records, so ask before running if the operator has not said yes. Add `--json` when you need to work with the rows.

A record only; no money moves. Then run npm run docs -- remittance to produce the statement.

Present the result as a short table in plain words. Amounts are in the currency shown. Never mix AUD and NZD.
