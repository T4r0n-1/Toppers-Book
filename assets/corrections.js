const $ = selector => document.querySelector(selector);
const chapters = ['Real Numbers', 'Polynomials', 'Pair of Linear Equations in Two Variables', 'Quadratic Equations', 'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Introduction to Trigonometry', 'Some Applications of Trigonometry', 'Circles', 'Areas Related to Circles', 'Surface Areas and Volumes', 'Statistics', 'Probability'];
const params = new URLSearchParams(location.search);
const demo = params.get('source') === 'demo';
const page = Number(params.get('page'));
const title = demo ? 'Illustrative reader demo (not the final book)' : 'CBSE Class 10 Mathematics Standard (041)';
$('#correction-context').textContent = title;
for (const [index, chapter] of chapters.entries()) {
  const option = document.createElement('option');
  option.value = `${index + 1}. ${chapter}`;
  option.textContent = option.value;
  $('#correction-chapter').append(option);
}
if (Number.isInteger(page) && page > 0 && page <= 100000) $('#correction-page').value = String(page);
$('#correction-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const issue = $('#correction-issue');
  issue.setCustomValidity(issue.value.trim().length < 10 ? 'Please describe the issue in at least 10 characters.' : '');
  if (!form.reportValidity()) return;
  const subject = `Correction suggestion — ${demo ? 'Reader demo' : 'Class 10 Mathematics Standard (041)'}`;
  const value = id => $(id).value.trim() || 'Not specified';
  const body = [
    'Hello Toppers Books,', '', `Book: ${title}`,
    `Chapter: ${value('#correction-chapter')}`,
    `${demo ? 'Demo page' : 'Reader page'}: ${value('#correction-page')}`,
    `Question / section: ${value('#correction-question')}`,
    `Edition / version: ${value('#correction-version')}`, '',
    'Issue:', issue.value.trim(), '',
    'Suggested correction:', value('#correction-suggestion'), '',
    'Please review this suggestion. Thank you.'
  ].join('\n');
  $('#correction-draft-text').value = `To: codetoppers@gmail.com\nSubject: ${subject}\n\n${body}`;
  $('#correction-email').href = `mailto:codetoppers@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  $('#correction-draft').hidden = false;
  $('#correction-status').textContent = 'Draft prepared. Send it from your email app to complete your suggestion.';
  $('#correction-draft-text').focus();
});
$('#correction-issue').addEventListener('input', event => event.target.setCustomValidity(''));
$('#correction-form').addEventListener('input', () => {
  $('#correction-draft').hidden = true;
  $('#correction-email').href = 'mailto:codetoppers@gmail.com';
  $('#correction-status').textContent = '';
});
$('#copy-correction').addEventListener('click', async () => {
  const draft = $('#correction-draft-text');
  try {
    await navigator.clipboard.writeText(draft.value);
    $('#correction-status').textContent = 'Draft copied. Paste it into your email and send it to codetoppers@gmail.com.';
  } catch {
    draft.focus(); draft.select();
    $('#correction-status').textContent = 'Select and copy the draft above, then send it from your email app.';
  }
});
