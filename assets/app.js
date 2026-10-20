import { spreadPages, turnPage, fitSpread } from './reader-layout.js';
import { bindReaderGestures } from './reader-gestures.js';
import { setupReaderFullscreen } from './reader-fullscreen.js';
import { setupRoughPads } from './rough-pad.js';
import { book as bookEdition } from './book-data.js';
import { authMessage, emailAuthentication, passwordReset, profileInput } from './auth-helpers.js';
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const chapters = bookEdition.chapters.map(chapter => chapter.title.replace(/^\d+ · /, ''));
const support = '<a href="mailto:codetoppers@gmail.com">codetoppers@gmail.com</a> · <a href="tel:+918384871987">+91 83848 71987</a>';
const operator = '<p><strong>Toppers Books is operated by GUPTA ENTERPRISES.</strong><br>Tajganj, Agra, Uttar Pradesh – 282001, India.<br>' + support + '</p>';
const policies = {
  terms: { title: 'Terms & conditions', body: `${operator}<h3>Our digital books</h3><p>Toppers Books offers independent educational resources. We are not affiliated with or endorsed by CBSE. The complete 223-page Mathematics edition is available for purchase with personal online reading access.</p><h3>Purchase and personal access</h3><p>The book page states the contents, price and access period. A purchase provides a personal, non-transferable licence to read the purchased book online for 365 days from verified payment. It does not transfer copyright or provide a downloadable PDF. Access does not automatically renew.</p><h3>Your account and watermark</h3><p>Use accurate account and checkout details. Purchased reading pages are personalised with the reader name and mobile number provided at checkout. Do not share your account, copy, resell, publish or redistribute book content. Access may be restricted for misuse; contact support if you believe a restriction is incorrect.</p><h3>Availability and support</h3><p>An internet connection and a supported modern browser are required. Temporary interruptions can occur. Contact us about access problems, content errors or corrections. Educational resources support study and do not guarantee any exam result.</p><h3>Payments and policies</h3><p>Payments are processed through Razorpay. Coupon eligibility and the final total will be displayed before payment. Our Privacy, Digital Access, and Refunds & Cancellations policies also apply. Nothing in these terms excludes applicable statutory rights.</p>` },
  privacy: { title: 'Privacy policy', body: `${operator}<h3>Information we use</h3><p>When you create an account or make a purchase, we use your sign-in email and identifier, reader name, mobile number, purchase and payment references, and access expiry to provide your account and purchased books. Google sign-in may also provide your profile name and picture. We use browser storage to keep sign-in state and your reading position.</p><h3>Personalised reading pages</h3><p>Your name and mobile number will appear in a watermark on your purchased reading pages to discourage redistribution. This will be disclosed before payment. Sharing a screenshot can reveal these details, so keep your reading pages private.</p><h3>Service providers</h3><p>We use Cloudflare for hosting and protected content. Firebase Authentication handles Google and email/password sign-in. Passwords are handled by Firebase; we do not store them in our own database. Razorpay processes payments. These providers process information under their own policies. We do not store card numbers, CVV or UPI PINs.</p><h3>Retention and your requests</h3><p>We retain account and purchase information as needed to provide access, resolve issues and meet applicable record-keeping requirements. Contact us to request correction or deletion. Some transaction records may need to be retained even after account deletion. We do not sell your personal information.</p><h3>Students and parents</h3><p>If you are under 18, ask a parent or guardian to manage the purchase and provide appropriate account and contact details.</p><h3>Contact</h3><p>For privacy questions or requests, email codetoppers@gmail.com.</p>` },
  refunds: { title: 'Refunds & cancellations', body: `${operator}<h3>Current launch status</h3><p>The complete 223-page edition is available with 365-day online reading access after verified successful payment.</p><h3>Before you purchase</h3><p>Please check the book description, sample, online-only format and 365-day access period before paying. If you experience a duplicate payment, a payment without book access, a wrong product delivery or a material mismatch with the description, contact us with the order ID and issue details.</p><h3>Review and resolution</h3><p>We will review the transaction and work to restore the correct access or provide an appropriate refund. Requests based only on a change of mind after access has been provided will be reviewed individually. This policy does not limit rights available under applicable law.</p><h3>Cancellations and refunds</h3><p>Unpaid orders can be abandoned without a charge. For a paid order, contact support to request cancellation or a refund. Approved refunds are returned through the original payment method; bank and payment-provider processing times apply. Access associated with a fully refunded purchase will end.</p><h3>How to contact us</h3><p>Email codetoppers@gmail.com or WhatsApp +91 83848 71987. Never send your card details, CVV, UPI PIN or OTP.</p>` },
  delivery: { title: 'Digital access policy', body: `${operator}<h3>No physical delivery</h3><p>This is an online reading product. No printed book is shipped and no PDF download, print or offline access is included.</p><h3>When access begins</h3><p>Access is granted to the signed-in buyer only after the backend verifies a captured payment. Closing a checkout window or seeing a payment screenshot does not by itself establish a purchase.</p><h3>Your reading period</h3><p>Purchased access lasts 365 days from verified successful payment. The expiry date will be shown in My Books. Sign in with the same account used for purchase. There is no automatic renewal.</p><h3>Personalisation and devices</h3><p>Reading pages carry the reader name and mobile number provided at checkout. Use a modern browser on your phone, tablet or computer and maintain an internet connection. Access is for the purchasing account only.</p><h3>If a payment is pending or access is missing</h3><p>Check My Books after signing in. If payment was deducted but the book remains unavailable, contact support with your order/payment reference. Avoid repeatedly paying for the same book while an earlier payment is being checked.</p>` }
};
const samples = bookEdition.samples;
let config = { authEnabled: false, salesOpen: false };
let auth, authSDK, currentUser = null, activeBook = null, page = 0, zoom = 1, toastTimer, readerRequest = 0;
let loginMode = 'signin', authBusy = false, verificationSentAt = 0;
let currentProfile = null, profileOwner = null, profileRequest = 0, signupDraft = null;
function safeStorage(action, key, value) { try { return action === 'get' ? localStorage.getItem(key) : action === 'set' ? localStorage.setItem(key, value) : localStorage.removeItem(key); } catch { return null; } }
function notify(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 6500); }
function openDialog(id) { const element = $(id); if (!element.open) element.showModal(); }
function showPolicy(key) { const policy = policies[key]; if (!policy) return; $('#policy-title').textContent = policy.title; $('#policy-content').innerHTML = policy.body; openDialog('#policy-dialog'); }
async function api(path, options = {}) {
  const token = currentUser ? await currentUser.getIdToken() : null;
  const response = await fetch('/api/' + path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'This service is temporarily unavailable. Please try again.');
  return body;
}
function selectTab(key, focus = false) {
  $$('[data-tab]').forEach(button => { const selected = button.dataset.tab === key; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; $('#' + button.dataset.tab + '-panel').hidden = !selected; if (selected && focus) button.focus(); });
}
$('#chapter-list').replaceChildren(...chapters.map(title => { const li = document.createElement('li'); li.textContent = title; return li; }));
$('#year').textContent = new Date().getFullYear();
$('#menu-button').addEventListener('click', () => { const open = $('#nav-links').classList.toggle('open'); $('#menu-button').setAttribute('aria-expanded', String(open)); });
$$('.nav-links a').forEach(link => link.addEventListener('click', () => { $('#nav-links').classList.remove('open'); $('#menu-button').setAttribute('aria-expanded', 'false'); }));
$$('[data-tab]').forEach(button => button.addEventListener('click', () => selectTab(button.dataset.tab)));
$('.detail-tabs').addEventListener('keydown', event => { const tabs = $$('[data-tab]'); const index = tabs.indexOf(document.activeElement); if (index < 0) return; let next = index; if (event.key === 'ArrowRight') next = (index + 1) % tabs.length; else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length; else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = tabs.length - 1; else return; event.preventDefault(); selectTab(tabs[next].dataset.tab, true); });
document.addEventListener('click', async event => {
  const close = event.target.closest('[data-close]'); if (close) { close.closest('dialog').close(); return; }
  const policy = event.target.closest('[data-policy]'); if (policy) { showPolicy(policy.dataset.policy); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'details') openDialog('#details-dialog');
  if (action === 'login') { if (currentUser?.emailVerified) location.hash = 'library'; else openDialog('#login-dialog'); }
  if (action === 'library') location.hash = 'library';
  if (action === 'home') location.hash = 'home';
  if (action === 'preview') startReader();
  if (action === 'logout' && auth) { await authSDK.signOut(auth); signupDraft = null; if ($('#profile-dialog').open) $('#profile-dialog').close(); notify('You have signed out.'); }
  if (action === 'profile') await openProfile();
  if (action === 'checkout') {
    if (!currentUser?.emailVerified) openDialog('#login-dialog');
    else { await loadProfile(); if (!currentProfile) { await openProfile(); return; } $('#buyer-name').value = currentProfile.name; $('#buyer-phone').value = currentProfile.phone; openDialog('#checkout-dialog'); }
  }
});
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); }));
function resumeKey() { return activeBook && currentUser ? `toppers-reader:${currentUser.uid}:${activeBook.bookId}` : 'toppers-book-sample-page-v1'; }
let readerMode = 'spread', modeChosen = false, turnTimer = null;
const roughPads = setupRoughPads($('#reader-dialog'), () => ({ uid: currentUser?.uid || 'sample', book: activeBook?.bookId || 'sample' }));
const readerPresentation = setupReaderFullscreen($('#reader-dialog'), {
  onResize: applyZoom,
  onMessage: notify,
  onEnter: () => { setContents(false); roughPads.closeAll(); resetPageTurn(); },
  onLock: () => { setContents(false); roughPads.closeAll(); readerGestures.reset(); resetPageTurn(); },
  canHide: () => $('#reader-dialog').classList.contains('contents-hidden') && !$('#reader-dialog').querySelector('.rough-pad:not([hidden])')
});
function resetPageTurn() {
  clearTimeout(turnTimer); turnTimer = null;
  const spread = $('#reader-page'); spread.classList.remove('is-dragging', 'is-turning'); spread.style.removeProperty('--turn-x'); spread.style.removeProperty('--turn-angle');
}
function visiblePages() { return spreadPages(page, activeBook ? activeBook.pageCount : samples.length, activeBook ? readerMode : 'single'); }
function applyZoom() {
  const viewport = $('#page-viewport');
  viewport.classList.toggle('is-zoomed', zoom > 1);
  const padding = getComputedStyle(viewport);
  const width = viewport.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
  const height = viewport.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom);
  if (width <= 0 || height <= 0) return;
  const size = fitSpread(width, height, visiblePages().length, activeBook ? 1190 / 1724 : 595.44 / 841.68, zoom);
  const spread = $('#reader-page');
  spread.style.width = `${size.width}px`; spread.style.height = `${size.height}px`;
  spread.style.setProperty('--sheet-width', `${size.pageWidth}px`);
  spread.style.setProperty('--spread-gap', `${size.gap}px`);
  $('#zoom-label').textContent = `${Math.round(zoom * 100)}%`;
  $('#zoom-out').disabled = zoom <= 1; $('#zoom-in').disabled = zoom >= 3;
}
async function renderPage() {
  resetPageTurn();
  const request = ++readerRequest;
  const book = activeBook;
  const total = book ? book.pageCount : samples.length;
  page = Math.max(0, Math.min(Math.trunc(Number(page)) || 0, total - 1));
  const visible = visiblePages();
  const first = visible[0], last = visible.at(-1);
  $('#page-label').textContent = book ? `${first + 1}${last !== first ? '–' + (last + 1) : ''} / ${total}` : `Sample ${page + 1} / ${total} · Book p. ${samples[page].page}`;
  $('#jump-page').max = total; $('#jump-page').value = page + 1;
  $('#reader-correction').href = `/corrections.html?source=${book ? 'book' : 'sample'}&page=${book ? page + 1 : samples[page].page}#suggest`;
  $('#prev-page').disabled = first === 0; $('#next-page').disabled = last === total - 1;
  $('#jump-prev').disabled = first === 0; $('#jump-next').disabled = last === total - 1;
  const contents = $$('#reader-contents button');
  const selected = contents.filter(button => Number(button.dataset.page) <= page).at(-1);
  contents.forEach(button => { const active = button === selected; button.classList.toggle('active', active); if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
  const sheets = visible.map(index => {
    const sheet = document.createElement('div'); sheet.className = 'reader-sheet'; sheet.dataset.page = index + 1;
    sheet.setAttribute('aria-label', `Page ${book ? index + 1 : samples[index].page}`);
    sheet.setAttribute('aria-busy', 'true');
    const status = document.createElement('p'); status.className = 'reader-page-status'; status.textContent = `Loading page ${book ? index + 1 : samples[index].page}…`; sheet.append(status);
    return sheet;
  });
  $('#reader-page').replaceChildren(...sheets);
  $('#reader-page').classList.toggle('is-spread', visible.length > 1);
  safeStorage('set', resumeKey(), String(page));
  applyZoom(); $('#page-viewport').scrollTop = 0; $('#page-viewport').scrollLeft = 0;
  await Promise.all(visible.map(async (index, position) => {
    const sheet = sheets[position];
    try {
      const src = book ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent((await api(`read/${encodeURIComponent(book.bookId)}/${index + 1}`)).svg) : samples[index].src;
      if (request !== readerRequest) return;
      const image = new Image(); image.draggable = false; image.className = book ? 'paid-page' : 'book-sample-page';
      image.alt = book ? `${book.title}, page ${index + 1}, personalised reading copy` : `${samples[index].title}, selected sample from book page ${samples[index].page}`;
      image.src = src;
      await image.decode();
      if (request !== readerRequest) return;
      sheet.replaceChildren(image); sheet.setAttribute('aria-busy', 'false');
    } catch (error) {
      if (request !== readerRequest) return;
      const status = document.createElement('p'); status.className = 'reader-page-status'; status.textContent = `Page ${book ? index + 1 : samples[index].page}: ${error.message || 'Could not load this page.'}`;
      const retry = document.createElement('button'); retry.className = 'text-button'; retry.textContent = 'Try again'; retry.addEventListener('click', renderPage);
      sheet.replaceChildren(status, retry); sheet.setAttribute('aria-busy', 'false');
    }
  }));
}
function setContents(open) {
  $('#reader-dialog').classList.toggle('contents-hidden', !open);
  $('#toggle-contents').setAttribute('aria-expanded', String(open));
  requestAnimationFrame(applyZoom);
}
function startReader(book = null) {
  activeBook = book; zoom = 1; modeChosen = false;
  readerMode = book && matchMedia('(min-width: 900px)').matches ? 'spread' : 'single';
  $('#reader-view').value = readerMode; $('#reader-view').disabled = !book;
  page = Math.max(0, Number(safeStorage('get', resumeKey())) || 0);
  $('#reader-title').textContent = book ? book.title : 'Selected pages from the book';
  $('#reader-kicker').textContent = book ? 'YOUR PERSONALISED READING COPY' : 'PUBLIC BOOK SAMPLE · 5 SELECTED PAGES';
  $('#reader-disclaimer').textContent = book ? 'Personalised online reading. Scroll here for all chapters. Use Next to turn the book.' : 'Five selected pages from the supplied 223-page edition. Full book access is not included.';
  const contents = book ? book.chapters : samples.map((s, i) => ({ title: s.title, subtitle: s.subtitle, page: i + 1 }));
  $('#reader-contents').replaceChildren(...contents.map(entry => {
    const button = document.createElement('button'); button.textContent = entry.title; button.dataset.page = entry.page - 1;
    const subtitle = document.createElement('span'); subtitle.textContent = entry.subtitle || `Page ${entry.page}`; button.append(subtitle);
    button.addEventListener('click', () => { if (readerPresentation.locked) return; page = entry.page - 1; zoom = 1; if (matchMedia('(max-width: 760px)').matches) setContents(false); renderPage(); });
    return button;
  }));
  $('#reader-page').classList.toggle('is-paid', !!book);
  setContents(matchMedia('(min-width: 761px)').matches);
  roughPads.refresh();
  openDialog('#reader-dialog'); $('#reader-contents').scrollTop = 0; renderPage();
}
$('#reader-dialog').addEventListener('close', () => {
  ++readerRequest; readerGestures.reset(); resetPageTurn(); roughPads.closeAll(); activeBook = null; $('#reader-page').replaceChildren();
  readerPresentation.close();
});
function navigateReader(direction) {
  if (readerPresentation.locked) return;
  if (turnTimer !== null) return;
  const total = activeBook ? activeBook.pageCount : samples.length;
  const mode = activeBook ? readerMode : 'single';
  const target = turnPage(page, total, mode, direction);
  if (spreadPages(target, total, mode)[0] === visiblePages()[0]) { resetPageTurn(); return; }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  resetPageTurn();
  if (reduced) { page = target; renderPage(); return; }
  const spread = $('#reader-page');
  spread.classList.add('is-turning'); spread.style.setProperty('--turn-x', `${direction * -45}px`); spread.style.setProperty('--turn-angle', `${direction * -7}deg`);
  turnTimer = setTimeout(() => { turnTimer = null; if (!$('#reader-dialog').open) return; page = target; renderPage(); }, 145);
}
const readingViewport = $('#page-viewport');
const readerGestures = bindReaderGestures(readingViewport, {
  enabled: () => $('#reader-dialog').open && zoom === 1 && !readerPresentation.locked,
  onTurn: navigateReader,
  onReset: () => { if (turnTimer === null) resetPageTurn(); },
  onDrag: dx => {
    if (turnTimer !== null) return;
    const spread = $('#reader-page'); spread.classList.add('is-dragging');
    spread.style.setProperty('--turn-x', `${Math.max(-100, Math.min(100, dx * .35))}px`);
    spread.style.setProperty('--turn-angle', `${Math.max(-7, Math.min(7, dx * .025))}deg`);
  }
});
$('#prev-page').addEventListener('click', () => navigateReader(-1));
$('#next-page').addEventListener('click', () => navigateReader(1));
$('#jump-prev').addEventListener('click', () => navigateReader(-1));
$('#jump-next').addEventListener('click', () => navigateReader(1));
$('#zoom-in').addEventListener('click', () => { zoom = Math.min(3, zoom + .25); applyZoom(); });
$('#zoom-out').addEventListener('click', () => { zoom = Math.max(1, zoom - .25); applyZoom(); });
$('#reset-zoom').addEventListener('click', () => { zoom = 1; applyZoom(); $('#page-viewport').scrollTop = 0; $('#page-viewport').scrollLeft = 0; });
$('#reader-view').addEventListener('change', event => { readerMode = event.target.value; modeChosen = true; zoom = 1; renderPage(); });
$('#toggle-contents').addEventListener('click', () => setContents($('#reader-dialog').classList.contains('contents-hidden')));
$('#reader-jump').addEventListener('submit', event => { event.preventDefault(); if (readerPresentation.locked) return; if (!$('#reader-jump').reportValidity()) return; page = Number($('#jump-page').value) - 1; zoom = 1; renderPage(); });
// Discourage ordinary copying of rendered pages; this is not screenshot protection.
for (const type of ['contextmenu', 'dragstart', 'selectstart', 'copy', 'cut']) {
  $('#page-viewport').addEventListener(type, event => event.preventDefault());
}
$('#reader-dialog').addEventListener('copy', event => {
  if (!event.target.closest('input, textarea')) event.preventDefault();
});
$('#reader-dialog').addEventListener('keydown', event => {
  if (event.target.closest('button, input, textarea, select, a, .reader-sidebar, .rough-pad')) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); navigateReader(event.key === 'ArrowRight' ? 1 : -1); }
});
new ResizeObserver(() => { if ($('#reader-dialog').open) applyZoom(); }).observe($('#page-viewport'));
window.addEventListener('resize', () => {
  if (!$('#reader-dialog').open) return;
  if (activeBook && !modeChosen) {
    const next = matchMedia('(min-width: 900px)').matches ? 'spread' : 'single';
    if (next !== readerMode) { readerMode = next; $('#reader-view').value = next; renderPage(); }
  }
});
function emptyLibrary(title, description, action, text) {
  $('#library-content').innerHTML = '<div class="empty-library-icon" aria-hidden="true">▤</div><h2></h2><p></p><button class="button"></button>';
  $('#library-content h2').textContent = title; $('#library-content p').textContent = description;
  const button = $('#library-content button'); button.dataset.action = action; button.textContent = text;
}
function renderProfileSummary() {
  const container = $('#profile-summary');
  container.hidden = !currentUser;
  if (!currentUser) { container.replaceChildren(); return; }
  container.replaceChildren();
  const text = document.createElement('span');
  text.textContent = currentProfile && profileOwner === currentUser.uid ? `${currentProfile.name} · +91 ${currentProfile.phone}` : 'Add your name and mobile number to complete your profile.';
  const button = document.createElement('button'); button.className = 'inline-button'; button.dataset.action = 'profile'; button.textContent = currentProfile ? 'Edit profile' : 'Complete profile';
  container.append(text, button);
}
async function loadProfile(force = false) {
  const user = currentUser;
  if (profileOwner !== user?.uid) { currentProfile = null; profileOwner = null; }
  if (!user || !config.profileEnabled) { renderProfileSummary(); return null; }
  if (!force && currentProfile && profileOwner === user.uid) return currentProfile;
  const requestId = ++profileRequest;
  try {
    const result = await api('profile');
    if (currentUser?.uid !== user.uid || requestId !== profileRequest) return null;
    currentProfile = result.profile; profileOwner = user.uid; renderProfileSummary();
    return currentProfile;
  } catch { return null; }
}
async function saveProfileDetails(details) {
  const uid = currentUser?.uid;
  if (!uid || !config.profileEnabled) throw new Error('Profile saving is temporarily unavailable. Please try again shortly.');
  const result = await api('profile', { method: 'POST', body: JSON.stringify({ ...details, consent: true }) });
  if (currentUser?.uid !== uid) throw new Error('Your account changed. Please sign in and try again.');
  ++profileRequest; currentProfile = result.profile; profileOwner = uid; signupDraft = null; renderProfileSummary();
  return currentProfile;
}
async function openProfile() {
  if (!currentUser) { openDialog('#login-dialog'); return; }
  if ($('#checkout-dialog').open) $('#checkout-dialog').close();
  await loadProfile();
  if (!currentUser) return;
  const draft = signupDraft?.email === currentUser.email ? signupDraft : null;
  $('#profile-email').value = currentUser.email || '';
  $('#profile-name').value = currentProfile?.name || draft?.name || currentUser.displayName || '';
  $('#profile-phone').value = currentProfile?.phone || draft?.phone || '';
  $('#profile-consent').checked = false;
  $('#profile-title').textContent = currentProfile ? 'Your profile.' : 'Complete your profile.';
  $('#profile-status').textContent = config.profileEnabled ? 'These details will be saved privately to your account. Changes apply to future purchases.' : 'Profile saving will be available shortly. You can already use your account to sign in.';
  $('#save-profile').disabled = !config.profileEnabled;
  openDialog('#profile-dialog');
}
$('#profile-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!currentUser || !$('#profile-form').reportValidity()) return;
  $('#save-profile').disabled = true;
  try {
    const details = profileInput($('#profile-name').value, $('#profile-phone').value);
    await saveProfileDetails(details);
    // Display name is a convenience; the private profile remains authoritative.
    try { await authSDK.updateProfile(currentUser, { displayName: details.name }); } catch { /* A retry is not needed for a saved private profile. */ }
    $('#profile-dialog').close(); notify('Your name and mobile number have been saved.');
    if (location.hash === '#library') showLibrary();
  } catch (error) { $('#profile-status').textContent = error.message || 'Your profile could not be saved. Please try again.'; }
  finally { $('#save-profile').disabled = !config.profileEnabled; }
});
$('#profile-dialog').addEventListener('close', () => { $('#profile-form').reset(); });
async function showLibrary() {
  $('#logout-button').hidden = !currentUser;
  $('#profile-button').hidden = !currentUser;
  renderProfileSummary();
  if (!currentUser) { emptyLibrary('Your bookshelf starts here.', config.authEnabled ? 'Sign in with the same account you use at checkout to find your purchased books.' : 'Online reading and checkout setup are in progress.', 'login', config.authEnabled ? 'Sign in to My Books →' : 'View sign-in options →'); return; }
  if (!currentUser.emailVerified) { emptyLibrary('Verify your email first.', 'Open the verification email in your inbox, then return here to continue. You can resend it from your account screen.', 'login', 'Verify my email →'); return; }
  $('#library-content').textContent = 'Loading your bookshelf…';
  const userAtRequest = currentUser.uid;
  try {
    const data = await api('library'); if (currentUser?.uid !== userAtRequest) return;
    if (!data.books.length) { emptyLibrary('Your next chapter is on its way.', 'You have no purchased books yet. Explore the complete Class 10 Mathematics edition and its selected sample pages.', 'home', 'Explore the store →'); return; }
    $('#library-content').replaceChildren(...data.books.map(book => {
      const article = document.createElement('article'); article.className = 'owned-book';
      const image = new Image(); image.src = '/assets/maths-cover.webp'; image.alt = book.title;
      const copy = document.createElement('div'); const h3 = document.createElement('h3'); h3.textContent = book.title;
      const expiry = document.createElement('p'); expiry.textContent = `${book.active ? 'Access until' : 'Access ended'} ${new Date(book.expiresAt * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      const button = document.createElement('button'); button.className = 'button button-small'; button.textContent = book.active ? 'Continue reading →' : 'Access expired'; button.disabled = !book.active; button.addEventListener('click', () => startReader(book));
      copy.append(h3, expiry, button); article.append(image, copy); return article;
    }));
  } catch (error) { emptyLibrary('Your bookshelf could not be loaded.', error.message, 'library', 'Try again →'); $('#library-content button').addEventListener('click', showLibrary); }
}
function route() {
  const library = location.hash === '#library'; $('#store-view').hidden = library; $('#library-view').hidden = !library;
  if (library) { showLibrary(); window.scrollTo(0, 0); }
  else if (location.hash) { requestAnimationFrame(() => { const target = document.getElementById(location.hash.slice(1)); if (target) target.scrollIntoView({ behavior: 'instant' }); }); }
}
window.addEventListener('hashchange', route); route();
function clearLoginError() {
  $('#email-login-error').hidden = true; $('#email-login-error').textContent = '';
  $('#login-status').classList.remove('is-error');
  if (auth) $('#login-status').textContent = 'Choose Google or sign in with your email and password.';
  $('#login-email').removeAttribute('aria-invalid'); $('#login-password').removeAttribute('aria-invalid');
}
function showLoginError(error, fields = false) {
  const message = authMessage(error);
  $('#login-status').textContent = message; $('#login-status').classList.add('is-error');
  if (fields) {
    const inline = $('#email-login-error'); inline.textContent = message; inline.hidden = false;
    if (['auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/user-not-found', 'auth/wrong-password'].includes(error?.code)) {
      $('#login-email').setAttribute('aria-invalid', 'true'); $('#login-password').setAttribute('aria-invalid', 'true');
    }
    inline.scrollIntoView({ block: 'nearest' });
  } else $('#login-status').scrollIntoView({ block: 'nearest' });
}
function setAuthBusy(busy) {
  authBusy = busy;
  ['google-login', 'login-email', 'login-password', 'email-login', 'forgot-password', 'show-password'].forEach(id => { $('#' + id).disabled = busy || !auth; });
  $$('[data-auth-mode]').forEach(button => { button.disabled = busy || !auth; });
  ['signup-name', 'signup-phone', 'signup-consent'].forEach(id => { $('#' + id).disabled = busy || !auth || loginMode !== 'signup'; });
}
function renderAuthState() {
  const unverified = !!currentUser && !currentUser.emailVerified;
  $('#auth-entry').hidden = unverified;
  $('#email-verification').hidden = !unverified;
  if (unverified) {
    $('#verification-description').textContent = `Verify ${currentUser.email} using the email in your inbox or spam folder, then return here.`;
    $('#login-status').textContent = 'Email verification is required before you can purchase or read a book.';
  } else if (auth && !authBusy && $('#email-login-error').hidden && !$('#login-status').classList.contains('is-error')) {
    $('#login-status').textContent = 'Choose Google or sign in with your email and password.';
  }
}
function setLoginMode(mode) {
  if (authBusy) return;
  loginMode = mode; clearLoginError();
  $$('[data-auth-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.authMode === mode)));
  const signup = mode === 'signup';
  $('#signup-details').hidden = !signup;
  $('#signup-consent-label').hidden = !signup;
  ['signup-name', 'signup-phone', 'signup-consent'].forEach(id => { $('#' + id).required = signup; $('#' + id).disabled = !signup || !auth; });
  $('#login-password').value = '';
  $('#login-password').type = 'password';
  $('#login-password').autocomplete = signup ? 'new-password' : 'current-password';
  $('#login-password').minLength = signup ? 8 : 1;
  $('#login-password').placeholder = signup ? 'Create a password (8+ characters)' : 'Your password';
  $('#password-hint').hidden = !signup;
  $('#forgot-password').hidden = signup;
  $('#email-login').textContent = signup ? 'Create my account →' : 'Sign in with email →';
  $('#show-password').textContent = 'Show';
  $('#show-password').setAttribute('aria-pressed', 'false');
  $('#show-password').setAttribute('aria-label', 'Show password');
}
$$('[data-auth-mode]').forEach(button => button.addEventListener('click', () => setLoginMode(button.dataset.authMode)));
$('#show-password').addEventListener('click', () => {
  const shown = $('#login-password').type === 'password';
  $('#login-password').type = shown ? 'text' : 'password';
  $('#show-password').textContent = shown ? 'Hide' : 'Show';
  $('#show-password').setAttribute('aria-pressed', String(shown));
  $('#show-password').setAttribute('aria-label', shown ? 'Hide password' : 'Show password');
});
$('#login-dialog').addEventListener('close', () => { $('#login-password').value = ''; $('#login-password').type = 'password'; $('#show-password').textContent = 'Show'; $('#show-password').setAttribute('aria-pressed', 'false'); $('#show-password').setAttribute('aria-label', 'Show password'); });
async function continueToBooks() { $('#login-dialog').close(); if (location.hash === '#library') showLibrary(); else location.hash = 'library'; await loadProfile(); if (!currentProfile && currentUser && config.profileEnabled) await openProfile(); }
$('#google-login').addEventListener('click', async () => {
  if (!auth || authBusy) return; clearLoginError(); setAuthBusy(true);
  try { const result = await authSDK.signInWithPopup(auth, new authSDK.GoogleAuthProvider()); currentUser = result.user; renderAuthState(); if (currentUser.emailVerified) continueToBooks(); }
  catch (error) { showLoginError(error); }
  finally { setAuthBusy(false); }
});
$('#email-login-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!auth || authBusy) return;
  if (!$('#email-login-form').reportValidity()) return;
  clearLoginError();
  const email = $('#login-email').value.trim();
  if (loginMode === 'signup') {
    if (!config.profileEnabled) { $('#login-status').textContent = 'Account registration is being prepared. Please try again shortly. Existing users can sign in.'; return; }
    try { signupDraft = { ...profileInput($('#signup-name').value, $('#signup-phone').value), email }; }
    catch (error) { $('#login-status').textContent = error.message; return; }
  }
  setAuthBusy(true);
  $('#login-status').textContent = loginMode === 'signup' ? 'Creating your account…' : 'Signing in…';
  try {
    const result = await emailAuthentication(authSDK, auth, loginMode, email, $('#login-password').value, location.origin + '/#library');
    $('#login-password').value = '';
    currentUser = result.user;
    let profileError = null;
    if (loginMode === 'signup' && signupDraft?.email === email) {
      try { const details = { name: signupDraft.name, phone: signupDraft.phone }; await saveProfileDetails(details); try { await authSDK.updateProfile(currentUser, { displayName: details.name }); } catch { /* Private profile is saved. */ } }
      catch (error) { profileError = error.message; }
    }
    renderAuthState();
    if (result.verificationSent) { verificationSentAt = Date.now(); $('#login-status').textContent = 'Verification email sent. Open it, verify your email, then return here.'; }
    else if (!currentUser.emailVerified && loginMode === 'signup') $('#login-status').textContent = 'Your account was created. Use Resend verification email to verify your address.';
    if (profileError) $('#login-status').textContent = 'Your account was created, but your profile could not be saved. After signing in, open My profile to complete it.';
    if (currentUser.emailVerified) continueToBooks();
  } catch (error) { showLoginError(error, true); }
  finally { setAuthBusy(false); }
});
$('#forgot-password').addEventListener('click', async () => {
  if (!auth || authBusy) return;
  if (!$('#login-email').reportValidity()) return;
  setAuthBusy(true);
  try { $('#login-status').textContent = await passwordReset(authSDK, auth, $('#login-email').value.trim(), location.origin + '/#library'); }
  catch (error) { showLoginError(error); }
  finally { setAuthBusy(false); }
});
$('#resend-verification').addEventListener('click', async () => {
  if (!auth?.currentUser || auth.currentUser.emailVerified) return;
  if (Date.now() - verificationSentAt < 60000) { $('#login-status').textContent = 'An email was just sent. Please wait a minute before requesting another.'; return; }
  $('#resend-verification').disabled = true;
  try { await authSDK.sendEmailVerification(auth.currentUser, { url: location.origin + '/#library' }); verificationSentAt = Date.now(); $('#login-status').textContent = 'Verification email sent. Check your inbox and spam folder.'; }
  catch (error) { showLoginError(error); }
  finally { $('#resend-verification').disabled = false; }
});
$('#check-verification').addEventListener('click', async () => {
  if (!auth?.currentUser) return; $('#check-verification').disabled = true;
  try {
    await auth.currentUser.reload();
    currentUser = auth.currentUser;
    if (!currentUser.emailVerified) { $('#login-status').textContent = 'Your email is not verified yet. Open the verification email first, then try again.'; return; }
    await currentUser.getIdToken(true);
    renderAuthState(); continueToBooks();
  } catch (error) { showLoginError(error); }
  finally { $('#check-verification').disabled = false; }
});
function loadScript(src) { return new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = reject; document.head.append(script); }); }
$('#checkout-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!config.checkoutEnabled || !currentUser) { $('#checkout-status').textContent = 'Purchases are not open yet.'; return; }
  if (config.liveTest && !window.confirm('This is a LIVE payment test. Real money will be charged: ₹199, or ₹149 with TOPPERS50. Continue?')) return;
  const button = $('#pay-button'); button.disabled = true; $('#checkout-status').textContent = 'Preparing your order…';
  try {
    const order = await api('orders', { method: 'POST', body: JSON.stringify({ bookId: 'cbse10-maths-standard', name: $('#buyer-name').value.trim(), phone: $('#buyer-phone').value.trim(), coupon: $('#coupon').value.trim(), consent: $('#purchase-consent').checked }) });
    if (!window.Razorpay) await loadScript('https://checkout.razorpay.com/v1/checkout.js');
    const checkout = new window.Razorpay({ key: order.keyId, order_id: order.orderId, amount: order.amount, currency: 'INR', name: 'GUPTA ENTERPRISES', description: 'Toppers Books · 365-day online access', prefill: { name: $('#buyer-name').value.trim(), email: currentUser.email, contact: $('#buyer-phone').value.trim() }, theme: { color: '#6040b8' }, modal: { ondismiss: () => { button.disabled = false; $('#checkout-status').textContent = 'Checkout closed. If you paid, check My Books before trying again.'; setTimeout(() => { if (currentUser) openDialog('#checkout-dialog'); }, 0); } }, handler: async result => {
      try { await api('verify', { method: 'POST', body: JSON.stringify(result) }); $('#checkout-dialog').close(); location.hash = 'library'; showLibrary(); notify('Payment verified. Your book is ready in My Books.'); }
      catch (error) { $('#checkout-status').textContent = error.message; notify(error.message); }
      finally { button.disabled = false; }
    } }); checkout.on('payment.failed', () => { $('#checkout-status').textContent = 'Payment was not completed. If money was deducted, contact support with the payment reference.'; button.disabled = false; });
    // Native modal dialogs sit above provider overlays regardless of z-index.
    $('#checkout-dialog').close();
    checkout.open();
  } catch (error) { $('#checkout-status').textContent = error.message; button.disabled = false; if (currentUser) openDialog('#checkout-dialog'); }
});
$('#coupon').addEventListener('input', () => { const code = $('#coupon').value.trim().toUpperCase(); $('#checkout-total').textContent = code === 'TOPPERS50' ? '₹199 − ₹50 = ₹149 · 365-day online access' : code ? 'Coupon will be validated before payment.' : '₹199 · Apply TOPPERS50 for ₹149'; });
let checkoutRequest = 0;
function renderCheckout() {
  const existing = $('#purchase-button');
  if (!config.checkoutEnabled) { existing?.remove(); return; }
  if (!existing) {
    const buy = document.createElement('button'); buy.id = 'purchase-button'; buy.className = 'button button-outline'; buy.dataset.action = 'checkout'; $('.product-actions').append(buy);
  }
  $('#purchase-button').textContent = config.liveTest ? 'Test live payment →' : 'Buy online access →';
}
async function refreshCheckout(user) {
  const attempt = ++checkoutRequest;
  config.checkoutEnabled = config.salesOpen; config.liveTest = false; renderCheckout();
  if (!user || !user.emailVerified) return;
  try {
    const updated = await api('config');
    if (attempt !== checkoutRequest || currentUser?.uid !== user.uid) return;
    config = updated; renderCheckout();
  } catch { /* Restricted checkout stays closed if verification fails. */ }
}
async function initialise() {
  try { config = await api('config'); } catch { $('#login-status').textContent = 'Sign-in could not be loaded. Please refresh or contact support.'; return; }
  if (config.authEnabled && config.firebase) {
    try {
      const [app, sdk] = await Promise.all([import('https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js'), import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js')]);
      authSDK = sdk; auth = sdk.getAuth(app.initializeApp(config.firebase));
      auth.languageCode = 'en';
      setLoginMode('signin'); setAuthBusy(false);
      $('#login-status').textContent = 'Choose Google or sign in with your email and password.';
      sdk.onAuthStateChanged(auth, user => {
        const previousUid = currentUser?.uid;
        currentUser = user;
        refreshCheckout(user);
        $('#account-button').textContent = user ? 'My account ↗' : 'Sign in ↗';
        if (previousUid !== user?.uid) { if (activeBook && $('#reader-dialog').open) $('#reader-dialog').close(); verificationSentAt = 0; ++profileRequest; currentProfile = null; profileOwner = null; }
        renderAuthState();
        if (location.hash === '#library') showLibrary();
        if (user) loadProfile();
        else renderProfileSummary();
      });
      if (location.hash === '#library') showLibrary();
    } catch { $('#login-status').textContent = 'Sign-in is temporarily unavailable. Please try again later.'; }
  }
  renderCheckout();
}
initialise();
