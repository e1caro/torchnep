# FitQuest — credits and third-party licenses

Audit date: 2026-11-06. Everything listed allows commercial use; the two items marked ⚠️ need your decision before
Google Play (see the end).

## Code dependencies

| Component | Used for | Version | License | Commercial use |
|---|---|---|---|---|
| Web app (HTML/CSS/JS) | the whole app | own code | own | ✅ |
| androidx.webkit (+ transitive androidx.core, androidx.annotation…) | Android WebView shell | 1.11.0 | Apache-2.0 | ✅ |
| Android Gradle Plugin | build only | 8.10.1 | Apache-2.0 | ✅ |
| Gradle | build only | 8.13 | Apache-2.0 | ✅ |
| GitHub Actions: actions/checkout, setup-java, upload-artifact, gradle/actions, softprops/action-gh-release | CI only | v2–v4 | MIT | ✅ |
| fontTools (tools/currency_icons.py) | dev tool only, not shipped | — | MIT | ✅ |
| ruff | dev tool only | — | MIT | ✅ |
| Playwright (tests) | dev tool only | — | Apache-2.0 | ✅ |

No npm or Gradle library under GPL, AGPL, "non-commercial" or an unknown license is shipped.

## Data and assets

| Asset | Source | License | Commercial use | Notes |
|---|---|---|---|---|
| Exercise catalogue (names, muscles, steps) `data/exercises.json` | [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | Unlicense (public domain) | ✅ | 873 entries + 44 written for FitQuest |
| 40 new exercises `data/exercises-more.json` | written for FitQuest | own | ✅ | no photos or videos |
| Spanish translations `data/es-exercises.json`, `es-*.js` | written for FitQuest | own | ✅ | |
| Exercise photos (shown only when you tap the muscle map) | free-exercise-db images, loaded from raw.githubusercontent.com | Unlicense per the repository | ⚠️ | see note 1 |
| Exercise videos `data/videos.json` | — | — | — | empty: no videos are used |
| Muscle map drawing `data/body.json` | [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter) by ELABBASSI Hicham | MIT | ✅ | attribution kept in `bodymap.js` and in Settings |
| Icons `icons/gi/*.svg` | [game-icons.net](https://game-icons.net) (Lorc, Delapouite, Skoll, Caro Asercion, Darkzaitzev, Sbed, Carl Olsen), also via the `@iconify-json/game-icons` package | CC BY 3.0 | ✅ with attribution | credited in Settings and README |
| `icons/gi/ghostie.svg`, `batwing*.svg`, Android `ic_stat_fitquest` | drawn for FitQuest | own | ✅ | |
| App icons `icons/*.png`, Android launcher icons | made for FitQuest (`tools/make_icons.js`) | own | ✅ | |
| Interface art (skins.css, crests, podiums) | drawn in code for FitQuest (`tools/build_skins.py`, `tools/crest_art.py`) | own | ✅ | |
| Fonts (loaded from Google Fonts): Barlow Condensed, DM Sans, Exo 2, Orbitron, Press Start 2P, Share Tech Mono, Inter, ZCOOL XiaoWei, Lora, Shippori Mincho, Zen Kaku Gothic New, IM Fell English / SC, MedievalSharp, EB Garamond, Rye, Cinzel, Cinzel Decorative, Cormorant Garamond / SC, Metamorphous, Alegreya, Pirata One, Audiowide, VT323, Playfair Display, Poiret One, Josefin Sans, Grenze, Uncial Antiqua, Michroma, Space Grotesk, Creepster, Nunito | [Google Fonts](https://fonts.google.com) | SIL OFL 1.1 | ✅ | Special Elite: Apache-2.0 ✅. See note 3 about loading them from Google |
| Sounds | generated live with the Web Audio API | own | ✅ | no sound files |
| Emoji | the phone's own emoji font | — | ✅ | not bundled |
| Recipes and meal data | written for FitQuest | own | ✅ | |
| Song list `data/songs.txt` (titles and artists only) | compiled for FitQuest | facts, not copyrightable | ✅ | links open Spotify |
| Spotify logo drawn in `spotify.js` and the "Play in Spotify" buttons | Spotify brand | Spotify brand guidelines | ⚠️ | see note 2 |
| MusicBrainz lookups (song links) | [MusicBrainz](https://musicbrainz.org) | core data CC0 | ✅ | |

## Services (not shipped code; their terms apply)

Supabase (accounts and database, free plan), Brevo (reminder e-mails, free plan: 300 e-mails a day), GitHub Pages and
GitHub Releases (web app and APK hosting, free), Google Fonts, Spotify Web API (optional, development mode),
MusicBrainz API.

## Notes for you to decide

1. ⚠️ **Exercise photos.** free-exercise-db is published under the Unlicense, but the repository does not say who
   took the photos, and they look like they came from an older commercial exercise site. The licence on the repository
   allows commercial use, but the origin can't be confirmed. The app already shows the muscle map by default and the
   photos only on tap. **Options:** keep them (small risk), or hide them in the Google Play build (one line: skip
   `demoFlip` when `APP_PLAY`). Recommended for Play: hide them.
2. ⚠️ **Spotify logo and name.** Using the Spotify name and logo to link to Spotify is allowed only following the
   [Spotify Design Guidelines](https://developer.spotify.com/documentation/design) (official logo file, unmodified,
   green or black/white). The logo here is redrawn. **Options:** replace it with the official logo file or remove the
   logo and keep text links ("Open in Spotify").
3. Fonts are downloaded from Google's servers, which shares the user's IP address with Google (declared in the privacy
   policy). To avoid it entirely, the font files could be bundled inside the app instead (OFL allows it).

## Attribution text to keep in the app (Settings footer)

"Exercises: free-exercise-db (Unlicense). Muscle maps: react-native-body-highlighter (MIT). Icons by Lorc, Delapouite,
Skoll, Caro Asercion, Darkzaitzev, Sbed and Carl Olsen from game-icons.net, CC BY 3.0. Fonts: Google Fonts (SIL OFL)."
