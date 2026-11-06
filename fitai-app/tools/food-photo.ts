// FitQuest: a photo of a meal, judged by a coach. Supabase Edge Function "food-photo".
// Free: it uses Google's Gemini API free tier. A key from an AI Studio project without billing is never charged; past
// the free quota Google answers 429 and the next model in the list is tried.
// Deploy: Supabase > Edge Functions > Deploy a new function > Via editor, name it food-photo, paste this file, Deploy.
// Secrets (Edge Functions > Secrets): GEMINI_API_KEY (required); GEMINI_MODELS (optional, comma-separated, tried in order).
// Needs tools/supabase-food.sql (5 photos a day per player). The photo is not stored anywhere.

const MODELS = (Deno.env.get('GEMINI_MODELS') || 'gemini-flash-latest,gemini-2.5-flash,gemini-flash-lite-latest,gemini-2.5-flash-lite')
  .split(',').map((s) => s.trim()).filter(Boolean);
const KEY = Deno.env.get('GEMINI_API_KEY') || '';
const SB = Deno.env.get('SUPABASE_URL') || '';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const out = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

const STR = { type: 'STRING' }, INT = { type: 'INTEGER' };
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_food: { type: 'BOOLEAN' },
    dish: STR,
    items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: STR, grams: INT, kcal: INT }, required: ['name', 'grams', 'kcal'] } },
    kcal: INT, protein: INT, carbs: INT, fat: INT, fiber: INT,
    score: INT,
    verdict: STR,
    explanation: STR,
    good: { type: 'ARRAY', items: STR },
    improve: { type: 'ARRAY', items: STR },
    confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
  },
  required: ['is_food', 'dish', 'items', 'kcal', 'protein', 'carbs', 'fat', 'fiber', 'score', 'verdict', 'explanation', 'good', 'improve', 'confidence'],
};

const GOALS: Record<string, [string, string]> = {
  fat: ['perder grasa', 'lose fat'], muscle: ['ganar músculo', 'build muscle'], strength: ['ganar fuerza', 'get stronger'], general: ['estar en forma y sano', 'stay fit and healthy'],
};
const clip = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const num = (v: unknown, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, Number(v) || 0)));

function system(es: boolean) {
  return es
    ? `Eres el entrenador de nutrición de FitQuest, una app de entrenamiento. Te mandan la foto de una comida y la valoras para esa persona.
Escribe en español de España, de tú, cercano y claro, como si se lo explicaras en persona: qué ves en el plato, cuánto hay más o menos, por qué le pones esa nota según su objetivo y qué cambiarías la próxima vez. Sé concreto (alimentos y cantidades), sin sermones ni culpa, sin consejos médicos ni diagnósticos.
Calcula las raciones por el tamaño del plato, los cubiertos y las manos que se vean. No inventes alimentos que no se ven; si algo no está claro (salsas, aceite, lo que hay debajo), dilo en la explicación y estima con prudencia.
La nota (score) va de 1 a 10: cuánto encaja esta comida con su objetivo y con lo que le toca a esa hora (10 = ideal).
explanation: 2 o 3 párrafos cortos separados por una línea en blanco. verdict: una frase. good e improve: hasta 3 puntos breves cada uno.
Si la foto no es comida, is_food = false, nota 1 y explica qué ves.`
    : `You are FitQuest's nutrition coach (FitQuest is a training app). You get a photo of a meal and rate it for this person.
Write in plain, friendly English, as if explaining it face to face: what you see on the plate, roughly how much, why it gets that score for their goal and what you would change next time. Be specific (foods and amounts), no lecturing or guilt, no medical advice or diagnoses.
Work out portions from the size of the plate, cutlery and any hands in view. Never invent foods you can't see; if something is unclear (sauces, oil, what is underneath), say so in the explanation and estimate cautiously.
The score goes from 1 to 10: how well this meal fits their goal and this time of day (10 = ideal).
explanation: 2 or 3 short paragraphs separated by a blank line. verdict: one sentence. good and improve: up to 3 short points each.
If the photo isn't food, is_food = false, score 1, and say what you see.`;
}

