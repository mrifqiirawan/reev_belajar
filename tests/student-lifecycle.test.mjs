import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID as uuid} from 'node:crypto';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('011 lifecycle: backfill, enrollment, corrected WhatsApp identity, permanent deletion',async t=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create role supabase_auth_admin;
 create schema auth;create table auth.users(id uuid primary key,email text unique,raw_app_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon,service_role,supabase_auth_admin;
 grant execute on function auth.uid() to authenticated,anon,service_role;
 grant select,update,delete on auth.users to supabase_auth_admin;`);
 const dir=new URL('../supabase/migrations/',import.meta.url);
 for(const f of (await fs.readdir(dir)).sort().filter(n=>n<'011'))await db.exec(await fs.readFile(new URL(f,dir),'utf8'));
 const teacher=uuid(),sid=uuid(),uid=uuid(),other=uuid(),inactive=uuid(),period=uuid(),archived=uuid(),cls=uuid(),cls2=uuid();
 const phone='+6281234567890',nisn='0012345678',newNisn='0098765432';
 await db.query("insert into auth.users(id,email) values($1,'teacher@example.test')",[teacher]);
 await db.query("insert into profiles(id,name,role) values($1,'Guru Uji','teacher')",[teacher]);
 await db.query("insert into semesters(id,name,active,archived) values($1,'Aktif',true,false),($2,'Arsip',false,true)",[period,archived]);
 await db.query("insert into classes(id,name) values($1,'A'),($2,'B')",[cls,cls2]);
 await db.query("insert into students(id,nisn,name,registered_phone,phone_verified) values($1,$2,'Siswa Uji',$3,true)",[sid,nisn,phone]);
 await db.query("insert into auth.users(id,email,raw_app_meta_data) values($1,$2,$3)",[uid,nisn+'@siswa.reev.invalid',JSON.stringify({reev_student_id:sid})]);
 await db.query('select reev_attach_student_account($1,$2)',[sid,uid]);
 await db.query("insert into students(id,nisn,name,active) values($1,'0000000002','Lain',true),($2,'0000000003','Nonaktif',false)",[other,inactive]);
 await db.query('insert into class_memberships values($1,$4,$5),($2,$4,$6),($3,$4,$5),($1,$7,$5)',[sid,other,inactive,period,cls,cls2,archived]);
 const task=uuid(),sum=uuid(),otherTask=uuid(),oldTask=uuid();
 for(const [id,code,c,p,kind] of [[task,'F',cls,period,'FORMATIF'],[sum,'S',cls,period,'SUMATIF'],[otherTask,'B',cls2,period,'FORMATIF'],[oldTask,'OLD',cls,archived,'FORMATIF']]){
 await db.query('insert into tasks(id,code,title,kind,class_id,semester_id,kktp,classical_target) values($1,$2,$2,$3,$4,$5,70,80)',[id,code,kind,c,p]);}
 await db.query("insert into task_targets values($1,$2,'Dinilai')",[task,sid]);
 await db.query('insert into grades(task_id,student_id,score) values($1,$2,85)',[task,sid]);
 const beforeGrade=(await db.query('select * from grades')).rows;
 const role=async(r,id='')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+r)};
 const targets=async id=>(await db.query('select task_id,status from task_targets where student_id=$1 order by task_id',[id])).rows;
 const prepare=async(id,op='purge',old=nisn,next=null)=>(await db.query('select reev_prepare_student_account($1,$2,$3,$4,$5) r',[teacher,id,op,old,next])).rows[0].r;
 const gateway=async(action,arg='',p=phone,event=uuid())=>(await db.query('select reev_gateway_function($1,$2,$3,$4) r',[event,p,action,arg])).rows[0].r;
 const mutate=async(op,p)=>(await db.query('select reev_mutate($1,$2,$3) r',[op,JSON.stringify(p),uuid()])).rows[0].r;
 await db.exec(await fs.readFile(new URL('011_student_lifecycle.sql',dir),'utf8'));
 await t.test('backfill only missing targets in correct class and open semester, preserves scored rows',async()=>{
 const rows=await targets(sid);assert.equal(rows.length,2);assert.equal(rows.find(x=>x.task_id===task).status,'Dinilai');assert.equal(rows.find(x=>x.task_id===sum).status,'Belum');
 assert.deepEqual((await db.query('select * from grades')).rows,beforeGrade);
 assert.equal((await targets(inactive)).length,0);assert.deepEqual((await targets(other)).map(x=>x.task_id),[otherTask]);
 });
 let manual;
 await t.test('manual add and CSV automatically join old formative and summative tasks; no duplicates on edit',async()=>{
 await role('authenticated',teacher);manual=uuid();
 await mutate('student',{id:manual,nisn:'0000000010',name:'Baru',class_id:cls});
 assert.deepEqual((await targets(manual)).map(x=>x.task_id).sort(),[task,sum].sort());
 await mutate('student',{id:manual,nisn:'0000000010',name:'Baru edit',class_id:cls});assert.equal((await targets(manual)).length,2);
 await mutate('import_students',{rows:[{nisn:'0000000011',name:'CSV A',class_id:cls},{nisn:'0000000012',name:'CSV B',class_id:cls2}]});
 for(const [n,expected] of [['0000000011',[task,sum]],['0000000012',[otherTask]]]){
 const id=(await db.query('select id from students where nisn=$1',[n])).rows[0].id;assert.deepEqual((await targets(id)).map(x=>x.task_id).sort(),expected.sort());}
 await assert.rejects(()=>mutate('import_students',{rows:[{nisn:'0000000013',name:'Rollback',class_id:cls},{nisn:'0000000010',name:'Duplikat',class_id:cls}]}));
 assert.equal((await db.query("select * from students where nisn='0000000013'")).rows.length,0);
 // New tasks still target all current active members through the original path.
 const newTask=uuid();await mutate('task',{id:newTask,code:'NEW',title:'Tugas baru',kind:'FORMATIF',class_id:cls,max_score:100});
 assert.ok((await targets(manual)).some(x=>x.task_id===newTask));
 });
 await t.test('reactivation enrolls missing tasks, class transfer adds destination without destroying prior grades',async()=>{
 await role('authenticated',teacher);await mutate('student',{id:inactive,nisn:'0000000003',name:'Aktif lagi',class_id:cls,active:true});
 assert.equal((await targets(inactive)).length,3);
 await mutate('student',{id:manual,nisn:'0000000010',name:'Pindah',class_id:cls2});assert.ok((await targets(manual)).some(x=>x.task_id===otherTask));
 await role('postgres');assert.deepEqual((await db.query('select * from grades')).rows,beforeGrade);
 });
 await t.test('NISN correction reaches Gateway register + confirm + profile, invalidates old response snapshots',async()=>{
 await role('service_role');const oldEvent=uuid();assert.equal((await gateway('register',nisn,phone,oldEvent)).ok,true);
 assert.equal((await gateway('confirm')).ok,true);
 assert.equal((await prepare(sid,'nisn',nisn,newNisn)).account_id,uid);
 await role('supabase_auth_admin');await db.query('update auth.users set email=$1 where id=$2',[newNisn+'@siswa.reev.invalid',uid]);
 await role('service_role');assert.equal((await gateway('register',nisn,phone,oldEvent)).ok,false);
 assert.equal((await gateway('register',nisn)).ok,false);
 const fresh=await gateway('register',' '+newNisn+' ');assert.equal(fresh.ok,true);assert.match(fresh.text,new RegExp(newNisn));assert.doesNotMatch(fresh.text,new RegExp(nisn));
 assert.equal((await gateway('confirm')).ok,true);
 const profile=await gateway('profile');assert.equal(profile.ok,true);assert.match(profile.text,new RegExp(newNisn));
 const denied=await gateway('register',newNisn,'+6289999999999');assert.equal(denied.ok,false);assert.doesNotMatch(denied.text,/Siswa Uji|0098765432/);
 await role('postgres');assert.equal((await db.query('select student_id from whatsapp_links where phone=$1',[phone])).rows[0].student_id,sid);
 });
 await t.test('private deletion, stale non-destructive operation, and student callers are rejected',async()=>{
 for(const [r,u] of [['anon',''],['authenticated',uid],['authenticated',teacher]]){await role(r,u);await assert.rejects(()=>prepare(sid,'purge',newNisn));await assert.rejects(()=>db.query('select reev_private.purge_student($1)',[sid]));}
 await role('service_role');await assert.rejects(()=>prepare(sid,'delete',newNisn),/Operasi/);await assert.rejects(()=>prepare(sid,'purge',nisn),/telah berubah/);
 await role('postgres');await db.query('update profiles set active=false where id=$1',[teacher]);
 await role('service_role');await assert.rejects(()=>prepare(sid,'purge',newNisn),/Akses/);
 await role('postgres');await db.query('update profiles set active=true where id=$1',[teacher]);
 });
 await t.test('Auth deletion atomically purges all learning data and pending WA, preserves other students/tasks',async()=>{
 await role('postgres');const meeting=uuid(),violation=uuid(),star=uuid();
 await db.query("insert into attendance_meetings(id,class_id,semester_id,date,number) values($1,$2,$3,'2026-10-28',1)",[meeting,cls,period]);
 await db.query("insert into attendance_records(meeting_id,student_id,status) values($1,$2,'Hadir')",[meeting,sid]);
 await db.query("insert into violations(id,student_id,semester_id,code,description) values($1,$2,$3,'V','Uji')",[violation,sid,period]);
 await db.query("insert into heart_transactions(student_id,semester_id,amount,reason,violation_id,kind) values($1,$2,-1,'Uji',$3,'deduction')",[sid,period,violation]);
 await db.query("insert into star_transactions(id,student_id,semester_id,amount,reason) values($1,$2,$3,1,'Uji')",[star,sid,period]);
 await db.query("insert into star_transactions(student_id,semester_id,amount,reason,reversal_of) values($1,$2,-1,'Batal',$3)",[sid,period,star]);
 await role('service_role');assert.equal((await gateway('register',newNisn)).ok,true);await prepare(sid,'purge',newNisn);
 // Simulate an Auth failure after its SQL delete, then prove everything rolls back.
 await role('supabase_auth_admin');await db.exec('begin');await db.query('delete from auth.users where id=$1',[uid]);await db.exec('rollback');
 await role('postgres');assert.equal((await db.query('select * from students where id=$1',[sid])).rows.length,1);assert.equal((await db.query('select * from grades where student_id=$1',[sid])).rows.length,1);
 await role('supabase_auth_admin');await db.query('delete from auth.users where id=$1',[uid]);
 await role('postgres');for(const table of ['students','profiles','auth.users'])assert.equal((await db.query('select * from '+table+' where id=$1',[table==='students'?sid:uid])).rows.length,0);
 for(const table of ['grades','grade_history','task_targets','attendance_records','heart_transactions','violations','star_transactions','class_memberships','whatsapp_links','gateway_link_pending'])assert.equal((await db.query('select * from '+table+' where student_id=$1',[sid])).rows.length,0,table);
 assert.equal((await db.query('select * from students where id=$1',[other])).rows.length,1);assert.equal((await db.query('select * from tasks where id=$1',[task])).rows.length,1);
 assert.equal((await db.query('select * from student_summary where id=$1',[sid])).rows.length,0);
 await role('authenticated',uid);assert.equal((await db.query('select * from students')).rows.length,0);
 await role('service_role');assert.equal((await prepare(sid,'purge',newNisn)).done,true);assert.equal((await gateway('confirm')).ok,false);
 });
 await t.test('unlinked and previously deactivated students are fully removed; stale edits cannot resurrect UUID',async()=>{
 await role('postgres');await db.query('update students set active=false where id=$1',[manual]);
 await role('service_role');assert.equal((await prepare(manual,'purge','0000000010')).done,true);
 await role('authenticated',teacher);await assert.rejects(()=>mutate('student',{id:manual,nisn:'0000000010',name:'Stale',class_id:cls}),/dihapus permanen/);
 await role('postgres');assert.equal((await db.query('select * from students where id=$1',[manual])).rows.length,0);
 });
 }finally{await db.close()}
});
