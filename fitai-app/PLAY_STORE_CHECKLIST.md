# FitQuest · Google Play checklist

Checked on 2026-11-06. Legend: ✅ done · 🟡 pending (you) · 🔵 pending (Claude) · ⚠️ needs your decision.

## Build and signing

| Item | Status | Notes |
|---|---|---|
| App Bundle (AAB) | ✅ | `gradle -p android bundlePlayRelease` → `app/build/outputs/bundle/playRelease/app-play-release.aab`. CI builds it on every PR (artifact `FitQuest-1.N-play.aab`). AAB is mandatory for new apps since August 2021. |
| Play build without self-updates | ✅ | `play` flavor: `SELF_UPDATE=false`, no web.zip download, no "new APK" banner. Play forbids apps that update themselves outside Play (Device and Network Abuse policy). The GitHub APK (`github` flavor) keeps its updates. |
| Target API level | ✅ | `targetSdk 36` / `compileSdk 36` (Android 16). Required for new apps and updates from **31 Aug 2026**. |
| Edge-to-edge and predictive back (Android 15/16) | ✅ | insets applied to the WebView; `OnBackInvokedCallback` on API 33+. |
| Unique applicationId | ✅ | `io.github.e1caro.fitquest` (can never change once uploaded). The Play app and the GitHub APK share it: users must uninstall the GitHub APK before installing from Play, and their account sync brings the data back. |
| versionCode / versionName | ✅ | from CI: `versionCode = run number`, `versionName = 1.N`; always increasing. |
| Upload key (Play App Signing) | 🟡 | You create it (command below) and add 4 GitHub secrets. Google keeps the app signing key; you keep the upload key. |
| No secrets in git | ✅ | keystores and passwords only in environment variables or GitHub secrets. The old sideload key's password still has a fallback in the workflow so installed APKs keep updating; add the `FITQUEST_KEY_PASS` secret to remove that dependency (the keystore itself was never in git). |
| 64-bit / native code | ✅ | no native code. |

### Creating the upload key (you)

```
keytool -genkeypair -v -keystore fitquest-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 fitquest-upload.jks > fitquest-upload.b64      # on macOS: base64 -i fitquest-upload.jks -o fitquest-upload.b64
```
GitHub › repo › Settings › Secrets and variables › Actions › New repository secret:
`PLAY_UPLOAD_KEYSTORE_B64` (content of the .b64 file), `PLAY_UPLOAD_STORE_PASS`, `PLAY_UPLOAD_KEY_PASS`,
`PLAY_UPLOAD_KEY_ALIAS` (= `upload`). Keep the .jks and passwords in a password manager; never commit them.
Local build instead: `PLAY_UPLOAD_KEYSTORE=/path/fitquest-upload.jks PLAY_UPLOAD_STORE_PASS=… PLAY_UPLOAD_KEY_PASS=… PLAY_UPLOAD_KEY_ALIAS=upload gradle -p android bundlePlayRelease`

## Policies and forms (Play Console › App content)

| Item | Status | Notes |
|---|---|---|
| Privacy policy URL | 🟡 | Draft ready: `fitai-app/privacy.html` → `https://e1caro.github.io/torchnep/fitcoach/privacy.html` once merged. Fill in the `<…>` fields (your name, contact e-mail, minimum age, date). |
| Account deletion in the app | ✅ | Settings › Account › Delete my account (`deleteAccount`, needs `tools/supabase-play.sql`). |
| Account deletion on the web | ✅ | `https://e1caro.github.io/torchnep/fitcoach/delete-account.html` → enter it in the "Delete account URL" field. |
| Data safety form | 🟡 | Draft answers in `play/data-safety.md`. |
| Health apps declaration | 🟡 | fitness app, not medical; see `play/data-safety.md`. |
| Content rating questionnaire | 🟡 | answer: users interact and share content; in-game coin "bets" are not real-money gambling. |
| Target audience | 🟡 / ⚠️ | your choice; suggested 16+ or 18+. Not designed for children. |
| User-generated content policy (the Guild) | ✅ | rules in the app (link in the Guild) and in the privacy page; in-app report (⚑) and block (⦸); hidden after 3 reports; admins delete or restore; bad-words filter in the app and in the database. 🟡 Make yourself admin (SQL in `tools/supabase-play.sql`) and review reports. |
| AI-generated content (meal photo rating) | ✅ | in-app "Report" on every answer (`food_reports` table, `tools/supabase-food.sql`); disclaimer "an estimate made by AI, not medical advice"; notice before the first photo. 🟡 Read the reports now and then (Table Editor › food_reports). |
| Camera | ✅ | the phone's camera app is opened with an intent and writes to the app's cache (FileProvider): no CAMERA permission. |
| Notification permission (Android 13+) | ✅ | asked once with an explanation first; switch, time and a "Test the reminder" button in Settings; no exact alarms (`setWindow`, 15-minute window, set again each day). |
| Ads declaration | 🟡 | "No ads". |
| App access for reviewers | 🟡 | create a test account (username + password) and give it in "App access" (friends and the Guild need sign-in). |
| Exercise photos licence | ⚠️ | see `CREDITS.md`, note 1 (recommended: hide photos in the Play build). |

## Store listing

| Item | Status | Notes |
|---|---|---|
| Name, short and full description (ES/EN) | ✅ draft | `play/store-listing.md` |
| App icon 512 × 512 | ✅ | `icons/icon-512.png` |
| Feature graphic 1024 × 500 | 🟡 / 🔵 | to make (Claude can render one from the app's art if you want) |
| Phone screenshots (2–8) | 🟡 / 🔵 | Claude can take them at 1080 × 1920 from the web app on request |
| Contact e-mail and website | 🟡 | shown on the listing |

## Account and release (only you)

| Item | Status | Notes |
|---|---|---|
| Play Console developer account | 🟡 | one-time US$25 fee; identity verification. |
| Closed testing before production | 🟡 | personal accounts created after 13 Nov 2023: **12 testers opted in for 14 continuous days** on a closed track, then apply for production. |
| First upload | 🟡 | upload the signed AAB to the closed testing track; enrol in Play App Signing (default). |

## Backend set-up (Supabase, only you)

| Item | Status | Notes |
|---|---|---|
| Guild, moderation and account deletion | 🟡 | run `tools/supabase-play.sql` |
| Meal photo rating (free) | 🟡 | run `tools/supabase-food.sql`; create a Gemini API key in Google AI Studio **without billing**; deploy `tools/food-photo.ts` as the Edge Function `food-photo`; add the secret `GEMINI_API_KEY`. |
| E-mail reminders | 🟡 | run `tools/supabase-reminders.sql`, save the Brevo key and sender in Vault, test with `select public.send_test_reminder();`, then `update public.reminder_config set live = true;` |

## Sources (checked 2026-11-06)

- Target API level: https://developer.android.com/google/play/requirements/target-sdk and https://support.google.com/googleplay/android-developer/answer/11926878
- Account deletion: https://support.google.com/googleplay/android-developer/answer/13327111
- User-generated content: https://support.google.com/googleplay/android-developer/answer/9876937
- Self-updates and executable code (Device and Network Abuse): https://support.google.com/googleplay/android-developer/answer/16559646
- Closed testing for new personal accounts: https://support.google.com/googleplay/android-developer/answer/14151465
- App Bundle and Play App Signing: https://developer.android.com/guide/app-bundle and https://support.google.com/googleplay/android-developer/answer/9842756
