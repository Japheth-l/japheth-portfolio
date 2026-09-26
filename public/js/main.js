const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Terminal: fetch the real /api/me response and type it out ────────────────
const terminal = document.getElementById('terminalText');

async function runTerminal() {
  if (!terminal) return;

  let body;
  try {
    const res = await fetch('/api/me');
    body = JSON.stringify(await res.json(), null, 2);
  } catch {
    body = '{\n  "error": "could not reach /api/me"\n}';
  }

  const lines = [`$ curl ${window.location.origin}/api/me`, '', ...body.split('\n')];

  if (reduceMotion) {
    terminal.textContent = lines.join('\n');
    return;
  }

  for (const line of lines) {
    await typeLine(line);
    terminal.textContent += '\n';
    await wait(line ? 70 : 140);
  }
}

function typeLine(text) {
  return new Promise(resolve => {
    if (!text.length) return resolve();
    let i = 0;
    const interval = setInterval(() => {
      terminal.textContent += text[i++];
      if (i >= text.length) { clearInterval(interval); resolve(); }
    }, 13);
  });
}

const wait = ms => new Promise(r => setTimeout(r, ms));

runTerminal();

// ── Nav: shadow on scroll + active section highlight ─────────────────────────
const nav = document.getElementById('nav');
if (nav) {
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ── Mobile menu ──────────────────────────────────────────────────────────────
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navLinks');
if (navToggle && navMenu) {
  const closeMenu = () => {
    navMenu.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };
  navToggle.addEventListener('click', () => {
    const open = navMenu.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  navMenu.addEventListener('click', event => {
    if (event.target.tagName === 'A') closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
}

const navLinks = [...document.querySelectorAll('.nav__links a')];
const sections = navLinks
  .map(link => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if (sections.length) {
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(section => spy.observe(section));
}

// ── Reveal sections on scroll ────────────────────────────────────────────────
const revealTargets = document.querySelectorAll('.endpoint, .section__head, .about__body, .pkg, .terminal, .terminal-section__copy');
if (!reduceMotion && revealTargets.length) {
  const revealer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });

  revealTargets.forEach(el => {
    el.classList.add('reveal');
    revealer.observe(el);
  });
}

// ── Outbound click tracking (first-party, no third-party scripts) ────────────
document.querySelectorAll('[data-track]').forEach(el => {
  el.addEventListener('click', () => {
    const payload = JSON.stringify({ type: el.dataset.track, label: el.dataset.label || el.textContent.trim() });
    navigator.sendBeacon('/api/analytics/track', new Blob([payload], { type: 'application/json' }));
  });
});

// ── Contact form → POST /api/contact ─────────────────────────────────────────
const form = document.getElementById('contactForm');
const statusEl = document.getElementById('cf-status');
const submitBtn = document.getElementById('cf-submit');

function setStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = 'cf-status ' + (type || '');
}

if (form) {
  form.addEventListener('submit', async event => {
    event.preventDefault();

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      setStatus('Please fill in all fields.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    setStatus('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus(data.message, 'success');
        form.reset();
      } else {
        setStatus(data.errors ? data.errors.join(' · ') : (data.message || 'Something went wrong.'), 'error');
      }
    } catch {
      setStatus('Network error. Email me directly at lamuojapheth@gmail.com', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send message';
    }
  });
}

// ── Copy email button: works for every recruiter, whatever email app they use ──
document.querySelectorAll('[data-copy-email]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const email = btn.dataset.copyEmail;
    try {
      await navigator.clipboard.writeText(email);
      btn.textContent = 'Copied ✓';
    } catch {
      btn.textContent = email; // clipboard blocked: show the address so they can copy it by hand
    }
    setTimeout(() => { btn.textContent = 'Copy email'; }, 2500);
  });
});
