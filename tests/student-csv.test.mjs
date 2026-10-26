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
