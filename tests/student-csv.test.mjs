import test from 'node:test';import assert from 'node:assert/strict';
import {parseStudentCSV,exportStudentCSV} from '../src/student-csv.mjs';
const header='nisn,name,registered_phone\n';
test('quoted NISN preserves zeros; uppercase phone alias and semicolon accepted',()=>{
 const x=parseStudentCSV('\ufeffNISN;NAME;PHONE_REGISTERED\r\n"0123123123";"Siswa Uji";"6285399809980"\r\n','c');
 assert.equal(x[0].nisn,'0123123123');assert.equal(x[0].registered_phone,'+6285399809980');
 assert.equal(parseStudentCSV(header+'"0123123123",Nama,"085399809980"','c')[0].registered_phone,'+6285399809980');
});
test('reject unquoted identifiers, shortened NISN, scientific notation, formulas',()=>{
 for(const row of ['0123123123,Nama,"6285399809980"','"0123123123",Nama,6285399809980','"123123123",Nama,"6285399809980"','"1.23123E+09",Nama,"6285399809980"','"0123123123",Nama,"6.285E+12"','="0123123123",Nama,"6285399809980"'])assert.throws(()=>parseStudentCSV(header+row,'c'));
});
test('quote scanner handles comma in names, escaped quotes, multiline, blank records and empty phones',()=>{
 const x=parseStudentCSV(header+'\n"0123123123","Nama, ""Uji""\nDua",""\r\n"0123123124",Lain,\r\n','c');
 assert.equal(x.length,2);assert.equal(x[0].name,'Nama, "Uji"\nDua');assert.equal(x[0].registered_phone,null);
 assert.throws(()=>parseStudentCSV(header+'"0123123123","Nama\nUji",6285399809980','c'),/kutip ganda/);
});
test('invalid structure and duplicate identifiers cannot reach import preview',()=>{
 for(const text of ['nisn,name,phone_registered,registered_phone\n"0123123123",N,"6285399809980",x',header+'"0123123123",N,"6285399809980",extra',header+'"0123123123",N,"6285399809980',header+'"0123123123",N,"6285399809980"\n"0123123123",N,"6285399809980"'])assert.throws(()=>parseStudentCSV(text,'c'));
});
test('export quotes all fields and identifiers round trip without added apostrophe',()=>{
 const csv=exportStudentCSV([{nisn:'0123123123',name:'Nama',registered_phone:'+6285399809980'}]);
 assert.ok(csv.includes('"0123123123"'));assert.ok(csv.includes('"6285399809980"'));
 assert.equal(parseStudentCSV(csv,'c')[0].nisn,'0123123123');
});

test('Excel export uses only digit-validated constant strings; standard stays import-compatible',async()=>{
 const {default:Papa}=await import('papaparse');
 const {studentCSVDownload}=await import('../src/student-csv.mjs');
 const rows=[{nisn:'0012345678',name:'Nama, "Uji"\nBaris',registered_phone:'081234567890',score:0},{nisn:'0000000001',name:'Lain',registered_phone:null,score:null}];
 const file=studentCSVDownload(rows,{excel:true});
 assert.equal(file.filename,'rekap-siswa-excel.csv');assert.equal(file.content[0],'\ufeff');
 assert.ok(file.content.includes('"=""0012345678"""'));assert.ok(file.content.includes('"=""081234567890"""'));
 const parsed=Papa.parse(file.content,{header:true,dynamicTyping:false});assert.equal(parsed.errors.length,0);
 assert.equal(parsed.data[0].nisn,'="0012345678"');assert.equal(parsed.data[0].registered_phone,'="081234567890"');
 assert.equal(parsed.data[0].name,rows[0].name);assert.equal(parsed.data[0].score,'0');assert.equal(parsed.data[1].registered_phone,'');
 const standard=studentCSVDownload(rows);assert.equal(standard.filename,'rekap-siswa.csv');
 assert.equal(Papa.parse(standard.content,{header:true}).data[0].nisn,'0012345678');
 assert.ok(standard.content.includes('"081234567890"'));
});
test('export rejects damaged numeric identifiers and formula injection in identifiers',()=>{
 for(const nisn of [123456789,'1.2345E+9','=1+1','00123"&NOW()&"','00123\n45678'])
  for(const excel of [false,true])assert.throws(()=>exportStudentCSV([{nisn,name:'Uji',registered_phone:''}],{excel}));
 for(const registered_phone of [8123456789,'=HYPERLINK("x")','+62812"&1&"'])
  assert.throws(()=>exportStudentCSV([{nisn:'0012345678',registered_phone}],{excel:true}));
 for(const name of ['=HYPERLINK("https://example.test")','+1+1','@SUM(1)','-1+2'])
  assert.ok(exportStudentCSV([{nisn:'0012345678',name,registered_phone:''}],{excel:true}).includes("'"));
});
test('Excel presentation CSV is not accepted as a student import',()=>{
 const csv=exportStudentCSV([{nisn:'0012345678',name:'Uji',registered_phone:'081234567890'}],{excel:true});
 assert.throws(()=>parseStudentCSV(csv,'c'));
});
