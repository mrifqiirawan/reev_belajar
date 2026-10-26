import {gradePayload} from './grade-entry.mjs';
export function formativeStatus(row) {
  const total=Number(row.formative_total), graded=Number(row.formative_graded);
  if (!total) return 'Belum ada tugas';
  return graded===total && row.formative!=null && Number(row.formative)>=Number(row.kktp) ? 'Tuntas' : 'Belum tuntas';
}
export function settingsPayload(values) {
  return Object.fromEntries(['subject','school','teacher','kktp','classical_target','initial_hearts','min_hearts','restore_hearts','max_stars','bonus_enabled','stars_per_percent','accent'].map(key=>[key,values[key]]));
}
export function studentGradePayload(student,semester,rows,drafts) {
  const changes=rows.filter(r=>drafts[r.task.id]).map(r=>{
    try {return {...gradePayload(r.task,r,drafts[r.task.id]),task_id:r.task.id,revision:r.task.revision,expected_status:r.status,expected_grade:r.grades??null}}
    catch(error){throw Error(r.task.code+' — '+r.task.title+': '+error.message)}
  });
  if (!changes.length || changes.length>200) throw Error('Simpan 1–200 perubahan tugas per batch');
  return {student_id:student,semester_id:semester,rows:changes};
}
