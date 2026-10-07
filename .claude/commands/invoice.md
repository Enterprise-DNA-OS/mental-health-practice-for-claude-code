---
description: Invoice a session (fee from the session) or raise a standalone invoice.
---

Run `node scripts/practice.mjs invoice --name=INV-2001 --session=SESSION-ID --due=2026-10-21 [--cents=11000 for a late-cancel fee]` after saying back in one line what will change. It writes to the records, so ask before running if the operator has not said yes. Add `--json` when you need to work with the rows.

Standalone: invoice --name= --client= --payer= --cents= --due=.

Present the result as a short table in plain words. Amounts are in the currency shown. Never mix AUD and NZD.
