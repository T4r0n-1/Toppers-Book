import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../assets/corrections.js', import.meta.url), 'utf8');
function form(search = '') {
  const elements = new Map();
  function element(selector) {
    if (!elements.has(selector)) elements.set(selector, {
      value: '', hidden: true, textContent: '', href: '', listeners: {}, children: [],
      addEventListener(event, callback) { this.listeners[event] = callback; },
      append(child) { this.children.push(child); },
      setCustomValidity(message) { this.validationMessage = message; },
      reportValidity() { return !element('#correction-issue').validationMessage; },
      focus() { this.focused = true; }, select() { this.selected = true; }
    });
    return elements.get(selector);
  }
  vm.runInNewContext(source, {
    document: { querySelector: element, createElement: () => ({}) },
    location: { search }, URLSearchParams, encodeURIComponent, navigator: {}
  });
  function submit() { element('#correction-form').listeners.submit({ preventDefault() {}, currentTarget: element('#correction-form') }); }
  return { element, submit };
}

test('reader correction keeps page context and safely encodes email content', () => {
  const { element, submit } = form('?source=book&page=24');
  assert.equal(element('#correction-page').value, '24');
  element('#correction-issue').value = 'Q12: x & y are swapped. Please check + signs.\nBcc: stays in body';
  element('#correction-question').value = 'Q12';
  submit();
  const link = new URL(element('#correction-email').href);
  assert.equal(link.pathname, 'codetoppers@gmail.com');
  assert.equal(link.searchParams.has('bcc'), false);
  assert.match(link.searchParams.get('body'), /Reader page: 24/);
  assert.match(link.searchParams.get('body'), /x & y are swapped/);
  assert.match(element('#correction-status').textContent, /Draft prepared/);
});

test('demo reports are distinct and invalid query pages are ignored', () => {
  const { element, submit } = form('?source=demo&page=-3');
  assert.equal(element('#correction-page').value, '');
  element('#correction-issue').value = 'Please check this example formula.';
  submit();
  assert.match(element('#correction-draft-text').value, /Illustrative reader demo/);
  assert.match(element('#correction-draft-text').value, /Demo page: Not specified/);
});

test('blank reports are rejected and editing invalidates a prepared draft', () => {
  const { element, submit } = form();
  element('#correction-issue').value = '           ';
  submit();
  assert.equal(element('#correction-email').href, '');
  element('#correction-issue').value = 'A step in this solution seems incorrect.';
  submit();
  assert.equal(element('#correction-draft').hidden, false);
  element('#correction-form').listeners.input();
  assert.equal(element('#correction-draft').hidden, true);
  assert.equal(element('#correction-email').href, 'mailto:codetoppers@gmail.com');
});

test('copy failure leaves a selectable draft without claiming a submission', async () => {
  const { element, submit } = form();
  element('#correction-issue').value = 'The final answer needs checking.';
  submit();
  await element('#copy-correction').listeners.click();
  assert.equal(element('#correction-draft-text').selected, true);
  assert.match(element('#correction-status').textContent, /send it from your email app/);
});
