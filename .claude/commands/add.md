---
description: Add a client, practitioner, site, room, service, referral or intake.
---

Run `node scripts/practice.mjs add intake --client="CLIENT" --source="GP referral" --concern="WHAT THEY ASKED FOR" [--urgency=priority] [--site=SITE] [--discipline=Psychologist]` after saying back in one line what will change. It writes to the records, so ask before running if the operator has not said yes. Add `--json` when you need to work with the rows.

Other forms: add client --name=; add practitioner --name= --discipline= [--split=60 --capacity=20 --registration-due=]; add site --name=; add room --site= --name=; add service --code= --name= --fee-cents= [--item=80110]; add referral --client= --name= --funder="Better Access" --referrer= --received= --approved=6 --initial=true [--prior-used=0].

Present the result as a short table in plain words. Amounts are in the currency shown. Never mix AUD and NZD.
