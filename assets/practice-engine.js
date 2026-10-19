import { practiceQuestions, practiceChapters } from './practice-bank.js';
function shuffled(items, random) { const result = [...items]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
export function buildPractice(mode, chapter, random = Math.random) {
  if (mode === 'chapter') {
    const questions = practiceQuestions.filter(q => q.chapter === Number(chapter));
    if (!questions.length) throw new Error('Choose a chapter.');
    return { questions: shuffled(questions, random), minutes: 5, title: `${practiceChapters.find(c => c.id === Number(chapter)).title} · Quick check` };
  }
  if (mode === 'full') return { questions: shuffled(practiceQuestions, random), minutes: 35, title: 'All chapters · Full practice' };
  if (mode !== 'mixed') throw new Error('Choose a test type.');
  return { questions: shuffled(practiceChapters.map(c => { const pool = practiceQuestions.filter(q => q.chapter === c.id); return pool[Math.floor(random() * pool.length)]; }), random), minutes: 20, title: 'All chapters · Mixed practice' };
}
export function analysePractice(questions, answers) {
  let correct = 0, wrong = 0, unanswered = 0;
  const chapters = new Map();
  const review = questions.map(q => {
    const raw = answers[q.id];
    const selected = Number.isInteger(raw) && raw >= 0 && raw < q.options.length ? raw : null;
    const status = selected === null ? 'unanswered' : selected === q.correct ? 'correct' : 'wrong';
    if (status === 'correct') correct++; else if (status === 'wrong') wrong++; else unanswered++;
    if (!chapters.has(q.chapter)) chapters.set(q.chapter, { chapter: q.chapter, title: practiceChapters.find(c => c.id === q.chapter)?.title || 'Maths', total: 0, correct: 0, wrong: 0, unanswered: 0 });
    const row = chapters.get(q.chapter); row.total++; row[status]++;
    return { ...q, selected, status };
  });
  const attempted = correct + wrong;
  return { total: questions.length, correct, wrong, unanswered, attempted, percent: questions.length ? Math.round(correct * 100 / questions.length) : 0, accuracy: attempted ? Math.round(correct * 100 / attempted) : null, chapters: [...chapters.values()].sort((a,b) => a.chapter - b.chapter), review };
}
