const code = document.querySelector('#gmail-code'), button = document.querySelector('#copy-gmail-code'), status = document.querySelector('#copy-status');
try {
  const response = await fetch('/assets/gmail-alerts.gs.txt');
  if (!response.ok) throw new Error('Code download failed.');
  code.value = await response.text(); button.disabled = false; status.textContent = 'Code ready. Copy it into Code.gs.';
} catch { status.textContent = 'Could not load the code. Use the download link below.'; }
button.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(code.value); status.textContent = 'Copied. Paste it into Code.gs in Google Apps Script.'; }
  catch { code.focus(); code.select(); status.textContent = 'Select and copy the code shown below.'; }
});
