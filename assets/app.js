(() => {
  const nav = document.querySelector('.nav');
  const burger = document.querySelector('.burger');
  burger?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  nav?.addEventListener('click', e => { if (e.target.closest('a')) nav.classList.remove('open'); });

  // reveal on scroll
  const items = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: .12 });
    items.forEach(el => io.observe(el));
  } else items.forEach(el => el.classList.add('in'));

  // lightbox
  const lb = document.getElementById('lb');
  const shots = [...document.querySelectorAll('.gallery button')];
  let cur = 0;
  const show = i => {
    cur = (i + shots.length) % shots.length;
    const img = lb.querySelector('img');
    img.src = shots[cur].dataset.full;
    img.alt = shots[cur].querySelector('img').alt;
  };
  shots.forEach((b, i) => b.addEventListener('click', () => { show(i); lb.showModal(); }));
  lb?.querySelector('.x').addEventListener('click', () => lb.close());
  lb?.querySelector('.prev').addEventListener('click', () => show(cur - 1));
  lb?.querySelector('.next').addEventListener('click', () => show(cur + 1));
  lb?.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  lb?.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });

  // RFQ form -> mailto (static site, no backend)
  const form = document.querySelector('form.rfq');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(form);
    const body = `${f.get('message')}\n\n— ${f.get('name')}${f.get('company') ? ', ' + f.get('company') : ''}\n${f.get('contact')}`;
    location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(form.dataset.subject)}&body=${encodeURIComponent(body)}`;
  });
})();

// ===== v3 additions =====
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // sticky header shadow
  const hdr = document.querySelector('.site-header');
  const onScroll = () => hdr.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // scroll-spy
  const links = [...document.querySelectorAll('.nav a[href^="#"]:not(.cta)')];
  const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { links.forEach(a => a.classList.remove('active')); map.get(e.target.id)?.classList.add('active'); }
    }), { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  // CNC readout: tool moves along the drawn toolpath, DRO shows X/Y/Z
  const svg = document.querySelector('svg.tp');
  if (!svg) return;
  const line = svg.querySelector('.tp-line'), dot = svg.querySelector('.tp-dot');
  const L = line.getTotalLength();
  const out = { x: document.querySelector('[data-ax=x]'), y: document.querySelector('[data-ax=y]'), z: document.querySelector('[data-ax=z]') };
  const T = 9000;
  // axes: crosshair lines follow the tool, tags on the frame edges show the live value
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (cls, x1, y1, x2, y2) => { const l = document.createElementNS(NS, 'line'); l.setAttribute('class', cls); l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2); svg.insertBefore(l, line); return l; };
  const ax = mk('tp-axis', 0, 0, 0, 300), ay = mk('tp-axis', 0, 0, 400, 0);
  const fig = svg.parentElement;
  const tag = (cls) => { const t = document.createElement('span'); t.className = 'axtag ' + cls; t.setAttribute('aria-hidden', 'true'); fig.appendChild(t); return t; };
  const tx = tag('tx'), ty = tag('ty');
  const draw = p => {
    line.style.strokeDasharray = `${L * p} ${L}`;
    const pt = line.getPointAtLength(L * p);
    dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
    ax.setAttribute('x1', pt.x); ax.setAttribute('x2', pt.x);
    ay.setAttribute('y1', pt.y); ay.setAttribute('y2', pt.y);
    tx.style.left = (pt.x / 4) + '%'; tx.textContent = 'X ' + ((pt.x - 200) * 0.45).toFixed(1);
    ty.style.top = (pt.y / 3) + '%'; ty.textContent = 'Y ' + ((150 - pt.y) * 0.45).toFixed(1);
    out.x.textContent = ((pt.x - 200) * 0.45).toFixed(3);
    out.y.textContent = ((150 - pt.y) * 0.45).toFixed(3);
    out.z.textContent = (-(2 + 3 * Math.min(1, p * 6 % 1.2))).toFixed(3);
  };
  // runs even with reduced motion: it is a small readout, not a large movement
  const t0 = performance.now();
  const tick = now => {
    const k = ((now - t0) % (T + 1500)) / T;
    draw(Math.min(1, k));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

// ===== v5: scroll progress =====
(() => {
  const bar = document.createElement('div');
  bar.className = 'prog'; bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);
  const upd = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`;
  };
  addEventListener('scroll', upd, { passive: true }); upd();
})();

// ===== cookie consent (jen mapa OpenStreetMap) =====
(() => {
  const KEY = 'htm-cc';
  const bar = document.getElementById('cc');
  const get = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const set = v => { try { localStorage.setItem(KEY, v); } catch {} };
  const apply = () => {
    const ok = get() === 'yes';
    document.querySelectorAll('.map').forEach(m => {
      const f = m.querySelector('iframe');
      if (!f) return;
      if (ok) { if (!f.src) f.src = f.dataset.src; f.hidden = false; }
      else { f.removeAttribute('src'); f.hidden = true; }
      m.classList.toggle('on', ok);
    });
  };
  const choose = v => { set(v); bar.hidden = true; apply(); };
  bar?.querySelectorAll('[data-cc]').forEach(b => b.addEventListener('click', () => choose(b.dataset.cc)));
  document.querySelectorAll('[data-cc-open]').forEach(b => b.addEventListener('click', () => {
    // tlačítko v mapě = souhlas, odkaz v patičce = znovu otevřít lištu
    if (b.closest('.map')) choose('yes'); else bar.hidden = false;
  }));
  if (!get()) bar.hidden = false;
  apply();
})();
