(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Scroll progress and cursor light ---------- */
  const bar = document.createElement('div'); bar.className = 'fx-progress';
  const glow = document.createElement('div'); glow.className = 'fx-glow';
  document.body.append(bar, glow);
  addEventListener('scroll', () => {
    const m = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', m > 0 ? (scrollY / m).toFixed(3) : 0);
  }, { passive: true });

  /* ---------- Card tilt + spotlight, magnetic buttons ---------- */
  const CARDS = '.stats div, .lp-step', MAG = 'button.go, .lp-btn';
  if (fine && !reduce) {
    document.addEventListener('pointermove', e => {
      glow.style.setProperty('--gx', e.clientX + 'px'); glow.style.setProperty('--gy', e.clientY + 'px'); glow.classList.add('on');
      const t = e.target.closest ? e.target : null; if (!t) return;
      const c = t.closest(CARDS);
      if (c) {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--px', (x * 100) + '%'); c.style.setProperty('--py', (y * 100) + '%');
        c.style.setProperty('--ty', ((x - .5) * 10).toFixed(2) + 'deg'); c.style.setProperty('--tx', ((.5 - y) * 8).toFixed(2) + 'deg');
      }
      const m = t.closest(MAG);
      if (m) {
        const r = m.getBoundingClientRect();
        m.style.setProperty('--mx', (((e.clientX - r.left) / r.width - .5) * 10).toFixed(1) + 'px');
        m.style.setProperty('--my', (((e.clientY - r.top) / r.height - .5) * 8).toFixed(1) + 'px');
      }
    }, { passive: true });
    document.addEventListener('pointerout', e => {
      const t = e.target.closest ? e.target : null; if (!t) return;
      const c = t.closest(CARDS); if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--tx', '0deg'); c.style.setProperty('--ty', '0deg'); }
      const m = t.closest(MAG); if (m && !m.contains(e.relatedTarget)) { m.style.setProperty('--mx', '0px'); m.style.setProperty('--my', '0px'); }
    });
  }

  /* ---------- Button ripple ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button.go, button.alt, button.stop, .lp-btn');
    if (!b || b.disabled || reduce) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span'); s.className = 'fx-ripple';
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(s); setTimeout(() => s.remove(), 700);
  });

  /* ---------- Page entrance, count-up, scroll reveal ---------- */
  let lastView = null;
  function viewEnter() {
    const v = $('#view');
    if (v && v !== lastView) { lastView = v; v.classList.add('enter'); setTimeout(() => v.classList.remove('enter'), 1400); }
  }
  function countUp() {
    $$('.stats b:not([data-n])').forEach(b => {
      b.dataset.n = '1';
      const full = b.textContent.trim(), m = full.match(/^(₱)?([\d,]+(?:\.\d+)?)$/);
      if (!m || reduce || !b.firstChild) return;
      const end = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, pre = m[1] || '', t0 = performance.now();
      const fmt = v => pre + v.toLocaleString('en-PH', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      (function tick(now) {
        const p = Math.min(1, (now - t0) / 900);
        if (!b.isConnected) return;
        b.firstChild.nodeValue = p < 1 ? fmt(end * (1 - Math.pow(1 - p, 3))) : full;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }
  const rise = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(x => {
    if (x.isIntersecting) { x.target.classList.add('in'); rise.unobserve(x.target); }
  }), { threshold: .12 }) : null;
  function watchRise() { $$('[data-rise]:not(.in)').forEach(el => rise ? rise.observe(el) : el.classList.add('in')); }

  /* ---------- The white 3D bus ---------- */
  const TYPES = { 'Ordinary': ['ORDINARY', '2 + 2 seats'], 'Air-conditioned': ['AIRCON', '2 + 2 seats'], 'Sleeper': ['SLEEPER', '1 + 2 berths'] };
  function busHTML() {
    const L = 340, xs = [275, 90, 50];
    const arches = mirror => xs.map(x => `<i class="ar" style="left:${(mirror ? L - x : x) - 21}px"></i>`).join('');
    const side = c => `<div class="f ${c}"><i class="gl"></i><i class="dr"></i>${arches(c === 'l')}<i class="lv"></i><span class="nm">Bicol Isarog</span></div>`;
    const wheels = [1, -1].flatMap(s => xs.flatMap(x => [41, 38, 35].map((z, k) =>
      `<i class="wh${k ? ' in' : ''}" style="left:${x - 16}px;transform:translateZ(${s * z}px)">${k ? '' : '<b></b>'}</i>`))).join('');
    return `<div class="b3" data-type="Ordinary"><div class="b3-world">
      <i class="b3-floor"></i><i class="b3-ring"></i><i class="b3-shadow"></i>
      <div class="b3-body">
        ${side('r')}${side('l')}
        <div class="f fr"><span class="sg">ORDINARY</span><i class="ws"></i><i class="hl a"></i><i class="hl b"></i><i class="gr"></i><i class="bp"></i></div>
        <div class="f bk"><i class="rw"></i><i class="tl a"></i><i class="tl b"></i><i class="bp"></i></div>
        <div class="f tp"><i class="ac"></i></div><div class="f bt"></div>
        ${wheels}
      </div></div></div>`;
  }
  function mountFleet() {
    const t = $('.lp-ticker');
    if (!t || $('#fleet')) return;
    const views = [['Front', -65], ['Side', -8], ['Back', 115], ['Other side', 172]];
    t.insertAdjacentHTML('afterend', `<section class="fleet" id="fleet" data-rise>
      <h2>Meet your ride</h2>
      <p class="lp-sub">Drag to turn the bus, use the arrow keys, or pick a view. Choose a bus type to change the sign on the front.</p>
      <div class="stage" tabindex="0" role="group" aria-label="Interactive 3D bus. Drag or use the left and right arrow keys to rotate it.">
        ${busHTML()}
        <p class="stage-hint" aria-hidden="true">Drag to turn</p>
        <div class="stage-ui">
          ${views.map(v => `<button class="pill" data-view="${v[1]}">${v[0]}</button>`).join('')}<span class="pill-sep"></span>
          ${Object.keys(TYPES).map((k, i) => `<button class="pill" data-type="${k}" aria-pressed="${i === 0}">${k} · ${TYPES[k][1]}</button>`).join('')}
        </div>
      </div></section>`);
  }
  function initBus() {
    const st = $('.stage'); if (!st || st.dataset.on) return; st.dataset.on = '1';
    const bus = $('.b3', st), world = $('.b3-world', st);
    let ry = -34, rx = -15, vy = 0, down = false, lx = 0, ly = 0, tgt = null, seen = true;
    const fit = () => bus.style.setProperty('--s', Math.max(.5, Math.min(1.4, st.clientWidth / 600)).toFixed(2));
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(st); else addEventListener('resize', fit);
    if ('IntersectionObserver' in window) new IntersectionObserver(e => { seen = e[0].isIntersecting; }).observe(st);

    st.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      down = true; tgt = null; vy = 0; lx = e.clientX; ly = e.clientY; st.classList.add('drag', 'used'); st.setPointerCapture(e.pointerId);
    });
    st.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      ry += dx * .6; vy = dx * .6; rx = Math.max(-42, Math.min(-2, rx - dy * .25));
    });
    const end = () => { down = false; st.classList.remove('drag'); };
    st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
    st.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') vy = -6; else if (e.key === 'ArrowRight') vy = 6; else return;
      tgt = null; st.classList.add('used'); e.preventDefault();
    });
    $$('[data-view]', st).forEach(b => b.addEventListener('click', () => { tgt = Number(b.dataset.view); st.classList.add('used'); }));
    $$('[data-type]', st).forEach(b => b.addEventListener('click', () => {
      bus.dataset.type = b.dataset.type;
      $$('.sg', st).forEach(s => { s.textContent = TYPES[b.dataset.type][0]; });
      $$('[data-type]', st).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    }));

    (function loop() {
      if (!st.isConnected) return;
      requestAnimationFrame(loop);
      if (!seen) return;
      if (!down) {
        if (tgt !== null) {
          const d = ((((tgt - ry + 180) % 360) + 360) % 360) - 180;
          ry += d * .08; vy = 0; if (Math.abs(d) < .4) tgt = null;
        } else { ry += vy; vy *= .94; if (!reduce && Math.abs(vy) < .06) ry += .22; }
      }
      world.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    })();
  }

  /* ---------- Run now, then after every page change ---------- */
  function run() { viewEnter(); countUp(); mountFleet(); initBus(); watchRise(); }
  let queued = false;
  new MutationObserver(() => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => { queued = false; run(); });
  }).observe($('#app') || document.body, { childList: true, subtree: true });
  run();
})();