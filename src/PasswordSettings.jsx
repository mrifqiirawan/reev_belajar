import React,{useState} from 'react';
import {db} from './db.js';
import {changePassword} from './student-auth.mjs';
export default function PasswordSettings(){
 const [password,P]=useState(''),[confirm,C]=useState(''),[busy,B]=useState(false),[error,E]=useState(''),[notice,N]=useState('');
 async function submit(e){e.preventDefault();if(busy)return;B(true);E('');N('');try{await changePassword(db.auth,password,confirm);P('');C('');N('Sandi berhasil diganti. Gunakan sandi baru saat login berikutnya.')}catch(e){E(e.message)}finally{B(false)}}
 return <section className="panel"><h2>Ganti sandi</h2><p>Gunakan sandi pribadi minimal 8 karakter. Jangan bagikan sandi kepada orang lain.</p><form onSubmit={submit}><div className="formgrid"><label>Sandi baru<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e=>P(e.target.value)} disabled={busy}/></label><label>Konfirmasi sandi baru<input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={e=>C(e.target.value)} disabled={busy}/></label></div>{error&&<p role="alert" className="error">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}<button disabled={busy}>{busy?'Menyimpan…':'Simpan sandi baru'}</button></form></section>
}
