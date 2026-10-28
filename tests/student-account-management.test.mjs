import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID as uuid} from 'node:crypto';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {manageStudentAccount} from '../server/manage-student-account.mjs';

test('account API denies unauthorized callers and validates before privileged calls',async()=>{
 let calls=0,role='student',active=true;
 const db={auth:{getUser:async()=>({data:{user:{id:uuid()}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role,active}})})})}),rpc:async()=>{calls++;return {data:{done:true}}}};
 const body={studentId:uuid(),operation:'nisn',expectedNisn:'0012345678',newNisn:'0098765432'};
 await assert.rejects(()=>manageStudentAccount(db,'',body),e=>e.status===401);
 await assert.rejects(()=>manageStudentAccount(db,'token',body),e=>e.status===403);
 role='teacher';active=false;await assert.rejects(()=>manageStudentAccount(db,'token',body),e=>e.status===403);
 active=true;await assert.rejects(()=>manageStudentAccount(db,'token',{...body,newNisn:98765432}),e=>e.status===400);
 assert.equal(calls,0);
 await manageStudentAccount(db,'token',body);assert.equal(calls,1);
});

test('010 incremental upgrade, Auth transactions, recovery, privilege and history',async t=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create role supabase_auth_admin;
 create schema auth;create table auth.users(id uuid primary key,email text unique,raw_app_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon,service_role,supabase_auth_admin;
 grant execute on function auth.uid() to authenticated,anon,service_role;
 grant select,update,delete on auth.users to supabase_auth_admin;`);
 const dir=new URL('../supabase/migrations/',import.meta.url);
 for(const f of (await fs.readdir(dir)).sort().filter(n=>n<'010'))await db.exec(await fs.readFile(new URL(f,dir),'utf8'));
 const teacher=uuid(),inactive=uuid(),a=uuid(),b=uuid(),ua=uuid(),ub=uuid(),cls=uuid(),sem=uuid(),task=uuid();
 await db.query("insert into auth.users(id,email) values($1,'guru@example.org'),($2,'inactive@example.org')",[teacher,inactive]);
 await db.query("insert into profiles(id,name,role,active) values($1,'Guru','teacher',true),($2,'Nonaktif','teacher',false)",[teacher,inactive]);
 await db.query("insert into students(id,nisn,name) values($1,'0012345678','Siswa A'),($2,'0012345679','Siswa B')",[a,b]);
 await db.query("insert into auth.users(id,email,raw_app_meta_data) values($1,'0012345678@siswa.reev.invalid',$3),($2,'0012345679@siswa.reev.invalid',$4)",[ua,ub,JSON.stringify({reev_student_id:a}),JSON.stringify({reev_student_id:b})]);
 await db.query('select reev_attach_student_account($1,$2)',[a,ua]);await db.query('select reev_attach_student_account($1,$2)',[b,ub]);
 await db.query("insert into semesters(id,name,active) values($1,'Uji',true)",[sem]);
 await db.query("insert into classes(id,name) values($1,'Kelas Uji')",[cls]);
 await db.query('insert into class_memberships values($1,$2,$3)',[a,sem,cls]);
 await db.query("insert into tasks(id,code,title,kind,class_id,semester_id,kktp,classical_target) values($1,'UJI','Tugas Uji','FORMATIF',$2,$3,70,80)",[task,cls,sem]);
 await db.query("insert into task_targets values($1,$2,'Dinilai')",[task,a]);
 await db.query('insert into grades(task_id,student_id,score) values($1,$2,85)',[task,a]);
 const meeting=uuid(),violation=uuid();
 await db.query("insert into attendance_meetings(id,class_id,semester_id,date,number) values($1,$2,$3,'2026-10-28',1)",[meeting,cls,sem]);
 await db.query("insert into attendance_records(meeting_id,student_id,status) values($1,$2,'Hadir')",[meeting,a]);
 await db.query("insert into star_transactions(student_id,semester_id,amount,reason) values($1,$2,2,'Uji')",[a,sem]);
 await db.query("insert into violations(id,student_id,semester_id,code,description) values($1,$2,$3,'UJI','Uji')",[violation,a,sem]);
 await db.query("insert into heart_transactions(student_id,semester_id,amount,reason,violation_id,kind) values($1,$2,-1,'Uji',$3,'deduction')",[a,sem,violation]);
 await db.query("insert into whatsapp_links(student_id,phone) values($1,'+628123456789')",[a]);
 const historyTables=['grades','class_memberships','task_targets','grade_history','attendance_records','star_transactions','violations','heart_transactions'];
 const tables=['students','profiles',...historyTables];const before={};
 for(const table of tables)before[table]=(await db.query('select * from '+table+' order by 1,2')).rows;
 await db.exec(await fs.readFile(new URL('010_student_account_management.sql',dir),'utf8'));
 for(const table of tables)assert.deepEqual((await db.query('select * from '+table+' order by 1,2')).rows,before[table]);
 const role=async(r,id='')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+r)};
 const prepare=async(actor=teacher,operation='nisn',old='0012345678',next='0098765432')=>(await db.query('select reev_prepare_student_account($1,$2,$3,$4,$5) r',[actor,a,operation,old,next])).rows[0].r;
 const email=async value=>db.query('update auth.users set email=$1 where id=$2',[value,ua]);
 await t.test('private RPC cannot be called by anon/student/teacher browser; service rechecks actor',async()=>{
 for(const [r,id] of [['anon',''],['authenticated',ua],['authenticated',teacher]]){await role(r,id);await assert.rejects(()=>prepare());}
 await role('service_role');await assert.rejects(()=>prepare(ua),/Akses/);await assert.rejects(()=>prepare(inactive),/Akses/);
 await assert.rejects(()=>prepare(teacher,'nisn','0012345678','123'),/10 digit/);
 await assert.rejects(()=>prepare(teacher,'nisn','0012345678','0012345679'),/sudah digunakan/);
 });
 await t.test('uncoordinated Auth email update, direct student update and teacher-target misuse denied',async()=>{
 await role('supabase_auth_admin');await assert.rejects(()=>email('0098765432@siswa.reev.invalid'),/Guru Operator/);
 await role('postgres');await assert.rejects(()=>db.query("update students set nisn='0098765432' where id=$1",[a]),/Koreksi NISN/);
 const corrupt=uuid();await db.query("insert into students(id,nisn,name,user_id) values($1,'0000000001','Target guru',$2)",[corrupt,teacher]);
 await role('service_role');await assert.rejects(()=>db.query("select reev_prepare_student_account($1,$2,'delete','0000000001',null)",[teacher,corrupt]),/Hanya akun siswa/);
 await role('postgres');await db.query('delete from students where id=$1',[corrupt]);
 });
 await t.test('intent resumes; competing operation/stale data denied; Auth failure rolls back student and audit',async()=>{
 await role('service_role');assert.equal((await prepare()).account_id,ua);assert.equal((await prepare()).account_id,ua);
 await assert.rejects(()=>prepare(teacher,'delete','0012345678',null),/belum selesai/);
 await assert.rejects(()=>prepare(teacher,'nisn','0000000000','0098765432'),/telah berubah/);
 await role('postgres');const audit=(await db.query('select count(*) n from audit_logs')).rows[0].n;
 await db.exec('begin');await role('supabase_auth_admin');await email('0098765432@siswa.reev.invalid');await db.exec('rollback');
 await role('postgres');assert.equal((await db.query('select nisn from students where id=$1',[a])).rows[0].nisn,'0012345678');
 assert.equal((await db.query('select count(*) n from audit_logs')).rows[0].n,audit);
 await role('supabase_auth_admin');await assert.rejects(()=>email('0088888888@siswa.reev.invalid'),/tidak cocok/);
 await email('0098765432@siswa.reev.invalid');
 await role('service_role');assert.equal((await prepare()).done,true);
 await role('postgres');assert.equal((await db.query('select nisn,user_id from students where id=$1',[a])).rows[0].nisn,'0098765432');
 assert.equal((await db.query('select user_id from students where id=$1',[a])).rows[0].user_id,ua);
 assert.equal((await db.query("select count(*) n from audit_logs where action='correct_student_nisn'")).rows[0].n,1);
 for(const table of historyTables)assert.deepEqual((await db.query('select * from '+table+' order by 1,2')).rows,before[table]);
 });
 await t.test('duplicate race rolls back Auth; expired or revoked intent cannot change account',async()=>{
 await role('service_role');await prepare(teacher,'nisn','0098765432','0077777777');
 await role('postgres');await db.query("insert into students(nisn,name) values('0077777777','Race')");
 await role('supabase_auth_admin');await assert.rejects(()=>email('0077777777@siswa.reev.invalid'),/unique/);
 await role('postgres');assert.equal((await db.query('select email from auth.users where id=$1',[ua])).rows[0].email,'0098765432@siswa.reev.invalid');
 await db.query("update reev_private.student_account_intents set expires_at=now()-interval '1 second'");
 await role('supabase_auth_admin');await assert.rejects(()=>email('0077777777@siswa.reev.invalid'),/Guru Operator/);
 await role('service_role');await prepare(teacher,'delete','0098765432',null);
 await role('postgres');await db.query('update profiles set active=false where id=$1',[teacher]);
 await role('supabase_auth_admin');await assert.rejects(()=>db.query('delete from auth.users where id=$1',[ua]),/Guru Operator/);
 await role('postgres');await db.query('update profiles set active=true where id=$1',[teacher]);
 });
 await t.test('account delete is atomic, preserves learning history, revokes RLS and supports lost-response retry',async()=>{
 await role('supabase_auth_admin');await db.query('delete from auth.users where id=$1',[ua]);
 await role('postgres');assert.equal((await db.query('select * from profiles where id=$1',[ua])).rows.length,0);
 assert.equal((await db.query('select * from whatsapp_links where student_id=$1',[a])).rows.length,0);
 assert.deepEqual((await db.query('select active,user_id from students where id=$1',[a])).rows,[{active:false,user_id:null}]);
 for(const table of historyTables)assert.deepEqual((await db.query('select * from '+table+' order by 1,2')).rows,before[table]);
 await role('authenticated',ua);assert.equal((await db.query('select * from grades')).rows.length,0);assert.equal((await db.query('select * from students')).rows.length,0);
 await role('service_role');assert.equal((await prepare(teacher,'delete','0098765432',null)).done,true);
 await role('postgres');assert.equal((await db.query('select * from auth.users where id=$1',[ub])).rows.length,1);
 assert.equal((await db.query("select count(*) n from audit_logs where action='delete_student_account'")).rows[0].n,1);
 });
 await t.test('unlinked students can be corrected/disabled; incomplete provisioning is blocked',async()=>{
 await role('postgres');const c=uuid(),uc=uuid();await db.query("insert into students(id,nisn,name) values($1,'0000000002','Belum aktif')",[c]);
 await role('service_role');assert.equal((await db.query("select reev_prepare_student_account($1,$2,'nisn','0000000002','0000000003') r",[teacher,c])).rows[0].r.done,true);
 assert.equal((await db.query("select reev_prepare_student_account($1,$2,'delete','0000000003',null) r",[teacher,c])).rows[0].r.done,true);
 await role('postgres');await db.query('insert into auth.users(id,email,raw_app_meta_data) values($1,$2,$3)',[uc,'0000000003@siswa.reev.invalid',JSON.stringify({reev_student_id:c})]);
 await role('service_role');await assert.rejects(()=>db.query("select reev_prepare_student_account($1,$2,'nisn','0000000003','0000000004')",[teacher,c]),/Aktivasi akun sebelumnya/);
 });
 }finally{await db.close()}
});

test('API uses official Auth operations, preserves password, and verifies synchronization',async()=>{
 const studentId=uuid(),accountId=uuid(),actorId=uuid();let calls=[],done=false,authFailure=false,verifyFailure=false;
 const db={auth:{getUser:async()=>({data:{user:{id:actorId}}}),admin:{
 updateUserById:async(id,attrs)=>{calls.push({id,attrs});done=!verifyFailure;return {error:authFailure?{}:null}},
 deleteUser:async id=>{calls.push({deleted:id});done=true;return {error:authFailure?{}:null}}
 }},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'teacher',active:true}})})})}),
 rpc:async(name,p)=>{assert.equal(name,'reev_prepare_student_account');assert.equal(p.actor_id,actorId);return {data:done?{done:true}:{done:false,account_id:accountId}}}};
 const body={studentId,operation:'nisn',expectedNisn:'0012345678',newNisn:'0098765432'};
 assert.equal((await manageStudentAccount(db,'token',body)).ok,true);
 assert.deepEqual(calls,[{id:accountId,attrs:{email:'0098765432@siswa.reev.invalid',email_confirm:true}}]);
 await manageStudentAccount(db,'token',body);assert.equal(calls.length,1);
 done=false;await manageStudentAccount(db,'token',{...body,operation:'delete'});assert.deepEqual(calls[1],{deleted:accountId});
 done=false;authFailure=true;await assert.rejects(()=>manageStudentAccount(db,'token',body),e=>e.status===502);
 done=false;authFailure=false;verifyFailure=true;await assert.rejects(()=>manageStudentAccount(db,'token',body),e=>e.status===502);
});
