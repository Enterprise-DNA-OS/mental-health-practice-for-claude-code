-- Fictional group practice. Stable IDs and conflict handling make this seed repeatable.
-- Dates move with the day it is first seeded, so the attention list always has something to say.
insert into sites(id,name) values
 ('a0000000-0000-0000-0000-000000000001','Northcote'),
 ('a0000000-0000-0000-0000-000000000002','Brunswick') on conflict do nothing;
insert into rooms(id,site_id,name) values
 ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Room 1'),
 ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','Room 2'),
 ('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002','Room A') on conflict do nothing;
insert into practitioners(id,name,discipline,registration_due,split_pct,weekly_capacity,focus,takes_new) values
 ('10000000-0000-0000-0000-000000000001','Dr Hannah Lee','Clinical psychologist',current_date+200,60,22,'trauma, adults',true),
 ('10000000-0000-0000-0000-000000000002','Tom Reid','Psychologist',current_date-5,65,20,'anxiety, adolescents',true),
 ('10000000-0000-0000-0000-000000000003','Mei Tanaka','Counsellor',null,70,16,'couples, grief',false) on conflict do nothing;
insert into services(id,code,name,item_number,minutes,fee_cents) values
 ('c0000000-0000-0000-0000-000000000001','BA-CP-50','Better Access clinical psychology, 50 minutes or more','80010',50,26000),
 ('c0000000-0000-0000-0000-000000000002','BA-PSY-50','Better Access focussed psychological strategies, 50 minutes or more','80110',50,23000),
 ('c0000000-0000-0000-0000-000000000003','PRIV-50','Private session, 50 minutes',null,50,22000),
 ('c0000000-0000-0000-0000-000000000004','COUN-50','Counselling session, 50 minutes',null,50,18000) on conflict do nothing;
insert into clients(id,name,email,consent_on,contact_ok) values
 ('20000000-0000-0000-0000-000000000001','Alex Morgan','alex@example.invalid',current_date-90,true),
 ('20000000-0000-0000-0000-000000000002','Jamie Patel','jamie@example.invalid',current_date-80,true),
 ('20000000-0000-0000-0000-000000000003','Riley King','riley@example.invalid',null,false),
 ('20000000-0000-0000-0000-000000000004','Jordan Blake','jordan@example.invalid',current_date-40,true),
 ('20000000-0000-0000-0000-000000000005','Casey Nguyen','casey@example.invalid',current_date-20,true),
 ('20000000-0000-0000-0000-000000000006','Alex Martin','martin@example.invalid',current_date-2,true) on conflict do nothing;
insert into intakes(id,client_id,received_on,source,concern,urgency,preferred_site_id,preferred_discipline,allocated_to,allocated_on) values
 ('d0000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000005',current_date-20,'GP referral','Low mood after redundancy','routine','a0000000-0000-0000-0000-000000000001','Psychologist',null,null),
 ('d0000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000006',current_date-2,'Self referral','Panic attacks at work','priority',null,null,null,null),
 ('d0000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000004',current_date-25,'GP referral','Exam anxiety','routine','a0000000-0000-0000-0000-000000000001','Psychologist','10000000-0000-0000-0000-000000000002',current_date-24) on conflict do nothing;
insert into referrals(id,client_id,name,funder,referrer,received_on,approved,initial_course,prior_used) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','AM-BA-1','Better Access','Dr Lin, Harbour General Practice',current_date-60,6,true,4),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','JP-BA-1','Better Access','Dr Lin, Harbour General Practice',current_date-60,6,true,5),
 ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000003','RK-EAP-1','EAP','Workplace Support',current_date-20,3,false,0),
 ('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000004','JB-BA-1','Better Access','Dr Osei, High Street Medical',current_date-24,6,true,0) on conflict do nothing;
insert into annual_usage(client_id,year,external_individual,checked_on) values
 ('20000000-0000-0000-0000-000000000001',extract(year from current_date),4,current_date-60),
 ('20000000-0000-0000-0000-000000000002',extract(year from current_date),5,current_date-60),
 ('20000000-0000-0000-0000-000000000004',extract(year from current_date),0,current_date-24) on conflict do nothing;
