# Google Play · Data safety form — draft answers

Based on what the app does today (2026-11-06). Check again if features change.

## Data collection and security

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS to Supabase, Brevo, GitHub) |
| Do you provide a way for users to request that their data be deleted? | **Yes** — in the app (Settings › Account › Delete my account) and on the web: `https://e1caro.github.io/torchnep/fitcoach/delete-account.html` |

## Data types

"Collected" means it leaves the device. Data kept only on the phone (the app without an account) is not collected.
None is **shared** with third parties: Supabase and Brevo act as service providers (processors), which Play does not
count as sharing.

| Category › type | Collected | Shared | Optional? | Purposes |
|---|---|---|---|---|
| Personal info › Name (player name, username) | Yes | No | Optional (only with an account) | App functionality, Account management |
| Personal info › Email address | Yes | No | Optional (e-mail reminders) | Developer communications |
| Personal info › User IDs | Yes | No | Optional (account) | App functionality, Account management |
| Health and fitness › Health info (weight, height, age, sex, body goals) | Yes | No | Optional (synced with an account) | App functionality |
| Health and fitness › Fitness info (workouts, sets, minutes, dungeons) | Yes | No | Optional (synced with an account) | App functionality |
| App activity › Other user-generated content (Guild exercises, friend profile summary) | Yes | No | Optional | App functionality |
| App activity › Other actions (reports, blocks, "use it") | Yes | No | Optional | App functionality (moderation) |
| Location, Financial info, Messages, Photos/videos, Audio, Files, Calendar, Contacts, Web browsing, Device or other IDs, App info and performance | **No** | No | — | — |

- No advertising, no analytics SDKs, no data sold.
- Notifications are scheduled on the device (nothing collected).

## Other forms in "App content"

- **Health apps declaration:** fitness/workout app; not a medical device; gives general guidance only.
- **Ads:** No ads.
- **App access:** login needed only for friends and the Guild → give the reviewers a test username and password.
- **Target audience:** your choice (suggested 16+ or 18+ because of body-weight data and community content).
- **Content rating questionnaire:** users interact and share content (friends, Guild); no violence beyond game
  themes, no gambling for money (the "bets" use in-game coins only and cannot be bought).
- **News app / COVID / Government:** No.
