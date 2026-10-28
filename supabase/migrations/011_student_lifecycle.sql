begin;
-- v1.7.0: destructive deletion is a NEW operation. Old v1.6 clients cannot
-- accidentally request permanent deletion with their non-destructive dialog.
alter table reev_private.student_account_intents drop constraint student_account_intents_operation_check;
alter table reev_private.student_account_intents add constraint student_account_intents_operation_check check(operation in ('nisn','delete','purge'));
create table reev_private.deleted_students(student_id uuid primary key,nisn_hash text not null,deleted_at timestamptz not null default now());
revoke all on reev_private.deleted_students from public,anon,authenticated;

create function reev_private.purge_student(sid uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.students;
begin
 select * into s from public.students where id=sid for update;
 if not found then raise exception 'Siswa tidak ditemukan'; end if;
 -- Invalidate pending commands and replayed Gateway responses, retaining event
 -- identities/rate limits so an old event cannot execute again.
 update public.gateway_function_events set result=jsonb_build_object('ok',false,'pending',false,'text','Data siswa telah dihapus. Hubungi guru.')
 where phone=s.registered_phone or phone in(select phone from public.whatsapp_links where student_id=sid);
 update public.wa_outbox set body='Data siswa telah dihapus. Hubungi guru.',status=case when status='queued' then 'failed' else status end
 where phone=s.registered_phone;
 delete from public.pending_confirmations where payload->'p'->>'student_id'=sid::text or actor=s.user_id;
 delete from public.gateway_link_pending where student_id=sid;
 delete from public.whatsapp_links where student_id=sid;
 delete from public.grades where student_id=sid;
 delete from public.grade_history where student_id=sid;
 delete from public.task_targets where student_id=sid;
 delete from public.attendance_records where student_id=sid;
 delete from public.heart_transactions where student_id=sid;
 delete from public.violations where student_id=sid;
 -- Delete reversals and originals in the same statement (self FK).
 delete from public.star_transactions where student_id=sid;
 delete from public.class_memberships where student_id=sid;
 delete from reev_private.student_account_intents where student_id=sid;
 delete from public.students where id=sid;
 insert into reev_private.deleted_students(student_id,nisn_hash) values(sid,md5(s.nisn));
end $$;
revoke all on function reev_private.purge_student(uuid) from public,anon,authenticated,service_role;
create or replace function public.reev_prepare_student_account(actor_id uuid, student_id uuid, operation text, expected_nisn text, new_nisn text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.students; intent reev_private.student_account_intents;
begin
 if not exists(select 1 from public.profiles where id=actor_id and role='teacher' and active) then raise exception 'Akses guru aktif diperlukan'; end if;
 if operation is null or operation not in ('nisn','purge') then raise exception 'Operasi tidak valid'; end if;
 if operation='nisn' and (new_nisn is null or new_nisn !~ '^[0-9]{10}$') then raise exception 'NISN baru wajib 10 digit'; end if;
 select * into s from public.students where id=student_id for update;
 if not found then
  if operation='purge' and exists(select 1 from reev_private.deleted_students d where d.student_id=reev_prepare_student_account.student_id and d.nisn_hash=md5(expected_nisn)) then return jsonb_build_object('done',true); end if;
  raise exception 'Siswa tidak ditemukan';
 end if;
 -- Safe replay after an API response was lost.
 if operation='nisn' and s.nisn=new_nisn then return jsonb_build_object('done',true); end if;
 if expected_nisn is distinct from s.nisn then raise exception 'Data siswa telah berubah. Muat ulang halaman'; end if;
 perform set_config('reev.actor',actor_id::text,true);
 perform set_config('reev.source','website',true);
 if s.user_id is null then
  if exists(select 1 from auth.users where raw_app_meta_data->>'reev_student_id'=s.id::text) then
   raise exception 'Aktivasi akun sebelumnya belum selesai. Jalankan provision:students sebelum mengelola akun ini';
  end if;
  if operation='nisn' then update public.students set nisn=new_nisn where id=s.id;
  else
   perform reev_private.purge_student(s.id);
  end if;
  return jsonb_build_object('done',true);
 end if;
 if not exists(select 1 from public.profiles where id=s.user_id and role='student') then raise exception 'Hanya akun siswa yang dapat dikelola'; end if;
 if operation='nisn' and exists(select 1 from public.students where nisn=new_nisn and id<>s.id) then raise exception 'NISN sudah digunakan siswa lain'; end if;
 select * into intent from reev_private.student_account_intents i where i.student_id=s.id;
 if found and intent.expires_at>now() and (intent.operation<>operation or intent.new_nisn is distinct from new_nisn) then
  raise exception 'Operasi akun sebelumnya belum selesai. Ulangi operasi yang sama atau tunggu 10 menit';
 end if;
 insert into reev_private.student_account_intents(student_id,account_id,actor,operation,old_nisn,new_nisn)
 values(s.id,s.user_id,actor_id,operation,s.nisn,new_nisn)
 on conflict on constraint student_account_intents_pkey do update set account_id=excluded.account_id,actor=excluded.actor,operation=excluded.operation,
 old_nisn=excluded.old_nisn,new_nisn=excluded.new_nisn,expires_at=now()+interval '10 minutes';
 return jsonb_build_object('done',false,'account_id',s.user_id);
end $$;
revoke all on function public.reev_prepare_student_account(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.reev_prepare_student_account(uuid,uuid,text,text,text) to service_role;

create or replace function reev_private.sync_student_auth() returns trigger
language plpgsql security definer set search_path='' as $$
declare s public.students; intent reev_private.student_account_intents;
begin
 if TG_OP='UPDATE' and new.email is not distinct from old.email then return new; end if;
 select * into s from public.students where user_id=old.id for update;
 if not found then
  if TG_OP='DELETE' then return old; else return new; end if;
 end if;
 select * into intent from reev_private.student_account_intents where student_id=s.id for update;
 if not found or intent.account_id<>old.id or intent.expires_at<=now()
 or not exists(select 1 from public.profiles where id=intent.actor and role='teacher' and active)
 or not exists(select 1 from public.profiles where id=old.id and role='student') then
  raise exception 'Perubahan identitas akun siswa harus melalui Guru Operator';
 end if;
 perform set_config('reev.actor',intent.actor::text,true);
 perform set_config('reev.source','website',true);
 if TG_OP='UPDATE' then
  if intent.operation<>'nisn' or new.email is distinct from intent.new_nisn||'@siswa.reev.invalid'
    or s.nisn<>intent.old_nisn then raise exception 'Koreksi NISN tidak cocok'; end if;
  update public.students set nisn=intent.new_nisn where id=s.id;
 else
  if intent.operation<>'purge' or s.nisn<>intent.old_nisn then raise exception 'Konfirmasi hapus akun tidak cocok'; end if;
  perform reev_private.purge_student(s.id);
  -- Preserve historical actor UUIDs in audit JSON before detaching FK references.
  update public.audit_logs set old_data=coalesce(old_data,'{}'::jsonb)||jsonb_build_object('deleted_actor_id',actor),actor=null where actor=old.id;
  delete from public.pending_confirmations where actor=old.id;
  delete from public.teacher_whatsapp_allowlist where profile_id=old.id;
  delete from public.profiles where id=old.id;
 end if;
 insert into public.audit_logs(actor,source,action,entity,new_data)
 values(intent.actor,'website',case when TG_OP='UPDATE' then 'correct_student_nisn' else 'purge_student' end,'students',
 jsonb_build_object('student_id',s.id,'account_id',old.id,'old_nisn',s.nisn,'new_nisn',intent.new_nisn));
 delete from reev_private.student_account_intents where student_id=s.id;
 if TG_OP='DELETE' then return old; else return new; end if;
end $$;
revoke all on function reev_private.sync_student_auth() from public,anon,authenticated;

-- Registration and profile responses are snapshots. Discard their payloads on
-- NISN correction, but do not remove event IDs or the verified phone binding.
create function reev_private.refresh_student_gateway_identity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.nisn is distinct from new.nisn then
  update public.gateway_function_events set result=jsonb_build_object('ok',false,'pending',false,'text','NISN telah diperbarui. Kirim .infodaftar dengan NISN terbaru sebagai pesan baru.')
  where phone=new.registered_phone or phone in(select phone from public.whatsapp_links where student_id=new.id);
  update public.pending_confirmations set used_at=now() where used_at is null and payload->'p'->>'student_id'=new.id::text;
 end if;
 return new;
end $$;
create trigger refresh_student_gateway_identity after update of nisn on public.students
for each row execute function reev_private.refresh_student_gateway_identity();
revoke all on function reev_private.refresh_student_gateway_identity() from public,anon,authenticated;
create or replace function public.reev_gateway_function(p_event text,p_phone text,p_action text,p_argument text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.students;pending public.gateway_link_pending;reply text;r jsonb;cached public.gateway_function_events;h text;cmd text;until_time timestamptz;
begin
 if p_event is null or length(p_event)>300 or p_phone !~ '^\+[1-9][0-9]{7,14}$' or length(p_argument)>30 or p_action not in ('register','confirm','cancel','profile','tasks','grades','stars','hearts','attendance') then raise exception 'Input tidak valid';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_phone,1));
 h:=md5(p_phone||':'||p_action||':'||p_argument);
 select * into cached from public.gateway_function_events where event_key=p_event;
 if found then if cached.request_hash<>h then raise exception 'Event berbeda';end if;return cached.result;end if;
 if (select count(*) from public.gateway_function_events where phone=p_phone and created_at>now()-interval '1 minute')>=15 then return jsonb_build_object('ok',false,'text','Terlalu banyak permintaan. Tunggu satu menit.');end if;
 insert into public.gateway_function_events(event_key,phone,request_hash) values(p_event,p_phone,h);
 begin
 if p_action='register' then
 p_argument:=btrim(p_argument);
 if p_argument !~ '^[0-9]{5,20}$' then raise exception 'Ketik perintah daftar diikuti NISN, contoh: .infodaftar 0012345671';end if;
 -- Scope lookup to the registered phone first. Never disclose a student's
 -- name/status to a different phone, even if it knows the student's NISN.
 select * into s from public.students where registered_phone=p_phone for update;
 if not found then raise exception 'Nomor WhatsApp belum terdaftar. Minta guru memeriksa nomor Anda di Siswa dan Kelas.'; end if;
 if not s.phone_verified then raise exception 'Nomor WhatsApp belum diverifikasi guru. Minta guru mencentang verifikasi nomor di Siswa dan Kelas.'; end if;
 if not s.active then raise exception 'Data siswa dinonaktifkan. Hubungi Guru Operator.'; end if;
 if s.user_id is not null and not exists(select 1 from public.profiles where id=s.user_id and active) then raise exception 'Akses akun dinonaktifkan. Hubungi Guru Operator.'; end if;
 if s.nisn<>p_argument then raise exception 'NISN tidak cocok dengan nomor Anda. Gunakan NISN terbaru dari Guru Operator, termasuk angka nol di depan.'; end if;
 if exists(select 1 from public.whatsapp_links where (student_id=s.id and phone<>p_phone) or (phone=p_phone and student_id<>s.id)) then raise exception 'Sudah ada tautan lain. Hubungi guru untuk melepas tautan lama.';end if;
 until_time:=now()+interval '5 minutes';
 insert into public.gateway_link_pending(phone,student_id,expires_at) values(p_phone,s.id,until_time) on conflict(phone) do update set student_id=excluded.student_id,expires_at=excluded.expires_at;
 r:=jsonb_build_object('ok',true,'pending',true,'text',format(E'Konfirmasi REEV Belajar\nNama: %s\nNISN: %s\nNomor: %s\n\nBalas YA untuk menautkan nomor ini. Berlaku 5 menit. Balas BATAL untuk membatalkan.',s.name,s.nisn,p_phone));
 elsif p_action='cancel' then update public.pending_confirmations set used_at=now() where phone=p_phone and used_at is null;delete from public.gateway_link_pending where phone=p_phone;r:=jsonb_build_object('ok',true,'pending',false,'text','Penautan dibatalkan.');
 elsif p_action='confirm' then
 select * into pending from public.gateway_link_pending where phone=p_phone and expires_at>now() for update;
 if not found then raise exception 'Konfirmasi sudah berakhir. Ulangi perintah daftar.';end if;
 select * into s from public.students where id=pending.student_id and active and phone_verified and registered_phone=p_phone and (user_id is null or exists(select 1 from public.profiles p where p.id=students.user_id and p.active)) for update;
 if not found then raise exception 'Verifikasi nomor telah berubah. Hubungi guru.';end if;
 if exists(select 1 from public.whatsapp_links where (student_id=s.id and phone<>p_phone) or (phone=p_phone and student_id<>s.id)) then raise exception 'Tautan sudah berubah. Hubungi guru.';end if;
 perform set_config('reev.source','WhatsApp Gateway',true);
 insert into public.whatsapp_links(student_id,phone) values(s.id,p_phone) on conflict(student_id) do update set phone=excluded.phone,created_at=now();
 update public.students set registered_phone=p_phone,phone_verified=true where id=s.id;
 delete from public.gateway_link_pending where phone=p_phone;
 r:=jsonb_build_object('ok',true,'pending',false,'text','Nomor berhasil ditautkan ke '||s.name||E'.\nKirim .menu untuk membuka REEV Belajar.');
 else
 if p_argument<>'' then raise exception 'Perintah ini hanya menampilkan data Anda sendiri. Kirim tanpa NISN atau argumen tambahan.';end if;
 select st.* into s from public.whatsapp_links l join public.students st on st.id=l.student_id where l.phone=p_phone and st.active and st.phone_verified and st.registered_phone=p_phone and (st.user_id is null or exists(select 1 from public.profiles p where p.id=st.user_id and p.active));
 if not found then raise exception 'Nomor belum tertaut atau akses dinonaktifkan. Gunakan menu Tautkan NISN.';end if;
 cmd:=case p_action when 'profile' then '.profil' when 'tasks' then '.tugas' when 'grades' then '.nilai' when 'stars' then '.bintang' when 'hearts' then '.hati' when 'attendance' then '.absen' end;
 reply:=reev_private.bot_profile(s.id,cmd);r:=jsonb_build_object('ok',true,'text',reply);
 end if;
 exception when others then r:=jsonb_build_object('ok',false,'text',case when SQLSTATE='P0001' then SQLERRM else 'Permintaan tidak dapat diproses. Hubungi guru.' end);
 end;
 update public.gateway_function_events set result=r where event_key=p_event;return r;
end $$;
revoke all on function public.reev_gateway_function(text,text,text,text) from public,anon,authenticated;
grant execute on function public.reev_gateway_function(text,text,text,text) to service_role;

-- Membership and task creation through application RPCs serialize together.
-- This covers either ordering of a task creation vs new student/CSV membership.
alter function reev_private.mutate(uuid,text,jsonb,uuid,text) rename to mutate_v160;
revoke all on function reev_private.mutate_v160(uuid,text,jsonb,uuid,text) from public,anon,authenticated,service_role;
create function reev_private.mutate(a uuid,op text,p jsonb,req uuid,src text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if op in ('student','import_students','task') then perform pg_advisory_xact_lock(11700); end if;
 return reev_private.mutate_v160(a,op,p,req,src);
end $$;
revoke all on function reev_private.mutate(uuid,text,jsonb,uuid,text) from public,anon,authenticated,service_role;

create function reev_private.enroll_existing_tasks() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_TABLE_NAME='class_memberships' then
  insert into public.task_targets(task_id,student_id)
  select t.id,new.student_id from public.tasks t join public.semesters sem on sem.id=t.semester_id
  join public.students s on s.id=new.student_id
  where t.class_id=new.class_id and t.semester_id=new.semester_id and not sem.archived and s.active
  on conflict(task_id,student_id) do nothing;
 else
  if new.active and not old.active then
   insert into public.task_targets(task_id,student_id)
   select t.id,new.id from public.class_memberships m join public.tasks t on t.class_id=m.class_id and t.semester_id=m.semester_id
   join public.semesters sem on sem.id=m.semester_id
   where m.student_id=new.id and not sem.archived
   on conflict(task_id,student_id) do nothing;
  end if;
 end if;
 return new;
end $$;
create trigger enroll_existing_tasks after insert or update on public.class_memberships
for each row execute function reev_private.enroll_existing_tasks();
create trigger enroll_reactivated_student after update of active on public.students
for each row execute function reev_private.enroll_existing_tasks();
revoke all on function reev_private.enroll_existing_tasks() from public,anon,authenticated;
-- Repair existing students missing targets; do not overwrite grades/statuses or
-- modify archived semesters, inactive students, or other classes.
insert into public.task_targets(task_id,student_id)
select t.id,s.id from public.class_memberships m join public.students s on s.id=m.student_id
join public.tasks t on t.class_id=m.class_id and t.semester_id=m.semester_id
join public.semesters sem on sem.id=m.semester_id
where s.active and not sem.archived
on conflict(task_id,student_id) do nothing;
-- Prevent a stale Edit dialog from recreating a permanently deleted UUID.
create function reev_private.reject_deleted_student() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from reev_private.deleted_students where student_id=new.id) then
  raise exception 'Siswa telah dihapus permanen. Muat ulang halaman';
 end if;
 return new;
end $$;
create trigger reject_deleted_student before insert on public.students
for each row execute function reev_private.reject_deleted_student();
revoke all on function reev_private.reject_deleted_student() from public,anon,authenticated;
commit;
