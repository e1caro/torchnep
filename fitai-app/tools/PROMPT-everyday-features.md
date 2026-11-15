# Prompt: make FitQuest better for everyday training

**Context.** FitQuest is a gamified workout app (vanilla JS PWA in `fitai-app/`, wrapped in an Android WebView). Players
mostly use it to follow their routines and log sets. Dungeons, bets, the Guild and other side systems get little use.
The goal is to make the **core loop** (open the app → train → log sets → see progress) feel faster, smarter and more
rewarding, the way Strong, Hevy or Fitbod do, without adding new game systems or making screens busier.

**Rules.**
- Improve what people already do every session; add no new currencies, modes or menus.
- Every feature should be one tap away from where it's needed, and invisible when it isn't.
- Works offline, in Spanish and English, in every interface skin, on a phone held with one hand.
- Add-on code in its own file (`everyday.js`), wrapping existing screens; no rewrites of `app.js` flows.
- Old data keeps working; new data is optional fields.

**Build these, in this order:**

1. **Smarter set logging (the workout screen).**
   - Under each exercise, "Last time: 60 kg × 8, 8, 7" from the most recent workout with it.
   - A suggestion chip: if last time every set reached the top of the rep target, suggest +2.5 kg (barbell, machine,
     cable) or +1 kg (dumbbells, kettlebells); otherwise the same weight for one more rep. Tapping it fills the sets.
   - Big − / + steppers next to the weight (±2.5 kg, ±1 for dumbbells) and reps (±1), so typing is rarely needed.
   - Ticking a set copies its weight and reps into the next empty set.

2. **A rest timer that just works.**
   - Starts by itself when a set is ticked (the exercise's rest time), counts from a timestamp so it survives the
     screen turning off, and ends with a sound and a vibration.
   - Shows as a small countdown bar on the workout screen (with −15 s / +15 s / skip), not a blocking dialog.

3. **Exercise notes.** A "Note" field per exercise (seat height, grip, cues) saved on the device, shown on the
   workout screen and on the exercise page.

4. **A useful history.**
   - Progress › History grouped by week; each workout opens a detail page: date, duration, sets, total kilos, every
     exercise with its sets, records marked with a trophy.
   - "Repeat this workout" starts the same exercises with last time's weights; "Delete" with a confirmation.

5. **A finish screen worth looking at.**
   - Duration, sets, total kilos and the change against the last time the same workout was done (+x %).
   - The new records, the muscles worked, and a one-tap "How did it feel?" (easy / good / hard) saved with the workout.

6. **Quick start from Today.** In the Train panel: "Repeat last workout" and "Empty workout" (add exercises as you go).

7. **Personal records.** Progress › Records: per exercise, the heaviest set and the best estimated 1-rep max with dates,
   newest records first.

**Done when.**
- Each item works in the browser and in the Android app, in Spanish and English, with no page errors.
- A Playwright test covers a full workout using suggestions, steppers, the auto rest timer, a note, finishing,
  the feeling rating, opening the workout in History, repeating it, and the records list.
- Screens stay uncluttered: nothing new shows on Today unless the Train panel is opened.
