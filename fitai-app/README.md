# FitCoach

Free, offline-first workout app (PWA). Nothing to pay for, no accounts, no ads; all data stays on the device.

- **Profile and coach:** age, gender, height, weight, target weight, goal, experience, equipment, days, session length, focus muscles and limitations (knees, lower back, shoulders, wrists). An on-device coach turns that into BMI, calorie and macro targets and a split with exercises chosen for you. It is an algorithm, not a cloud AI model, so it works offline and sends nothing anywhere.
- **Plans:** full body, upper/lower or push/pull/legs, with extra sets for the muscles you want to bring up and low-impact choices for older users or higher BMI.
- **Workouts:** exercise demo loop, weight and reps per set (pre-filled from last time), rest timer.
- **Progress:** body-weight chart against your target, volume per workout, personal records, history.

## Install on a phone
It is published with the docs site at `/fitcoach/` (repo Settings → Pages → Source: GitHub Actions; see `.github/workflows/docs.yml`).
Open the URL in Chrome (Android) or Safari (iOS) → menu → **Install app / Add to Home Screen**. Open it once online; viewed exercises then work offline.

Local test: `python3 -m http.server -d fitai-app 8000`.

## Exercise media
876 exercises with instructions and start/end pose photos come from the public-domain [free-exercise-db](https://github.com/yuhonas/free-exercise-db). The "video" is a looping animation of the two photos.
To use real video for an exercise, add `"<exercise id>": "<mp4 URL or 11-char YouTube id>"` to `data/videos.json`. Only use videos you have the rights to.
