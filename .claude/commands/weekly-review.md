---
description: The Monday review for the practice manager, written from attention, caseload, payouts-due and compliance into one decision list.
---

1. Run, each with `--json`: `node scripts/practice.mjs attention`, `node scripts/practice.mjs caseload`, `node scripts/practice.mjs intake`, `node scripts/practice.mjs payouts-due`, `node scripts/practice.mjs compliance`.
2. Write `drafts/weekly-review-YYYY-MM-DD.md` with five short sections:
   - **New clients:** each waiting intake, days waiting, and the practitioner with free capacity and the right discipline who could take them.
   - **Courses and reports:** courses at zero that need a GP review, and reports owed to referrers.
   - **Clinical admin:** notes not finalised, by practitioner, oldest first.
   - **Money:** debts overdue, and what each practitioner is owed with the oldest receipt date.
   - **Team:** registration reviews passed, CPD short with days left in the registration year, missing security evidence.
3. End with at most five decisions for the operator, each one line with the command that would carry it out.
4. Show the draft path and the five decisions in chat. Do not run any write command from this review.
