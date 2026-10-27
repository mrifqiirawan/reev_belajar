import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID as uuid} from 'node:crypto';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {loginEmail,changePassword} from '../src/student-auth.mjs';
import {provisionStudent} from '../server/student-provision.mjs';
test('NISN preserves zeros; email login remains compatible',()=>{
 assert.equal(loginEmail(' 0012345678 '),'0012345678@siswa.reev.invalid');
 assert.equal(loginEmail('guru@example.org'),'guru@example.org');
 assert.throws(()=>loginEmail('123x'));assert.throws(()=>loginEmail('123'));
});
test('password validation prevents writes; errors propagate and success is awaited',async()=>{
 let calls=0;const auth={updateUser:async p=>{calls++;assert.deepEqual(p,{password:'Rahasia123'});return {error:null}}};
 await assert.rejects(()=>changePassword(auth,'123456','123456'));await assert.rejects(()=>changePassword(auth,'Rahasia123','beda'));assert.equal(calls,0);
 await changePassword(auth,'Rahasia123','Rahasia123');assert.equal(calls,1);
 await assert.rejects(()=>changePassword({updateUser:async()=>({error:{message:'Sesi habis'}})},'Rahasia123','Rahasia123'),/Sesi habis/);
});
test('provisioning resumes after uncertain link failure without resetting password',async()=>{
 const s={id:uuid(),nisn:'0012345678'},id=uuid();let pending=null,creates=0,links=0;
 const db={rpc:async(name)=>{if(name==='reev_pending_student_account')return {data:pending};links++;return links===1?{error:{message:'timeout'}}:{}},auth:{admin:{createUser:async p=>{creates++;assert.equal(p.password,'123456');assert.equal(p.app_metadata.reev_student_id,s.id);pending=id;return {data:{user:{id}}}}}}};
 await assert.rejects(()=>provisionStudent(db,s),/rekonsiliasi/);
 assert.equal(await provisionStudent(db,s),id);assert.equal(creates,1);
 assert.equal(await provisionStudent(db,{...s,user_id:id}),id);assert.equal(links,2);
});
test('Auth failure never attaches an account',async()=>{
 let attached=false;const db={rpc:async name=>{if(name.includes('attach'))attached=true;return {data:null}},auth:{admin:{createUser:async()=>({error:{message:'policy'}})}}};
 await assert.rejects(()=>provisionStudent(db,{id:uuid(),nisn:'0012345678'}),/Auth gagal/);assert.equal(attached,false);
});
test('009 incremental migration: private provisioning, reconciliation, RLS isolation',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;`);
 const dir=new URL('../supabase/migrations/',import.meta.url);
 for(const f of (await fs.readdir(dir)).sort().filter(n=>n<'009'))await db.exec(await fs.readFile(new URL(f,dir),'utf8'));
 const a=uuid(),b=uuid(),ua=uuid(),ub=uuid();
 await db.query("insert into students(id,nisn,name) values($1,'0012345678','Siswa A'),($2,'0012345679','Siswa B')",[a,b]);
 const before=(await db.query('select * from students order by id')).rows;
 await db.exec(await fs.readFile(new URL('009_student_accounts.sql',dir),'utf8'));
 assert.deepEqual((await db.query('select * from students order by id')).rows,before);
 const role=async(r,id='')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+r)};
 const pending=id=>db.query('select reev_pending_student_account($1) id',[id]);
 const attach=(s,u)=>db.query('select reev_attach_student_account($1,$2)',[s,u]);
 for(const r of ['anon','authenticated']){await role(r);await assert.rejects(()=>pending(a));await assert.rejects(()=>attach(a,ua))}
 await role('service_role');assert.equal((await pending(a)).rows[0].id,null);
 await role('postgres');await db.query("insert into auth.users(id,email,raw_app_meta_data) values($1,'0012345678@siswa.reev.invalid',$3),($2,'0012345679@siswa.reev.invalid',$4)",[ua,ub,JSON.stringify({reev_student_id:a}),JSON.stringify({reev_student_id:b})]);
 await role('service_role');assert.equal((await pending(a)).rows[0].id,ua);
 await assert.rejects(()=>attach(a,ub),/Identitas/);
 await attach(a,ua);await attach(a,ua);await attach(b,ub);
 await assert.rejects(()=>attach(a,ub),/akun lain/);
 await role('authenticated',ua);assert.deepEqual((await db.query('select id from students')).rows,[{id:a}]);
 await assert.rejects(()=>db.query("update profiles set role='teacher' where id=$1",[ua]));
 await assert.rejects(()=>attach(b,ua));
 await role('postgres');await assert.rejects(()=>db.query("update students set nisn='0099999999' where id=$1",[a]),/identitas login/);
 await db.query('update students set active=false where id=$1',[a]);await role('authenticated',ua);assert.equal((await db.query('select * from students')).rows.length,0);
 await role('postgres');await db.query('update profiles set active=false where id=$1',[ub]);await role('authenticated',ub);assert.equal((await db.query('select * from students')).rows.length,0);
 }finally{await db.close()}
});
