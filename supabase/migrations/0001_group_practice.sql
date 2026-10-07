-- Mental health group practice records. No extension required on PostgreSQL 14+ or PGlite.
-- Practitioners, sites and rooms; intake and allocation; referral courses; sessions, notes and
-- outcomes; invoices, receipts and practitioner fee-split payouts; CPD; security evidence.
create function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create function immutable_record() returns trigger language plpgsql as $$ begin raise exception 'Append-only record'; end $$;

-- Practice rules the commands read. Change them with /customise, never in code.
create table settings (key text primary key, value numeric not null, note text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on settings for each row execute function touch_updated_at();
insert into settings(key,value,note) values
 ('ba_annual_cap',10,'Better Access individual services per calendar year (Services Australia)'),
 ('ba_initial_course',6,'Better Access services allowed on an initial referral course'),
 ('cpd_hours',30,'Psychology Board of Australia: 10 hours peer consultation plus 20 hours other CPD a year'),
 ('cpd_peer_hours',10,'Peer consultation hours within the CPD total'),
 ('late_cancel_hours',24,'Practice policy: cancellations inside this many hours count as late'),
 ('security_review_days',90,'Practice policy: interval for security review evidence'),
 ('intake_wait_days',14,'Practice policy: flag intake requests waiting longer than this');

create table sites (id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on sites for each row execute function touch_updated_at();
create table rooms (id uuid primary key default gen_random_uuid(), site_id uuid not null references sites, name text not null, active boolean not null default true, unique(site_id,name), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on rooms for each row execute function touch_updated_at();

create table practitioners (id uuid primary key default gen_random_uuid(), name text not null unique,
 discipline text not null check(discipline in ('Clinical psychologist','Psychologist','Provisional psychologist','Counsellor','Mental health social worker','Mental health OT')),
 registration_due date, split_pct numeric(5,2) not null default 60 check(split_pct between 0 and 100),
 weekly_capacity integer not null default 20 check(weekly_capacity between 0 and 60), focus text not null default '',
 takes_new boolean not null default true, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on practitioners for each row execute function touch_updated_at();

create table clients (id uuid primary key default gen_random_uuid(), external_id text unique, name text not null, email text, phone text, dob date,
 consent_on date, contact_ok boolean not null default false, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on clients for each row execute function touch_updated_at();

create table intakes (id uuid primary key default gen_random_uuid(), client_id uuid not null references clients, received_on date not null default current_date,
 source text not null, concern text not null, urgency text not null default 'routine' check(urgency in ('routine','priority')),
 preferred_site_id uuid references sites, preferred_discipline text, allocated_to uuid references practitioners, allocated_on date, closed_reason text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on intakes for each row execute function touch_updated_at();

create table referrals (id uuid primary key default gen_random_uuid(), client_id uuid not null references clients, name text not null unique,
 funder text not null check(funder in ('Better Access','NDIS','DVA','WorkCover','EAP','Private')), referrer text not null, received_on date not null,
 approved integer not null check(approved>0), initial_course boolean not null default false, prior_used integer not null default 0 check(prior_used>=0),
 valid_until date, report_sent_on date, closed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on referrals for each row execute function touch_updated_at();

create table annual_usage (id uuid primary key default gen_random_uuid(), client_id uuid not null references clients, year integer not null check(year between 2000 and 2200),
 external_individual integer not null default 0 check(external_individual between 0 and 50), checked_on date not null, unique(client_id,year),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on annual_usage for each row execute function touch_updated_at();

-- The fee schedule. item_number is the MBS item the practice bills against, entered by the practice.
create table services (id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, item_number text,
 minutes integer not null default 50 check(minutes between 5 and 240), fee_cents integer not null check(fee_cents>=0),
 currency text not null default 'AUD' check(currency in ('AUD','NZD')), active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on services for each row execute function touch_updated_at();

create table sessions (id uuid primary key default gen_random_uuid(), external_id text unique, client_id uuid not null references clients,
 practitioner_id uuid not null references practitioners, room_id uuid references rooms, referral_id uuid references referrals, service_id uuid references services,
 starts_at timestamptz not null, service_on date not null, minutes integer not null default 50 check(minutes between 5 and 240),
 status text not null default 'booked' check(status in ('booked','completed','cancelled','dna')), cancelled_at timestamptz, fee_waived boolean not null default false,
 fee_cents integer not null default 0 check(fee_cents>=0), currency text not null default 'AUD' check(currency in ('AUD','NZD')), funded boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on sessions for each row execute function touch_updated_at();
create index session_client_date on sessions(client_id,starts_at);
create index session_practitioner_date on sessions(practitioner_id,starts_at);
create index session_room_date on sessions(room_id,starts_at);

create table notes (id uuid primary key default gen_random_uuid(), session_id uuid not null unique references sessions, body text not null, author text not null, finalised_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on notes for each row execute function touch_updated_at();
create table addenda (id uuid primary key default gen_random_uuid(), note_id uuid not null references notes, body text not null, author text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on addenda for each row execute function touch_updated_at();

create table outcomes (id uuid primary key default gen_random_uuid(), client_id uuid not null references clients, instrument text not null, score numeric not null,
 measured_on date not null, review_on date not null, comment text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on outcomes for each row execute function touch_updated_at();

create table invoices (id uuid primary key default gen_random_uuid(), name text not null unique, client_id uuid not null references clients, session_id uuid unique references sessions,
 payer text not null, amount_cents integer not null check(amount_cents>0), currency text not null check(currency in ('AUD','NZD')), due_on date not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on invoices for each row execute function touch_updated_at();
create table payments (id uuid primary key default gen_random_uuid(), invoice_id uuid not null references invoices, reference text not null unique,
 amount_cents integer not null check(amount_cents>0), paid_on date not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on payments for each row execute function touch_updated_at();

-- Practitioner payouts: what the practice paid each contractor from fees received. A record only; no money moves.
create table payouts (id uuid primary key default gen_random_uuid(), name text not null unique, practitioner_id uuid not null references practitioners,
 through_on date not null, amount_cents integer not null check(amount_cents>=0), currency text not null check(currency in ('AUD','NZD')), paid_on date not null, reference text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on payouts for each row execute function touch_updated_at();
create table payout_lines (id uuid primary key default gen_random_uuid(), payout_id uuid not null references payouts, payment_id uuid not null unique references payments,
 split_pct numeric(5,2) not null, practitioner_cents integer not null check(practitioner_cents>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on payout_lines for each row execute function touch_updated_at();

create table cpd (id uuid primary key default gen_random_uuid(), practitioner_id uuid not null references practitioners, done_on date not null,
 hours numeric(5,2) not null check(hours>0 and hours<=40), kind text not null check(kind in ('cpd','peer consultation')), activity text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on cpd for each row execute function touch_updated_at();

create table activity (id uuid primary key default gen_random_uuid(), client_id uuid not null references clients, body text not null, author text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on activity for each row execute function touch_updated_at();
create table import_rows (id uuid primary key default gen_random_uuid(), source_file text not null, fingerprint text not null unique, payload jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on import_rows for each row execute function touch_updated_at();
create table security_checks (id uuid primary key default gen_random_uuid(), name text not null unique, checked_on date not null, evidence text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on security_checks for each row execute function touch_updated_at();

create function protect_final_note() returns trigger language plpgsql as $$
begin
 if old.finalised_at is not null then raise exception 'Finalised note is immutable; write an addendum'; end if;
 if TG_OP='DELETE' then return old; end if;
 return new;
end $$;
create trigger locked_note before update or delete on notes for each row execute function protect_final_note();
create trigger locked_addendum before update or delete on addenda for each row execute function immutable_record();
create trigger locked_activity before update or delete on activity for each row execute function immutable_record();
create trigger locked_payment before update or delete on payments for each row execute function immutable_record();
create trigger locked_payout before update or delete on payouts for each row execute function immutable_record();
create trigger locked_payout_line before update or delete on payout_lines for each row execute function immutable_record();

create function setting(k text) returns numeric language sql stable as $$ select value from settings where key=k $$;

create view v_diary as
 select s.id,c.name client,p.name practitioner,si.name site,r.name room,s.starts_at,s.minutes,s.status,sv.code service,rf.name referral,rf.funder,s.funded,s.fee_cents,s.currency
 from sessions s join clients c on c.id=s.client_id join practitioners p on p.id=s.practitioner_id
 left join rooms r on r.id=s.room_id left join sites si on si.id=r.site_id left join services sv on sv.id=s.service_id left join referrals rf on rf.id=s.referral_id;

create view v_referrals as
 select r.id,r.name,c.name client,r.funder,r.referrer,r.approved,r.prior_used,
 (select count(*) from sessions s where s.referral_id=r.id and s.funded and s.status='completed')::integer completed,
 (select count(*) from sessions s where s.referral_id=r.id and s.funded and s.status='booked')::integer booked,
 r.approved-r.prior_used-(select count(*) from sessions s where s.referral_id=r.id and s.funded and s.status in ('completed','booked'))::integer remaining,
 r.received_on,r.valid_until,r.report_sent_on,r.closed
 from referrals r join clients c on c.id=r.client_id;
create view v_reports_due as
 select * from v_referrals where funder='Better Access' and report_sent_on is null and (closed or prior_used+completed>=approved);

create view v_debtors as
 select i.id,i.name,c.name client,i.payer,i.currency,i.amount_cents,
 coalesce((select sum(p.amount_cents) from payments p where p.invoice_id=i.id),0)::integer paid_cents,
 i.amount_cents-coalesce((select sum(p.amount_cents) from payments p where p.invoice_id=i.id),0)::integer balance_cents,
 i.due_on,greatest(0,current_date-i.due_on) days_overdue
 from invoices i join clients c on c.id=i.client_id;

create view v_notes_due as
 select s.id,c.name client,p.name practitioner,s.starts_at,case when n.id is null then 'missing' else 'draft' end note_status,current_date-s.service_on days_since
 from sessions s join clients c on c.id=s.client_id join practitioners p on p.id=s.practitioner_id left join notes n on n.session_id=s.id
 where s.status='completed' and n.finalised_at is null;

create view v_outcomes as
 select o.id,c.name client,o.instrument,o.score,o.measured_on,o.review_on,
 o.score-first_value(o.score) over(partition by o.client_id,o.instrument order by o.measured_on,o.created_at,o.id) change_from_first,
 row_number() over(partition by o.client_id,o.instrument order by o.measured_on desc,o.created_at desc,o.id desc) latest
 from outcomes o join clients c on c.id=o.client_id;

-- Who can take a new client: booked load next seven days against weekly capacity.
create view v_caseload as
 select p.id,p.name practitioner,p.discipline,p.focus,p.takes_new,p.weekly_capacity,
 x.active_clients,x.booked_next_7,p.weekly_capacity-x.booked_next_7 free_next_7,x.new_last_30
 from practitioners p cross join lateral (select
  (select count(distinct s.client_id) from sessions s where s.practitioner_id=p.id and s.status in ('booked','completed') and s.starts_at>=now()-interval '60 days')::integer active_clients,
  (select count(*) from sessions s where s.practitioner_id=p.id and s.status='booked' and s.starts_at>=now() and s.starts_at<now()+interval '7 days')::integer booked_next_7,
  (select count(*) from intakes i where i.allocated_to=p.id and i.allocated_on>=current_date-30)::integer new_last_30) x
 where p.active;

create view v_intake as
 select i.id,c.name client,i.received_on,current_date-i.received_on days_waiting,i.urgency,i.source,i.concern,s.name preferred_site,i.preferred_discipline
 from intakes i join clients c on c.id=i.client_id left join sites s on s.id=i.preferred_site_id
 where i.allocated_to is null and i.closed_reason is null;

create view v_rooms as
 select r.id,si.name site,r.name room,
 (select count(*) from sessions s where s.room_id=r.id and s.status='booked' and s.starts_at>=now() and s.starts_at<now()+interval '7 days')::integer bookings_next_7,
 round(coalesce((select sum(s.minutes) from sessions s where s.room_id=r.id and s.status='booked' and s.starts_at>=now() and s.starts_at<now()+interval '7 days'),0)/60.0,1) hours_next_7
 from rooms r join sites si on si.id=r.site_id where r.active;

-- Every receipt against a session, split between the practitioner and the practice at today's split.
create view v_split as
 select pm.id payment_id,i.name invoice,c.name client,p.id practitioner_id,p.name practitioner,pm.paid_on,i.currency,pm.amount_cents,
 coalesce(pl.split_pct,p.split_pct) split_pct,
 coalesce(pl.practitioner_cents,round(pm.amount_cents*p.split_pct/100)::integer) practitioner_cents,
 pm.amount_cents-coalesce(pl.practitioner_cents,round(pm.amount_cents*p.split_pct/100)::integer) practice_cents,
 po.name payout
 from payments pm join invoices i on i.id=pm.invoice_id join sessions s on s.id=i.session_id join practitioners p on p.id=s.practitioner_id join clients c on c.id=i.client_id
 left join payout_lines pl on pl.payment_id=pm.id left join payouts po on po.id=pl.payout_id;
create view v_payouts_due as
 select practitioner_id,practitioner,currency,count(*)::integer receipts,sum(amount_cents)::integer received_cents,sum(practitioner_cents)::integer owed_cents,min(paid_on) oldest_receipt
 from v_split where payout is null group by practitioner_id,practitioner,currency;

-- CPD runs on the Board's registration year, 1 December to 30 November.
create view v_cpd as
 select p.id,p.name practitioner,p.discipline,y.year_start,
 coalesce((select sum(hours) from cpd where practitioner_id=p.id and done_on>=y.year_start),0) hours,
 coalesce((select sum(hours) from cpd where practitioner_id=p.id and done_on>=y.year_start and kind='peer consultation'),0) peer_hours,
 setting('cpd_hours') target,setting('cpd_peer_hours') peer_target,(y.year_start+interval '1 year' - interval '1 day')::date year_end
 from practitioners p cross join lateral (select case when extract(month from current_date)=12 then make_date(extract(year from current_date)::integer,12,1) else make_date(extract(year from current_date)::integer-1,12,1) end year_start) y
 where p.active and p.discipline like '%sychologist';

create view v_cancellations as
 select s.id,c.name client,p.name practitioner,s.starts_at,s.status,
 case when s.status='dna' then 'no-show' else 'late cancel' end kind,
 round(extract(epoch from (s.starts_at-s.cancelled_at))/3600.0,1) hours_notice,
 case when exists(select 1 from invoices i where i.session_id=s.id) then 'invoiced' when s.fee_waived then 'waived' else 'undecided' end fee_decision
 from sessions s join clients c on c.id=s.client_id join practitioners p on p.id=s.practitioner_id
 where s.starts_at>=now()-interval '90 days' and (s.status='dna' or (s.status='cancelled' and s.cancelled_at>s.starts_at-setting('late_cancel_hours')*interval '1 hour'));

create view v_attention as
 select 'intake' kind,client,'Waiting '||days_waiting||' days ('||urgency||'), not allocated' detail from v_intake where days_waiting>setting('intake_wait_days') or urgency='priority'
 union all select 'notes',client,'Session note '||note_status||', '||practitioner from v_notes_due
 union all select 'referral',client,name||': '||remaining||' funded sessions left' from v_referrals where not closed and remaining<=1
 union all select 'report',client,name||': report to referrer outstanding' from v_reports_due
 union all select 'debt',client,name||': '||currency||' '||to_char(balance_cents/100.0,'FM999990.00')||' owing, '||days_overdue||' days overdue' from v_debtors where balance_cents>0 and days_overdue>0
 union all select 'payout',practitioner,currency||' '||to_char(owed_cents/100.0,'FM999990.00')||' owed from '||receipts||' receipts since '||oldest_receipt from v_payouts_due
 union all select 'cancel',client,kind||' on '||to_char(starts_at,'YYYY-MM-DD')||', no fee decision' from v_cancellations where fee_decision='undecided' and starts_at>=now()-interval '14 days'
 union all select 'outcome',client,instrument||': review due '||review_on from v_outcomes where latest=1 and review_on<current_date
 union all select 'consent',name,'No consent date recorded' from clients where active and consent_on is null;
