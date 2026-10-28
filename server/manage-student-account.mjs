import {createClient} from '@supabase/supabase-js';
const fail=(status,message)=>Object.assign(Error(message),{status});
export async function manageStudentAccount(db,token,body){
 if(!token)throw fail(401,'Silakan login kembali.');
 const {data:auth,error}=await db.auth.getUser(token);
 if(error||!auth?.user)throw fail(401,'Sesi tidak valid.');
 const {data:actor,error:actorError}=await db.from('profiles').select('role,active').eq('id',auth.user.id).maybeSingle();
 if(actorError)throw fail(503,'Pemeriksaan akses gagal.');
 if(actor?.role!=='teacher'||!actor.active)throw fail(403,'Akses Guru Operator aktif diperlukan.');
 const {studentId,operation,expectedNisn,newNisn}=body||{};
 if(typeof studentId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId)
 ||!['nisn','delete'].includes(operation)||typeof expectedNisn!=='string'||! /^[0-9]{5,20}$/.test(expectedNisn)
 ||(operation==='nisn'&&(typeof newNisn!=='string'||! /^[0-9]{10}$/.test(newNisn))))throw fail(400,'Identitas siswa atau NISN tidak valid. NISN baru wajib 10 digit.');
 const prepared=await db.rpc('reev_prepare_student_account',{actor_id:auth.user.id,student_id:studentId,operation,expected_nisn:expectedNisn,new_nisn:operation==='nisn'?newNisn:null});
 if(prepared.error)throw fail(409,prepared.error.code==='23505'?'NISN sudah digunakan.':prepared.error.message);
 if(!prepared.data?.done){
  const accountId=prepared.data?.account_id;
  if(!accountId)throw fail(503,'Persiapan akun gagal. Pastikan migrasi 010 sudah terpasang.');
  const changed=operation==='nisn'
   ?await db.auth.admin.updateUserById(accountId,{email:newNisn+'@siswa.reev.invalid',email_confirm:true})
   :await db.auth.admin.deleteUser(accountId);
  if(changed.error)throw fail(502,'Perubahan akun belum terkonfirmasi. Muat ulang halaman; bila belum berubah, ulangi operasi yang sama. Periksa benturan email, migrasi 010, dan log Auth bila tetap gagal.');
  const verified=await db.rpc('reev_prepare_student_account',{actor_id:auth.user.id,student_id:studentId,operation,expected_nisn:expectedNisn,new_nisn:operation==='nisn'?newNisn:null});
  if(verified.error||!verified.data?.done)throw fail(502,'Perubahan belum terkonfirmasi di data siswa. Muat ulang halaman dan periksa sinkronisasi Auth.');
 }
 return {ok:true,message:operation==='nisn'?'NISN dan identitas login berhasil diperbarui. Gunakan NISN baru dengan sandi yang sama.':'Akun login dihapus dan siswa dinonaktifkan. Nilai serta riwayat belajar tetap disimpan.'};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 const reply=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data))};
 if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,{error:'Metode tidak diizinkan.'})}
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return reply(503,{error:'Konfigurasi server belum lengkap.'});
 try{
  let body=req.body;
  if(body==null){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>2048)return reply(413,{error:'Permintaan terlalu besar.'})}try{body=JSON.parse(raw)}catch{throw fail(400,'JSON tidak valid.')}}
  if(typeof body==='string'){try{body=JSON.parse(body)}catch{throw fail(400,'JSON tidak valid.')}}
  if(Buffer.byteLength(JSON.stringify(body)??'')>2048)return reply(413,{error:'Permintaan terlalu besar.'});
  const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];
  const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  return reply(200,await manageStudentAccount(db,token,body));
 }catch(e){return reply(e.status||500,{error:e.status?e.message:'Permintaan belum terkonfirmasi. Muat ulang dan ulangi operasi yang sama bila belum berubah.'})}
}
