import {rubricScore} from './domain.mjs';
const blank = value => value == null || String(value).trim() === '';
const gradeOf = row => (Array.isArray(row.grades) ? row.grades[0] : row.grades);

export function editGradeDraft(draft, key, value, task) {
  const next = {...draft, [key]: value};
  // Score entry is an explicit grading action, including a score of zero.
  if (key === 'score' || key === 'components') next.status = 'Dinilai';
  if (key === 'status' && value !== 'Dinilai') {
    next.score = '';
    next.components = task.rubric.map(() => '');
  }
  return next;
}

export function gradeEntry(task, row, draft = {}) {
  const grade = gradeOf(row);
  const stored = grade?.components ?? [];
  return {
    status: draft.status ?? row.status,
    raw: draft.score ?? (grade?.score == null ? '' : Number(grade.score) * Number(task.max_score) / 100),
    components: task.rubric.map((_, i) => (draft.components ?? stored)[i] ?? ''),
    feedback: draft.feedback ?? grade?.feedback ?? '',
  };
}

function numeric(value, max) {
  if (blank(value)) throw Error('Nilai wajib diisi; nol diperbolehkan');
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > max) throw Error('Skor di luar rentang');
  return number;
}

export function gradePayload(task, row, draft = {}) {
  const entry = gradeEntry(task, row, draft);
  if (!['Belum', 'Selesai', 'Dinilai'].includes(entry.status)) throw Error('Status tidak valid');
  let score = null, components = [];
  if (entry.status === 'Dinilai') {
    if (task.kind === 'SUMATIF') {
      if (!task.rubric.length || entry.components.some(blank)) throw Error('Semua aspek wajib diisi');
      components = entry.components.map((x, i) => numeric(x, task.rubric[i].max));
      rubricScore(components, task.rubric);
    } else score = numeric(entry.raw, task.max_score);
  }
  return {student_id: row.student_id, status: entry.status, score, components, feedback: entry.feedback};
}

export function previewGrade(task, row, draft = {}) {
  try {
    const payload = gradePayload(task, row, draft);
    if (payload.status !== 'Dinilai') return null;
    const score = task.kind === 'SUMATIF' ? rubricScore(payload.components, task.rubric) : payload.score / task.max_score * 100;
    return Math.round(score * 10000) / 10000;
  } catch { return null; }
}
