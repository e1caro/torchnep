import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { pickUpdate, unpack, type Release } from '../src/native/update';

const rel = (n: number, assets: string[], extra: Partial<Release> = {}): Release => ({ tag_name: `bizsim-${n}`, html_url: `https://x/releases/bizsim-${n}`, assets: assets.map(name => ({ name, browser_download_url: `https://x/${n}/${name}` })), ...extra });

describe('in-app update', () => {
  it('picks the newest release this app can show, and says when one needs a new install', () => {
    const list = [rel(5, ['BizSim-1.5.apk', 'web.zip', 'shell-1']), rel(7, ['web.zip', 'shell-1']), rel(6, ['web.zip', 'shell-1']), { tag_name: 'analyst-99', assets: [{ name: 'web.zip', browser_download_url: 'no' }] }, rel(9, ['web.zip', 'shell-1'], { draft: true }), rel(8, ['BizSim-1.8.apk'])];
    expect(pickUpdate(list, 4, 1)).toMatchObject({ version: 7, zip: 'https://x/7/web.zip', needsApk: false });
    expect(pickUpdate(list, 7, 1)).toBeNull();
    expect(pickUpdate([], 0, 1)).toBeNull();
    const withNative = [...list, rel(10, ['web.zip', 'shell-2'])];
    expect(pickUpdate(withNative, 4, 1)).toMatchObject({ version: 10, zip: null, needsApk: true, page: 'https://x/releases/bizsim-10' });
    expect(pickUpdate(withNative, 4, 2)).toMatchObject({ version: 10, zip: 'https://x/10/web.zip', needsApk: false });
  });

  it('only unpacks a real web build whose files stay inside their folder', () => {
    const good = zipSync({ 'index.html': strToU8('<html>'), 'assets/index-abc.js': strToU8('x'), 'assets/sql-wasm-1.wasm': new Uint8Array([0, 97, 115, 109]), 'icon.svg': strToU8('<svg/>') });
    expect(unpack(good).map(f => f.path).sort()).toEqual(['assets/index-abc.js', 'assets/sql-wasm-1.wasm', 'icon.svg', 'index.html']);
    expect(() => unpack(zipSync({ 'index.html': strToU8('x'), 'assets/index-a.js': strToU8('x'), '../evil.js': strToU8('x') }))).toThrow('bad entry');
    expect(() => unpack(zipSync({ 'readme.txt': strToU8('x') }))).toThrow('not a BizSim web build');
    expect(() => unpack(strToU8('not a zip'))).toThrow();
  });
});
