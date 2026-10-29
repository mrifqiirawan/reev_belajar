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
test('selective quotes preserve identifiers and ordinary fields remain unquoted',async()=>{
 const {studentCSVDownload,studentCSVTemplate}=await import('../src/student-csv.mjs');
 const rows=[{nisn:'0012345678',name:'SISWA UJI',class_name:'7A',registered_phone:'+6281234567890',formative:89.33333333,summative:null,stars:0,hearts:10},{nisn:'0142373659',name:'SISWA DUA',class_name:'7A',registered_phone:null,formative:80,summative:null,stars:0,hearts:10}];
 const csv=exportStudentCSV(rows);
 assert.equal(csv,'nisn,name,class_name,registered_phone,formative,summative,stars,hearts\r\n"""0012345678""",SISWA UJI,7A,"""6281234567890""",89.33333333,,0,10\r\n"""0142373659""",SISWA DUA,7A,,80,,0,10');
 const file=studentCSVDownload(rows);assert.equal(file.filename,'rekap-siswa.csv');assert.equal(file.content,'\ufeff'+csv);
 assert.equal(studentCSVTemplate,'nisn,name,registered_phone\r\n');
 const importCSV=exportStudentCSV([{nisn:'0012345678',name:'SISWA UJI',registered_phone:'081234567890'}]);
 assert.equal(parseStudentCSV(importCSV,'c')[0].nisn,'0012345678');
 assert.equal(parseStudentCSV(importCSV,'c')[0].registered_phone,'+6281234567890');
});
test('special names are escaped and reordered columns retain their quote policy',()=>{
 const row={name:'Nama, "Uji"\nDua',registered_phone:'081234567890',nisn:'0012345678'};
 const csv=exportStudentCSV([row]);assert.ok(csv.startsWith('name,registered_phone,nisn\r\n'));
 const parsed=parseStudentCSV(csv,'c');assert.equal(parsed[0].name,row.name);assert.equal(parsed[0].nisn,row.nisn);
});
test('export rejects numeric identifiers and formula injection; text is neutralized',()=>{
 for(const nisn of [123456789,'1.2345E+9','=1+1','00123"&NOW()&"','00123\n45678'])assert.throws(()=>exportStudentCSV([{nisn,name:'Uji',registered_phone:''}]));
 for(const registered_phone of [8123456789,'=HYPERLINK("x")','+62812"&1&"'])assert.throws(()=>exportStudentCSV([{nisn:'0012345678',registered_phone}]));
 for(const name of ['=HYPERLINK("https://example.test")','+1+1','@SUM(1)','-1+2'])assert.ok(exportStudentCSV([{nisn:'0012345678',name,registered_phone:''}]).includes("'"));
});
test('empty export contains headers and blank phone imports without quotes',()=>{
 assert.equal(exportStudentCSV([]),'nisn,name,class_name,registered_phone,formative,summative,stars,hearts\r\n');
 const csv=exportStudentCSV([{nisn:'0012345678',name:'Nama',registered_phone:null}]);
 assert.equal(csv,'nisn,name,registered_phone\r\n"""0012345678""",Nama,');
 assert.equal(parseStudentCSV(csv,'c')[0].registered_phone,null);
});

test('downloaded cell includes literal quotes and never an equals formula',async()=>{
 const {default:Papa}=await import('papaparse');
 const rows=[{nisn:'0012345678',name:'Siswa',class_name:'7A',registered_phone:'081234567890',formative:0,summative:null,stars:2,hearts:10}];
 const csv=exportStudentCSV(rows);const parsed=Papa.parse(csv,{header:true,dynamicTyping:false});
 assert.equal(parsed.errors.length,0);assert.equal(parsed.data[0].nisn,'"0012345678"');
 assert.equal(parsed.data[0].registered_phone,'"081234567890"');assert.equal(parsed.data[0].name,'Siswa');
 assert.equal(parsed.data[0].formative,'0');assert.equal(parsed.data[0].summative,'');assert.ok(!csv.includes('='));
});
test('import accepts literal quoted identifiers without persisting quote characters',()=>{
 const csv=exportStudentCSV([{nisn:'0012345678',name:'Siswa',registered_phone:'081234567890'}]);
 const rows=parseStudentCSV(csv,'c');assert.equal(rows[0].nisn,'0012345678');assert.equal(rows[0].registered_phone,'+6281234567890');
 for(const value of ['"=0012345678"','"1.234E9"','""0012345678""']){
  const escaped='"'+value.replaceAll('"','""')+'"';
  assert.throws(()=>parseStudentCSV(header+escaped+',Nama,','c'));
 }
});
