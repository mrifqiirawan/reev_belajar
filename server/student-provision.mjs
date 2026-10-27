import {studentEmail} from '../src/student-auth.mjs';
export async function provisionStudent(db,student){
 if(student.user_id)return student.user_id;
 const email=studentEmail(student.nisn);
 const pending=await db.rpc('reev_pending_student_account',{student:student.id});
 if(pending.error)throw Error(pending.error.message);
 let id=pending.data;
 if(!id){
  const created=await db.auth.admin.createUser({email,password:'123456',email_confirm:true,app_metadata:{reev_student_id:student.id}});
  if(created.error)throw Error('Auth gagal dibuat. Periksa kebijakan sandi/koneksi lalu jalankan ulang. '+created.error.message);
  id=created.data.user.id;
 }
 const linked=await db.rpc('reev_attach_student_account',{student:student.id,account:id});
 // Do not delete an account on an ambiguous timeout: a retry recovers by trusted metadata.
 if(linked.error)throw Error('Penautan belum terkonfirmasi; jalankan ulang untuk rekonsiliasi. '+linked.error.message);
 return id;
}
