---
description: Check the records against the rules in docs/compliance.md (Better Access courses and reports, consent, notes, registration, CPD, security evidence) and report what is breached or due, with the source.
---

1. Run `node scripts/practice.mjs compliance --json`.
2. Read `docs/compliance.md`. Match each finding's `rule` to its section and source link.
3. Report a table: rule, record, finding, source. Order: REPORT, COURSE, NOTE, CONSENT, ANNUAL, REGISTRATION, CPD, SECURITY.
4. For each breach, offer the fix the operator can approve: `/draft-gp-letter` then `/report-sent` for a REPORT, `/finalise` for a NOTE, `/consent` once consent is verified, `/annual-use` after checking outside use, `/cpd-log` for hours, `/security-review` once evidence exists.
5. If a rule in `docs/compliance.md` looks out of date, say so and stop. The operator confirms the rule; then update the doc, the `settings` row and the check together through `/customise`.

These are record checks, not legal advice or a compliance certificate.
