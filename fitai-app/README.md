# FitCoach

Offline-first workout PWA inspired by Fit.AI: personalised plans, exercise demos, workout logging with rest timer, progress stats and a free/Premium split.

## Install on a phone
1. Host the folder over HTTPS (the included GitHub Pages workflow does this: repo Settings → Pages → Source: GitHub Actions).
2. Open the URL in Chrome (Android) or Safari (iOS) → menu → **Add to Home Screen / Install app**.
3. Open it once online; the app and any exercise you viewed then work offline.

Local test: `python3 -m http.server -d fitai-app 8000`.

## Exercise media
Exercise data (876 exercises, instructions, start/end pose photos) comes from the public-domain
[free-exercise-db](https://github.com/yuhonas/free-exercise-db). The "video" is a looping animation of the two pose photos.
To use real video for any exercise, add `"<exercise id>": "<mp4 URL or 11-char YouTube id>"` to `data/videos.json`.
Only use videos you have the rights to.

## Premium
Local switch only (Premium tab); no payments or accounts. Premium unlocks the full library, 4–6 day splits, unlimited plan regeneration, exercise swapping, volume charts, PRs and full history.
