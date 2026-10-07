---
description: Book a session with clash checks on client, practitioner and room, and funding checks.
---

Run `node scripts/practice.mjs book --client="CLIENT" --practitioner="PRACTITIONER" --room=ROOM --service=BA-PSY-50 [--referral=REFERRAL] --at=2026-10-14T10:00:00+11:00` after saying back in one line what will change. It writes to the records, so ask before running if the operator has not said yes. Add `--json` when you need to work with the rows.

A referral makes it funded. The fee comes from the service unless --fee-cents is given.

Present the result as a short table in plain words. Amounts are in the currency shown. Never mix AUD and NZD.
