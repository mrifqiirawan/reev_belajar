import {createClient} from '@supabase/supabase-js';
import {provisionStudent} from '../server/student-provision.mjs';
if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dalam .env privat pengelola.');
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
let cursor=null,ok=0,failed=0;
// Keyset pagination remains stable while accounts are attached. Never print passwords/tokens.
while(true){
 let q=db.from('students').select('id,nisn,user_id').eq('active',true).is('user_id',null).order('id').limit(100);
 if(cursor)q=q.gt('id',cursor);
 const {data,error}=await q;if(error)throw Error(error.message);
 if(!data.length)break;
 for(const student of data){try{await provisionStudent(db,student);ok++;console.log('OK siswa:',student.id)}catch(e){failed++;console.error('GAGAL siswa:',student.id,e.message)}}
 cursor=data.at(-1).id;
}
console.log(`Selesai: ${ok} akun tertaut; ${failed} gagal. Akun lama tidak direset. Jalankan ulang untuk mencoba yang belum tertaut.`);
if(failed)process.exitCode=1;
