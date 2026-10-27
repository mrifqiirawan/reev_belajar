export const studentEmail=nisn=>{
 const value=String(nisn).trim();
 if(!/^[0-9]{5,20}$/.test(value))throw Error('NISN harus berisi 5–20 digit.');
 return `${value}@siswa.reev.invalid`;
};
export function loginEmail(value){const v=value.trim();return v.includes('@')?v:studentEmail(v)}
export function validatePassword(password,confirmation){
 if(password.length<8)throw Error('Sandi baru minimal 8 karakter.');
 if(password!==confirmation)throw Error('Konfirmasi sandi tidak cocok.');
}
export async function changePassword(auth,password,confirmation){
 validatePassword(password,confirmation);
 const {error}=await auth.updateUser({password});
 if(error)throw Error(error.message);
}
