---
description: Log CPD or peer consultation hours.
---

Run `node scripts/practice.mjs cpd-log "PRACTITIONER" --date=2026-10-07 --hours=1.5 --kind="peer consultation" --activity="WHAT"` after saying back in one line what will change. It writes to the records, so ask before running if the operator has not said yes. Add `--json` when you need to work with the rows.

Kind is cpd or peer consultation.

Present the result as a short table in plain words. Amounts are in the currency shown. Never mix AUD and NZD.
