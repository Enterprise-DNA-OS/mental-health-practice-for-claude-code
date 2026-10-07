# Record checks and their sources

Sources checked 7 October 2026. This is practice administration, not clinical advice, a claiming service or a compliance certificate. The practitioner decides treatment and disclosure. A funding warning changes billing review, never access to care. Every number below lives in the `settings` table, so a rule change is one `/customise` away.

## Better Access individual sessions (Australia)

Source: Department of Health, Disability and Ageing, [Better Access fact sheet for professionals](https://www.health.gov.au/sites/default/files/2026-03/better-access-fact-sheet-professionals_0.pdf) (March 2026), and Services Australia, [allied health referrals for mental health treatment](https://www.servicesaustralia.gov.au/allied-health-referrals-for-mental-health-treatment-services?context=20).

- Patients can receive "up to 10 individual and up to 10 group therapy mental health treatment services per calendar year (1 January to 31 December)". Setting `ba_annual_cap` = 10.
- The initial referral covers up to 6 services. For more, the patient returns to the referring practitioner, who considers the written report. Setting `ba_initial_course` = 6; a referral with `initial_course` true cannot approve more than that at entry.
- A written report goes to the referring practitioner at the end of each course.

How the records apply it: `book` and `complete` refuse a funded session when the course has nothing left or the year's individual services (here plus `annual-use` elsewhere) reach the cap. Cancelled and missed sessions release their place. `referrals-due` lists courses at one or zero. `reports-due` and the `REPORT` compliance rule list finished or closed courses with no `report-sent` date. `ANNUAL` flags a client with an open Better Access course and no outside-use check this year.

Scope: individual Better Access sessions only. Group sessions, the referral pathway rules (MyMedicare enrolment or the usual medical practitioner) and eligibility are for the practice to check against the referral itself. MBS item numbers in `services` are entered by the practice; no rebate amounts are stored or stated.

## Practitioner CPD

Source: Psychology Board of Australia, [Continuing professional development](https://www.psychologyboard.gov.au/Registration/Continuing-professional-development.aspx): "Completing 10 hours of peer consultation activities annually" and "Completing 20 hours of other CPD activities annually".

How the records apply it: `cpd` and the `CPD` compliance rule total hours since 1 December for registered and provisional psychologists, against `cpd_hours` (30 in total) and `cpd_peer_hours` (10). Counsellors, social workers and OTs answer to their own bodies; add their targets with `/customise` if you want them checked. The registration year start is a setting in the view; confirm it against your practitioners' renewal dates.

## Registration review dates

Each practitioner carries a `registration_due` date the practice enters from the public register. `REGISTRATION` flags any date that has passed. The software does not check the register.

## Consent, notes and corrections

Practice rules, not legal claims: a session cannot be completed without a consent date on or before it. Completed sessions without a finalised note appear in `notes-due` and `NOTE`. Finalised notes cannot be changed or deleted in the database; corrections are dated addenda. Receipts, payouts, payout lines, addenda and activity are append-only.

## Health information security

Australian practices hold health information under the Privacy Act 1988 and the Australian Privacy Principles; see the OAIC's [guide to health privacy](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/health-service-providers/guide-to-health-privacy). `SECURITY` asks for recorded evidence of an access review, a backup restore, device encryption and an agreement covering the agent provider's data handling within `security_review_days` (90, a practice policy, not a statutory period). These are attestations a person records, not technical verification.

The local demo has no user login, role separation, encryption at rest or access log. Before real records, provision those controls, agree retention and backups, and check the host and agent provider's data terms. Keep exports, rendered documents and drafts in restricted storage. Never put client records into Git or an unapproved model.

## Fee splits and payouts

No statute. The split is the contract between the practice and each practitioner, held as `split_pct`. `payout` records what the practice paid from receipts up to a date, at the split on that day, and locks those receipts so they cannot be paid twice. No money moves. Check the contracts and your accountant's view on GST and payroll tax for contractor arrangements; this records the arrangement, it does not decide it.
