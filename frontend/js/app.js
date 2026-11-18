(function () {
  const L = window.Logic;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const S = { reg: false, token: null, user: null, view: 'dash', step: 1, b: {}, q: null, results: null, sel: null, cancelling: false, fq: '', et: null, rf: null, rt: null };
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

  async function render() {
    const app = $('#app');
    if (!S.user && S.reg) {
    app.innerHTML = `<div class="login"><h1>Create a customer account</h1><form data-form="register" novalidate>${field('name', 'Full name')}${field('contact', 'Contact number', 'inputmode="tel"', '7 to 15 digits')}${field('username', 'Username', 'autocomplete="username"')}${field('password', 'Password', 'type="password" autocomplete="new-password"', '10 or more characters')}${msgH()}<div class="actions"><button class="go" type="submit">Create account</button><button class="alt" type="button" data-act="showlogin">Back to sign in</button></div></form></div>`;
    return;
    }
    if (!S.user) {
      app.innerHTML = `<div class="login"><h1>Bicol Isarog booking station</h1><p class="hint">Sign in with the account your administrator gave you.</p>
      <form data-form="login" novalidate>${field('username', 'Username', 'autocomplete="username"')}${field('password', 'Password', 'type="password" autocomplete="current-password"')}${msgH()}
      <button class="go" type="submit">Sign in</button></form><p style="margin-top:1rem"><button class="alt" data-act="showreg">New customer? Create an account</button></p></div>`;
      return;
    }
    const nav = S.user.role === 'passenger' ? [['book', 'Book a trip'], ['find', 'My bookings']] : [['book', 'New booking'], ['find', 'Find booking']];
    if (S.user.role === 'admin') nav.push(['trips', 'Trips and fares'], ['rep', 'Reports'], ['staff', 'Staff']);
    nav.unshift(['dash', 'Dashboard']);
    nav.push(['settings', 'Settings']);
    app.innerHTML = `<header class="top"><strong>Bicol Isarog</strong><nav aria-label="Main">${nav.map(n => `<button data-act="go" data-arg="${n[0]}" ${S.view === n[0] ? 'aria-current="page"' : ''}>${n[1]}</button>`).join('')}</nav>
      <span class="who">${esc(S.user.name)}</span><button data-act="out">Sign out</button></header><main id="view">${loadingH()}</main>`;
    try { $('#view').innerHTML = await VIEWS[S.view](); } catch (e) { $('#view').innerHTML = errorH(e.message); }
  }

  const stat = (n, label) => `<div><b>${n}</b><span>${label}</span></div>`;

  const VIEWS = {
        async dash() {
      const d = await api('/api/v1/dashboard');
      if (d.role === 'passenger') {
        return `<h1>Welcome, ${esc(S.user.name)}</h1>
        <div class="stats">${stat(d.upcoming, 'Upcoming trips')}${stat(d.unpaid, 'Unpaid bookings')}${stat(d.cancelled, 'Cancelled')}</div>
        <div class="actions"><button class="go" data-act="go" data-arg="book">Book a trip</button><button class="alt" data-act="go" data-arg="find">My bookings</button></div>
        <h2>Your next trips</h2>${d.next.length
          ? `<div class="scroll"><table><tr><th>Reference</th><th>Trip</th><th>Date</th><th>Seat</th><th>Payment</th><th></th></tr>${d.next.map(b => `<tr><td>${esc(b.reference)}</td><td>${esc((b.tripId || {}).origin)} to ${esc((b.tripId || {}).destination)}</td><td>${esc(b.travelDate)}</td><td>${b.seat}</td><td><span class="tag">${esc(b.payStatus)}</span></td><td><button class="alt" data-act="open" data-arg="${b._id}">Open</button></td></tr>`).join('')}</table></div><p class="hint">Pay the fare at the booking station. A booking is paid once staff record your payment.</p>`
          : '<div class="empty"><p><strong>No upcoming trips.</strong></p><p>Choose Book a trip to reserve a seat.</p></div>'}`;
      }
      const admin = d.role === 'admin';
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
        h += `<form data-form="search" novalidate><div class="fields three">${field('origin', 'Origin', `value="${esc(q.origin)}" placeholder="Naga"`)}${field('destination', 'Destination', `value="${esc(q.destination)}" placeholder="Manila"`)}${field('date', 'Travel date', `type="date" min="${today()}" value="${esc(q.date || today())}"`)}</div>${msgH()}<button class="go" type="submit">Search trips</button></form>`;
        if (S.results) {
          h += S.results.length ? `<h2>Departures</h2><div class="scroll"><table><tr><th>Time</th><th>Route</th><th>Seats left</th><th>Fare</th><th></th></tr>${S.results.map(t => `<tr><td>${t.time}</td><td>${esc(t.origin)} to ${esc(t.destination)}</td><td>${t.seatsLeft} of ${t.capacity}</td><td>${peso(t.fare)}</td><td>${t.seatsLeft > 0 ? `<button class="alt" data-act="pick" data-arg="${t._id}">Select</button>` : '<span class="tag bad">Fully booked</span>'}</td></tr>`).join('')}</table></div>`
            : '<div class="empty"><p><strong>No trips match.</strong></p><p>Check the spelling of the origin and destination, or ask an administrator to add the trip.</p></div>';
        }
      } else if (s === 2) {
        const p = b.p || {};
        h += `<h2>Passenger details</h2><p class="hint">Ask to see a valid ID and check that the name matches.</p><form data-form="passenger" novalidate><div class="fields two">${field('name', 'Full name', `value="${esc(p.name)}"`)}${field('contact', 'Contact number', `value="${esc(p.contact)}" inputmode="tel"`, '7 to 15 digits')}</div>
        <div class="field"><label for="ptype">Passenger type</label><select id="ptype" name="type">${['Adult', 'Student', 'Senior', 'PWD'].map(x => `<option ${p.type === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="field"><label><input type="checkbox" name="idVerified" ${p.idVerified ? 'checked' : ''}>Valid ID checked by staff</label></div>${msgH()}
        <div class="actions"><button class="alt" type="button" data-act="step" data-arg="1">Back</button><button class="go" type="submit">Continue to seats</button></div></form>`;
      } else if (s === 3) {
        const d = await api(`/api/v1/trips/${b.tripId}/seats?date=${b.date}`);
        const map = L.buildSeatMap(d.capacity, d.taken);
        h += `<h2>${esc(b.trip.origin)} to ${esc(b.trip.destination)}, ${b.trip.time}</h2><p>${b.date}. ${d.capacity - d.taken.length} seats left. Crossed-out seats are taken.</p>
        <div class="seats" role="group" aria-label="Seats">${map.map(x => `${(x.n - 1) % 5 === 2 ? '<span class="aisle"></span>' : ''}<button class="seat" data-act="seat" data-arg="${x.n}" aria-label="Seat ${x.n}${x.taken ? ', taken' : ''}" aria-pressed="${b.seat === x.n}" ${x.taken ? 'disabled' : ''}>${x.n}</button>`).join('')}</div>${msgH()}
        <div class="actions"><button class="alt" data-act="step" data-arg="${S.user.role === 'passenger' ? 1 : 2}">Back</button><button class="go" data-act="review">Review booking</button></div>`;
      } else if (s === 4) {
        const def = L.defaultBookingType(b.date, today());
        const cust = S.user.role === 'passenger';
        h += `<h2>Review booking</h2><dl><dt>Passenger</dt><dd>${esc(b.p.name)} (${b.p.type}), ${esc(b.p.contact)}</dd><dt>ID check</dt><dd>${b.p.idVerified ? 'Verified' : 'Not verified'}</dd><dt>Trip</dt><dd>${esc(b.trip.origin)} to ${esc(b.trip.destination)}, ${b.date} at ${b.trip.time}</dd><dt>Seat</dt><dd>${b.seat}</dd><dt>Fare</dt><dd>${peso(b.trip.fare)}</dd></dl>
        <form data-form="confirm"><div class="field" style="max-width:18rem"><label for="btype">Booking type</label><select id="btype" name="type">${(cust ? ['Advance reservation'] : ['Walk-in', 'Advance reservation']).map(x => `<option ${def === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>${msgH()}
        <div class="actions"><button class="alt" type="button" data-act="step" data-arg="3">Back</button><button class="go" type="submit">${cust ? 'Book this seat' : 'Save and record payment'}</button></div></form>`;
      } else if (S.user.role === 'passenger') {
      h += `<h2>Seat reserved</h2><p>Your reference is <strong>${esc(S.bk.reference)}</strong>. Pay the fare of ${peso(S.bk.fare)} at the booking station. The booking is not paid until staff record your payment.</p><div class="actions"><button class="go" data-act="open" data-arg="${S.bk._id}">View my booking</button></div>`;
      } else {
        h += `<h2>Booking ${esc(S.bk.reference)} saved</h2><p>Record the fare collected, or skip and do it later.</p>${payForm(S.bk)}<div class="actions"><button class="alt" data-act="open" data-arg="${S.bk._id}">Skip payment for now</button></div>`;
      }
      return h;
    },

    async find() {
      if (S.sel) {
        const b = await api('/api/v1/bookings/' + S.sel), t = b.tripId || {};
        return `<h1>Booking ${esc(b.reference)}</h1><p>${tag(b)} <span class="tag">${esc(b.payStatus)}</span> <span class="tag">${esc(b.type)}</span></p>
        <dl><dt>Passenger</dt><dd>${esc(b.passenger.name)} (${esc(b.passenger.type)}), ${esc(b.passenger.contact)}</dd><dt>ID verified</dt><dd>${b.passenger.idVerified ? 'Yes' : 'No'}</dd><dt>Trip</dt><dd>${esc(t.origin)} to ${esc(t.destination)}, ${esc(b.travelDate)} at ${esc(t.time)}</dd><dt>Seat</dt><dd>${b.seat}</dd><dt>Fare</dt><dd>${peso(b.fare)}</dd><dt>Received</dt><dd>${peso(b.received)}</dd>${b.status === 'Cancelled' ? `<dt>Cancelled</dt><dd>${esc(b.cancelReason)}</dd>` : ''}</dl>
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
      return `<h1>Trips and fares</h1>${list.length ? `<div class="scroll"><table><tr><th>Route</th><th>Departs</th><th>Date</th><th>Seats</th><th>Fare</th><th>Status</th><th></th></tr>${list.map(t => `<tr><td>${esc(t.origin)} to ${esc(t.destination)}</td><td>${t.time}</td><td>${esc(t.date) || 'Every day'}</td><td>${t.capacity}</td><td>${peso(t.fare)}</td><td>${t.active ? '<span class="tag good">Active</span>' : '<span class="tag">Inactive</span>'}</td><td><button class="alt" data-act="edittrip" data-arg="${t._id}">Edit</button> <button class="alt" data-act="toggle" data-arg="${t._id}" data-on="${t.active}">${t.active ? 'Deactivate' : 'Activate'}</button></td></tr>`).join('')}</table></div>` : '<div class="empty"><p><strong>No trips yet.</strong></p><p>Add the first trip below. Routes, times and fares come from the bus operator.</p></div>'}
      <h2>${S.et ? 'Edit trip' : 'Add trip'}</h2><form data-form="trip" novalidate><div class="fields two">${field('origin', 'Origin', `value="${esc(e.origin)}"`)}${field('destination', 'Destination', `value="${esc(e.destination)}"`)}</div><div class="fields three">${field('time', 'Departure time', `type="time" value="${esc(e.time)}"`)}${field('capacity', 'Bus capacity', `inputmode="numeric" value="${esc(e.capacity)}"`, '1 to 60')}${field('fare', 'Fare (₱)', `inputmode="decimal" value="${e.fare == null ? '' : e.fare}"`)}</div><div class="fields two">${field('date', 'Trip date', `type="date" min="${today()}" value="${esc(e.date)}"`, 'leave blank for a daily trip')}</div>${msgH()}
      <div class="actions"><button class="go" type="submit">${S.et ? 'Save changes' : 'Add trip'}</button>${S.et ? '<button class="alt" type="button" data-act="canceledit">Cancel edit</button>' : ''}</div></form>`;
    },

    async rep() {
      const f = S.rf || today().slice(0, 8) + '01', t = S.rt || today();
      const r = await api(`/api/v1/reports/bookings?from=${f}&to=${t}`);
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
    async register(d) {
    const errs = L.validatePassenger({ name: d.name, contact: d.contact });
    if (errs.length) throw new Error(errs.join(' '));
    if (d.password.length < 10) throw new Error('Password must be at least 10 characters.');
    await api('/api/v1/auth/register', { method: 'POST', body: d });
    S.reg = false;
    await H.login({ username: d.username, password: d.password });
    },
    async search(d) {
      const q = { origin: d.origin, destination: d.destination, date: d.date };
      const errs = L.validateSearch(q, today());
      if (errs.length) throw new Error(errs.join(' '));
      S.q = q;
      S.results = await api(`/api/v1/trips?origin=${encodeURIComponent(q.origin)}&destination=${encodeURIComponent(q.destination)}&date=${q.date}`);
      await render();
    },
    async passenger(d) {
      const p = { name: d.name, contact: d.contact, type: d.type, idVerified: d.idVerified === 'on' };
      const errs = L.validatePassenger(p);
      if (errs.length) throw new Error(errs.join(' '));
      S.b.p = p; S.step = 3; await render();
    },
    async confirm(d) {
      try {
        S.bk = await api('/api/v1/bookings', { method: 'POST', body: { tripId: S.b.tripId, travelDate: S.b.date, seat: S.b.seat, passenger: S.b.p, type: d.type } });
        S.step = 5; await render();
      } catch (e) {
        if (e.status === 409 && /Seat/.test(e.message)) { S.b.seat = null; S.step = 3; await render(); }
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
      const body = { origin: d.origin, destination: d.destination, time: d.time, capacity: d.capacity, fare: d.fare, date: d.date || '' };
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
    go(v) { S.view = v; S.sel = null; S.cancelling = false; S.et = null; if (v === 'book') { S.step = 1; S.b = {}; S.results = null; S.q = null; } return render(); },
    out() { signOut(); },
    retry() { return render(); },
    pick(id) {
    const t = S.results.find(x => x._id === id);
    S.b = { tripId: id, date: S.q.date, trip: t };
    if (S.user.role === 'passenger') { S.b.p = { name: S.user.name, contact: S.user.contact, type: 'Adult', idVerified: false }; S.step = 3; }
    else S.step = 2;
    return render();
    },
    step(n) { S.step = Number(n); return render(); },
    seat(n) { S.b.seat = Number(n); return render(); },
    review() { if (!S.b.seat) throw new Error('Select an available seat.'); S.step = 4; return render(); },
    open(id) { S.sel = id; S.view = 'find'; S.cancelling = false; return render(); },
    back() { S.sel = null; S.cancelling = false; return render(); },
    docancel() { S.cancelling = true; return render(); },
    nocancel() { S.cancelling = false; return render(); },
    edittrip(id) { S.et = id; return render(); },
    canceledit() { S.et = null; return render(); },
    showreg() { S.reg = true; return render(); },
    showlogin() { S.reg = false; return render(); },
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

  render();
})();
