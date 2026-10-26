import React,{useEffect,useRef,useState} from 'react';
import {db,result,mutate} from './db.js';
import {gradeEntry,editGradeDraft,previewGrade} from './grade-entry.mjs';
import {studentGradePayload} from './gradebook.mjs';

export default function StudentGradebook({student,semester,archived,onClose,onSaved}) {
 const dialog=useRef(),pending=useRef(new Map());
 const [rows,setRows]=useState([]),[drafts,setDrafts]=useState({}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[reload,setReload]=useState(0);
 const dirty=Object.keys(drafts).length,locked=busy||loading||archived;
 useEffect(()=>{const node=dialog.current;node.showModal();return()=>node.close()},[]);
 useEffect(()=>{
  let live=true;setLoading(true);setError('');setRows([]);
  (async()=>{
   const all=[];
   for(let offset=0;;offset+=200){
    const batch=await result(db.rpc('reev_student_tasks',{student:student.id,period:semester,page_offset:offset}));
    if(!live)return;
    all.push(...batch);if(batch.length<200)break;
   }
   // Keep one row per assignment if the dataset changed between pages.
   if(live)setRows([...new Map(all.map(r=>[r.task.id,r])).values()]);
  })().catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[student.id,semester,reload]);
 function close(){if(busy)return;if(!dirty||window.confirm('Ada perubahan nilai belum disimpan. Tutup dan buang perubahan?'))onClose()}
 function edit(row,key,value){if(!drafts[row.task.id]&&dirty>=200){setError('Sudah ada 200 perubahan. Simpan dahulu sebelum mengubah tugas berikutnya.');return}setDrafts(d=>({...d,[row.task.id]:editGradeDraft(d[row.task.id],key,value,row.task)}));setNotice('')}
 async function save(event){
  event.preventDefault();if(locked)return;setBusy(true);setError('');setNotice('');
  try{
   const payload=studentGradePayload(student.id,semester,rows,drafts),key=JSON.stringify(payload);
   const request=pending.current.get(key)||crypto.randomUUID();pending.current.set(key,request);
   await mutate('student_grades',payload,request);pending.current.delete(key);
   setDrafts({});setNotice(payload.rows.length+' tugas berhasil disimpan.');setReload(x=>x+1);onSaved();
  }catch(e){setError('Perubahan belum dikonfirmasi tersimpan: '+e.message)}finally{setBusy(false)}
 }
 return <dialog ref={dialog} className="student-gradebook" aria-labelledby="gradebook-title" onCancel={e=>{e.preventDefault();close()}}>
  <form onSubmit={save}>
   <div className="sectionhead"><div><h2 id="gradebook-title">Semua tugas · {student.name}</h2><small>{student.nisn} · {student.class_name}</small></div><button type="button" className="quiet" disabled={busy} onClick={close} aria-label="Tutup daftar tugas">×</button></div>
   <p className="hint">Urutan dari tugas pertama dibuat hingga terbaru pada semester terpilih. Formatif diisi melalui skor; sumatif melalui aspek rubrik. Mengisi skor otomatis memilih Dinilai. Nilai / 100 adalah hasil hitung.</p>
   <p className="hint">Mengubah status ke Belum/Selesai akan mengosongkan nilai saat disimpan. Maksimal 200 tugas diubah dalam satu penyimpanan; seluruh perubahan disimpan bersama.</p>
   {archived&&<p className="notice">Semester arsip: hanya dapat dibaca.</p>}
   {loading&&<p role="status">Memuat seluruh tugas siswa…</p>}
   {error&&<p className="error" role="alert">{error}</p>}
   {notice&&<p className="notice" role="status">{notice}</p>}
   {!loading&&!error&&!rows.length&&<p>Belum ada tugas yang ditugaskan kepada siswa ini pada semester terpilih.</p>}
   {!!rows.length&&<div className="tablewrap"><table><thead><tr>{['No.','Tugas / asesmen','Status','Skor / aspek','Nilai / 100','Umpan balik'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>
    {rows.map((r,index)=>{
     const t=r.task,d=drafts[t.id]||{},entry=gradeEntry(t,r,d),score=previewGrade(t,r,d);
     return <tr key={t.id} className={drafts[t.id]?'edited-grade':''}>
      <td>{index+1}</td><td><strong>{t.title}</strong><small>{t.code} · {t.kind==='FORMATIF'?'Formatif':'Sumatif'}</small><small>KKTP {t.kktp}{t.due_date?' · Tenggat '+t.due_date:''}</small></td>
      <td><select aria-label={'Status '+t.code} value={entry.status} disabled={locked} onChange={e=>edit(r,'status',e.target.value)}>{['Belum','Selesai','Dinilai'].map(v=><option key={v}>{v}</option>)}</select></td>
      <td>{t.kind==='FORMATIF'?<label>Skor / {t.max_score}<input aria-label={'Skor '+t.code} type="number" min="0" max={t.max_score} step="any" value={entry.raw} disabled={locked} onChange={e=>edit(r,'score',e.target.value)}/></label>:<div className="grade-aspects">{t.rubric.map((a,i)=><label key={i}>{a.name} / {a.max}<input aria-label={t.code+' '+a.name} type="number" min="0" max={a.max} step="any" value={entry.components[i]} disabled={locked} onChange={e=>{const next=[...entry.components];next[i]=e.target.value;edit(r,'components',next)}}/></label>)}</div>}</td>
      <td><strong>{score==null?'—':score.toLocaleString('id-ID',{maximumFractionDigits:2})}</strong></td>
      <td><input aria-label={'Umpan balik '+t.code} value={entry.feedback} disabled={locked} onChange={e=>edit(r,'feedback',e.target.value)}/></td>
     </tr>
    })}
   </tbody></table></div>}
   <footer><span className="hint">{rows.length} tugas · {dirty} perubahan</span><button type="button" className="quiet" disabled={busy} onClick={close}>Tutup</button>{!archived&&<button disabled={locked||!dirty||dirty>200}>{busy?'Menyimpan…':'Simpan semua perubahan'}</button>}</footer>
  </form>
 </dialog>
}
