(() => {
  // Block Space: demo-only prototype. No real payments, no real money, no network calls.
  const KEY = 'blockspace-demo-v1';
  const RATE = 0.12; // demo pot rate, 12% p.a.
  const EMOJIS = ['🎉', '🏠', '🚗', '✈️', '💍', '🎓', '📚', '🏖️'];

  const fmt = (n) => '₦' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const ago = (d) => new Date(Date.now() - d * 864e5).toISOString();
  const dayLabel = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const initials = (n) => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  const todayKey = () => new Date().toDateString();
  const CAT_ICON = { Income: '💼', Groceries: '🛒', Transport: '🚕', Bills: '🧾', Transfer: '↔️', Savings: '🐷', Topup: '➕', Card: '💳' };

  // ---------- data ----------
  function newCard(name) {
    const d = Array.from({ length: 16 }, (_, i) => (i === 0 ? 5 : Math.floor(Math.random() * 10)));
    const groups = [0, 4, 8, 12].map(s => d.slice(s, s + 4).join(''));
    return {
      number: groups.join(' '), holder: name.toUpperCase(), expiry: '12/30', cvv: '123',
      frozen: false, dailyLimit: 100000, perSpendLimit: 50000, spentToday: 0, spendDay: todayKey()
    };
  }

  function seed() {
    const people = [
      { id: 'chidi', name: 'Chidi Okafor', acct: '0123456789', wallet: 245300 },
      { id: 'amara', name: 'Amara Bello', acct: '0987654321', wallet: 98750.5 },
      { id: 'tunde', name: 'Tunde Adeyemi', acct: '0765432198', wallet: 31200 },
      { id: 'ngozi', name: 'Ngozi Eze', acct: '0811223344', wallet: 512000 }
    ];
    const users = {};
    people.forEach(p => {
      users[p.id] = {
        ...p,
        card: newCard(p.name),
        txns: [
          { id: uid(), type: 'in', title: 'Salary - Acme Ltd', amount: 350000, date: ago(9), category: 'Income' },
          { id: uid(), type: 'out', title: 'Shoprite Lekki', amount: 18450, date: ago(6), category: 'Groceries' },
          { id: uid(), type: 'out', title: 'Bolt ride', amount: 4200, date: ago(4), category: 'Transport' },
          { id: uid(), type: 'out', title: 'DSTV subscription', amount: 24500, date: ago(2), category: 'Bills' },
          { id: uid(), type: 'in', title: 'From Amara Bello', amount: 15000, date: ago(1), category: 'Transfer' }
        ],
        pots: []
      };
    });
    users.chidi.pots.push({
      id: uid(), name: 'Owambe fund', emoji: '🎉', target: 500000, balance: 124800, earned: 24800,
      history: [{ date: ago(60), balance: 100000 }, { date: ago(30), balance: 118500 }, { date: ago(0), balance: 124800 }]
    });
    return { v: 1, current: null, users };
  }

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && d.v === 1 && d.users) {
        Object.values(d.users).forEach(u => { if (!u.card) u.card = newCard(u.name); });
        return d;
      }
    } catch (e) { /* fall through to seed */ }
    const d = seed();
    localStorage.setItem(KEY, JSON.stringify(d));
    return d;
  }

  let db = load();
  const save = () => {
    // lite: cap stored history so localStorage never bloats
    Object.values(db.users).forEach(u => {
      if (Array.isArray(u.txns)) u.txns = u.txns.slice(0, 30);
      (u.pots || []).forEach(p => { if (Array.isArray(p.history)) p.history = p.history.slice(-12); });
    });
    localStorage.setItem(KEY, JSON.stringify(db));
  };
  const me = () => db.users[db.current];
  const potsTotal = (u) => u.pots.reduce((s, p) => s + p.balance, 0);
  const totalOf = (u) => u.wallet + potsTotal(u);
  function cardToday(c) {
    if (c.spendDay !== todayKey()) { c.spendDay = todayKey(); c.spentToday = 0; }
    return c;
  }

  const ui = { view: 'home', q: '', to: null, step: 1, amount: '', note: '', potId: null, filter: 'all', err: '', last: null, newPotErr: '', cardErr: '', cardMsg: '' };

  // ---------- actions ----------
  function transfer(fromId, toId, amount, note) {
    const from = db.users[fromId], to = db.users[toId];
    from.wallet -= amount;
    to.wallet += amount;
    const ts = new Date().toISOString();
    from.txns.unshift({ id: uid(), type: 'out', title: 'To ' + to.name, amount, date: ts, category: 'Transfer', note });
    to.txns.unshift({ id: uid(), type: 'in', title: 'From ' + from.name, amount, date: ts, category: 'Transfer', note });
    save();
  }

  function findPot() { return me().pots.find(p => p.id === ui.potId); }
  function resetSend() { ui.to = null; ui.step = 1; ui.q = ''; ui.amount = ''; ui.note = ''; ui.err = ''; }

  const actions = {
    login(d) { db.current = d.id; ui.view = 'home'; ui.cardMsg = ''; ui.cardErr = ''; save(); },
    logout() { db.current = null; save(); ui.view = 'home'; },
    go(d) { ui.view = d.v; ui.err = ''; ui.cardErr = ''; ui.cardMsg = ''; if (d.v === 'send') resetSend(); },
    topup() {
      me().wallet += 50000;
      me().txns.unshift({ id: uid(), type: 'in', title: 'Demo top-up (fake)', amount: 50000, date: new Date().toISOString(), category: 'Topup' });
      save();
    },
    pick(d) { ui.to = d.id; ui.step = 2; ui.err = ''; },
    chip(d) { ui.amount = d.amt; },
    back() { ui.step = Math.max(1, ui.step - 1); ui.err = ''; if (ui.step === 1) ui.to = null; },
    confirm() {
      const amt = Number(ui.amount);
      if (!(amt > 0) || amt > me().wallet || !db.users[ui.to]) { ui.err = 'this transfer can no longer be completed, check the amount'; ui.step = 2; return; }
      transfer(me().id, ui.to, amt, ui.note);
      ui.last = { amt, to: db.users[ui.to].name };
      ui.step = 4;
    },
    done() { resetSend(); ui.view = 'home'; },
    openPot(d) { ui.potId = d.id; ui.view = 'pot'; ui.err = ''; },
    newPot() { ui.view = 'newpot'; ui.newPotErr = ''; },
    simulate() {
      const p = findPot(); if (!p) return;
      const add = p.balance * RATE * 30 / 365;
      p.balance += add; p.earned += add;
      p.history.push({ date: new Date().toISOString(), balance: p.balance });
    },
    closePot() {
      const p = findPot(); if (!p) return;
      me().wallet += p.balance;
      me().txns.unshift({ id: uid(), type: 'in', title: 'Closed pot: ' + p.name, amount: p.balance, date: new Date().toISOString(), category: 'Savings' });
      me().pots = me().pots.filter(x => x.id !== p.id);
      ui.view = 'pots'; ui.err = '';
    },
    filter(d) { ui.filter = d.f; },
    reset() {
      localStorage.removeItem(KEY);
      db = seed(); save(); render();
    },
    toggleFreeze() {
      const c = cardToday(me().card);
      c.frozen = !c.frozen;
      ui.cardMsg = c.frozen ? 'card frozen. spends are declined until you unfreeze.' : 'card unfrozen.';
      ui.cardErr = '';
    }
  };

  // ---------- forms ----------
  const forms = {
    search(f, d) { ui.q = String(d.get('q') || '').trim(); },
    details(f, d) {
      const amt = Number(d.get('amount'));
      if (!(amt > 0)) { ui.err = 'enter an amount above ₦0'; return; }
      if (amt > me().wallet) { ui.err = 'that is more than your wallet balance'; return; }
      ui.amount = String(amt); ui.note = String(d.get('note') || '').slice(0, 60); ui.step = 3; ui.err = '';
    },
    addToPot(f, d) {
      const p = findPot(); const amt = Number(d.get('amount'));
      if (!p) return;
      if (!(amt > 0)) { ui.err = 'enter an amount above ₦0'; return; }
      if (amt > me().wallet) { ui.err = 'not enough in your wallet'; return; }
      me().wallet -= amt; p.balance += amt;
      p.history.push({ date: new Date().toISOString(), balance: p.balance });
      me().txns.unshift({ id: uid(), type: 'out', title: 'To pot: ' + p.name, amount: amt, date: new Date().toISOString(), category: 'Savings' });
      ui.err = '';
    },
    withdrawPot(f, d) {
      const p = findPot(); const amt = Number(d.get('amount'));
      if (!p) return;
      if (!(amt > 0) || amt > p.balance) { ui.err = 'amount must be above ₦0 and within the pot balance'; return; }
      p.balance -= amt; me().wallet += amt;
      p.history.push({ date: new Date().toISOString(), balance: p.balance });
      me().txns.unshift({ id: uid(), type: 'in', title: 'From pot: ' + p.name, amount: amt, date: new Date().toISOString(), category: 'Savings' });
      ui.err = '';
    },
    newPot(f, d) {
      const name = String(d.get('name') || '').trim().slice(0, 30);
      const target = Number(d.get('target'));
      if (!name) { ui.newPotErr = 'give your pot a name'; return; }
      if (!(target > 0)) { ui.newPotErr = 'set a target above ₦0'; return; }
      const pot = { id: uid(), name, emoji: d.get('emoji') || '🎯', target, balance: 0, earned: 0, history: [{ date: new Date().toISOString(), balance: 0 }] };
      me().pots.push(pot);
      ui.potId = pot.id; ui.view = 'pot'; ui.newPotErr = '';
    },
    setLimits(f, d) {
      const c = cardToday(me().card);
      const daily = Number(d.get('daily')), per = Number(d.get('per'));
      if (!(daily > 0) || !(per > 0)) { ui.cardErr = 'limits must be above ₦0'; ui.cardMsg = ''; return; }
      if (per > daily) { ui.cardErr = 'per-spend limit cannot be higher than the daily limit'; ui.cardMsg = ''; return; }
      c.dailyLimit = daily; c.perSpendLimit = per;
      ui.cardErr = ''; ui.cardMsg = 'limits saved (demo).';
    },
    testSpend(f, d) {
      const c = cardToday(me().card);
      const amt = Number(d.get('amount'));
      const merchant = String(d.get('merchant') || 'Demo merchant').slice(0, 30);
      if (c.frozen) { ui.cardErr = 'card is frozen. unfreeze it to spend.'; ui.cardMsg = ''; return; }
      if (!(amt > 0)) { ui.cardErr = 'enter an amount above ₦0'; ui.cardMsg = ''; return; }
      if (amt > c.perSpendLimit) { ui.cardErr = 'over your per-spend limit of ' + fmt(c.perSpendLimit); ui.cardMsg = ''; return; }
      if (c.spentToday + amt > c.dailyLimit) { ui.cardErr = 'over your daily limit. ' + fmt(Math.max(0, c.dailyLimit - c.spentToday)) + ' left today.'; ui.cardMsg = ''; return; }
      if (amt > me().wallet) { ui.cardErr = 'insufficient wallet balance'; ui.cardMsg = ''; return; }
      me().wallet -= amt; c.spentToday += amt;
      me().txns.unshift({ id: uid(), type: 'out', title: merchant + ' (card)', amount: amt, date: new Date().toISOString(), category: 'Card' });
      ui.cardErr = ''; ui.cardMsg = 'approved ' + fmt(amt) + ' at ' + merchant + ' (demo).';
    }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = actions[el.dataset.act];
    if (fn) { fn(el.dataset); save(); render(); }
  });
  document.addEventListener('input', (e) => {
    if (e.target.name === 'q') { forms.search(null, { get: () => e.target.value }); renderRecipients(); }
    if (e.target.name === 'amount') ui.amount = e.target.value;
    if (e.target.name === 'note') ui.note = e.target.value;
  });
  document.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target; const name = f.dataset.form;
    if (forms[name]) { forms[name](f, new FormData(f)); save(); render(); }
  });

  // ---------- views ----------
  function txList(list) {
    if (!list.length) return '<div class="empty">no transactions yet</div>';
    return list.map(t => `
      <div class="tx">
        <div class="dot">${CAT_ICON[t.category] || '💸'}</div>
        <div class="meta">
          <div class="title">${esc(t.title)}</div>
          <div class="sub">${dayLabel(t.date)}${t.note ? ' · ' + esc(t.note) : ''}</div>
        </div>
        <div class="amt ${t.type}">${t.type === 'in' ? '+' : '-'}${fmt(t.amount)}</div>
      </div>`).join('');
  }

  function homeView() {
    const u = me(); const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    return `
      <div class="top">
        <div><div class="muted">${greet}</div><div class="name">${esc(u.name.split(' ')[0])}</div></div>
        <button class="avatar" data-act="logout" title="Switch demo user">${initials(u.name)}</button>
      </div>
      <div class="card hero">
        <div class="label">Total balance</div>
        <div class="big">${fmt(totalOf(u))}</div>
        <div class="split">
          <div class="mini"><span class="muted">Wallet</span><b>${fmt(u.wallet)}</b></div>
          <div class="mini"><span class="muted">Savings pots</span><b>${fmt(potsTotal(u))}</b></div>
        </div>
        <div class="acct">Block Space · ${u.acct}</div>
      </div>
      <div class="actions">
        <button class="action" data-act="go" data-v="send"><i>↗</i>Send</button>
        <button class="action" data-act="topup"><i>＋</i>Top up</button>
        <button class="action" data-act="go" data-v="pots"><i>🐷</i>Pots</button>
      </div>
      <h3>Recent activity <a data-act="go" data-v="activity">See all</a></h3>
      <div class="card" style="padding:4px 16px">${txList(u.txns.slice(0, 5))}</div>`;
  }

  function recipientList() {
    const q = ui.q.toLowerCase();
    const list = Object.values(db.users).filter(x => x.id !== db.current)
      .filter(x => !q || x.name.toLowerCase().includes(q) || x.acct.includes(q));
    if (!list.length) return '<div class="empty">no Block Space demo user matches that</div>';
    return list.map(x => `
      <button class="user" data-act="pick" data-id="${x.id}">
        <div class="avatar">${initials(x.name)}</div>
        <div><div style="font-weight:600">${esc(x.name)}</div><div class="acct-n">Block Space · ${x.acct}</div></div>
      </button>`).join('');
  }
  function renderRecipients() { const el = document.getElementById('recipients'); if (el) el.innerHTML = recipientList(); }

  function sendView() {
    const u = me();
    const head = `<button class="back" data-act="go" data-v="home">← Back</button>`;
    if (ui.step === 4) {
      return `<div class="ok">
        <div class="tick">✓</div>
        <div class="title-lg">Sent</div>
        <div class="muted">${fmt(ui.last.amt)} to ${esc(ui.last.to)} (demo)</div>
        <div class="muted" style="margin-top:6px">Wallet now ${fmt(u.wallet)}</div>
        <button class="btn" data-act="done">Done</button></div>`;
    }
    if (ui.step === 1) {
      return `${head}<div class="title-lg">Send money</div>
        <div class="muted" style="margin-bottom:14px">Demo users only. No real money moves.</div>
        <form class="search" data-form="search" onsubmit="return false">
          <input name="q" placeholder="Search name or account number" value="${esc(ui.q)}" autocomplete="off">
        </form>
        <div id="recipients">${recipientList()}</div>`;
    }
    if (ui.step === 2) {
      const to = db.users[ui.to];
      if (!to) { resetSend(); return sendView(); }
      return `${head}<div class="title-lg">Amount</div>
        <div class="muted" style="margin-bottom:14px">To ${esc(to.name)} · ${to.acct}</div>
        <form data-form="details">
          <div class="card" style="text-align:center">
            <div class="muted">Wallet ${fmt(u.wallet)}</div>
            <input name="amount" type="number" min="1" step="0.01" inputmode="decimal" placeholder="0.00" value="${esc(ui.amount)}" style="font-size:32px;font-weight:800;text-align:center;margin-top:10px">
          </div>
          <div class="chips">
            ${[1000, 5000, 10000, 20000].map(a => `<button type="button" class="chip" data-act="chip" data-amt="${a}">${fmt(a)}</button>`).join('')}
          </div>
          <label class="field"><span>Note (optional)</span><input name="note" maxlength="60" placeholder="e.g. lunch" value="${esc(ui.note)}"></label>
          ${ui.err ? `<div class="err">${esc(ui.err)}</div>` : ''}
          <button class="btn" type="submit">Review</button>
        </form>`;
    }
    if (ui.step === 3) {
      const to = db.users[ui.to];
      if (!to) { resetSend(); return sendView(); }
      return `${head}<div class="title-lg">Review</div>
        <div class="card" style="margin-top:12px">
          <div class="row"><span class="muted">Amount</span><b>${fmt(ui.amount)}</b></div>
          <div class="row" style="margin-top:12px"><span class="muted">To</span><b>${esc(to.name)}</b></div>
          <div class="row" style="margin-top:12px"><span class="muted">Account</span><b>${to.acct}</b></div>
          <div class="row" style="margin-top:12px"><span class="muted">Note</span><b>${esc(ui.note) || '-'}</b></div>
          <div class="row" style="margin-top:12px"><span class="muted">Fee</span><b>₦0.00 (demo)</b></div>
        </div>
        ${ui.err ? `<div class="err">${esc(ui.err)}</div>` : ''}
        <div class="btn-row">
          <button class="btn ghost" data-act="back">Edit</button>
          <button class="btn" data-act="confirm">Send ${fmt(ui.amount)}</button>
        </div>`;
    }
    return head;
  }

  function potsView() {
    const u = me();
    const cards = u.pots.map(p => {
      const pct = Math.min(100, (p.balance / p.target) * 100);
      return `<button class="pot" data-act="openPot" data-id="${p.id}">
        <div class="row"><div class="row" style="gap:10px"><span class="emo">${p.emoji}</span><b>${esc(p.name)}</b></div><span class="pill">+${fmt(p.earned)}</span></div>
        <div class="bar"><div style="width:${pct.toFixed(1)}%"></div></div>
        <div class="row muted" style="font-size:12px"><span>${fmt(p.balance)}</span><span>of ${fmt(p.target)} · ${pct.toFixed(0)}%</span></div>
      </button>`;
    }).join('');
    return `<div class="title-lg" style="margin-top:4px">Savings pots</div>
      <div class="muted" style="margin-bottom:14px">Demo growth at ${(RATE * 100).toFixed(0)}% p.a. Total in pots ${fmt(potsTotal(u))}</div>
      ${cards || '<div class="empty">no pots yet. make one for your next goal.</div>'}
      <button class="btn" data-act="newPot">+ New pot</button>`;
  }

  function spark(p) {
    const h = p.history; if (h.length < 2) return '';
    const w = 340, ht = 130;
    const max = Math.max(...h.map(x => x.balance), 1);
    const pts = h.map((x, i) => [i * (w / (h.length - 1)), ht - (x.balance / max) * (ht - 12) - 6]);
    const d = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
    return `<svg class="spark" viewBox="0 0 ${w} ${ht}" preserveAspectRatio="none">
      <path d="${d} L${w} ${ht} L0 ${ht} Z" class="area"/><path d="${d}" class="line"/></svg>`;
  }

  function potView() {
    const p = findPot(); if (!p) { ui.view = 'pots'; return potsView(); }
    const pct = Math.min(100, (p.balance / p.target) * 100);
    const monthly = p.balance * RATE / 12;
    return `<button class="back" data-act="go" data-v="pots">← All pots</button>
      <div class="card hero">
        <div class="row"><span style="font-size:28px">${p.emoji}</span><span class="pill">${RATE * 100}% p.a. (demo)</span></div>
        <div class="title-lg" style="margin-top:8px">${esc(p.name)}</div>
        <div class="big">${fmt(p.balance)}</div>
        <div class="bar"><div style="width:${pct.toFixed(1)}%"></div></div>
        <div class="row muted" style="font-size:12px"><span>Target ${fmt(p.target)}</span><span>${pct.toFixed(1)}%</span></div>
        <div class="split">
          <div class="mini"><span class="muted">Interest earned</span><b style="color:var(--accent)">${fmt(p.earned)}</b></div>
          <div class="mini"><span class="muted">Est. per month</span><b>${fmt(monthly)}</b></div>
        </div>
      </div>
      <div class="card"><div class="row"><b>Growth</b><span class="muted" style="font-size:12px">${p.history.length} points</span></div>${spark(p)}</div>
      ${ui.err ? `<div class="err">${esc(ui.err)}</div>` : ''}
      <div class="card">
        <form data-form="addToPot"><label class="field"><span>Add from wallet (${fmt(me().wallet)} available)</span><input name="amount" type="number" min="1" step="0.01" placeholder="0.00"></label><button class="btn" type="submit">Add to pot</button></form>
        <form data-form="withdrawPot" style="margin-top:14px"><label class="field"><span>Withdraw to wallet</span><input name="amount" type="number" min="1" step="0.01" placeholder="0.00"></label><button class="btn ghost" type="submit">Withdraw</button></form>
      </div>
      <div class="btn-row">
        <button class="btn ghost" data-act="simulate">Simulate 30 days</button>
        <button class="btn danger" data-act="closePot">Close pot</button>
      </div>
      <div class="muted" style="font-size:12px;margin-top:10px">Simulate 30 days adds interest at the demo rate. Closing the pot returns the balance to your wallet.</div>`;
  }

  function newPotView() {
    return `<button class="back" data-act="go" data-v="pots">← Cancel</button>
      <div class="title-lg">New savings pot</div>
      <div class="muted" style="margin-bottom:14px">Name it, set a target, and start adding from your wallet.</div>
      <form data-form="newPot">
        <label class="field"><span>Pot name</span><input name="name" maxlength="30" placeholder="e.g. Japa fund" required></label>
        <label class="field"><span>Target</span><input name="target" type="number" min="1" step="1" placeholder="500000" required></label>
        <label class="field"><span>Icon</span><select name="emoji">${EMOJIS.map(e => `<option value="${e}">${e}</option>`).join('')}</select></label>
        ${ui.newPotErr ? `<div class="err">${esc(ui.newPotErr)}</div>` : ''}
        <button class="btn" type="submit">Create pot</button>
      </form>`;
  }

  function cardView() {
    const u = me();
    const c = cardToday(u.card);
    const left = Math.max(0, c.dailyLimit - c.spentToday);
    const pct = Math.min(100, (c.spentToday / c.dailyLimit) * 100);
    const cardMsgOk = ui.cardMsg ? `<div class="muted" style="color:var(--accent);margin:8px 0">${esc(ui.cardMsg)}</div>` : '';
    return `<div class="title-lg" style="margin-top:4px">Virtual card</div>
      <div class="muted" style="margin-bottom:14px">Demo card. Fake number, no real charges.</div>
      <div class="vcard ${c.frozen ? 'frozen' : ''}">
        <div class="row"><span class="brand">Block<span>Space</span></span><span class="pill">${c.frozen ? 'FROZEN' : 'ACTIVE'}</span></div>
        <div class="vnum">${esc(c.number)}</div>
        <div class="row" style="font-size:12px;opacity:.85"><span>${esc(c.holder)}</span><span>exp ${c.expiry} · cvv ${c.cvv}</span></div>
      </div>
      <div class="card"><div class="row"><div><b>Freeze card</b><div class="muted" style="font-size:12px">Declines all spends until unfrozen</div></div>
        <button class="btn ${c.frozen ? '' : 'ghost'}" style="width:auto;padding:10px 14px;margin:0" data-act="toggleFreeze">${c.frozen ? 'Unfreeze' : 'Freeze'}</button></div></div>
      <div class="card">
        <div class="row"><b>Spending today</b><span class="muted" style="font-size:12px">${fmt(left)} left</span></div>
        <div class="bar"><div style="width:${pct.toFixed(1)}%"></div></div>
        <div class="muted" style="font-size:12px">${fmt(c.spentToday)} of ${fmt(c.dailyLimit)} daily limit</div>
      </div>
      <div class="card">
        <b>Limits</b>
        <form data-form="setLimits" style="margin-top:12px">
          <label class="field"><span>Daily limit (₦)</span><input name="daily" type="number" min="1" step="1" value="${c.dailyLimit}"></label>
          <label class="field"><span>Per-spend limit (₦)</span><input name="per" type="number" min="1" step="1" value="${c.perSpendLimit}"></label>
          <button class="btn ghost" type="submit">Save limits</button>
        </form>
      </div>
      <div class="card">
        <b>Test spend (demo)</b>
        <form data-form="testSpend" style="margin-top:12px">
          <label class="field"><span>Merchant</span><input name="merchant" maxlength="30" placeholder="e.g. Jumia"></label>
          <label class="field"><span>Amount (₦)</span><input name="amount" type="number" min="1" step="0.01" placeholder="0.00"></label>
          <button class="btn" type="submit">Spend on card</button>
        </form>
      </div>
      ${ui.cardErr ? `<div class="err">${esc(ui.cardErr)}</div>` : ''}
      ${cardMsgOk}`;
  }

  function activityView() {
    const f = ui.filter;
    const list = me().txns.filter(t => f === 'all' || t.type === f).slice(0, 60);
    const chip = (k, label) => `<button class="chip ${f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${label}</button>`;
    return `<div class="title-lg" style="margin-top:4px">Activity</div>
      <div class="chips" style="margin-top:12px">${chip('all', 'All')}${chip('in', 'Money in')}${chip('out', 'Money out')}</div>
      <div class="card" style="padding:4px 16px">${txList(list)}</div>`;
  }

  function loginView() {
    return `<div class="login-wrap">
      <div class="demo-banner">Demo · fake money only</div>
      <div class="brand" style="font-size:26px">Block<span>Space</span></div>
      <div class="title-lg" style="margin-top:18px">Pick a demo user</div>
      <div class="muted" style="margin-bottom:18px">No real accounts, no real payments. Transfers only move fake balances between these demo users.</div>
      ${Object.values(db.users).map(u => `
        <button class="user" data-act="login" data-id="${u.id}">
          <div class="avatar">${initials(u.name)}</div>
          <div style="flex:1"><div style="font-weight:600">${esc(u.name)}</div><div class="acct-n">${u.acct} · wallet ${fmt(u.wallet)}</div></div>
          <span class="muted">›</span>
        </button>`).join('')}
      <button class="user" data-act="reset" style="justify-content:center;color:#c0392b">Reset demo data</button>
    </div>`;
  }

  const TABS = [
    { v: 'home', label: 'Home', icon: '⌂' },
    { v: 'send', label: 'Send', icon: '↗' },
    { v: 'pots', label: 'Pots', icon: '🐷' },
    { v: 'card', label: 'Card', icon: '💳' },
    { v: 'activity', label: 'Activity', icon: '≡' }
  ];

  function render() {
    const app = document.getElementById('app');
    if (!db.current || !db.users[db.current]) { app.innerHTML = loginView(); return; }
    const views = { home: homeView, send: sendView, pots: potsView, pot: potView, newpot: newPotView, activity: activityView, card: cardView };
    const tabView = ui.view === 'newpot' || ui.view === 'pot' ? 'pots' : ui.view;
    const body = (views[ui.view] || homeView)();
    const nav = TABS.map(t => `<button class="${tabView === t.v ? 'on' : ''}" data-act="go" data-v="${t.v}"><i>${t.icon}</i>${t.label}</button>`).join('');
    app.innerHTML = `<div class="demo-banner">Demo · fake money</div>${body}<nav class="nav">${nav}</nav>`;
  }


  render();
})();
