/* Seven Sisters Conservatoire — floating "Buy us a coffee or tea" button.
   Included on every page except /pay/. Appears after the visitor scrolls a little
   (or after a few seconds), sits bottom-left so it never covers the home page's
   "Sponsor Us!" button (bottom-right), and can be dismissed for 7 days. */
(function () {
  if (/^\/pay(\/|$)/.test(location.pathname)) return;

  var KEY = 'ssc-coffee-dismissed';
  var WEEK = 7 * 24 * 60 * 60 * 1000;
  try {
    var t = parseInt(localStorage.getItem(KEY) || '0', 10);
    if (t && Date.now() - t < WEEK) return;
  } catch (e) {}

  var css = '' +
    '.ssc-cf{position:fixed;left:20px;bottom:24px;z-index:9997;display:flex;align-items:center;gap:2px;' +
    'background:#1C3760;color:#FAF5EC;border-radius:999px;box-shadow:0 8px 28px rgba(22,44,77,.32);' +
    'font-family:"Noto Sans Assamese",system-ui,sans-serif;opacity:0;transform:translateY(16px);' +
    'transition:opacity .35s ease,transform .35s ease;pointer-events:none}' +
    '.ssc-cf.on{opacity:1;transform:none;pointer-events:auto}' +
    '.ssc-cf a{display:flex;align-items:center;gap:9px;color:inherit;text-decoration:none;font-weight:700;' +
    'font-size:14px;letter-spacing:.02em;padding:11px 6px 11px 16px}' +
    '.ssc-cf a:hover .ssc-cf-txt{text-decoration:underline;text-underline-offset:3px}' +
    '.ssc-cf .cup{font-size:18px;line-height:1}' +
    '.ssc-cf button{background:none;border:0;color:#AFC2DC;font-size:18px;line-height:1;cursor:pointer;' +
    'padding:10px 14px 10px 6px;border-radius:999px}' +
    '.ssc-cf button:hover{color:#fff}' +
    '.ssc-cf :focus-visible{outline:2px solid #D0A33C;outline-offset:2px}' +
    '.ssc-cf-as{display:none}.ssc-cf-short{display:none}' +
    'html[data-lang="as"] .ssc-cf-as{display:inline}html[data-lang="as"] .ssc-cf-en{display:none}' +
    '@media(max-width:600px){.ssc-cf{left:12px;bottom:16px}.ssc-cf a{font-size:13px;padding:10px 2px 10px 13px}.ssc-cf button{padding:9px 11px 9px 4px}.ssc-cf-long{display:none}.ssc-cf-short{display:inline}}' +
    '@media(max-width:420px){.ssc-cf.stack{bottom:78px}}' +
    '@media(prefers-reduced-motion:reduce){.ssc-cf{transition:none}}' +
    '@media print{.ssc-cf{display:none}}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var el = document.createElement('div');
  el.className = 'ssc-cf';
  el.innerHTML =
    '<a href="/pay/" aria-label="Buy us a coffee or tea">' +
      '<span class="cup" aria-hidden="true">&#9749;</span>' +
      '<span class="ssc-cf-txt"><span class="ssc-cf-en"><span class="ssc-cf-long">Buy us a </span><span class="ssc-cf-short">C</span><span class="ssc-cf-long">c</span>offee or tea<span class="ssc-cf-short">?</span></span>' +
      '<span class="ssc-cf-as">কফি বা চাহ খুৱাওক</span></span>' +
    '</a>' +
    '<button type="button" aria-label="Hide this button">&times;</button>';

  function show() { el.classList.add('on'); cleanup(); }
  function onScroll() { if (window.scrollY > 300) show(); }
  var timer;
  function cleanup() { window.removeEventListener('scroll', onScroll); clearTimeout(timer); }

  el.querySelector('button').addEventListener('click', function () {
    el.classList.remove('on');
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
    setTimeout(function () { el.remove(); }, 400);
  });

  function mount() {
    if (document.querySelector('.donate-float')) el.classList.add('stack');
    document.body.appendChild(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    timer = setTimeout(show, 6000);
    onScroll();
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
