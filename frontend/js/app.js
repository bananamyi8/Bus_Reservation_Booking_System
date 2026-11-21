(function () {
  const L = window.Logic;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const S = { page: 'landing', reg: false, token: null, user: null, view: 'dash', step: 1, b: {}, q: null, results: null, sel: null, cancelling: false, seatData: null, bk: null, fq: '', bq: null, btrips: [], et: null, rf: null, rt: null };
  try { S.token = sessionStorage.getItem('tok'); S.user = JSON.parse(sessionStorage.getItem('usr') || 'null'); } catch (e) { /* storage unavailable */ }

  async function api(path, opt) {
    opt = opt || {};
    let r;
    try {
      r = await fetch(window.API_BASE + path, {
        method: opt.method || 'GET',
        headers: Object.assign({ 'Content-Type': 'application/json' }, S.token ? { Authorization: 'Bearer ' + S.token } : {}),
        body: opt.body ? JSON.stringify(opt.body) : undefined
      });
    } catch (e) { throw new Error('Cannot reach the server. Check the connection and try again. If the server was idle, wait a minute for it to wake up.'); }
    let d = {}; try { d = await r.json(); } catch (e) { /* no body */ }
    if (r.status === 401 && S.token) { signOut(); throw new Error('Your session ended. Sign in again.'); }
    if (!r.ok) { const err = new Error(d.error || 'Request failed (' + r.status + ').'); err.status = r.status; throw err; }
    return d;
  }

  function saveSession() {
    try { sessionStorage.setItem('tok', S.token); sessionStorage.setItem('usr', JSON.stringify(S.user)); } catch (e) { /* ignore */ }
  }

  function signOut() {
    S.token = null; S.user = null;
    S.page = 'landing'; S.reg = false;
    try { sessionStorage.clear(); } catch (e) { /* ignore */ }
    render();
  }

  const loadingH = () => '<p class="status" role="status">Loading…</p>';
  const errorH = m => `<div class="panel-error" role="alert"><p><strong>Something went wrong.</strong></p><p>${esc(m)}</p><p><button class="alt" data-act="retry">Try again</button></p></div>`;
  const msgH = () => '<div id="msg" class="msg" role="alert" aria-live="polite"></div>';
  const show = (m, good) => { const e = $('#msg'); if (e) { e.textContent = m; e.className = 'msg ' + (good ? 'good' : 'bad'); } };
  const tag = b => b.status === 'Cancelled' ? '<span class="tag bad">Cancelled</span>' : '<span class="tag good">Confirmed</span>';
  const peso = L.formatPeso;
  const field = (id, label, extra, hint) => `<div class="field"><label for="${id}">${label}${hint ? ` <span class="hint">${hint}</span>` : ''}</label><input id="${id}" name="${id}" ${extra || ''}></div>`;

  // ===== Bus types: shared by the landing page and the bus-type picker =====
  const BUS = {
    sleeper:  { kind: 'sleeper',        name: 'Sleeper bus',         label: 'SLEEPER',  text: 'Lie-down berths for long overnight trips.' },
    aircon:   { kind: 'coach aircon',   name: 'Air-conditioned bus', label: 'AIRCON',   text: 'Cool, comfortable seats for everyday routes.' },
    ordinary: { kind: 'coach ordinary', name: 'Ordinary bus',        label: 'ORDINARY', text: 'Open cabin with the lowest fares.' }
  };
  const busName = id => (BUS[id] || BUS.ordinary).name;
  const byBus = (list, bus) => bus ? list.filter(t => (t.busType || 'ordinary') === bus) : list;
  // Wheels: front and rear axle, near side (n) and far side (x).
  const WHEELS = ['fa', 'ra'].flatMap(a => ['n', 'x'].map(side => `<i class="arch ${a} ${side}"></i><i class="wheel ${a} ${side}"></i>`)).join('');
  const bus3d = (kind, label) => `<div class="bus-bob"><div class="bus3d ${kind}">
      <div class="f side left"><i class="door"></i><i class="brand">Bicol Isarog</i></div>
      <div class="f side right"><i class="brand">Bicol Isarog</i></div>
      <div class="f end front"><i class="sign">${label}</i><i class="lamp l"></i><i class="lamp r"></i><i class="plate">260</i><i class="grille"></i></div>
      <div class="f end back"><i class="lamp red l"></i><i class="lamp red r"></i></div>
      <div class="f roof"></div><div class="f floor"></div>${WHEELS}
    </div></div>`;
  // Three clickable 3D buses. The choice is kept in a hidden "busType" field of the form.
  // req = true means one must be chosen; false lets the user click again to clear it (any bus).
  const busPicker = (val, req) => `<input type="hidden" name="busType" value="${esc(val)}">
    <div class="bus-pick" ${req ? 'data-req="1"' : ''} role="group" aria-label="Bus type">${Object.entries(BUS).map(([id, b]) => `
      <div class="bus-opt${val === id ? ' on' : ''}" data-id="${id}" data-act="bus" data-arg="${id}">
        <div class="fleet-stage"><div class="lp-ground"></div>${bus3d(b.kind, b.label)}</div>
        <h3>${b.name}</h3><p class="hint">${b.text}</p>
        <button type="button" class="alt" data-act="bus" data-arg="${id}" aria-pressed="${val === id}"><span class="t-off">Choose</span><span class="t-on">Selected</span></button>
      </div>`).join('')}</div>`;

  function landingH() {
    const items = ['Choose your trip', 'Pick your seat', 'Show a valid ID', 'Pay at the station', 'Travel with a reserved seat'];
    const row = items.map(t => `<span>${t}</span>`).join('');
    const step = (n, c, d, title, text) => `<li class="rv" style="--d:${d}s"><div class="lp-step" style="--c:${c}"><b>${n}</b><h3>${title}</h3><p>${text}</p></div></li>`;

    // Hero slideshow: up to 5 pictures. Each entry is [file, alt text, caption shown on the right].
    // Put the pictures in the same folder as bus.png (frontend/img/). Remove lines if you have fewer than 5.
    const slides = [
      ['img/bus1.jpg', 'A Bicol Isarog bus at the terminal', 'Reserve online. Pay at the station.'],
      ['img/bus2.jpg', 'A Bicol Isarog bus on the highway', 'Comfortable rides across Bicol.'],
      ['img/bus3.jpg', 'Inside a Bicol Isarog bus with reserved seats', 'Pick your own seat.'],
      ['img/bus4.jpg', 'Passengers boarding a Bicol Isarog bus', 'Show your ID and board.'],
      ['img/bus5.jpg', 'A Bicol Isarog bus near Mount Isarog', 'Travel with a reserved seat.']
    ];

    // "Meet your ride": three 3D buses styled after the real Bicol Isarog coaches.
    const fleet = [
      ['sleeper', 'Sleeper bus', 'SLEEPER', 'Lie-down berths with lit upper windows, made for long overnight trips.', ['Overnight rides', 'Berth seats'], 'var(--lime)'],
      ['coach aircon', 'Air-conditioned bus', 'AIRCON', 'Cool, comfortable seats and big tinted windows for everyday routes.', ['Air-conditioned', 'Reclining seats'], 'var(--ice)'],
      ['coach ordinary', 'Ordinary bus', 'ORDINARY', 'Open, bright cabin with the lowest fares for short and regional trips.', ['Budget fare', 'Short trips'], 'var(--green)']
    ];
    const fleetH = fleet.map(([kind, name, label, text, tags, c], n) => `<div class="lp-step fleet-card rv" style="--c:${c};--d:${n * 0.1}s">
      <div class="fleet-stage" aria-label="3D ${name}. Drag to turn it."><div class="lp-ring"></div><div class="lp-ground"></div>${bus3d(kind, label)}</div>
      <h3>${name}</h3><p>${text}</p><div class="fleet-tags">${tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
    </div>`).join('');

    return `<div class="lp">
    <header class="lp-nav">
      <a class="lp-brand" href="#top"><i></i>Bicol Isarog</a>
      <nav class="lp-links" aria-label="Main"><a href="#how">How it works</a><a href="#fleet">Our buses</a><a href="#notes">Good to know</a></nav>
      <div class="lp-nav-btns"><button class="lp-btn lp-ghost" data-act="showreg">Create account</button><button class="lp-btn lp-solid" data-act="showlogin">Sign in</button></div>
    </header>

    <section class="lp-hero" id="top">
      <div class="lp-slides" role="group" aria-roledescription="carousel" aria-label="Bicol Isarog buses">
        <div class="lp-track">
          ${slides.map(([src, alt, cap], i) => `<div class="lp-slide" data-cap="${cap}"><img src="${src}" alt="${alt}" ${i ? 'loading="lazy"' : ''}></div>`).join('')}
        </div>
        <div class="lp-shade"></div>
      </div>
      <div class="lp-ctl">
        <button class="lp-arrow" data-slide="-1" aria-label="Previous picture">‹</button>
        <div class="lp-dots">${slides.map((s, i) => `<button class="lp-dot" data-go="${i}" aria-label="Picture ${i + 1}"></button>`).join('')}</div>
        <button class="lp-arrow" data-slide="1" aria-label="Next picture">›</button>
      </div>
      <p class="lp-cap" aria-live="polite"></p>
      <div class="lp-copy">
        <h1 class="lp-up" style="--d:.05s">Reserve your seat<span>.</span></h1>
        <p class="lp-lead lp-up" style="--d:.2s">Pick your trip and your seat online with Bicol Isarog Transport System. Pay the fare at the booking station when you arrive.</p>
        <div class="lp-cta lp-up" style="--d:.35s"><button class="lp-btn lp-lime" data-act="showreg">Create account</button><a class="lp-btn lp-ghost" href="#how">See how it works</a></div>
      </div>
      <a class="lp-scroll" href="#how" aria-label="Scroll to how it works"><span></span></a>
    </section>

    <div class="lp-ticker" aria-hidden="true"><div>${row}${row}</div></div>

    <section class="lp-sec" id="how">
      <h2 class="rv">How it works</h2>
      <p class="lp-sub rv" style="--d:.08s">Four short steps from sign-up to a reserved seat.</p>
      <ol class="lp-steps">
        ${step(1, 'var(--lime)', 0, 'Create an account', 'Use your name and a contact number we can reach.')}
        ${step(2, 'var(--green)', 0.1, 'Choose a trip', 'Enter where you are going and the travel date, then pick a departure.')}
        ${step(3, 'var(--sky)', 0.2, 'Pick your seat', 'Taken seats are crossed out, so nobody else can be given yours.')}
        ${step(4, 'var(--ice)', 0.3, 'Pay at the station', 'Show a valid ID. Your booking is marked paid once staff record your payment.')}
      </ol>
    </section>

    <section class="lp-sec" id="fleet">
      <h2 class="rv">Meet your ride</h2>
      <p class="lp-sub rv" style="--d:.08s">Three ways to travel with Bicol Isarog. Drag a bus to turn it around.</p>
      <div class="fleet">${fleetH}</div>
    </section>

    <section class="lp-sec" id="notes">
      <div class="lp-notes">
        <div class="rv"><h2>Good to know</h2><p>Plan ahead for long trips and busy holiday dates.</p></div>
        <ul class="lp-list rv" style="--d:.12s">
          <li>Advance reservations are best for long-distance travel.</li>
          <li>View or cancel your own bookings any time under My bookings.</li>
          <li>Fares and schedules are set by Bicol Isarog Transport System and shown once you sign in.</li>
          <li>Booking station staff and administrators sign in from the same page.</li>
        </ul>
      </div>
    </section>

    <section class="lp-sec">
      <div class="lp-band rv">
        <div><h2>Ready to travel?</h2><p>Create your account and reserve a seat in a few minutes.</p></div>
        <button class="lp-btn lp-lime" data-act="showreg">Create account</button>
      </div>
    </section>

    <footer class="lp-foot"><p>Bicol Isarog Transport System, Inc. Booking and reservation system.</p></footer>
    </div>`;
  }

  function initReveal() {
    const els = document.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(list => list.forEach(x => {
      if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
    }), { threshold: 0.15 });
    els.forEach(e => io.observe(e));
  }

  // Hero slideshow: slides sideways every 5 seconds, with arrows, dots and touch swipe.
  let sliderTimer;
  function initSlider() {
    clearInterval(sliderTimer);
    const box = document.querySelector('.lp-slides');
    if (!box) return;
    const track = box.querySelector('.lp-track');
    const n = track.children.length;
    const dots = [...document.querySelectorAll('.lp-dot')];
    const cap = document.querySelector('.lp-cap');
    const hero = document.querySelector('.lp-hero');
    let i = 0;

    function go(k) {
      i = (k + n) % n;
      track.style.transform = `translateX(-${i * 100}%)`;
      dots.forEach((d, j) => d.setAttribute('aria-current', String(j === i)));
      cap.textContent = track.children[i].dataset.cap || '';
    }
    function play() {
      clearInterval(sliderTimer);
      if (n < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      sliderTimer = setInterval(() => {
        if (!document.body.contains(box)) { clearInterval(sliderTimer); return; }
        go(i + 1);
      }, 5000);
    }

    document.querySelectorAll('.lp-arrow').forEach(b => { b.onclick = () => { go(i + Number(b.dataset.slide)); play(); }; });
    dots.forEach((d, j) => { d.onclick = () => { go(j); play(); }; });
    hero.onmouseenter = () => clearInterval(sliderTimer);
    hero.onmouseleave = play;

    let x0 = null; // swipe on phones
    hero.ontouchstart = e => { x0 = e.touches[0].clientX; };
    hero.ontouchend = e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1)); play(); }
      x0 = null;
    };

    go(0);
    play();
  }

  // Drag any 3D bus to spin it. Each turns slowly on its own and tilts toward the pointer.
  // Used on the landing page and in the bus-type picker. A drag does not count as a click.
  function initBus() {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const all = [...document.querySelectorAll('.fleet-stage')].map((el, i) => ({ el, bus: el.querySelector('.bus3d'), ry: -35 + i * 45, tx: 0, drag: false, moved: false, x0: 0, ry0: 0 }));
    if (!all.length) return;
    all.forEach(s => {
      s.el.addEventListener('pointerdown', e => { s.drag = true; s.moved = false; s.x0 = e.clientX; s.ry0 = s.ry; s.el.setPointerCapture(e.pointerId); });
      s.el.addEventListener('pointermove', e => {
        const r = s.el.getBoundingClientRect();
        s.tx = ((e.clientY - r.top) / r.height - 0.5) * -12;
        if (s.drag) {
          s.ry = s.ry0 + (e.clientX - s.x0) * 0.5;
          if (Math.abs(e.clientX - s.x0) > 5) s.moved = true;
        }
      });
      s.el.addEventListener('pointerup', () => { s.drag = false; });
      s.el.addEventListener('pointercancel', () => { s.drag = false; });
      s.el.addEventListener('pointerleave', () => { s.tx = 0; });
      s.el.addEventListener('click', e => { if (s.moved) { e.stopPropagation(); s.moved = false; } }, true);
    });
    (function tick() {
      if (!document.body.contains(all[0].el)) return;
      all.forEach(s => {
        if (!s.drag && !reduce) s.ry += 0.25;
        s.bus.style.setProperty('--ry', s.ry + 'deg');
        s.bus.style.setProperty('--tx', s.tx + 'deg');
      });
      requestAnimationFrame(tick);
    })();
  }

  // Cursor glow, card spotlight and tilt, click ripples, magnetic buttons, and counting-up numbers.
  function initFx() {
    const root = document.documentElement;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sel = '.stats div, .lp-step, dl, .lp-band';

    document.addEventListener('pointermove', e => {
      root.style.setProperty('--px', e.clientX + 'px');
      root.style.setProperty('--py', e.clientY + 'px');
      const t = e.target.closest ? e.target : null;
      if (!t) return;
      const mb = t.closest('.lp-btn');
      if (mb && !reduce) {
        const r = mb.getBoundingClientRect();
        mb.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px');
        mb.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px');
      }
      const c = t.closest(sel);
      if (!c) return;
      const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      c.style.setProperty('--mx', x + 'px');
      c.style.setProperty('--my', y + 'px');
      if (c.matches('.stats div, .lp-step') && !reduce) {
        c.style.setProperty('--tiltx', ((y / r.height - 0.5) * -9).toFixed(2) + 'deg');
        c.style.setProperty('--tilty', ((x / r.width - 0.5) * 9).toFixed(2) + 'deg');
      }
    }, { passive: true });

    document.addEventListener('pointerout', e => {
      const t = e.target.closest ? e.target : null;
      if (!t) return;
      const c = t.closest('.stats div, .lp-step');
      if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--tiltx', '0deg'); c.style.setProperty('--tilty', '0deg'); }
      const mb = t.closest('.lp-btn');
      if (mb && !mb.contains(e.relatedTarget)) { mb.style.setProperty('--bx', '0px'); mb.style.setProperty('--by', '0px'); }
    });

    document.addEventListener('pointerdown', e => {
      const b = e.target.closest && e.target.closest('button.go, button.alt, button.stop, .lp-btn');
      if (!b || b.disabled || reduce) return;
      const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
      const s = document.createElement('span');
      s.className = 'ripple';
      s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      b.appendChild(s);
      setTimeout(() => s.remove(), 700);
    });

    // Dashboard numbers count up when they appear.
    const countUp = () => document.querySelectorAll('.stats b:not([data-c])').forEach(b => {
      b.dataset.c = '1';
      const m = b.textContent.trim().match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
      if (!m || reduce) return;
      const end = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, t0 = performance.now();
      (function step(t) {
        const k = Math.min(1, (t - t0) / 900), v = end * (1 - Math.pow(1 - k, 3));
        b.textContent = m[1] + v.toLocaleString('en-PH', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[3];
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
    new MutationObserver(countUp).observe(document.body, { childList: true, subtree: true });
  }

  async function renderView() {
    const v = $('#view');
    if (v) { try { v.innerHTML = await VIEWS[S.view](); initBus(); } catch (e) { v.innerHTML = errorH(e.message); } }
  }

  async function render() {
    const app = $('#app');
    if (!S.user && S.page === 'landing') { app.innerHTML = landingH(); initReveal(); initSlider(); initBus(); window.scrollTo(0, 0); return; }
    if (!S.user && S.reg) {
      app.innerHTML = `<div class="login"><h1>Create a customer account</h1><form data-form="register" novalidate>${field('name', 'Full name')}${field('contact', 'Contact number', 'inputmode="tel"', '7 to 15 digits')}${field('username', 'Username', 'autocomplete="username"')}${field('password', 'Password', 'type="password" autocomplete="new-password"', '10 or more characters')}${msgH()}<div class="actions"><button class="go" type="submit">Create account</button><button class="alt" type="button" data-act="showlogin">Back to sign in</button></div></form></div>`;
      return;
    }
    if (!S.user) {
      app.innerHTML = `<div class="login"><h1>Bicol Isarog booking station</h1><p class="hint">Sign in with the account your administrator gave you.</p>
      <form data-form="login" novalidate>${field('username', 'Username', 'autocomplete="username"')}${field('password', 'Password', 'type="password" autocomplete="current-password"')}${msgH()}
      <button class="go" type="submit">Sign in</button></form><p style="margin-top:1rem"><button class="alt" data-act="showreg">New customer? Create an account</button> <button class="alt" data-act="showlanding">Back to home</button></p></div>`;
      return;
    }
    const nav = S.user.role === 'passenger' ? [['book', 'Book a trip'], ['find', 'My bookings']] : [['book', 'New booking'], ['find', 'Find booking']];
    if (S.user.role === 'admin') nav.push(['trips', 'Trips and fares'], ['rep', 'Reports'], ['staff', 'Staff']);
    nav.unshift(['dash', 'Dashboard']);
    nav.splice(2, 0, ['browse', 'All trips']);
    nav.push(['settings', 'Settings']);
    app.innerHTML = `<header class="top"><strong>Bicol Isarog</strong><nav aria-label="Main">${nav.map(n => `<button data-act="go" data-arg="${n[0]}" ${S.view === n[0] ? 'aria-current="page"' : ''}>${n[1]}</button>`).join('')}</nav>
      <span class="who">${esc(S.user.name)}</span><button data-act="out">Sign out</button></header><main id="view">${loadingH()}</main>`;
    const v = $('#view');
    try { v.innerHTML = await VIEWS[S.view](); initBus(); } catch (e) { v.innerHTML = errorH(e.message); }
  }

  const stat = (n, label) => `<div><b>${n}</b><span>${label}</span></div>`;

  const VIEWS = {
    async dash() {
      const d = await api('/api/v1/dashboard');
      d.next = d.next || []; d.departures = d.departures || [];
      ['upcoming', 'unpaid', 'cancelled', 'bookingsToday', 'active', 'collected'].forEach(k => { if (d[k] == null) d[k] = 0; });
      d.today = d.today || today();
      if (S.user.role === 'passenger') {
        return `<h1>Welcome, ${esc(S.user.name)}</h1>
        <div class="stats">${stat(d.upcoming, 'Upcoming trips')}${stat(d.unpaid, 'Unpaid bookings')}${stat(d.cancelled, 'Cancelled')}</div>
        <div class="actions"><button class="alt" data-act="go" data-arg="browse">All trips</button><button class="alt" data-act="go" data-arg="find">My bookings</button></div>
        <h2>Your next trips</h2>${d.next.length
          ? `<div class="scroll"><table><tr><th>Reference</th><th>Trip</th><th>Date</th><th>Seat</th><th>Payment</th><th></th></tr>${d.next.map(b => `<tr><td>${esc(b.reference)}</td><td>${esc((b.tripId || {}).origin)} to ${esc((b.tripId || {}).destination)}</td><td>${esc(b.travelDate)}</td><td>${b.seat}</td><td><span class="tag">${esc(b.payStatus)}</span></td><td><button class="alt" data-act="open" data-arg="${b._id}">Open</button></td></tr>`).join('')}</table></div><p class="hint">Pay the fare at the booking station. A booking is paid once staff record your payment.</p>`
          : '<div class="empty"><p><strong>No upcoming trips.</strong></p><p>Choose Book a trip to reserve a seat.</p></div>'}`;
      }
      const admin = S.user.role === 'admin';
      return `<h1>Dashboard</h1><p class="hint">${esc(d.today)}</p>
      <div class="stats">${stat(d.bookingsToday, 'Seats booked for today')}${stat(d.active, 'Active bookings')}${stat(d.unpaid, 'Unpaid, upcoming')}${stat(d.cancelled, 'Cancelled')}${admin ? stat(peso(d.collected), 'Payments recorded') : ''}</div>
      <div class="actions"><button class="go" data-act="go" data-arg="book">New booking</button><button class="alt" data-act="go" data-arg="find">Find booking</button>${admin ? '<button class="alt" data-act="go" data-arg="trips">Trips and fares</button><button class="alt" data-act="go" data-arg="rep">Reports</button>' : ''}</div>
      <h2>Today’s departures</h2>${d.departures.length
        ? `<div class="scroll"><table><tr><th>Time</th><th>Route</th><th>Seats left</th><th>Fare</th></tr>${d.departures.map(t => `<tr><td>${t.time}</td><td>${esc(t.origin)} to ${esc(t.destination)}</td><td>${t.seatsLeft} of ${t.capacity}</td><td>${peso(t.fare)}</td></tr>`).join('')}</table></div>`
        : `<div class="empty"><p><strong>No trips today.</strong></p><p>${admin ? 'Add a trip under Trips and fares.' : 'Ask an administrator to add trips.'}</p></div>`}`;
    },

    async settings() {
      const u = S.user, roles = { admin: 'Administrator', staff: 'Booking staff', passenger: 'Customer' };
      return `<h1>Settings</h1><p class="hint">Signed in as ${esc(u.username)} (${roles[u.role]}).</p>${msgH()}
      <h2>Profile</h2><form data-form="profile" novalidate><div class="fields two">${field('name', 'Full name', `value="${esc(u.name)}"`)}${field('contact', 'Contact number', `inputmode="tel" value="${esc(u.contact)}"`, '7 to 15 digits')}</div><button class="go" type="submit">Save profile</button></form>
      <h2>Change password</h2><form data-form="password" novalidate>${field('current', 'Current password', 'type="password" autocomplete="current-password"')}<div class="fields two">${field('next', 'New password', 'type="password" autocomplete="new-password"', '10 or more characters')}${field('again', 'Repeat new password', 'type="password" autocomplete="new-password"')}</div><button class="go" type="submit">Change password</button></form>`;
    },

    async book() {
      const b = S.b, s = S.step, names = ['Find trip', 'Passenger', 'Seat', 'Review', 'Payment'];
      let h = `<h1>New booking</h1><ol class="steps">${names.map((n, i) => `<li class="${i + 1 === s ? 'on' : ''}" ${i + 1 === s ? 'aria-current="step"' : ''}>${n}</li>`).join('')}</ol>`;
      if (s === 1) {
        const q = S.q || {};
        h += `<form data-form="search" novalidate><div class="fields four">${field('origin', 'Origin', `value="${esc(q.origin)}" placeholder="Naga"`)}${field('destination', 'Destination', `value="${esc(q.destination)}" placeholder="Manila"`)}${field('date', 'Travel date', `type="date" min="${today()}" value="${esc(q.date || today())}"`)}${field('qty', 'Number of tickets', `type="number" min="1" max="${L.maxTickets(S.user.role)}" inputmode="numeric" value="${q.qty || 1}"`, `up to ${L.maxTickets(S.user.role)}`)}</div>
        <h2>Bus type <span class="hint">optional. Click a selected bus again to show every type.</span></h2>${busPicker(q.bus || '', false)}${msgH()}<button class="go" type="submit">Search trips</button></form>`;
        if (S.results) {
          h += S.results.length ? `<h2>Departures</h2><div class="scroll"><table><tr><th>Time</th><th>Route</th><th>Bus</th><th>Seats left</th><th>Fare</th><th></th></tr>${S.results.map(t => `<tr><td>${t.time}</td><td>${esc(t.origin)} to ${esc(t.destination)}</td><td>${esc(busName(t.busType))}</td><td>${t.seatsLeft} of ${t.capacity}</td><td>${peso(t.fare)}</td><td>${t.seatsLeft > 0 ? `<button class="alt" data-act="pick" data-arg="${t._id}">Select</button>` : '<span class="tag bad">Fully booked</span>'}</td></tr>`).join('')}</table></div>`
            : '<div class="empty"><p><strong>No trips match.</strong></p><p>Check the spelling of the origin and destination, try another bus type, or ask an administrator to add the trip.</p></div>';
        }
      } else if (s === 2) {
        const p = b.p || {};
        h += `<h2>Passenger details</h2><p class="hint">Ask to see a valid ID and check that the name matches.</p><form data-form="passenger" novalidate><div class="fields two">${field('name', 'Full name', `value="${esc(p.name)}"`)}${field('contact', 'Contact number', `value="${esc(p.contact)}" inputmode="tel"`, '7 to 15 digits')}</div>
        <div class="field"><label for="ptype">Passenger type</label><select id="ptype" name="type">${['Adult', 'Student', 'Senior', 'PWD'].map(x => `<option ${p.type === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="field"><label><input type="checkbox" name="idVerified" ${p.idVerified ? 'checked' : ''}>Valid ID checked by staff</label></div>${msgH()}
        <div class="actions"><button class="alt" type="button" data-act="step" data-arg="1">Back</button><button class="go" type="submit">Continue to seats</button></div></form>`;
      } else if (s === 3) {
        const key = b.tripId + b.date;
        if (!S.seatData || S.seatData.key !== key) S.seatData = Object.assign({ key }, await api(`/api/v1/trips/${b.tripId}/seats?date=${b.date}`));
        const d = S.seatData, lay = L.layoutSeats(d.capacity, d.taken);
        b.seats = (b.seats || []).filter(n => !d.taken.includes(n));
        const staff = S.user.role !== 'passenger', need = b.qty - b.seats.length, prev = staff ? 2 : 1;
        h += `<h2>${esc(b.trip.origin)} to ${esc(b.trip.destination)}, ${b.trip.time}</h2><p>${b.date}. ${esc(busName(b.trip.busType))}. ${d.capacity - d.taken.length} seats left on this trip.</p>
        <p class="pick-count" role="status" aria-live="polite"><strong>${b.seats.length} of ${b.qty}</strong> seat${b.qty > 1 ? 's' : ''} selected${need > 0 ? '. Choose ' + need + ' more.' : '. Ready to continue.'}</p>
        <div class="seat-legend"><span><i class="sw free"></i>Available</span><span><i class="sw mine"></i>Your seats</span><span><i class="sw taken"></i>Taken</span></div>
        <div class="bus-wrap"><div class="bus" role="group" aria-label="Bus seat plan" style="--n:${lay.cols}">
          <div class="bus-front">Front</div>
          <div class="bus-driver"><i aria-hidden="true"></i><span>Driver</span></div>
          ${lay.seats.map(x => `<button class="seat" style="--c:${x.c};--r:${x.r}" data-act="seat" data-arg="${x.n}" aria-label="Seat ${x.n}${x.taken ? ', taken' : ''}" aria-pressed="${b.seats.includes(x.n)}" ${x.taken ? 'disabled' : ''}>${x.n}</button>`).join('')}
        </div></div>
        ${staff ? `<form data-form="typeseats" novalidate><div class="field" style="max-width:24rem"><label for="seatlist">Or type the seat numbers <span class="hint">for example 5, 6, 12</span></label><input id="seatlist" name="seatlist" inputmode="numeric" value="${esc(b.seats.join(', '))}"></div><button class="alt" type="submit">Apply seat numbers</button></form>` : ''}
        ${msgH()}
        <div class="actions"><button class="alt" data-act="step" data-arg="${prev}">Back</button><button class="alt" data-act="refreshseats">Refresh seat map</button><button class="go" data-act="review">Review booking</button></div>`;
      } else if (s === 4) {
        const def = L.defaultBookingType(b.date, today());
        const cust = S.user.role === 'passenger';
        h += `<h2>Review booking</h2><dl><dt>Passenger</dt><dd>${esc(b.p.name)} (${b.p.type}), ${esc(b.p.contact)}</dd><dt>ID check</dt><dd>${b.p.idVerified ? 'Verified' : 'Not verified'}</dd><dt>Trip</dt><dd>${esc(b.trip.origin)} to ${esc(b.trip.destination)}, ${b.date} at ${b.trip.time}</dd><dt>Bus</dt><dd>${esc(busName(b.trip.busType))}</dd><dt>Tickets</dt><dd>${b.seats.length}</dd><dt>Seats</dt><dd>${b.seats.slice().sort((x, y) => x - y).join(', ')}</dd><dt>Fare</dt><dd>${peso(b.trip.fare)} each, ${peso(b.trip.fare * b.seats.length)} total</dd></dl>
        <form data-form="confirm"><div class="field" style="max-width:18rem"><label for="btype">Booking type</label><select id="btype" name="type">${(cust ? ['Advance reservation'] : ['Walk-in', 'Advance reservation']).map(x => `<option ${def === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>${msgH()}
        <div class="actions"><button class="alt" type="button" data-act="step" data-arg="3">Back</button><button class="go" type="submit">${cust ? 'Book ' + b.seats.length + ' seat' + (b.seats.length > 1 ? 's' : '') : 'Save and record payment'}</button></div></form>`;
      } else {
        const tk = S.bk.tickets || [S.bk], n = tk.length, cust = S.user.role === 'passenger';
        const tot = S.bk.total != null ? S.bk.total : tk.reduce((a, t) => a + (t.fare || 0), 0);
        const table = `<div class="scroll"><table><tr><th>Reference</th><th>Seat</th><th>Fare</th><th></th></tr>${tk.map(t => `<tr><td>${esc(t.reference)}</td><td>${t.seat}</td><td>${peso(t.fare)}</td><td>${cust ? '' : `<button class="alt" data-act="open" data-arg="${t._id}">Open</button>`}</td></tr>`).join('')}</table></div>`;
        if (cust) {
          h += `<h2>${n} seat${n > 1 ? 's' : ''} reserved</h2>${table}<p>Total to pay at the station: <strong>${peso(tot)}</strong>. Your booking is marked paid once the staff record your payment.</p><div class="actions"><button class="go" data-act="go" data-arg="find">View my bookings</button></div>`;
        } else {
          h += `<h2>${n} ticket${n > 1 ? 's' : ''} saved</h2>${table}<p>Total due: <strong>${peso(tot)}</strong></p>${S.bk.paid
            ? '<p class="msg good">All tickets are marked paid.</p><div class="actions"><button class="go" data-act="go" data-arg="book">New booking</button></div>'
            : `${msgH()}<div class="actions"><button class="go" data-act="paygroup">Mark all ${n} as paid (${peso(tot)})</button><button class="alt" data-act="go" data-arg="book">Skip payment for now</button></div><p class="hint">For a partial payment, open a ticket and record it there.</p>`}`;
        }
      }
      return h;
    },

    async browse() {
      const q = S.bq || (S.bq = { date: today(), qty: 1, bus: '' });
      const max = L.maxTickets(S.user.role);
      const list = byBus(await api('/api/v1/trips?date=' + encodeURIComponent(q.date) + (q.bus ? '&busType=' + q.bus : '')), q.bus)
        .sort((a, b) => (a.origin + a.destination).localeCompare(b.origin + b.destination) || a.time.localeCompare(b.time));
      S.btrips = list;
      return `<h1>All trips</h1><p class="hint">Every departure for the date you choose. Pick a trip to choose your seats.</p>
      <form data-form="browse" novalidate><div class="fields two">${field('date', 'Travel date', `type="date" min="${today()}" value="${esc(q.date)}"`)}${field('qty', 'Number of tickets', `type="number" min="1" max="${max}" inputmode="numeric" value="${q.qty}"`, `up to ${max}`)}</div>
      <h2>Bus type <span class="hint">optional. Click a selected bus again to show every type.</span></h2>${busPicker(q.bus || '', false)}${msgH()}<button class="go" type="submit">Show trips</button></form>
      <h2>${list.length} departure${list.length === 1 ? '' : 's'} on ${esc(q.date)}${q.bus ? ' (' + esc(busName(q.bus)) + ')' : ''}</h2>
      ${list.length
        ? `<div class="scroll"><table><tr><th>Route</th><th>Bus</th><th>Departs</th><th>Seats left</th><th>Fare</th><th></th></tr>${list.map(t => `<tr><td>${esc(t.origin)} to ${esc(t.destination)}</td><td>${esc(busName(t.busType))}</td><td>${t.time}</td><td>${t.seatsLeft} of ${t.capacity}</td><td>${peso(t.fare)}</td><td>${t.seatsLeft >= q.qty ? `<button class="go" data-act="booktrip" data-arg="${t._id}">Book</button>` : (t.seatsLeft > 0 ? '<span class="tag bad">Not enough seats</span>' : '<span class="tag bad">Fully booked</span>')}</td></tr>`).join('')}</table></div>`
        : '<div class="empty"><p><strong>No trips found.</strong></p><p>Try another date or bus type, or ask an administrator to add trips.</p></div>'}`;
    },

    async find() {
      if (S.sel) {
        const b = await api('/api/v1/bookings/' + S.sel), t = b.tripId || {};
        return `<h1>Booking ${esc(b.reference)}</h1><p>${tag(b)} <span class="tag">${esc(b.payStatus)}</span> <span class="tag">${esc(b.type)}</span></p>
        <dl><dt>Passenger</dt><dd>${esc(b.passenger.name)} (${esc(b.passenger.type)}), ${esc(b.passenger.contact)}</dd><dt>ID verified</dt><dd>${b.passenger.idVerified ? 'Yes' : 'No'}</dd><dt>Trip</dt><dd>${esc(t.origin)} to ${esc(t.destination)}, ${esc(b.travelDate)} at ${esc(t.time)}</dd>${t.busType ? `<dt>Bus</dt><dd>${esc(busName(t.busType))}</dd>` : ''}<dt>Seat</dt><dd>${b.seat}</dd><dt>Fare</dt><dd>${peso(b.fare)}</dd><dt>Received</dt><dd>${peso(b.received)}</dd>${b.status === 'Cancelled' ? `<dt>Cancelled</dt><dd>${esc(b.cancelReason)}</dd>` : ''}</dl>
        ${b.status === 'Cancelled' ? '' : (S.cancelling
          ? `<h2>Cancel this booking</h2><p>This releases seat ${b.seat} and cannot be undone.</p><form data-form="cancel" novalidate><div class="field"><label for="reason">Cancellation reason</label><textarea id="reason" name="reason" rows="3"></textarea></div>${msgH()}<div class="actions"><button class="alt" type="button" data-act="nocancel">Back</button><button class="stop" type="submit">Confirm cancellation</button></div></form>`
          : `${S.user.role === 'passenger' ? '' : `<h2>Payment</h2>${payForm(b)}`}<h2>Cancellation</h2><button class="stop" data-act="docancel">Cancel booking</button>`)}
        <div class="actions"><button class="alt" data-act="back">Back to search</button></div>`;
      }
      let h = `<h1>Find a booking</h1><form data-form="find" novalidate>${field('fq', 'Booking reference or passenger name', `value="${esc(S.fq)}"`)}${msgH()}<button class="go" type="submit">Search</button></form>`;
      if (S.fq) {
        const q = /^NB-/i.test(S.fq) ? 'reference=' : 'name=';
        const r = await api('/api/v1/bookings?' + q + encodeURIComponent(S.fq));
        h += r.length ? `<div class="scroll"><table><tr><th>Reference</th><th>Passenger</th><th>Date</th><th>Seat</th><th>Status</th><th></th></tr>${r.map(b => `<tr><td>${esc(b.reference)}</td><td>${esc(b.passenger.name)}</td><td>${esc(b.travelDate)}</td><td>${b.seat}</td><td>${tag(b)}</td><td><button class="alt" data-act="open" data-arg="${b._id}">Open</button></td></tr>`).join('')}</table></div>`
          : '<div class="empty"><p><strong>No booking found.</strong></p><p>Check the reference or try part of the passenger’s name.</p></div>';
      }
      return h;
    },

    async trips() {
      const list = await api('/api/v1/trips?includeInactive=1');
      const e = list.find(t => t._id === S.et) || {};
      return `<h1>Trips and fares</h1>${list.length ? `<div class="scroll"><table><tr><th>Route</th><th>Bus</th><th>Departs</th><th>Date</th><th>Seats</th><th>Fare</th><th>Status</th><th></th></tr>${list.map(t => `<tr><td>${esc(t.origin)} to ${esc(t.destination)}</td><td>${esc(busName(t.busType))}</td><td>${t.time}</td><td>${esc(t.date) || 'Every day'}</td><td>${t.capacity}</td><td>${peso(t.fare)}</td><td>${t.active ? '<span class="tag good">Active</span>' : '<span class="tag">Inactive</span>'}</td><td><button class="alt" data-act="edittrip" data-arg="${t._id}">Edit</button> <button class="alt" data-act="toggle" data-arg="${t._id}" data-on="${t.active}">${t.active ? 'Deactivate' : 'Activate'}</button></td></tr>`).join('')}</table></div>` : '<div class="empty"><p><strong>No trips yet.</strong></p><p>Add the first trip below. Routes, times and fares come from the bus operator.</p></div>'}
      <h2>${S.et ? 'Edit trip' : 'Add trip'}</h2><form data-form="trip" novalidate><div class="fields two">${field('origin', 'Origin', `value="${esc(e.origin)}"`)}${field('destination', 'Destination', `value="${esc(e.destination)}"`)}</div><div class="fields three">${field('time', 'Departure time', `type="time" value="${esc(e.time)}"`)}${field('capacity', 'Bus capacity', `inputmode="numeric" value="${esc(e.capacity)}"`, '1 to 60')}${field('fare', 'Fare (₱)', `inputmode="decimal" value="${e.fare == null ? '' : e.fare}"`)}</div>
      <h2>Bus type <span class="hint">choose the bus used for this trip</span></h2>${busPicker(e.busType || 'ordinary', true)}
      <div class="fields two">${field('date', 'Trip date', `type="date" min="${today()}" value="${esc(e.date)}"`, 'leave blank for a daily trip')}</div>${msgH()}
      <div class="actions"><button class="go" type="submit">${S.et ? 'Save changes' : 'Add trip'}</button>${S.et ? '<button class="alt" type="button" data-act="canceledit">Cancel edit</button>' : ''}</div></form>`;
    },

    async rep() {
      const f = S.rf || today().slice(0, 8) + '01', t = S.rt || today();
      const r = await api(`/api/v1/reports/bookings?from=${f}&to=${t}`);
      r.days = r.days || [];
      return `<h1>Booking reports</h1><form data-form="report" novalidate><div class="fields two">${field('from', 'From (travel date)', `type="date" value="${f}"`)}${field('to', 'To', `type="date" value="${t}"`)}</div>${msgH()}<button class="go" type="submit">Apply date range</button></form>
      <dl><dt>Active bookings</dt><dd>${r.totals.active}</dd><dt>Cancelled</dt><dd>${r.totals.cancelled}</dd><dt>Payments recorded</dt><dd>${peso(r.totals.collected)}</dd></dl>
      ${r.days.length ? `<div class="scroll"><table><tr><th>Travel date</th><th>Active</th><th>Cancelled</th><th>Collected</th></tr>${r.days.map(d => `<tr><td>${d.date}</td><td>${d.active}</td><td>${d.cancelled}</td><td>${peso(d.collected)}</td></tr>`).join('')}</table></div>` : '<div class="empty"><p><strong>No bookings in this range.</strong></p><p>Widen the dates to see more.</p></div>'}`;
    },

    async staff() {
      return `<h1>Staff accounts</h1><p class="hint">Create sign-ins for booking station staff.</p><form data-form="staff" novalidate><div class="fields two">${field('name', 'Full name')}${field('username', 'Username', 'autocomplete="off"', '3 to 30 characters')}</div><div class="fields two">${field('password', 'Password', 'type="password" autocomplete="new-password"', '10 or more characters')}<div class="field"><label for="role">Role</label><select id="role" name="role"><option value="staff">Booking staff</option><option value="admin">Administrator</option></select></div></div>${msgH()}<button class="go" type="submit">Create account</button></form>`;
    }
  };

  function payForm(b) {
    return `<form data-form="pay" data-id="${b._id}" novalidate><div class="fields two"><div class="field"><label>Amount due</label><input value="${peso(b.fare)}" disabled></div>${field('received', 'Amount received (₱)', `inputmode="decimal" value="${b.received || ''}"`)}</div>
    <div class="field" style="max-width:18rem"><label for="status">Payment status</label><select id="status" name="status">${['Unpaid', 'Partial', 'Paid'].map(x => `<option ${(b.payStatus || 'Unpaid') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>${msgH()}<button class="go" type="submit">Save payment</button></form>`;
  }

  const H = {
    async login(d) {
      if (!d.username.trim() || !d.password) throw new Error('Enter both username and password.');
      const r = await api('/api/v1/auth/login', { method: 'POST', body: { username: d.username, password: d.password } });
      S.token = r.token; S.user = r.user; S.view = 'dash';
      try { sessionStorage.setItem('tok', r.token); sessionStorage.setItem('usr', JSON.stringify(r.user)); } catch (e) { /* ignore */ }
      await render();
    },
    async profile(d) {
      const errs = [];
      if (d.name.trim().length < 2) errs.push('Enter your full name.');
      const c = d.contact.trim();
      if ((S.user.role === 'passenger' || c) && !/^[0-9+\-\s]{7,15}$/.test(c)) errs.push('Enter a valid contact number (7 to 15 digits).');
      if (errs.length) throw new Error(errs.join(' '));
      const r = await api('/api/v1/account/profile', { method: 'PATCH', body: { name: d.name, contact: d.contact } });
      S.token = r.token; S.user = r.user; saveSession();
      await render();
      show('Profile saved.', true);
    },
    async password(d, form) {
      if (!d.current) throw new Error('Enter your current password.');
      if (d.next.length < 10) throw new Error('New password must be at least 10 characters.');
      if (d.next !== d.again) throw new Error('The new passwords do not match.');
      await api('/api/v1/account/password', { method: 'PATCH', body: { current: d.current, next: d.next } });
      form.reset();
      show('Password changed.', true);
    },
    async browse(d) {
      const qty = Number(d.qty);
      if (!d.date) throw new Error('Choose a travel date.');
      if (d.date < today()) throw new Error('Travel date cannot be in the past.');
      const qe = L.validateQuantity(qty, L.maxTickets(S.user.role));
      if (qe) throw new Error(qe);
      S.bq = { date: d.date, qty, bus: d.busType || '' };
      await render();
    },
    async register(d) {
      const errs = L.validatePassenger({ name: d.name, contact: d.contact });
      if (errs.length) throw new Error(errs.join(' '));
      if (d.password.length < 10) throw new Error('Password must be at least 10 characters.');
      await api('/api/v1/auth/register', { method: 'POST', body: d });
      S.reg = false;
      await H.login({ username: d.username, password: d.password });
    },
    async search(d) {
      const q = { origin: d.origin, destination: d.destination, date: d.date, qty: Number(d.qty), bus: d.busType || '' };
      const errs = L.validateSearch(q, today());
      const qe = L.validateQuantity(q.qty, L.maxTickets(S.user.role));
      if (qe) errs.push(qe);
      if (errs.length) throw new Error(errs.join(' '));
      S.q = q;
      S.results = byBus(await api(`/api/v1/trips?origin=${encodeURIComponent(q.origin)}&destination=${encodeURIComponent(q.destination)}&date=${q.date}${q.bus ? '&busType=' + q.bus : ''}`), q.bus);
      await render();
    },
    async passenger(d) {
      const p = { name: d.name, contact: d.contact, type: d.type, idVerified: d.idVerified === 'on' };
      const errs = L.validatePassenger(p);
      if (errs.length) throw new Error(errs.join(' '));
      S.b.p = p; S.seatData = null; S.step = 3; await render();
    },
    async typeseats(d) {
      const r = L.parseSeatList(d.seatlist, S.seatData.capacity);
      if (r.error) throw new Error(r.error);
      const clash = r.seats.filter(n => S.seatData.taken.includes(n));
      if (clash.length) throw new Error('Seat ' + clash.join(', ') + ' is already taken.');
      if (r.seats.length > S.b.qty) throw new Error('You chose ' + S.b.qty + ' tickets but typed ' + r.seats.length + ' seats.');
      S.b.seats = r.seats;
      await renderView();
    },
    async confirm(d) {
      try {
        S.bk = await api('/api/v1/bookings', { method: 'POST', body: { tripId: S.b.tripId, travelDate: S.b.date, seats: S.b.seats, passenger: S.b.p, type: d.type } });
        S.step = 5; await render();
      } catch (e) {
        if (e.status === 409 && /Seat/.test(e.message)) { S.seatData = null; S.step = 3; await render(); }
        throw e;
      }
    },
    async pay(d, form) {
      const b = await api(`/api/v1/bookings/${form.dataset.id}/payment`, { method: 'PATCH', body: { received: d.received.trim(), status: d.status } });
      S.sel = b._id; S.view = 'find'; S.cancelling = false; await render();
    },
    async find(d) {
      if (!d.fq.trim()) throw new Error('Enter a booking reference or passenger name.');
      S.fq = d.fq.trim(); await render();
    },
    async cancel(d) {
      if (d.reason.trim().length < 3) throw new Error('Enter a reason for the cancellation.');
      await api(`/api/v1/bookings/${S.sel}/cancel`, { method: 'PATCH', body: { reason: d.reason } });
      S.cancelling = false; await render();
    },
    async trip(d) {
      const body = { origin: d.origin, destination: d.destination, time: d.time, capacity: d.capacity, fare: d.fare, date: d.date || '', busType: d.busType || 'ordinary' };
      if (!body.origin.trim() || !body.destination.trim() || !body.time || !String(body.capacity).trim() || !String(body.fare).trim()) throw new Error('Fill in origin, destination, time, capacity and fare.');
      if (S.et) await api('/api/v1/trips/' + S.et, { method: 'PATCH', body }); else await api('/api/v1/trips', { method: 'POST', body });
      S.et = null; await render();
    },
    async report(d) {
      if (!d.from || !d.to) throw new Error('Choose both dates.');
      if (d.from > d.to) throw new Error('The start date must come before the end date.');
      S.rf = d.from; S.rt = d.to; await render();
    },
    async staff(d, form) {
      await api('/api/v1/auth/staff', { method: 'POST', body: d });
      form.reset(); show('Account created for ' + d.username.trim().toLowerCase() + '.', true);
    }
  };

  const A = {
    go(v) { S.view = v; S.sel = null; S.cancelling = false; S.et = null; if (v === 'book') { S.step = 1; S.b = {}; S.results = null; S.q = null; S.seatData = null; } return render(); },
    out() { signOut(); },
    retry() { return render(); },
    pick(id) {
      const t = S.results.find(x => x._id === id);
      S.b = { tripId: id, date: S.q.date, trip: t, qty: S.q.qty || 1, seats: [] };
      S.seatData = null;
      if (S.user.role === 'passenger') { S.b.p = { name: S.user.name, contact: S.user.contact, type: 'Adult', idVerified: false }; S.step = 3; }
      else S.step = 2;
      return render();
    },
    booktrip(id) {
      const t = S.btrips.find(x => x._id === id);
      S.q = { origin: t.origin, destination: t.destination, date: S.bq.date, qty: S.bq.qty, bus: S.bq.bus || '' };
      S.results = [t];
      S.view = 'book';
      return A.pick(id);
    },
    // Click a 3D bus in the picker: update the hidden field and highlight, without redrawing the buses.
    bus(id, el) {
      const box = el.closest('.bus-pick'), inp = box.closest('form').querySelector('input[name=busType]');
      const next = (!box.dataset.req && inp.value === id) ? '' : id;
      inp.value = next;
      box.querySelectorAll('.bus-opt').forEach(o => {
        const on = o.dataset.id === next;
        o.classList.toggle('on', on);
        o.querySelector('button').setAttribute('aria-pressed', String(on));
      });
    },
    step(n) { S.step = Number(n); return render(); },
    async seat(n) {
      n = Number(n);
      const i = S.b.seats.indexOf(n);
      if (i >= 0) S.b.seats.splice(i, 1);
      else {
        if (S.b.seats.length >= S.b.qty) throw new Error('You chose ' + S.b.qty + ' ticket' + (S.b.qty > 1 ? 's' : '') + '. Deselect a seat first, or go back to change the number of tickets.');
        S.b.seats.push(n);
      }
      await renderView();
    },
    async refreshseats() { S.seatData = null; await renderView(); },
    review() {
      if (S.b.seats.length !== S.b.qty) throw new Error('Select ' + S.b.qty + ' seat' + (S.b.qty > 1 ? 's' : '') + '. You have selected ' + S.b.seats.length + '.');
      S.step = 4; return render();
    },
    async paygroup() {
      await api('/api/v1/bookings/group/' + S.bk.groupId + '/paid', { method: 'PATCH' });
      S.bk.paid = true; await render();
    },
    open(id) { S.sel = id; S.view = 'find'; S.cancelling = false; return render(); },
    back() { S.sel = null; S.cancelling = false; return render(); },
    docancel() { S.cancelling = true; return render(); },
    nocancel() { S.cancelling = false; return render(); },
    edittrip(id) { S.et = id; return render(); },
    canceledit() { S.et = null; return render(); },
    showreg() { S.reg = true; S.page = 'login'; return render(); },
    showlogin() { S.reg = false; S.page = 'login'; return render(); },
    showlanding() { S.reg = false; S.page = 'landing'; return render(); },
    async toggle(id, el) { await api('/api/v1/trips/' + id, { method: 'PATCH', body: { active: el.dataset.on !== 'true' } }); return render(); }
  };

  async function run(fn, btn) {
    if (btn) btn.disabled = true;
    try { await fn(); } catch (e) { show(e.message); if (!$('#msg')) alert(e.message); }
    finally { if (btn && btn.isConnected) btn.disabled = false; }
  }

  document.addEventListener('submit', e => {
    const name = e.target.dataset.form;
    if (!name) return;
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    run(() => H[name](Object.fromEntries(new FormData(e.target)), e.target), btn);
  });
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (el) run(() => A[el.dataset.act](el.dataset.arg, el), null);
  });

  initFx();
  render();
})();