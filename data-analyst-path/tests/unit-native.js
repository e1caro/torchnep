'use strict';
/* Inside the Android app the web code must hand copy / save / share to the native bridge. */
const assert = require('assert');
const { DA, test } = require('./harness');
const ui = DA.ui;

test('without the native bridge, ui.native() is null', () => {
  delete global.AnalystNative;
  assert.strictEqual(ui.native(), null);
});

test('inside the app, copy and download go through the native bridge', () => {
  const calls = [];
  global.AnalystNative = { copy: (t) => calls.push(['copy', t]), saveFile: (n, m, t) => calls.push(['save', n, m, t]), share: () => {} };
  try {
    ui.copy('hello code');
    ui.download('messy_orders.csv', '﻿a,b\n1,2\n', 'text/csv;charset=utf-8');
    ui.download('backup.json', '{}');
    assert.deepStrictEqual(calls[0], ['copy', 'hello code']);
    assert.deepStrictEqual(calls[1], ['save', 'messy_orders.csv', 'text/csv;charset=utf-8', '﻿a,b\n1,2\n']);
    assert.deepStrictEqual(calls[2], ['save', 'backup.json', 'text/plain;charset=utf-8', '{}'], 'default mime is supplied');
  } finally { delete global.AnalystNative; }
});

test('the app shell (assets copied into the APK) never needs the network or a service worker', () => {
  const fs = require('fs'), path = require('path');
  const pwa = fs.readFileSync(path.join(__dirname, '..', 'js/pwa.js'), 'utf8');
  assert.ok(/if \(ui\.native\(\)\) return;/.test(pwa), 'service worker registration is skipped inside the app');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(!/(?:src|href)="https?:\/\/(?!e1caro)/.test(html), 'index.html loads nothing from outside');
});
