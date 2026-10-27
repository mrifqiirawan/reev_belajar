import {createClient} from '@supabase/supabase-js';
export async function resetStudentPassword(db,token,studentId){
 const fail=(status,message)=>Object.assign(Error(message),{status});
 if(!token)throw fail(401,'Silakan login kembali.');
 const {data:auth,error}=await db.auth.getUser(token);
 if(error||!auth?.user)throw fail(401,'Sesi tidak valid.');
 const {data:actor,error:actorError}=await db.from('profiles').select('role,active').eq('id',auth.user.id).maybeSingle();
 if(actorError)throw fail(503,'Pemeriksaan akses gagal.');
 if(actor?.role!=='teacher'||!actor.active)throw fail(403,'Akses guru aktif diperlukan.');
 if(typeof studentId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId))throw fail(400,'Identitas siswa tidak valid.');
 const {data:student,error:studentError}=await db.from('students').select('id,user_id').eq('id',studentId).maybeSingle();
 if(studentError)throw fail(503,'Pemeriksaan siswa gagal.');
 if(!student?.user_id)throw fail(409,'Siswa belum memiliki akun login. Jalankan aktivasi akun dahulu.');
 const {data:target,error:targetError}=await db.from('profiles').select('role').eq('id',student.user_id).maybeSingle();
 if(targetError)throw fail(503,'Pemeriksaan akun gagal.');
 if(target?.role!=='student')throw fail(403,'Reset hanya untuk akun siswa.');
 const changed=await db.auth.admin.updateUserById(student.user_id,{password:'123456'});
 if(changed.error)throw fail(502,'Reset belum berhasil. Periksa kebijakan sandi Supabase dan koneksi, lalu coba kembali.');
 const audit=await db.from('audit_logs').insert({actor:auth.user.id,source:'website',action:'reset_student_password',entity:'students',new_data:{student_id:student.id,account_id:student.user_id}});
 return {ok:true,message:'Sandi siswa berhasil direset menjadi 123456. Minta siswa menggantinya melalui Pengaturan.',auditRecorded:!audit.error};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 const reply=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data))};
 if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,{error:'Metode tidak diizinkan.'})}
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return reply(503,{error:'Konfigurasi server belum lengkap.'});
 try{
  let body=req.body;
  if(body==null){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>2048)return reply(413,{error:'Permintaan terlalu besar.'})}body=JSON.parse(raw)}
  if(typeof body==='string')body=JSON.parse(body);
  const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];
  const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  return reply(200,await resetStudentPassword(db,token,body?.studentId));
 }catch(e){return reply(e.status||500,{error:e.status?e.message:'Permintaan gagal. Periksa koneksi dan coba kembali.'})}
}
