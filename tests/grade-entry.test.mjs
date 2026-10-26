import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID as uid} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {editGradeDraft,gradeEntry,gradePayload,previewGrade} from '../src/grade-entry.mjs';
const formative={kind:'FORMATIF',max_score:50,rubric:[]};
const summative={kind:'SUMATIF',max_score:100,rubric:[{name:'A',max:20,weight:2},{name:'B',max:10,weight:1}]};
const row={student_id:'student',status:'Belum',grades:[]};
test('entry sets Dinilai, previews normalized score and preserves feedback',()=>{
 let draft=editGradeDraft({},'score','40',formative);
 draft=editGradeDraft(draft,'feedback','Bagus',formative);
 assert.equal(draft.status,'Dinilai');assert.equal(previewGrade(formative,row,draft),80);
 assert.deepEqual(gradePayload(formative,row,draft),{student_id:'student',status:'Dinilai',score:40,components:[],feedback:'Bagus'});
 for(const v of ['0','50','12.5'])assert.equal(previewGrade(formative,row,editGradeDraft({},'score',v,formative)),Number(v)*2);
 for(const v of ['',' ','-1','51','NaN','Infinity'])assert.throws(()=>gradePayload(formative,row,editGradeDraft({},'score',v,formative)));
});
test('empty stored aspects do not become zeros; partial sumative rejected',()=>{
 const r={...row,grades:{score:null,components:[],feedback:'Catatan'}};
 assert.deepEqual(gradeEntry(summative,r).components,['','']);
 for(const values of [['20',''],['','0'],['20',null]]){
  const d=editGradeDraft({},'components',values,summative);
  assert.equal(previewGrade(summative,r,d),null);assert.throws(()=>gradePayload(summative,r,d),/Semua aspek/);
 }
 const d=editGradeDraft({},'components',['20','0'],summative);
 assert.equal(previewGrade(summative,r,d),80);
 assert.deepEqual(gradePayload(summative,r,d).components,[20,0]);
});
test('feedback-only retains saved score; explicit ungrading clears score; blank graded fails',()=>{
 const r={...row,status:'Dinilai',grades:[{score:75,components:[],feedback:'Lama'}]};
 assert.equal(gradePayload(formative,r,{feedback:'Baru'}).score,37.5);
 assert.equal(gradePayload(formative,row,{feedback:'Belum dinilai'}).score,null);
 const d=editGradeDraft({},'status','Selesai',formative);
 assert.equal(previewGrade(formative,r,d),null);
 assert.equal(gradePayload(formative,r,d).score,null);
 assert.throws(()=>gradePayload(formative,r,editGradeDraft(d,'status','Dinilai',formative)));
});
test('regression: UI payload to SQL persists score, history and reports across rereads',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;`);
 for(const file of (await fs.readdir(new URL('../supabase/migrations/',import.meta.url))).sort())await db.exec(await fs.readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 const teacher=uid(),student=uid(),cls=uid(),sem=uid(),task=uid();
 await db.query('insert into auth.users values ($1)',[teacher]);
 await db.query("insert into profiles(id,name,role) values($1,'Guru Uji','teacher')",[teacher]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[teacher]);await db.exec('set role authenticated');
 const mutate=async(op,p,id=uid())=>db.query('select reev_mutate($1,$2,$3)',[op,JSON.stringify(p),id]);
 await mutate('semester',{id:sem,name:'Uji',active:true});await mutate('class',{id:cls,name:'Uji'});
 await mutate('student',{id:student,nisn:'0012345678',name:'Siswa Uji',class_id:cls});
 await mutate('task',{...formative,id:task,code:'REG-1',title:'Regresi',class_id:cls});
 const read=async()=>{const g=(await db.query('select * from grades where task_id=$1',[task])).rows;const target=(await db.query('select * from task_targets where task_id=$1',[task])).rows[0];return {...target,grades:g}};
 // Reproduce old behavior, on synthetic data only.
 await mutate('grades',{task_id:task,rows:[{student_id:student,status:'Belum',score:40,feedback:'Tersimpan'}]});
 assert.equal((await read()).grades[0].score,null);
 let r=await read();let d=editGradeDraft({},'score','40',formative);
 const request=uid(),payload={task_id:task,rows:[gradePayload(formative,r,d)]};
 await mutate('grades',payload,request);await mutate('grades',payload,request);
 r=await read();assert.equal(Number(r.grades[0].score),80);assert.equal(r.status,'Dinilai');assert.equal(r.grades[0].feedback,'Tersimpan');
 assert.equal(previewGrade(formative,r),80);
 d=editGradeDraft({},'score','45',formative);await mutate('grades',{task_id:task,rows:[gradePayload(formative,r,d)]});
 const histories=(await db.query('select old_data,new_data from grade_history where task_id=$1',[task])).rows;
 assert.equal(histories.length,3);assert.ok(histories.some(h=>h.old_data?.score===80&&h.new_data?.score===90));
 assert.equal(Number((await db.query('select formative from student_summary where id=$1',[student])).rows[0].formative),90);
 r=await read();await mutate('grades',{task_id:task,rows:[gradePayload(formative,r,{feedback:'Koreksi catatan'})]});
 assert.equal(Number((await read()).grades[0].score),90);
 await mutate('grades',{task_id:task,rows:[gradePayload(formative,await read(),editGradeDraft({},'score','0',formative))]});
 assert.equal(Number((await read()).grades[0].score),0);
 const sum=uid();await mutate('task',{...summative,id:sum,code:'REG-2',title:'Sumatif',class_id:cls});
 await mutate('grades',{task_id:sum,rows:[gradePayload(summative,{...row,student_id:student},editGradeDraft({},'components',['20','0'],summative))]});
 assert.equal(Number((await db.query('select score from grades where task_id=$1',[sum])).rows[0].score),80);
 } finally {await db.close()}
});
