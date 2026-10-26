import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs/promises';import{PGlite}from'@electric-sql/pglite';import crypto from'node:crypto';
const uid=()=>crypto.randomUUID();
test('PostgreSQL migrations, RLS, transactions and WhatsApp',async t=>{const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;`);
for(const name of (await fs.readdir(new URL('../supabase/migrations',import.meta.url))).sort().filter(n=>n<'007'))await db.exec(await fs.readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
const teacher=uid(),userA=uid(),userB=uid(),studentA=uid(),studentB=uid(),sem=uid(),cls=uid(),task=uid();
await db.query(`insert into auth.users values ($1),($2),($3)`,[teacher,userA,userB]);await db.query(`insert into profiles(id,name,role) values($1,'Guru Uji','teacher'),($2,'Siswa A','student'),($3,'Siswa B','student')`,[teacher,userA,userB]);
async function role(r,id=''){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+r)}
async function mutate(op,p,id=uid()){return (await db.query('select reev_mutate($1,$2,$3) r',[op,JSON.stringify(p),id])).rows[0].r}
await role('authenticated',teacher);
await mutate('semester',{id:sem,name:'2026/2027 Ganjil',active:true});await mutate('class',{id:cls,name:'7A'});await mutate('student',{id:studentA,nisn:'0012345678',name:'Siswa A',class_id:cls,registered_phone:'+628123456789',phone_verified:true});await mutate('student',{id:studentB,nisn:'0012345679',name:'Siswa B',class_id:cls});await role('postgres');await db.query('update students set user_id=$1 where id=$2',[userA,studentA]);await db.query('update students set user_id=$1 where id=$2',[userB,studentB]);
await t.test('RLS student can only read self and cannot escalate/write',async()=>{await role('authenticated',userA);assert.equal((await db.query('select * from students')).rows.length,1);assert.equal((await db.query('select * from student_summary')).rows[0].nisn,'0012345678');await assert.rejects(()=>db.query("update profiles set role='teacher' where id=$1",[userA]));await assert.rejects(()=>mutate('class',{name:'Hacked'}));await assert.rejects(()=>db.query("select reev_bot('x','+628123456789','.menu')"));assert.equal((await db.query('select * from pending_confirmations')).rows.length,0)});
await t.test('anon cannot read students',async()=>{await role('anon');await assert.rejects(()=>db.query('select * from students'))});
await role('authenticated',teacher);await mutate('task',{id:task,code:'FMT-01',title:'Tugas',kind:'FORMATIF',class_id:cls,max_score:100});
await t.test('grade zero, atomic history and request idempotency',async()=>{const id=uid(),p={task_id:task,rows:[{student_id:studentA,status:'Dinilai',score:0}]};await mutate('grades',p,id);await mutate('grades',p,id);assert.equal((await db.query('select count(*) n from grade_history')).rows[0].n,1);assert.equal((await db.query('select formative from student_summary where id=$1',[studentA])).rows[0].formative,'0.00000000000000000000');await assert.rejects(()=>mutate('grades',{task_id:task,rows:[{student_id:studentA,status:'Dinilai',score:80},{student_id:studentB,status:'Dinilai',score:101}]}));assert.equal(Number((await db.query('select score from grades')).rows[0].score),0)});
await t.test('sumative weighted normalization and denominator',async()=>{let id=uid();await mutate('task',{id,code:'SUM-1',title:'Sumatif',kind:'SUMATIF',class_id:cls,rubric:[{name:'A',max:100,weight:2},{name:'B',max:100,weight:1}]});await mutate('grades',{task_id:id,rows:[{student_id:studentA,status:'Dinilai',components:[100,50]}]});const r=(await db.query('select reev_task_report($1) r',[id])).rows[0].r;assert.equal(r.targets,2);assert.equal(r.participants,1);assert.equal(r.classical,100)});
await t.test('heart configuration mandatory; cancellation ledger; star reversal once',async()=>{await assert.rejects(()=>mutate('violation',{student_id:studentA,code:'V1',description:'Uji'}));await role('postgres');await db.exec('update school_settings set initial_hearts=5,restore_hearts=true');await role('authenticated',teacher);const id=uid();await mutate('violation',{id,student_id:studentA,code:'V1',description:'Uji'});assert.equal(Number((await db.query('select hearts from student_summary where id=$1',[studentA])).rows[0].hearts),4);await mutate('resolve_violation',{id,status:'Selesai',restore:true,note:'Tebusan selesai'});await assert.rejects(()=>mutate('resolve_violation',{id,status:'Selesai',restore:true}));assert.equal(Number((await db.query('select hearts from student_summary where id=$1',[studentA])).rows[0].hearts),5);const star=uid();await mutate('star',{id:star,student_id:studentA,amount:2,reason:'Uji'});await mutate('reverse_star',{id:star,reason:'Koreksi'});await assert.rejects(()=>mutate('reverse_star',{id:star,reason:'Ulang'}))});
await mutate('allowlist',{phone:'+628111111111',profile_id:teacher,active:true});
const bot=async(phone,message,event=uid())=>(await db.query('select reev_bot($1,$2,$3) r',[event,phone,message])).rows[0].r;
await t.test('WA wrong NISN link denied; duplicate event suppressed; teacher confirmation one-use',async()=>{await role('service_role');await bot('+628999999999','.daftar 0012345678');assert.equal((await db.query('select * from whatsapp_links')).rows.length,0);await bot('+628123456789','.daftar 0012345678');assert.equal((await db.query('select * from whatsapp_links')).rows.length,1);const id=uid();await bot('+628123456789','.profil 0012345679',id);assert.equal((await bot('+628123456789','.profil 0012345679',id)).duplicate,true);await bot('+628111111111','.bintang 0012345678 3 Usaha baik');const token=(await db.query('select token from pending_confirmations where used_at is null')).rows[0].token;await bot('+628111111111','KONFIRMASI '+token);await bot('+628111111111','KONFIRMASI '+token);assert.equal(Number((await db.query('select sum(amount) n from star_transactions where student_id=$1',[studentA])).rows[0].n),3)});
await t.test('expired confirmation and revoked teacher cannot write',async()=>{await role('service_role');await bot('+628111111111','.bintang 0012345678 2 Tes kedaluwarsa');let token=(await db.query('select token from pending_confirmations where used_at is null')).rows[0].token;await db.query("update pending_confirmations set expires_at=now()-interval '1 minute' where token=$1",[token]);await bot('+628111111111','KONFIRMASI '+token);assert.equal(Number((await db.query('select sum(amount) n from star_transactions where student_id=$1',[studentA])).rows[0].n),3);await role('authenticated',teacher);await mutate('allowlist',{phone:'+628111111111',profile_id:teacher,active:false});await role('service_role');await bot('+628111111111','.bintang 0012345678 2 Tidak berhak');assert.equal(Number((await db.query('select sum(amount) n from star_transactions where student_id=$1',[studentA])).rows[0].n),3);await role('authenticated',teacher);await mutate('allowlist',{phone:'+628111111111',profile_id:teacher,active:true})});
await t.test('CSV batch duplicate rolls back; attendance validates membership',async()=>{await role('authenticated',teacher);await assert.rejects(()=>mutate('import_students',{rows:[{nisn:'0012300001',name:'Baris baru',class_id:cls},{nisn:'0012345678',name:'Duplikat',class_id:cls}]}));assert.equal((await db.query("select * from students where nisn='0012300001'")).rows.length,0);const meeting=uid();await mutate('meeting',{id:meeting,class_id:cls,date:'2026-10-13',number:1});await mutate('attendance',{meeting_id:meeting,rows:[{student_id:studentA,status:'Hadir'}]});await assert.rejects(()=>mutate('attendance',{meeting_id:meeting,rows:[{student_id:uid(),status:'Hadir'}]}));await role('authenticated',userA);assert.equal((await db.query('select * from grades')).rows.length,2);assert.equal((await db.query('select * from grade_history where student_id=$1',[studentB])).rows.length,0)});
await t.test('inactive student denied; last teacher protected',async()=>{await role('postgres');await db.query('update profiles set active=false where id=$1',[userA]);await role('authenticated',userA);assert.equal((await db.query('select * from students')).rows.length,0);await role('authenticated',teacher);await assert.rejects(()=>mutate('profile',{id:teacher,name:'Guru',active:false}))});
await t.test('outbox claim once and receipt cannot regress READ',async()=>{await role('service_role');const key=uid();await bot('+628111111111','.menu',key);assert.equal((await db.query('select * from reev_claim_reply($1)',[key])).rows.length,1);assert.equal((await db.query('select * from reev_claim_reply($1)',[key])).rows.length,0);await db.query("select reev_receipt('msg1','read')");await db.query("select reev_finish_reply($1,'sent','msg1')",[key]);await db.query("select reev_receipt('msg1','sent')");assert.equal((await db.query('select status from wa_outbox where event_key=$1',[key])).rows[0].status,'read')});

await t.test('incremental 007 preserves existing tasks, scores, targets and history',async()=>{
 await role('postgres');const before={};
 for(const table of ['tasks','grades','task_targets','grade_history'])before[table]=(await db.query('select * from '+table+' order by 1,2')).rows;
 await db.exec(await fs.readFile(new URL('../supabase/migrations/007_task_management.sql',import.meta.url),'utf8'));
 for(const table of ['tasks','grades','task_targets','grade_history']){
 const after=(await db.query('select * from '+table+' order by 1,2')).rows;
 if(table==='tasks')for(const row of after){assert.equal(row.revision,1);delete row.revision;}
 assert.deepEqual(after,before[table]);}
});
const manage=async(op,p,id=uid())=>(await db.query('select reev_manage_task($1,$2,$3) r',[op,JSON.stringify(p),id])).rows[0].r;
const getTask=async id=>(await db.query('select * from tasks where id=$1',[id])).rows[0];
await t.test('task editing preserves scores; rejects stale edits and changed scoring',async()=>{
 await role('authenticated',teacher);
 let original=await getTask(task);
 const payload={...original,title:'Judul diperbarui',kktp:90,material:'Materi baru',due_date:'2026-11-01'};
 const req=uid();await manage('task_update',payload,req);await manage('task_update',payload,req);
 assert.equal((await getTask(task)).revision,2);
 assert.equal((await getTask(task)).title,'Judul diperbarui');
 assert.equal(Number((await db.query('select score from grades where task_id=$1',[task])).rows[0].score),0);
 await assert.rejects(()=>manage('task_update',payload),/telah berubah/);
 const current=await getTask(task);
 await assert.rejects(()=>manage('task_update',{...current,max_score:50}),/Sudah ada nilai/);
 await assert.rejects(()=>manage('task_update',{...current,class_id:uid()}),/tidak dapat dipindahkan/);
 await assert.rejects(()=>manage('task_update',{...current,kktp:101}));
 assert.equal((await getTask(task)).revision,2);
});
await t.test('ungraded rubric editable; invalid rubric and duplicate code roll back',async()=>{
 await role('authenticated',teacher);
 const id=uid();await mutate('task',{id,code:'EDIT-SUM',title:'Edit rubrik',kind:'SUMATIF',class_id:cls,rubric:[{name:'A',max:10,weight:1}]});
 let current=await getTask(id);
 await manage('task_update',{...current,rubric:[{name:'Baru',max:20,weight:2}]});
 current=await getTask(id);
 assert.equal(current.rubric[0].max,20);
 await assert.rejects(()=>manage('task_update',{...current,rubric:[{name:'Rusak',max:0,weight:1}]}),/Rubrik tidak valid/);
 await assert.rejects(()=>manage('task_update',{...current,code:'FMT-01'}));
 await mutate('grades',{task_id:id,rows:[{student_id:studentA,status:'Dinilai',components:[15]}]});
 await assert.rejects(()=>manage('task_update',{...current,rubric:[{name:'Lain',max:100,weight:1}]}),/Sudah ada nilai/);
 assert.equal(Number((await db.query('select score from grades where task_id=$1',[id])).rows[0].score),75);
});
await t.test('anon, student and inactive teacher cannot edit or delete; archived blocked',async()=>{
 await role('authenticated',teacher);const current=await getTask(task);
 for(const [r,id] of [['anon',''],['authenticated',userB],['authenticated',userA]]){
  await role(r,id);
  await assert.rejects(()=>manage('task_update',{...current,title:'Tidak sah'}));
  await assert.rejects(()=>manage('task_delete',{...current,confirm_code:current.code}));
 }
 const inactive=uid();await role('postgres');
 await db.query('insert into auth.users values($1)',[inactive]);
 await db.query("insert into profiles(id,name,role,active) values($1,'Nonaktif','teacher',false)",[inactive]);
 await role('authenticated',inactive);
 await assert.rejects(()=>manage('task_update',current),/Akses guru/);
 await assert.rejects(()=>manage('task_delete',{...current,confirm_code:current.code}),/Akses guru/);
 await role('postgres');await db.query('update semesters set archived=true,active=false where id=$1',[sem]);
 await role('authenticated',teacher);
 await assert.rejects(()=>manage('task_update',current),/diarsipkan/);
 await assert.rejects(()=>manage('task_delete',{...current,confirm_code:current.code}),/diarsipkan/);
 await role('postgres');await db.query('update semesters set archived=false,active=true where id=$1',[sem]);
});
await t.test('confirmed delete removes dependent rows, preserves audit, and retry is idempotent',async()=>{
 await role('authenticated',teacher);const current=await getTask(task);
 await assert.rejects(()=>manage('task_delete',{...current,confirm_code:'SALAH'}),/Ketik kode/);
 assert.ok(await getTask(task));
 const req=uid(),p={id:task,revision:current.revision,confirm_code:current.code};
 await manage('task_delete',p,req);await manage('task_delete',p,req);
 assert.equal(await getTask(task),undefined);
 for(const table of ['grades','task_targets'])assert.equal((await db.query('select * from '+table+' where task_id=$1',[task])).rows.length,0);
 const history=(await db.query('select * from grade_history where task_id=$1 order by id desc',[task])).rows;
 assert.ok(history.length>=2);assert.equal(history[0].new_data,null);
 assert.equal(Number(history[0].old_data.score),0);
 assert.equal((await db.query("select * from audit_logs where entity='tasks' and action='DELETE' and old_data->>'id'=$1",[task])).rows.length,1);
 await assert.rejects(()=>manage('task_update',current),/tidak ditemukan/);
});
await db.close();});
