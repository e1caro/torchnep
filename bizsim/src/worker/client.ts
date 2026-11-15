import type { Ops, Res } from './protocol';

type Progress = (p: { id: string; done: number; total: number }) => void;

class SimClient {
  private w: Worker | null = null;
  private seq = 0;
  private waiting = new Map<number, { ok: (v: unknown) => void; no: (e: Error) => void }>();
  onProgress: Progress = () => { };
  private worker(): Worker {
    if (!this.w) {
      this.w = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' });
      this.w.onmessage = (e: MessageEvent<Res>) => {
        const m = e.data;
        if ('progress' in m) return this.onProgress(m.progress);
        const p = this.waiting.get(m.id); if (!p) return;
        this.waiting.delete(m.id);
        if (m.ok) p.ok(m.result); else p.no(new Error(m.error));
      };
    }
    return this.w;
  }
  call<K extends keyof Ops>(op: K, args: Ops[K]['args']): Promise<Ops[K]['result']> {
    const id = ++this.seq;
    return new Promise((ok, no) => { this.waiting.set(id, { ok: ok as (v: unknown) => void, no }); this.worker().postMessage({ id, op, args }); });
  }
}
export const sim = new SimClient();
