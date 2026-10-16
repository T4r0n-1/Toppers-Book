import { authMessage, emailAuthentication, passwordReset } from './auth-helpers.js';
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const chapters = ['Real Numbers', 'Polynomials', 'Pair of Linear Equations in Two Variables', 'Quadratic Equations', 'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Introduction to Trigonometry', 'Some Applications of Trigonometry', 'Circles', 'Areas Related to Circles', 'Surface Areas and Volumes', 'Statistics', 'Probability'];
const support = '<a href="mailto:codetoppers@gmail.com">codetoppers@gmail.com</a> · <a href="tel:+918384871987">+91 83848 71987</a>';
const operator = '<p><strong>Toppers Books is operated by GUPTA ENTERPRISES.</strong><br>Tajganj, Agra, Uttar Pradesh – 282001, India.<br>' + support + '</p>';
const policies = {
  terms: { title: 'Terms & conditions', body: `${operator}<h3>Our digital books</h3><p>Toppers Books offers independent educational resources. We are not affiliated with or endorsed by CBSE. The current Mathematics book is in preparation; no advance payments are accepted.</p><h3>Purchase and personal access</h3><p>Once sales open, the book page will state the final contents, price and access period. A purchase provides a personal, non-transferable licence to read the purchased book online for 365 days from verified payment. It does not transfer copyright or provide a downloadable PDF. Access does not automatically renew.</p><h3>Your account and watermark</h3><p>Use accurate account and checkout details. Purchased reading pages are personalised with the reader name and mobile number provided at checkout. Do not share your account, copy, resell, publish or redistribute book content. Access may be restricted for misuse; contact support if you believe a restriction is incorrect.</p><h3>Availability and support</h3><p>An internet connection and a supported modern browser are required. Temporary interruptions can occur. Contact us about access problems, content errors or corrections. Educational resources support study and do not guarantee any exam result.</p><h3>Payments and policies</h3><p>Payments will be processed through Razorpay when checkout opens. Coupon eligibility and the final total will be displayed before payment. Our Privacy, Digital Access, and Refunds & Cancellations policies also apply. Nothing in these terms excludes applicable statutory rights.</p>` },
  privacy: { title: 'Privacy policy', body: `${operator}<h3>Information we use</h3><p>When you create an account or make a purchase, we use your sign-in email and identifier, reader name, mobile number, purchase and payment references, and access expiry to provide your account and purchased books. Google sign-in may also provide your profile name and picture. We use browser storage to keep sign-in state and your reading position.</p><h3>Personalised reading pages</h3><p>Your name and mobile number will appear in a watermark on your purchased reading pages to discourage redistribution. This will be disclosed before payment. Sharing a screenshot can reveal these details, so keep your reading pages private.</p><h3>Service providers</h3><p>We use Cloudflare for hosting and protected content. Firebase Authentication handles Google and email/password sign-in. Passwords are handled by Firebase; we do not store them in our own database. Razorpay will process payments when checkout opens. These providers process information under their own policies. We do not store card numbers, CVV or UPI PINs.</p><h3>Retention and your requests</h3><p>We retain account and purchase information as needed to provide access, resolve issues and meet applicable record-keeping requirements. Contact us to request correction or deletion. Some transaction records may need to be retained even after account deletion. We do not sell your personal information.</p><h3>Students and parents</h3><p>If you are under 18, ask a parent or guardian to manage the purchase and provide appropriate account and contact details.</p><h3>Contact</h3><p>For privacy questions or requests, email codetoppers@gmail.com.</p>` },
  refunds: { title: 'Refunds & cancellations', body: `${operator}<h3>Current launch status</h3><p>The complete book is being prepared. Checkout is closed and no advance payment is required.</p><h3>After sales open</h3><p>Please check the book description, sample, online-only format and 365-day access period before paying. If you experience a duplicate payment, a payment without book access, a wrong product delivery or a material mismatch with the description, contact us with the order ID and issue details.</p><h3>Review and resolution</h3><p>We will review the transaction and work to restore the correct access or provide an appropriate refund. Requests based only on a change of mind after access has been provided will be reviewed individually. This policy does not limit rights available under applicable law.</p><h3>Cancellations and refunds</h3><p>Unpaid orders can be abandoned without a charge. For a paid order, contact support to request cancellation or a refund. Approved refunds are returned through the original payment method; bank and payment-provider processing times apply. Access associated with a fully refunded purchase will end.</p><h3>How to contact us</h3><p>Email codetoppers@gmail.com or WhatsApp +91 83848 71987. Never send your card details, CVV, UPI PIN or OTP.</p>` },
  delivery: { title: 'Digital access policy', body: `${operator}<h3>No physical delivery</h3><p>This is an online reading product. No printed book is shipped and no PDF download, print or offline access is included.</p><h3>When access begins</h3><p>After sales open, access will be granted to the signed-in buyer only after the backend verifies a captured payment. Closing a checkout window or seeing a payment screenshot does not by itself establish a purchase.</p><h3>Your reading period</h3><p>Purchased access lasts 365 days from verified successful payment. The expiry date will be shown in My Books. Sign in with the same account used for purchase. There is no automatic renewal.</p><h3>Personalisation and devices</h3><p>Reading pages carry the reader name and mobile number provided at checkout. Use a modern browser on your phone, tablet or computer and maintain an internet connection. Access is for the purchasing account only.</p><h3>If a payment is pending or access is missing</h3><p>Check My Books after signing in. If payment was deducted but the book remains unavailable, contact support with your order/payment reference. Avoid repeatedly paying for the same book while an earlier payment is being checked.</p>` }
};
const samples = [
  { title: 'The essentials', subtitle: 'Real Numbers · concept recap', html: '<div class="sheet-kicker">TOPPERS BOOKS / READER DEMO</div><div class="sheet-label">01 · REAL NUMBERS</div><h3>Start with the<br>bigger picture.</h3><p>Every composite number can be expressed as a product of primes. This factorisation is unique, apart from the order of the factors.</p><div class="formula-box"><p class="sheet-label">AN EXAMPLE</p><p class="math-line">60 = 2² × 3 × 5</p><p>Break a number down into prime factors to compare it with another number.</p></div><p>Use the smallest shared prime powers for the HCF, and the largest prime powers present for the LCM.</p><div class="sheet-footer">ILLUSTRATIVE CONTENT · NOT A PYQ · 01</div>' },
  { title: 'Put it into practice', subtitle: 'Real Numbers · worked example', html: '<div class="sheet-kicker">TOPPERS BOOKS / READER DEMO</div><div class="sheet-label">02 · WORKED EXAMPLE</div><h3>A question.<br>A clear next step.</h3><p><strong>Q.</strong> Find the HCF and LCM of 36 and 60 by prime factorisation.</p><div class="formula-box"><p class="math-line">36 = 2² × 3²<br>60 = 2² × 3 × 5</p></div><p>For the HCF, select common primes with their smallest powers:</p><p class="math-line">HCF = 2² × 3 = 12</p><p>For the LCM, select all primes with their largest powers:</p><p class="math-line">LCM = 2² × 3² × 5 = 180</p><p class="sample-note">Check: 12 × 180 = 36 × 60 = 2160.</p><div class="sheet-footer">ORIGINAL PRACTICE EXAMPLE · NOT A PYQ · 02</div>' },
  { title: 'Check your understanding', subtitle: 'Real Numbers · quick practice', html: '<div class="sheet-kicker">TOPPERS BOOKS / READER DEMO</div><div class="sheet-label">03 · TRY IT YOURSELF</div><h3>One more question.<br>A little more confidence.</h3><p><strong>Q.</strong> Two positive integers have HCF 6 and LCM 72. If one integer is 18, find the other.</p><div class="formula-box"><p class="sheet-label">THE RELATION YOU NEED</p><p class="math-line">HCF × LCM = a × b</p></div><p>Let the other integer be b.</p><p class="math-line">6 × 72 = 18 × b<br>b = 432 ÷ 18 = 24</p><p class="sample-note">Check: the HCF of 18 and 24 is 6, and their LCM is 72.</p><div class="sheet-footer">ORIGINAL PRACTICE EXAMPLE · NOT A PYQ · 03</div>' }
];
let config = { authEnabled: false, salesOpen: false };
let auth, authSDK, currentUser = null, activeBook = null, page = 0, zoom = 1, toastTimer, readerRequest = 0;
let loginMode = 'signin', authBusy = false, verificationSentAt = 0;
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
  if (action === 'logout' && auth) { await authSDK.signOut(auth); notify('You have signed out.'); }
  if (action === 'checkout') { if (!currentUser?.emailVerified) openDialog('#login-dialog'); else openDialog('#checkout-dialog'); }
});
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); }));
function resumeKey() { return activeBook && currentUser ? `toppers-reader:${currentUser.uid}:${activeBook.bookId}` : 'toppers-demo-page'; }
function applyZoom() { $('#reader-page').style.transform = `scale(${zoom})`; $('#reader-page').style.marginBottom = zoom > 1 ? `${(zoom - 1) * $('#reader-page').offsetHeight}px` : '0px'; $('#zoom-label').textContent = Math.round(zoom * 100) + '%'; $('#zoom-out').disabled = zoom <= .75; $('#zoom-in').disabled = zoom >= 1.75; }
async function renderPage() {
  const request = ++readerRequest;
  const total = activeBook ? activeBook.pageCount : samples.length;
  page = Math.max(0, Math.min(page, total - 1));
  $('#page-label').textContent = `${page + 1} / ${total}`;
  $('#prev-page').disabled = page === 0; $('#next-page').disabled = page === total - 1;
  $$('#reader-contents button').forEach(button => button.classList.toggle('active', Number(button.dataset.page) === page));
  if (!activeBook) { $('#reader-page').innerHTML = `<article class="sample-sheet">${samples[page].html}<div class="sample-watermark" aria-hidden="true">TOPPERS BOOKS · READER PREVIEW</div></article>`; }
  else {
    $('#reader-page').textContent = 'Loading your reading page…';
    try { const data = await api(`read/${encodeURIComponent(activeBook.bookId)}/${page + 1}`); if (request !== readerRequest) return; const image = new Image(); image.alt = `${activeBook.title}, page ${page + 1}, personalised reading copy`; image.className = 'paid-page'; image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data.svg); $('#reader-page').replaceChildren(image); }
    catch (error) { if (request !== readerRequest) return; $('#reader-page').textContent = error.message; }
  }
  safeStorage('set', resumeKey(), String(page)); $('#page-viewport').scrollTop = 0; applyZoom();
}
function startReader(book = null) {
  activeBook = book; zoom = 1; page = Math.max(0, Number(safeStorage('get', resumeKey())) || 0);
  $('#reader-title').textContent = book ? book.title : 'A little preview of your study space.';
  $('#reader-kicker').textContent = book ? 'YOUR PERSONALISED READING COPY' : 'ILLUSTRATIVE READER DEMO';
  $('#reader-disclaimer').textContent = book ? 'Your purchased pages are personalised. Please keep your account and reading copy private.' : 'These original example pages demonstrate the reader. They are not verified PYQs or final book pages.';
  const contents = book ? book.chapters : samples.map((s, i) => ({ title: s.title, subtitle: s.subtitle, page: i + 1 }));
  $('#reader-contents').replaceChildren(...contents.map(entry => { const button = document.createElement('button'); button.textContent = entry.title; button.dataset.page = entry.page - 1; const subtitle = document.createElement('span'); subtitle.textContent = entry.subtitle || `Page ${entry.page}`; button.append(subtitle); button.addEventListener('click', () => { page = entry.page - 1; renderPage(); }); return button; }));
  openDialog('#reader-dialog'); renderPage();
}
$('#reader-dialog').addEventListener('close', () => { ++readerRequest; activeBook = null; $('#reader-page').replaceChildren(); });
$('#prev-page').addEventListener('click', () => { page--; renderPage(); });
$('#next-page').addEventListener('click', () => { page++; renderPage(); });
$('#zoom-in').addEventListener('click', () => { zoom = Math.min(1.75, zoom + .25); applyZoom(); });
$('#zoom-out').addEventListener('click', () => { zoom = Math.max(.75, zoom - .25); applyZoom(); });
$('#reset-zoom').addEventListener('click', () => { zoom = 1; applyZoom(); });
function emptyLibrary(title, description, action, text) {
  $('#library-content').innerHTML = '<div class="empty-library-icon" aria-hidden="true">▤</div><h2></h2><p></p><button class="button"></button>';
  $('#library-content h2').textContent = title; $('#library-content p').textContent = description;
  const button = $('#library-content button'); button.dataset.action = action; button.textContent = text;
}
async function showLibrary() {
  $('#logout-button').hidden = !currentUser;
  if (!currentUser) { emptyLibrary('Your bookshelf starts here.', config.authEnabled ? 'Sign in with the same account you use at checkout to find your purchased books.' : 'Our first complete book is being prepared. Customer sign-in and your personal bookshelf will open when the store is ready.', 'login', config.authEnabled ? 'Sign in to My Books →' : 'View sign-in options →'); return; }
  if (!currentUser.emailVerified) { emptyLibrary('Verify your email first.', 'Open the verification email in your inbox, then return here to continue. You can resend it from your account screen.', 'login', 'Verify my email →'); return; }
  $('#library-content').textContent = 'Loading your bookshelf…';
  const userAtRequest = currentUser.uid;
  try {
    const data = await api('library'); if (currentUser?.uid !== userAtRequest) return;
    if (!data.books.length) { emptyLibrary('Your next chapter is on its way.', 'You have no purchased books yet. Explore the upcoming complete Class 10 Mathematics book.', 'home', 'Explore the store →'); return; }
    $('#library-content').replaceChildren(...data.books.map(book => {
      const article = document.createElement('article'); article.className = 'owned-book';
      const image = new Image(); image.src = '/assets/maths-cover.svg'; image.alt = book.title;
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
function setAuthBusy(busy) {
  authBusy = busy;
  ['google-login', 'login-email', 'login-password', 'email-login', 'forgot-password', 'show-password'].forEach(id => { $('#' + id).disabled = busy || !auth; });
  $$('[data-auth-mode]').forEach(button => { button.disabled = busy || !auth; });
}
function renderAuthState() {
  const unverified = !!currentUser && !currentUser.emailVerified;
  $('#auth-entry').hidden = unverified;
  $('#email-verification').hidden = !unverified;
  if (unverified) {
    $('#verification-description').textContent = `Verify ${currentUser.email} using the email in your inbox or spam folder, then return here.`;
    $('#login-status').textContent = 'Email verification is required before you can purchase or read a book.';
  } else if (auth && !authBusy) {
    $('#login-status').textContent = 'Choose Google or sign in with your email and password.';
  }
}
function setLoginMode(mode) {
  if (authBusy) return;
  loginMode = mode;
  $$('[data-auth-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.authMode === mode)));
  const signup = mode === 'signup';
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
function continueToBooks() { $('#login-dialog').close(); if (location.hash === '#library') showLibrary(); else location.hash = 'library'; }
$('#google-login').addEventListener('click', async () => {
  if (!auth || authBusy) return; setAuthBusy(true);
  try { const result = await authSDK.signInWithPopup(auth, new authSDK.GoogleAuthProvider()); currentUser = result.user; renderAuthState(); if (currentUser.emailVerified) continueToBooks(); }
  catch (error) { $('#login-status').textContent = authMessage(error); }
  finally { setAuthBusy(false); }
});
$('#email-login-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!auth || authBusy) return;
  if (!$('#email-login-form').reportValidity()) return;
  const email = $('#login-email').value.trim();
  setAuthBusy(true);
  try {
    const result = await emailAuthentication(authSDK, auth, loginMode, email, $('#login-password').value, location.origin + '/#library');
    $('#login-password').value = '';
    currentUser = result.user; renderAuthState();
    if (result.verificationSent) { verificationSentAt = Date.now(); $('#login-status').textContent = 'Verification email sent. Open it, verify your email, then return here.'; }
    else if (!currentUser.emailVerified && loginMode === 'signup') $('#login-status').textContent = 'Your account was created. Use Resend verification email to verify your address.';
    if (currentUser.emailVerified) continueToBooks();
  } catch (error) { $('#login-status').textContent = authMessage(error); }
  finally { setAuthBusy(false); }
});
$('#forgot-password').addEventListener('click', async () => {
  if (!auth || authBusy) return;
  if (!$('#login-email').reportValidity()) return;
  setAuthBusy(true);
  try { $('#login-status').textContent = await passwordReset(authSDK, auth, $('#login-email').value.trim(), location.origin + '/#library'); }
  catch (error) { $('#login-status').textContent = authMessage(error); }
  finally { setAuthBusy(false); }
});
$('#resend-verification').addEventListener('click', async () => {
  if (!auth?.currentUser || auth.currentUser.emailVerified) return;
  if (Date.now() - verificationSentAt < 60000) { $('#login-status').textContent = 'An email was just sent. Please wait a minute before requesting another.'; return; }
  $('#resend-verification').disabled = true;
  try { await authSDK.sendEmailVerification(auth.currentUser, { url: location.origin + '/#library' }); verificationSentAt = Date.now(); $('#login-status').textContent = 'Verification email sent. Check your inbox and spam folder.'; }
  catch (error) { $('#login-status').textContent = authMessage(error); }
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
  } catch (error) { $('#login-status').textContent = authMessage(error); }
  finally { $('#check-verification').disabled = false; }
});
function loadScript(src) { return new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = reject; document.head.append(script); }); }
$('#checkout-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!config.salesOpen || !currentUser) { $('#checkout-status').textContent = 'Purchases are not open yet.'; return; }
  const button = $('#pay-button'); button.disabled = true; $('#checkout-status').textContent = 'Preparing your order…';
  try {
    const order = await api('orders', { method: 'POST', body: JSON.stringify({ bookId: 'cbse10-maths-standard', name: $('#buyer-name').value.trim(), phone: $('#buyer-phone').value.trim(), coupon: $('#coupon').value.trim(), consent: $('#purchase-consent').checked }) });
    if (!window.Razorpay) await loadScript('https://checkout.razorpay.com/v1/checkout.js');
    const checkout = new window.Razorpay({ key: order.keyId, order_id: order.orderId, amount: order.amount, currency: 'INR', name: 'GUPTA ENTERPRISES', description: 'Toppers Books · 365-day online access', prefill: { name: $('#buyer-name').value.trim(), email: currentUser.email, contact: $('#buyer-phone').value.trim() }, theme: { color: '#12395b' }, modal: { ondismiss: () => { button.disabled = false; $('#checkout-status').textContent = 'Checkout closed. If you paid, check My Books before trying again.'; } }, handler: async result => {
      try { await api('verify', { method: 'POST', body: JSON.stringify(result) }); $('#checkout-dialog').close(); location.hash = 'library'; showLibrary(); notify('Payment verified. Your book is ready in My Books.'); }
      catch (error) { $('#checkout-status').textContent = error.message; }
      finally { button.disabled = false; }
    } }); checkout.on('payment.failed', () => { $('#checkout-status').textContent = 'Payment was not completed. If money was deducted, contact support with the payment reference.'; button.disabled = false; }); checkout.open();
  } catch (error) { $('#checkout-status').textContent = error.message; button.disabled = false; }
});
$('#coupon').addEventListener('input', () => { const code = $('#coupon').value.trim().toUpperCase(); $('#checkout-total').textContent = code === 'TOPPERS50' ? '₹199 − ₹50 = ₹149 · 365-day online access' : code ? 'Coupon will be validated before payment.' : '₹199 · Apply TOPPERS50 for ₹149'; });
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
        $('#account-button').textContent = user ? 'My account ↗' : 'Sign in ↗';
        if (previousUid !== user?.uid) verificationSentAt = 0;
        renderAuthState();
        if (location.hash === '#library') showLibrary();
      });
      if (location.hash === '#library') showLibrary();
    } catch { $('#login-status').textContent = 'Sign-in is temporarily unavailable. Please try again later.'; }
  }
  if (config.salesOpen) {
    // A private product readiness flag on the server is also required to create any order.
    $$('.coming-note').forEach(element => { element.textContent = '365-day online access'; });
    const buy = document.createElement('button'); buy.className = 'button button-outline'; buy.dataset.action = 'checkout'; buy.textContent = 'Buy online access →'; $('.product-actions').append(buy);
  }
}
initialise();
