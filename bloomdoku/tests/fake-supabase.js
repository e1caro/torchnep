/* A small stand-in for the account service, for tests: it answers the requests js/cloud.js makes and applies the
 * same rules as the real database (fitai-app/tools/supabase.sql for saves, tools/supabase.sql for bloom_*; the SQL
 * itself is checked by tests/sql.sh). Nothing here touches the network.
 *
 *   const fake = require('./fake-supabase.js')();
 *   cloud.fetch = fake.fetch;                    // Node: unit-cloud.js
 *   context.route('**' + '/auth/v1/**', ...)     // browser: e2e.js uses fake.handle(method, url, headers, body)
 *   fake.friendsOff = true                       // a project where tools/supabase.sql has not been run yet
 *   fake.offline = true                          // no connection
 */
'use strict';
module.exports = function () {
  const F = { users: {}, saves: {}, profiles: {}, friends: [], messages: [], reports: [], calls: [], friendsOff: false, offline: false, nextId: 1, nextMsg: 1 };
  const uuid = (n) => '00000000-0000-4000-8000-' + ('000000000000' + n).slice(-12);
  const session = (u) => ({ access_token: 'tok-' + u.id + '-' + (++u.tokens), refresh_token: 'ref-' + u.id, expires_in: 3600, user: { id: u.id } });
  const json = (status, body) => ({ status, body });
  const denied = () => json(403, { code: '42501', message: 'new row violates row-level security policy' });
  const related = (a, b) => F.friends.some((f) => (f.user_id === a && f.friend_id === b) || (f.user_id === b && f.friend_id === a));
  const mutual = (a, b) => F.friends.some((f) => f.user_id === a && f.friend_id === b) && F.friends.some((f) => f.user_id === b && f.friend_id === a);
  const pick = (row, select) => { if (!select || select === '*') return row; const o = {}; select.split(',').forEach((k) => { o[k] = row[k]; }); return o; };

  F.handle = function (method, url, headers, bodyText) {
    const u = new URL(url), path = u.pathname, q = u.searchParams, body = bodyText ? JSON.parse(bodyText) : null;
    F.calls.push(method + ' ' + path + u.search);
    // ---- accounts ----
    if (path === '/auth/v1/signup') {
      if (Object.values(F.users).some((x) => x.email === body.email)) return json(422, { msg: 'User already registered' });
      if (String(body.password).length < 6) return json(422, { msg: 'Password should be at least 6 characters' });
      const user = { id: uuid(F.nextId++), email: body.email, password: body.password, tokens: 0 };
      F.users[user.id] = user;
      return json(200, session(user));
    }
    if (path === '/auth/v1/token') {
      let user;
      if (q.get('grant_type') === 'password') user = Object.values(F.users).find((x) => x.email === body.email && x.password === body.password);
      else user = Object.values(F.users).find((x) => 'ref-' + x.id === body.refresh_token);
      return user ? json(200, session(user)) : json(400, { error_description: 'Invalid login credentials' });
    }
    const m = /^Bearer tok-(.+)-\d+$/.exec((headers && (headers.Authorization || headers.authorization)) || '');
    const me = m && F.users[m[1]] ? m[1] : null;
    if (!me) return json(401, { message: 'JWT expired' });
    const eq = (k) => (q.get(k) || '').replace(/^eq\./, '');

    // ---- the save of one account: only its owner ----
    if (path === '/rest/v1/saves') {
      if (method === 'GET') return json(200, eq('id') === me && F.saves[me] ? [pick(F.saves[me], q.get('select'))] : []);
      if (body.id !== me) return denied();
      F.saves[me] = { id: me, data: body.data, updated_at: body.updated_at };
      return json(201, null);
    }
    if (path === '/rest/v1/rpc/delete_my_account') {
      delete F.users[me]; delete F.saves[me]; delete F.profiles[me];
      F.friends = F.friends.filter((f) => f.user_id !== me && f.friend_id !== me);
      F.messages = F.messages.filter((x) => x.from_id !== me && x.to_id !== me);
      return json(204, null);
    }
    if (!/^\/rest\/v1\/(rpc\/)?bloom_/.test(path)) return json(404, { message: 'not found' });
    if (F.friendsOff) return json(404, { code: 'PGRST205', message: "Could not find the table 'public." + path.split('/').pop() + "' in the schema cache" });

    // ---- profiles: yours, and those of players with a friend row to or from you ----
    if (path === '/rest/v1/bloom_profiles') {
      if (method === 'GET') {
        const ids = q.get('id').startsWith('in.') ? q.get('id').slice(4, -1).split(',') : [eq('id')];
        return json(200, ids.filter((id) => F.profiles[id] && (id === me || related(me, id))).map((id) => pick(F.profiles[id], q.get('select'))));
      }
      if (method === 'POST') {
        if (body.id !== me || !/^[a-z0-9_]{3,20}$/.test(body.username) || !/^[A-HJ-NP-Z2-9]{6}$/.test(body.code)) return denied();
        if (F.profiles[me] || Object.values(F.profiles).some((p) => p.username === body.username || p.code === body.code)) return json(409, { code: '23505', message: 'duplicate key value violates unique constraint' });
        F.profiles[me] = { id: me, username: body.username, code: body.code, public: body.public || {}, updated_at: new Date().toISOString() };
        return json(201, null);
      }
      if (method === 'PATCH') {
        if (eq('id') !== me || !F.profiles[me]) return json(204, null); // the rules let nothing else match
        Object.assign(F.profiles[me], { public: body.public, updated_at: body.updated_at });
        return json(204, null);
      }
    }
    if (path === '/rest/v1/rpc/bloom_find') {
      const p = Object.values(F.profiles).find((x) => x.code === String(body.friend_code).toUpperCase());
      return json(200, p ? [{ id: p.id, username: p.username }] : []);
    }
    // ---- friends: a row (me, them) is my request; both rows mean friends ----
    if (path === '/rest/v1/bloom_friends') {
      if (method === 'GET') return json(200, F.friends.filter((f) => f.user_id === me || f.friend_id === me).map((f) => pick(f, q.get('select'))));
      if (body.user_id !== me || body.friend_id === me || !F.profiles[body.friend_id] || !F.profiles[me]) return denied();
      if (!F.friends.some((f) => f.user_id === me && f.friend_id === body.friend_id)) F.friends.push({ user_id: me, friend_id: body.friend_id });
      return json(201, null);
    }
    if (path === '/rest/v1/rpc/bloom_unfriend') {
      F.friends = F.friends.filter((f) => !((f.user_id === me && f.friend_id === body.other) || (f.user_id === body.other && f.friend_id === me)));
      return json(204, null);
    }
    // ---- messages: both read the conversation; only friends write, as themselves; the receiver marks as read ----
    if (path === '/rest/v1/bloom_messages') {
      if (method === 'GET') {
        let rows;
        if (q.get('or')) { const other = /to_id\.eq\.([0-9a-f-]+)\)/.exec(q.get('or'))[1]; rows = F.messages.filter((x) => (x.from_id === me && x.to_id === other) || (x.from_id === other && x.to_id === me)); }
        else rows = F.messages.filter((x) => x.to_id === me && x.to_id === eq('to_id') && !x.read_at);
        if (q.get('order') === 'id.desc') rows = rows.slice().sort((a, b) => b.id - a.id);
        return json(200, rows.slice(0, +(q.get('limit') || 1000)).map((x) => pick(x, q.get('select'))));
      }
      if (method === 'POST') {
        if (body.from_id !== me || !mutual(me, body.to_id) || body.read_at) return denied();
        if (!['text', 'sticker', 'garden'].includes(body.kind) || !body.body || body.body.length > 500) return json(400, { code: '23514', message: 'new row violates check constraint' });
        if (F.messages.filter((x) => x.from_id === me && Date.now() - Date.parse(x.created_at) < 60000).length >= 30) return json(400, { code: 'P0001', message: 'Too many messages. Wait a minute.' });
        const row = { id: F.nextMsg++, from_id: me, to_id: body.to_id, kind: body.kind, body: body.body, created_at: new Date().toISOString(), read_at: null };
        F.messages.push(row);
        return json(201, [row]);
      }
      if (method === 'PATCH') {
        if (Object.keys(body).join() !== 'read_at') return json(403, { code: '42501', message: 'permission denied for table bloom_messages' });
        F.messages.forEach((x) => { if (x.to_id === me && x.from_id === eq('from_id') && !x.read_at) x.read_at = body.read_at; });
        return json(204, null);
      }
      if (method === 'DELETE') { F.messages = F.messages.filter((x) => !(String(x.id) === eq('id') && x.from_id === me)); return json(204, null); }
    }
    if (path === '/rest/v1/bloom_reports') {
      if (body.reporter !== me) return denied();
      F.reports.push(body);
      return json(201, null);
    }
    return json(404, { message: 'not found' });
  };

  // The shape of window.fetch, for js/cloud.js in Node.
  F.fetch = function (url, init) {
    if (F.offline) return Promise.reject(new TypeError('Failed to fetch'));
    const r = F.handle(init.method || 'GET', url, init.headers || {}, init.body);
    return Promise.resolve({ ok: r.status < 300, status: r.status, text: () => Promise.resolve(r.body == null ? '' : JSON.stringify(r.body)) });
  };
  return F;
};
