---
description: Allocate a waiting client to a practitioner, checking new-client status, capacity and requested discipline.
---

Run `node scripts/practice.mjs allocate-intake "CLIENT" --practitioner="PRACTITIONER" [--override]` after saying back in one line what will change. It writes to the records, so ask before running if the operator has not said yes. Add `--json` when you need to work with the rows.

Use --override only when the operator says the exception is agreed.

Present the result as a short table in plain words. Amounts are in the currency shown. Never mix AUD and NZD.
