// Saving a generated file. In a browser it is a normal download; inside the Android app a WebView cannot download,
// so the file is written to the app's cache and handed to the system share sheet (save to Files, Drive, e-mail…).

import { Capacitor } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();

function b64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function saveFile(name: string, mime: string, parts: Uint8Array[]): Promise<void> {
  if (!isNative()) {
    const url = URL.createObjectURL(new Blob(parts as BlobPart[], { type: mime })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return;
  }
  const { Filesystem, Directory } = await import('@capacitor/filesystem'), { Share } = await import('@capacitor/share');
  // base64 needs whole groups of 3 bytes, so the parts are re-cut into chunks of a multiple of 3
  const CH = 3 * 256 * 1024; let first = true, carry = new Uint8Array(0);
  const flush = async (chunk: Uint8Array) => {
    if (first) { await Filesystem.writeFile({ path: name, data: b64(chunk), directory: Directory.Cache }); first = false; }
    else await Filesystem.appendFile({ path: name, data: b64(chunk), directory: Directory.Cache });
  };
  for (const p of parts) {
    let buf = p;
    if (carry.length) { buf = new Uint8Array(carry.length + p.length); buf.set(carry); buf.set(p, carry.length); }
    let o = 0;
    for (; buf.length - o >= CH; o += CH) await flush(buf.subarray(o, o + CH));
    carry = buf.slice(o);
  }
  if (carry.length || first) await flush(carry);
  const { uri } = await Filesystem.getUri({ path: name, directory: Directory.Cache });
  await Share.share({ title: name, url: uri, dialogTitle: name });
}
