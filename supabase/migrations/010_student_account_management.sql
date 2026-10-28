begin;
-- Authorized intent is private. Auth changes remain on the official Admin API.
create table reev_private.student_account_intents (
 student_id uuid primary key references public.students(id),
 account_id uuid not null, actor uuid not null references public.profiles(id),
 operation text not null check(operation in ('nisn','delete')),
 old_nisn text not null, new_nisn text,
 expires_at timestamptz not null default now()+interval '10 minutes'
);
revoke all on reev_private.student_account_intents from public,anon,authenticated;

create function public.reev_prepare_student_account(actor_id uuid, student_id uuid, operation text, expected_nisn text, new_nisn text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.students; intent reev_private.student_account_intents;
begin
 if not exists(select 1 from public.profiles where id=actor_id and role='teacher' and active) then raise exception 'Akses guru aktif diperlukan'; end if;
 if operation is null or operation not in ('nisn','delete') then raise exception 'Operasi tidak valid'; end if;
 if operation='nisn' and (new_nisn is null or new_nisn !~ '^[0-9]{10}$') then raise exception 'NISN baru wajib 10 digit'; end if;
 select * into s from public.students where id=student_id for update;
 if not found then raise exception 'Siswa tidak ditemukan'; end if;
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
   update public.students set active=false where id=s.id;
   delete from public.whatsapp_links where whatsapp_links.student_id=s.id;
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

-- Only the nested Auth synchronization trigger may change a linked NISN.
create or replace function reev_private.protect_login_nisn() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.nisn is distinct from new.nisn and old.user_id is not null then
  if pg_trigger_depth()<2 or not exists(select 1 from auth.users u
    join reev_private.student_account_intents i on i.account_id=u.id
    where u.id=old.user_id and i.student_id=old.id and i.operation='nisn'
    and i.new_nisn=new.nisn and u.email=new.nisn||'@siswa.reev.invalid') then
   raise exception 'Gunakan tombol Koreksi NISN agar identitas login ikut diperbarui';
  end if;
 end if;
 return new;
end $$;

create function reev_private.sync_student_auth() returns trigger
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
  if intent.operation<>'delete' or s.nisn<>intent.old_nisn then raise exception 'Konfirmasi hapus akun tidak cocok'; end if;
  update public.students set user_id=null,active=false where id=s.id;
  delete from public.whatsapp_links where student_id=s.id;
  -- Preserve historical actor UUIDs in audit JSON before detaching FK references.
  update public.audit_logs set old_data=coalesce(old_data,'{}'::jsonb)||jsonb_build_object('deleted_actor_id',actor),actor=null where actor=old.id;
  delete from public.pending_confirmations where actor=old.id;
  delete from public.teacher_whatsapp_allowlist where profile_id=old.id;
  delete from public.profiles where id=old.id;
 end if;
 insert into public.audit_logs(actor,source,action,entity,new_data)
 values(intent.actor,'website',case when TG_OP='UPDATE' then 'correct_student_nisn' else 'delete_student_account' end,'students',
 jsonb_build_object('student_id',s.id,'account_id',old.id,'old_nisn',s.nisn,'new_nisn',intent.new_nisn));
 delete from reev_private.student_account_intents where student_id=s.id;
 if TG_OP='DELETE' then return old; else return new; end if;
end $$;
-- AFTER email update makes the new Auth email visible to the NISN guard.
create trigger reev_sync_student_email after update of email on auth.users
for each row execute function reev_private.sync_student_auth();
create trigger reev_delete_student_account before delete on auth.users
for each row execute function reev_private.sync_student_auth();
revoke all on function reev_private.sync_student_auth() from public,anon,authenticated;
commit;
