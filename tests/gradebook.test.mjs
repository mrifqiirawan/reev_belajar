import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID as uid} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {editGradeDraft} from '../src/grade-entry.mjs';
import {formativeStatus,settingsPayload,studentGradePayload} from '../src/gradebook.mjs';

test('formative completeness and settings payload',()=>{
 assert.equal(formativeStatus({formative:90,kktp:73,formative_total:3,formative_graded:1}),'Belum tuntas');
 assert.equal(formativeStatus({formative:90,kktp:73,formative_total:3,formative_graded:3}),'Tuntas');
 assert.equal(formativeStatus({formative:60,kktp:73,formative_total:3,formative_graded:3}),'Belum tuntas');
 assert.equal(formativeStatus({formative:0,kktp:0,formative_total:1,formative_graded:1}),'Tuntas');
 assert.equal(formativeStatus({formative:null,kktp:73,formative_total:3,formative_graded:0}),'Belum tuntas');
 assert.equal(formativeStatus({formative:null,kktp:73,formative_total:0,formative_graded:0}),'Belum ada tugas');
 assert.equal('id' in settingsPayload({id:true,subject:'Baru'}),false);
});

test('v1.3.0 incremental migration and student gradebook integration',async t=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;`);
 const directory=new URL('../supabase/migrations/',import.meta.url);
 for(const file of (await fs.readdir(directory)).sort().filter(n=>n<'008'))await db.exec(await fs.readFile(new URL(file,directory),'utf8'));
 const teacher=uid(),user=uid(),student=uid(),second=uid(),third=uid(),cls=uid(),sem=uid(),first=uid(),last=uid(),sum=uid();
 const role=async(r,id='')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+r)};
 const mutate=(op,p,id=uid())=>db.query('select reev_mutate($1,$2,$3)',[op,JSON.stringify(p),id]);
 const read=async(sid=student,period=sem,offset=0)=>(await db.query('select reev_student_tasks($1,$2,$3) r',[sid,period,offset])).rows[0].r;
 const save=(p,id=uid())=>db.query('select reev_save_student_grades($1,$2)',[JSON.stringify(p),id]);
 const summary=async()=>(await db.query('select * from student_summary where id=$1 and semester_id=$2',[student,sem])).rows[0];
 const draftScore=rows=>Object.fromEntries(rows.map(r=>[r.task.id,editGradeDraft({},r.task.kind==='SUMATIF'?'components':'score',r.task.kind==='SUMATIF'?['8','10']:'80',r.task)]));
 await db.query('insert into auth.users values ($1),($2)',[teacher,user]);
 await db.query("insert into profiles(id,name,role) values($1,'Guru','teacher'),($2,'Siswa','student')",[teacher,user]);
 await role('authenticated',teacher);
 await mutate('semester',{id:sem,name:'Semester Uji',active:true});await mutate('class',{id:cls,name:'Kelas Uji'});
 for(const [id,nisn,name] of [[student,'00000001','zaki'],[second,'00000002',' Budi'],[third,'00000003','ayu']])await mutate('student',{id,nisn,name,class_id:cls});
 for(const [id,code,kind] of [[first,'F-1','FORMATIF'],[last,'F-2','FORMATIF'],[sum,'S-1','SUMATIF']])await mutate('task',{id,code,title:code,kind,class_id:cls,max_score:100,rubric:kind==='SUMATIF'?[{name:'A',max:10,weight:1},{name:'B',max:10,weight:1}]:[]});
 await mutate('grades',{task_id:first,rows:[{student_id:student,status:'Dinilai',score:90}]});
 const settings=(await db.query('select * from school_settings')).rows[0];
 await assert.rejects(()=>mutate('settings',{...settings,subject:'Uji'}),/uuid/);
 await role('postgres');await db.query('update students set user_id=$1 where id=$2',[user,student]);
 // Deliberately make chronological order differ from UUID order.
 for(const [id,date] of [[first,'2026-01-01'],[last,'2026-01-02'],[sum,'2026-01-03']])await db.query('update tasks set created_at=$1 where id=$2',[date,id]);
 const tables=['students','tasks','grades','task_targets','grade_history','school_settings'];
 const before={};for(const table of tables)before[table]=(await db.query('select * from '+table+' order by 1,2')).rows;
 await db.exec(await fs.readFile(new URL('008_student_gradebook.sql',directory),'utf8'));
 await t.test('migration preserves every existing row and history',async()=>{for(const table of tables)assert.deepEqual((await db.query('select * from '+table+' order by 1,2')).rows,before[table])});
 await role('authenticated',teacher);
 await t.test('settings accepts boolean singleton id and retains request idempotency',async()=>{
  const p={...settings,subject:'Informatika Baru'},id=uid();await mutate('settings',p,id);await mutate('settings',p,id);
  assert.equal((await db.query('select subject from school_settings')).rows[0].subject,p.subject);
  await assert.rejects(()=>mutate('settings',{...p,subject:'Lain'},id),/ID transaksi/);
  await assert.rejects(()=>mutate('settings',{...p,kktp:101}));
 });
 await t.test('sort names before limit; task chronology; completeness includes ungraded tasks',async()=>{
  const expected=['ayu',' Budi','zaki'];
  assert.deepEqual((await db.query('select name from student_summary order by name_sort,id')).rows.map(x=>x.name),expected);
  const roster=(await db.query('select reev_task_roster($1) r',[first])).rows[0].r;
  assert.deepEqual(roster.map(x=>x.students.name),expected);
  assert.deepEqual((await db.query('select reev_class_roster($1,$2) r',[cls,sem])).rows[0].r.map(x=>x.students.name),expected);
  assert.deepEqual((await read()).map(r=>r.task.id),[first,last,sum]);
  assert.equal((await read(student,sem,2)).length,1);
  const s=await summary();assert.equal(Number(s.formative_total),2);assert.equal(Number(s.formative_graded),1);assert.equal(formativeStatus(s),'Belum tuntas');
  assert.equal((await db.query('select reev_dashboard($1) r',[sem])).rows[0].r.classical,0);
 });
 await t.test('one save persists multiple tasks, history, summary and repeated request only once',async()=>{
  const rows=await read(),payload=studentGradePayload(student,sem,rows,draftScore(rows));const request=uid();
  const countBefore=Number((await db.query('select count(*) n from grade_history')).rows[0].n);
  await save(payload,request);await save(payload,request);
  const after=await read();assert.deepEqual(after.map(r=>Number(r.grades.score)),[80,80,90]);
  assert.equal(Number((await db.query('select count(*) n from grade_history')).rows[0].n),countBefore+3);
  assert.equal(formativeStatus(await summary()),'Tuntas');
  const history=(await db.query('select old_data,new_data from grade_history where task_id=$1 and student_id=$2',[first,student])).rows;
  assert.ok(history.some(h=>h.old_data?.score===90&&h.new_data?.score===80));
  await assert.rejects(()=>save({...payload,student_id:second},request),/ID transaksi/);
 });
 await t.test('invalid later task rolls back earlier task changes and audit',async()=>{
  const rows=await read();const p=studentGradePayload(student,sem,rows,draftScore(rows));
  p.rows.sort((a,b)=>a.task_id.localeCompare(b.task_id));
  p.rows[0].feedback='MUST ROLLBACK';p.rows.at(-1).status='INVALID';
  const before=(await db.query('select * from grade_history order by id')).rows;
  await assert.rejects(()=>save(p));assert.deepEqual((await db.query('select * from grade_history order by id')).rows,before);
  assert.ok((await read()).every(r=>r.grades.feedback!=='MUST ROLLBACK'));
 });
 await t.test('rejects stale grade edits, stale task revision, duplicate tasks and wrong semester',async()=>{
  const rows=await read();let p=studentGradePayload(student,sem,rows,{[first]:{feedback:'Lama'}});
  await mutate('grades',{task_id:first,rows:[{student_id:student,status:'Dinilai',score:85,feedback:'Perubahan lain'}]});
  await assert.rejects(()=>save(p),/telah berubah/);
  p=studentGradePayload(student,sem,await read(),{[first]:{feedback:'Baru'}});p.rows[0].revision=0;await assert.rejects(()=>save(p),/telah berubah/);
  p=studentGradePayload(student,sem,await read(),{[first]:{feedback:'Baru'}});await assert.rejects(()=>save({...p,semester_id:uid()}),/semester/);
  await assert.rejects(()=>save({...p,rows:[p.rows[0],p.rows[0]]}),/duplikat/);
  await assert.rejects(()=>save({...p,student_id:uid()}),/sasaran/);
 });
 await t.test('ungrading removes completeness; zero remains a valid graded result',async()=>{
  let rows=await read(),r=rows.find(x=>x.task.id===last);
  await save(studentGradePayload(student,sem,rows,{[last]:editGradeDraft({},'status','Selesai',r.task)}));
  assert.equal(formativeStatus(await summary()),'Belum tuntas');assert.equal(Number((await summary()).formative_graded),1);
  rows=await read();await save(studentGradePayload(student,sem,rows,{[last]:editGradeDraft({},'score','0',r.task)}));
  assert.equal(Number((await summary()).formative_graded),2);assert.equal(formativeStatus(await summary()),'Belum tuntas');
 });
 await t.test('student own reads only, no writes; anon and inactive teacher denied; archive blocked',async()=>{
  let rows=await read(),p=studentGradePayload(student,sem,rows,{[first]:{feedback:'Izin'}});
  await role('authenticated',user);assert.equal((await read()).length,3);assert.deepEqual(await read(second),[]);
  assert.equal((await db.query('select reev_task_roster($1) r',[first])).rows[0].r.length,1);
  await assert.rejects(()=>save(p),/Akses guru/);await assert.rejects(()=>mutate('settings',settings),/Akses guru/);
  await role('anon');await assert.rejects(()=>read());await assert.rejects(()=>save(p));
  await role('postgres');await db.query('update profiles set active=false where id=$1',[teacher]);
  await role('authenticated',teacher);assert.deepEqual(await read(),[]);await assert.rejects(()=>save(p),/Akses guru/);
  await role('postgres');await db.query('update profiles set active=true where id=$1',[teacher]);await db.query('update semesters set archived=true,active=false where id=$1',[sem]);
  await role('authenticated',teacher);await assert.rejects(()=>save(p),/diarsipkan/);assert.equal((await read()).length,3);
 });
 await t.test('more than 200 tasks are available through stable pages',async()=>{
  await role('postgres');
  await db.query(`insert into tasks(code,title,kind,class_id,semester_id,max_score,kktp,classical_target,created_at)
  select 'PAGE-'||i,'Tugas '||i,'FORMATIF',$1,$2,100,73,80,'2026-02-01'::timestamptz+i*interval '1 second' from generate_series(1,201) i`,[cls,sem]);
  await db.query("insert into task_targets(task_id,student_id) select id,$1 from tasks where code like 'PAGE-%'",[student]);
  await role('authenticated',teacher);
  const a=await read(student,sem,0),b=await read(student,sem,200);
  assert.equal(a.length,200);assert.equal(b.length,4);assert.equal(new Set([...a,...b].map(r=>r.task.id)).size,204);
  assert.equal(b.at(-1).task.code,'PAGE-201');
 });
 }finally{await db.close()}
});
