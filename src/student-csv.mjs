import Papa from 'papaparse';
import {validateImport,safeCell} from './domain.mjs';

// Preserve CSV syntax metadata: Papa supplies decoded strings but not quote flags.
function quotedFields(text, delimiter) {
 const records=[];let fields=[],i=0;
 while(i<text.length){
  const quoted=text[i]==='"';
  if(quoted){
   i++;let closed=false;
   while(i<text.length){
    if(text[i]==='"'){if(text[i+1]==='"'){i+=2;continue}i++;closed=true;break}i++;
   }
   if(!closed)throw Error('Tanda kutip CSV belum ditutup');
   if(i<text.length&&![delimiter,'\r','\n'].includes(text[i]))throw Error('Karakter di luar tanda kutip CSV tidak valid');
  }else{while(i<text.length&&![delimiter,'\r','\n'].includes(text[i]))i++}
  fields.push(quoted);
  if(text[i]===delimiter){i++;if(i===text.length){fields.push(false);records.push(fields)}continue}
  records.push(fields);fields=[];
  if(text[i]==='\r'&&text[i+1]==='\n')i+=2;else if(i<text.length)i++;
 }
 return records;
}
export function parseStudentCSV(input,classId){
 const text=input.replace(/^\uFEFF/,'');
 const parsed=Papa.parse(text,{header:false,dynamicTyping:false,skipEmptyLines:false,delimitersToGuess:[',',';']});
 if(parsed.errors.length)throw Error('CSV tidak valid: '+parsed.errors[0].message);
 const flags=quotedFields(text,parsed.meta.delimiter);
 const records=parsed.data.map((cells,i)=>({cells,quotes:flags[i]??[],line:i+1})).filter(r=>r.cells.some(c=>c.trim()!==''));
 if(!records.length)throw Error('CSV kosong');
 const headers=records.shift().cells.map(x=>x.trim().toLowerCase()).map(x=>x==='phone_registered'?'registered_phone':x);
 if(new Set(headers).size!==headers.length)throw Error('Header CSV duplikat');
 if(headers.length!==3||!['nisn','name','registered_phone'].every(x=>headers.includes(x)))throw Error('Header wajib: nisn,name,registered_phone (PHONE_REGISTERED juga diterima)');
 const rows=records.map(({cells,quotes,line})=>{
  if(cells.length!==headers.length)throw Error('Baris data '+line+': jumlah kolom tidak sesuai');
  const row=Object.fromEntries(headers.map((h,i)=>[h,cells[i].trim()]));
  for(const field of ['nisn','registered_phone']){
   if(row[field]&&!quotes[headers.indexOf(field)])throw Error('Baris data '+line+': '+field+' wajib diapit tanda kutip ganda, contoh "'+(field==='nisn'?'0123123123':'6285399809980')+'"');
  }
  // Accept one literal quote pair from our export, without accepting formulas.
  for(const field of ['nisn','registered_phone']){
   if(/^"[+0-9]+"$/.test(row[field]))row[field]=row[field].slice(1,-1);
  }
  if(!/^\d{10}$/.test(row.nisn))throw Error('Baris data '+line+': NISN wajib 10 digit teks. Periksa nol awal pada sumber; aplikasi tidak menambahkan nol secara otomatis');
  if(row.registered_phone&&!/^\+?\d+$/.test(row.registered_phone))throw Error('Baris data '+line+': nomor telepon wajib digit teks, bukan rumus atau notasi ilmiah');
  return row;
 });
 return validateImport(rows,classId);
}
export const studentCSVTemplate='nisn,name,registered_phone\r\n';
// Literal quotes are part of the identifier cell; Papa escapes them as CSV triple quotes.
// No formula or equals prefix is emitted. Import removes exactly one valid quote pair.
export function exportStudentCSV(rows){
 const data=rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>{
  if(key==='nisn'||key==='registered_phone'){
   if(value==null||value==='')return [key,''];
   if(typeof value!=='string')throw Error('Ekspor dibatalkan: NISN/telepon harus berupa teks. Periksa data sumber.');
   const text=value.trim();
   const valid=key==='nisn'?/^[0-9]{5,20}$/.test(text):/^\+?[0-9]{7,15}$/.test(text);
   if(!valid)throw Error('Ekspor dibatalkan: NISN/telepon tidak valid. Periksa data sumber.');
   // Standard format keeps the historical digits-only international phone.
   const identifier=key==='registered_phone'?text.replace(/^\+/, ''):text;
   return [key,'"'+identifier+'"'];
  }
  return [key,safeCell(value)];
 })));
 const fields=data.length?Object.keys(data[0]):['nisn','name','class_name','registered_phone','formative','summative','stars','hearts'];
 const header=Papa.unparse([fields],{newline:'\r\n'});
 const body=Papa.unparse(data.map(row=>fields.map(key=>row[key])),{quotes:(value,index)=>value!==''&&value!=null&&['nisn','registered_phone'].includes(fields[index]),newline:'\r\n'});
 return header+(body?'\r\n'+body:'\r\n');
}
export function studentCSVDownload(rows){
 return {filename:'rekap-siswa.csv',
  content:'\ufeff'+exportStudentCSV(rows),mime:'text/csv;charset=utf-8'};
}