function ask(es: boolean, c: Record<string, unknown>) {
  const goal = GOALS[String(c.goal)] || GOALS.general;
  const lines = es
    ? [`Objetivo: ${goal[0]}.`, c.kcal ? `Calorías al día: unas ${num(c.kcal, 800, 6000)} kcal; proteína: unos ${num(c.protein, 20, 400)} g.` : '', c.meal ? `Comida del día: ${clip(c.meal, 30)}.` : '', c.note ? `La persona dice: "${clip(c.note, 140)}".` : '', 'Valora la comida de la foto.']
    : [`Goal: ${goal[1]}.`, c.kcal ? `Calories a day: about ${num(c.kcal, 800, 6000)} kcal; protein: about ${num(c.protein, 20, 400)} g.` : '', c.meal ? `Meal of the day: ${clip(c.meal, 30)}.` : '', c.note ? `The person says: "${clip(c.note, 140)}".` : '', 'Rate the meal in the photo.'];
  return lines.filter(Boolean).join('\n') + (es ? '\nResponde solo con el JSON.' : '\nAnswer with the JSON only.');
}

function parse(text: string) {
  const m = text.replace(/```(?:json)?/g, '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  let j: Record<string, unknown>;
  try { j = JSON.parse(m[0]); } catch { return null; }
  if (typeof j !== 'object' || !j || !j.explanation) return null;
  const list = (v: unknown) => (Array.isArray(v) ? v : []).map((x) => clip(x, 160)).filter(Boolean).slice(0, 4);
  return {
    is_food: j.is_food !== false,
    dish: clip(j.dish, 80),
    items: (Array.isArray(j.items) ? j.items : []).slice(0, 10).map((i: Record<string, unknown>) => ({ name: clip(i?.name, 60), grams: num(i?.grams, 0, 3000), kcal: num(i?.kcal, 0, 3000) })).filter((i) => i.name),
    kcal: num(j.kcal, 0, 6000), protein: num(j.protein, 0, 400), carbs: num(j.carbs, 0, 800), fat: num(j.fat, 0, 400), fiber: num(j.fiber, 0, 150),
    score: num(j.score, 1, 10),
    verdict: clip(j.verdict, 200),
    explanation: String(j.explanation).trim().slice(0, 2500),
    good: list(j.good), improve: list(j.improve),
    confidence: ['low', 'medium', 'high'].includes(String(j.confidence)) ? String(j.confidence) : 'medium',
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return out(405, { error: 'method' });
  if (!KEY) return out(503, { error: 'not_configured' });
  // the player's own session: the database checks who it is and counts today's photos
  const auth = req.headers.get('authorization') || '', apikey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const rpc = (fn: string) => fetch(`${SB}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { authorization: auth, apikey, 'content-type': 'application/json' }, body: '{}' });
  const left = await rpc('food_scans_left');
  if (!left.ok) return out(401, { error: 'auth' });
  const n = Number(await left.json());
  if (!(n > 0)) return out(429, { error: 'limit', left: 0 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return out(400, { error: 'body' }); }
  const img = String(body.image || '');
  if (img.length < 100 || img.length > 4_000_000 || !/^[A-Za-z0-9+/]+=*$/.test(img)) return out(400, { error: 'image' });
  const es = body.lang !== 'en', ctx = (body.ctx && typeof body.ctx === 'object' ? body.ctx : {}) as Record<string, unknown>;
  ctx.note = body.note;

  let result = null, status = 0;
  for (const model of MODELS) {
    for (const withSchema of [true, false]) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system(es) }] },
          contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: img } }, { text: ask(es, ctx) }] }],
          generationConfig: { temperature: 0.4, responseMimeType: 'application/json', ...(withSchema ? { responseSchema: SCHEMA } : {}) },
        }),
      }).catch(() => null);
      status = r?.status || 0;
      if (r && r.status === 400 && withSchema) continue; // this model doesn't take the schema: ask for plain JSON
      if (!r || !r.ok) break; // unknown model, free quota used up, or down: next model
      const j = await r.json().catch(() => ({}));
      const text = (j?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('');
      result = parse(text);
      break;
    }
    if (result) break;
  }
  if (!result) return out(status === 429 ? 503 : 502, { error: status === 429 ? 'busy' : 'ai' });

  const taken = await rpc('food_scan_take');
  const rest = taken.ok ? Number(await taken.json()) : n - 1;
  return out(200, { ...result, left: Math.max(0, rest) });
});