insert into sessions(id,client_id,practitioner_id,room_id,referral_id,service_id,starts_at,service_on,status,cancelled_at,fee_cents,funded) values
 ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',current_date-7+time '10:00',current_date-7,'completed',null,26000,true),
 ('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',current_date+1+time '10:00',current_date+1,'booked',null,26000,true),
 ('40000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000002',current_date-3+time '11:00',current_date-3,'completed',null,23000,true),
 ('40000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000004',current_date-4+time '10:00',current_date-4,'dna',null,18000,false),
 ('40000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',current_date-10+time '14:00',current_date-10,'completed',null,23000,true),
 ('40000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',current_date+2+time '14:00',current_date+2,'booked',null,23000,true),
 ('40000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000002',null,'c0000000-0000-0000-0000-000000000002',current_date-3+time '14:00',current_date-3,'cancelled',current_date-3+time '06:00',23000,false),
 ('40000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',current_date-17+time '14:00',current_date-17,'completed',null,23000,true) on conflict do nothing;
insert into notes(id,session_id,body,author,finalised_at) values
 ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Fictional demo: session summary awaiting clinician review.','Dr Hannah Lee',null),
 ('50000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000005','Fictional demo: finalised session record.','Tom Reid',now()-interval '9 days'),
 ('50000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000008','Fictional demo: finalised session record.','Tom Reid',now()-interval '16 days') on conflict do nothing;
insert into outcomes(id,client_id,instrument,score,measured_on,review_on,comment) values
 ('60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','K10',32,current_date-50,current_date-30,'Recorded score, clinician interprets'),
 ('60000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','K10',26,current_date-20,current_date-6,'Recorded score, clinician interprets') on conflict do nothing;
insert into invoices(id,name,client_id,session_id,payer,amount_cents,currency,due_on) values
 ('70000000-0000-0000-0000-000000000000','INV-0990','20000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000008','Jordan Blake',23000,'AUD',current_date-17),
 ('70000000-0000-0000-0000-000000000001','INV-1001','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Alex Morgan',26000,'AUD',current_date-7),
 ('70000000-0000-0000-0000-000000000002','INV-1002','20000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000003','Jamie Patel',23000,'AUD',current_date-3),
 ('70000000-0000-0000-0000-000000000003','INV-1003','20000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000005','Jordan Blake',23000,'AUD',current_date-10) on conflict do nothing;
insert into payments(id,invoice_id,reference,amount_cents,paid_on) values
 ('80000000-0000-0000-0000-000000000000','70000000-0000-0000-0000-000000000000','BANK-0990',23000,current_date-16),
 ('80000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','BANK-1001',26000,current_date-6),
 ('80000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000002','BANK-1002',10000,current_date-2),
 ('80000000-0000-0000-0000-000000000003','70000000-0000-0000-0000-000000000003','BANK-1003',23000,current_date-9) on conflict do nothing;
insert into payouts(id,name,practitioner_id,through_on,amount_cents,currency,paid_on,reference) values
 ('90000000-0000-0000-0000-000000000001','PO-0001','10000000-0000-0000-0000-000000000002',current_date-14,14950,'AUD',current_date-13,'EFT-TR-0001') on conflict do nothing;
insert into payout_lines(id,payout_id,payment_id,split_pct,practitioner_cents) values
 ('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000000',65,14950) on conflict do nothing;
insert into cpd(id,practitioner_id,done_on,hours,kind,activity) values
 ('e0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',greatest(current_date-40,(select min(year_start) from v_cpd)),12,'cpd','Trauma-focused therapy workshop'),
 ('e0000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',greatest(current_date-10,(select min(year_start) from v_cpd)),6,'peer consultation','Monthly peer group'),
 ('e0000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002',greatest(current_date-60,(select min(year_start) from v_cpd)),20,'cpd','Adolescent anxiety course'),
 ('e0000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002',greatest(current_date-15,(select min(year_start) from v_cpd)),11,'peer consultation','Fortnightly peer supervision') on conflict do nothing;
insert into security_checks(id,name,checked_on,evidence) values
 ('f0000000-0000-0000-0000-000000000001','backup restore',current_date-30,'Fictional demo: restore tested by practice manager') on conflict do nothing;
