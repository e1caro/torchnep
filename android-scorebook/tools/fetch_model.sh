#!/bin/bash
# Downloads the piano transcription model the app ships with: Onsets and Frames (Magenta, Apache-2.0), 109 MB.
# It is too large for git, so builds fetch it: CI runs this before Gradle; run it once before a local build.
# Without it the app still builds and falls back to Basic Pitch (much weaker on chords).
set -euo pipefail
cd "$(dirname "$0")/.."
URL=https://storage.googleapis.com/magentadata/models/onsets_frames_transcription/tflite/onsets_frames_wavinput.tflite
SHA=4bcca463c3b5d550a33abf5ba5cdf68902162ceb690bedae9528c1bb0bc15a80
OUT=app/src/main/assets/onsets_frames.tflite
if [ -f "$OUT" ] && echo "$SHA  $OUT" | sha256sum -c --status; then echo "model already there: $OUT"; exit 0; fi
mkdir -p "$(dirname "$OUT")"
curl -fL --retry 4 --retry-delay 3 -o "$OUT.part" "$URL"
echo "$SHA  $OUT.part" | sha256sum -c
mv "$OUT.part" "$OUT"
ls -la "$OUT"
