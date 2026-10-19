import { practiceQuestions, practiceChapters } from './practice-bank.js';
import { buildPractice, analysePractice } from './practice-engine.js';
const $ = selector => document.querySelector(selector);
const KEY = 'toppers-maths-practice-v1';
let session = null, position = 0, timer, result = null;
function element(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function questions() { return session.ids.map(id => practiceQuestions.find(q => q.id === id)); }
function view(name) { for (const key of ['setup','test','results']) $('#practice-' + key).hidden = key !== name; }
function save() {
  if (!session) return;
  session.position = position;
  try { localStorage.setItem(KEY, JSON.stringify(session)); $('#practice-save-status').textContent = 'Progress saved in this browser.'; }
  catch { $('#practice-save-status').textContent = 'Progress cannot be saved here. Keep this tab open.'; }
}
function savedAttempt() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    if (!value || !Array.isArray(value.ids) || !value.ids.length || value.ids.length > practiceQuestions.length || new Set(value.ids).size !== value.ids.length || !value.ids.every(id => practiceQuestions.some(q => q.id === id))) return null;
    if (!['mixed','full','chapter'].includes(value.mode) || !Number.isFinite(value.started) || (value.deadline !== null && !Number.isFinite(value.deadline))) return null;
    value.answers = value.answers && typeof value.answers === 'object' ? value.answers : {};
    value.flags = Array.isArray(value.flags) ? value.flags.filter(id => value.ids.includes(id)) : [];
    return value;
  } catch { return null; }
}
function showSaved() {
  const saved = savedAttempt(); $('#saved-practice').hidden = !saved;
  if (saved) { $('#saved-label').textContent = saved.submitted ? 'Your last result is saved in this browser.' : 'You have a saved attempt. A running timer continues while you are away.'; $('#resume-practice').textContent = saved.submitted ? 'View last result' : 'Resume practice'; }
}
function tick() {
  if (!session || session.submitted) return;
  if (session.deadline === null) { $('#test-timer').textContent = 'Untimed'; return; }
  const seconds = Math.max(0, Math.ceil((session.deadline - Date.now()) / 1000));
  $('#test-timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
  $('#test-timer').classList.toggle('urgent', seconds <= 60);
  if (!seconds) finish('Time limit reached');
}
function startClock() { clearInterval(timer); tick(); if (session && !session.submitted) timer = setInterval(tick, 1000); }
function renderQuestion(focus = false) {
  if (!session || session.submitted) return;
  if (session.deadline !== null && session.deadline <= Date.now()) { finish('Time limit reached'); return; }
  const list = questions(); position = Math.max(0, Math.min(position, list.length - 1)); const q = list[position];
  $('#test-title').textContent = session.title;
  $('#question-counter').textContent = `Question ${position + 1} of ${list.length} · 1 mark`;
  $('#question-chapter').textContent = practiceChapters.find(c => c.id === q.chapter).title;
  $('#question-prompt').textContent = q.prompt;
  $('#question-options').replaceChildren(...q.options.map((text, index) => {
    const label = element('label', undefined, 'question-option');
    const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'answer'; radio.value = index; radio.checked = session.answers[q.id] === index;
    radio.addEventListener('change', () => { session.answers[q.id] = index; save(); renderPalette(); });
    label.append(radio, element('span', String.fromCharCode(65 + index), 'option-letter'), element('span', text)); return label;
  }));
  $('#question-prev').disabled = position === 0;
  $('#question-next').textContent = position === list.length - 1 ? 'Review & submit →' : 'Next →';
  const flagged = session.flags.includes(q.id); $('#flag-question').setAttribute('aria-pressed', String(flagged)); $('#flag-question').textContent = flagged ? '★ Marked for review' : '☆ Review later';
  renderPalette(); save(); if (focus) $('#question-prompt').focus();
}
function renderPalette() {
  const list = questions();
  const report = analysePractice(list, session.answers);
  $('#answered-count').textContent = `${report.attempted} answered · ${report.unanswered} unanswered`;
  $('#question-palette').replaceChildren(...list.map((q, i) => {
    const answered = Number.isInteger(session.answers[q.id]) && session.answers[q.id] >= 0 && session.answers[q.id] < q.options.length;
    const flagged = session.flags.includes(q.id);
    const button = element('button', `${i + 1}${flagged ? '☆' : ''}`); button.type = 'button'; button.classList.toggle('answered', answered); button.classList.toggle('flagged', flagged); button.setAttribute('aria-current', String(i === position)); button.setAttribute('aria-label', `Question ${i + 1}, ${answered ? 'answered' : 'unanswered'}${flagged ? ', flagged for review' : ''}`);
    button.addEventListener('click', () => { position = i; renderQuestion(true); }); return button;
  }));
}
function askSubmit() {
  tick(); if (session.submitted) return;
  const report = analysePractice(questions(), session.answers);
  $('#submit-summary').textContent = `${report.attempted} of ${report.total} answered. ${report.unanswered} unanswered. ${session.flags.length} flagged for review. Unanswered questions receive 0 marks.`;
  if (!$('#submit-dialog').open) $('#submit-dialog').showModal();
}
function finish(reason = 'Submitted') {
  if (!session || session.submitted) return;
  session.submitted = true; session.reason = reason; session.finished = session.deadline === null ? Date.now() : Math.min(Date.now(), session.deadline); clearInterval(timer); save();
  if ($('#submit-dialog').open) $('#submit-dialog').close();
  showResults();
}
function showResults() {
  clearInterval(timer); result = analysePractice(questions(), session.answers); view('results');
  $('#result-context').textContent = `${session.title} · ${session.reason || 'Submitted'} · ${Math.max(0, Math.round((session.finished - session.started) / 60000))} minutes elapsed`;
  $('#result-score').textContent = `${result.correct} / ${result.total} marks`; $('#result-percent').textContent = `${result.percent}%`;
  for (const key of ['correct','wrong','unanswered']) $('#result-' + key).textContent = result[key];
  $('#result-accuracy').textContent = result.accuracy === null ? 'No questions attempted. Open the explanations below, then try a short practice session.' : `${result.accuracy}% accuracy on ${result.attempted} attempted questions. Unanswered questions count as 0 in the overall score.`;
  $('#chapter-results').replaceChildren(...result.chapters.map(row => {
    const block = element('div', undefined, 'chapter-result'), line = element('div'); line.append(element('span', row.title), element('strong', `${row.correct}/${row.total}`));
    const bar = element('div', undefined, 'chapter-bar'), fill = element('span'); fill.style.width = `${row.correct * 100 / row.total}%`; bar.append(fill);
    block.append(line, bar, element('small', `${row.wrong} incorrect · ${row.unanswered} unanswered · ${row.total} question${row.total === 1 ? '' : 's'} sampled`)); return block;
  }));
  const revisit = result.chapters.filter(c => c.wrong || c.unanswered).sort((a,b) => (b.wrong + b.unanswered) - (a.wrong + a.unanswered));
  const recommendations = $('#practice-recommendations'); recommendations.replaceChildren();
  if (!revisit.length) recommendations.append(element('p', 'All answers in this attempt are correct. Read the explanations, then try another mix or the full practice test.'));
  else {
    recommendations.append(element('p', 'Start with these chapters from this attempt. Review the explanation, revise the idea, then try the chapter quick check.'));
    const ul = element('ul'); revisit.slice(0,4).forEach(c => ul.append(element('li', `${c.title}: ${c.wrong} incorrect, ${c.unanswered} unanswered.`))); recommendations.append(ul);
  }
  $('#review-filter').value = 'all'; renderReview(); $('#results-title').focus(); window.scrollTo(0,0);
}
function renderReview() {
  const filter = $('#review-filter').value;
  const items = result.review.map((q,i) => ({ ...q, number: i + 1 })).filter(q => filter === 'all' || q.status === filter);
  $('#answer-review').replaceChildren(...items.map(q => {
    const card = element('article', undefined, 'review-card');
    const label = { correct: 'Correct', wrong: 'Incorrect', unanswered: 'Unanswered' }[q.status];
    card.append(element('span', label, `review-tag ${q.status}`), element('h3', `${q.number}. ${q.prompt}`), element('p', `Your answer: ${q.selected === null ? 'Not answered' : q.options[q.selected]}`), element('p', `Correct answer: ${q.options[q.correct]}`), element('p', q.explanation, 'review-explanation')); return card;
  }));
  if (!items.length) $('#answer-review').append(element('p', 'No questions in this category.'));
}
$('#test-chapter').replaceChildren(...practiceChapters.map(c => { const option = element('option', `${String(c.id).padStart(2,'0')} · ${c.title}`); option.value = c.id; return option; }));
$('#test-mode').addEventListener('change', () => { $('#chapter-choice').hidden = $('#test-mode').value !== 'chapter'; });
$('#practice-config').addEventListener('submit', event => {
  event.preventDefault(); $('#setup-error').hidden = true;
  try {
    const mode = $('#test-mode').value, chapter = Number($('#test-chapter').value), test = buildPractice(mode, chapter), started = Date.now();
    session = { mode, chapter, title: test.title, ids: test.questions.map(q => q.id), answers: {}, flags: [], started, deadline: $('#timed-test').checked ? started + test.minutes * 60000 : null, submitted: false, position: 0 };
    position = 0; view('test'); renderQuestion(); startClock(); $('#test-title').focus(); window.scrollTo(0,0);
  } catch (error) { $('#setup-error').textContent = error.message; $('#setup-error').hidden = false; }
});
$('#question-form').addEventListener('submit', event => event.preventDefault());
$('#question-prev').addEventListener('click', () => { position--; renderQuestion(true); });
$('#question-next').addEventListener('click', () => { if (position === session.ids.length - 1) askSubmit(); else { position++; renderQuestion(true); } });
$('#clear-answer').addEventListener('click', () => { delete session.answers[session.ids[position]]; renderQuestion(); });
$('#flag-question').addEventListener('click', () => { const id = session.ids[position]; session.flags = session.flags.includes(id) ? session.flags.filter(x => x !== id) : [...session.flags,id]; renderQuestion(); });
$('#submit-practice').addEventListener('click', askSubmit);
$('#keep-practising').addEventListener('click', () => $('#submit-dialog').close());
$('#confirm-submit').addEventListener('click', () => finish());
$('#pause-practice').addEventListener('click', () => { save(); view('setup'); showSaved(); window.scrollTo(0,0); });
$('#new-practice').addEventListener('click', () => { view('setup'); showSaved(); window.scrollTo(0,0); });
$('#review-filter').addEventListener('change', renderReview);
$('#resume-practice').addEventListener('click', () => { session = savedAttempt(); if (!session) { showSaved(); return; } position = Number.isInteger(session.position) ? session.position : 0; if (session.submitted) showResults(); else { view('test'); renderQuestion(); startClock(); } });
$('#clear-practice').addEventListener('click', () => { clearInterval(timer); session = null; try { localStorage.removeItem(KEY); } catch { /* No stored attempt is available. */ } showSaved(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
showSaved();
