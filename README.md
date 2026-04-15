# NBA Playoffs Challenge

Static GitHub Pages app for a shared NBA playoff snake draft with live scoring.

## What it does

- Lets four players claim a name once on their device
- Runs a 4-round snake draft
- Tracks 2026 postseason team scores as `wins - losses`
- Adds Finals winner bonuses
- Shows the shared leaderboard live on every device through Firebase

## Firebase setup

1. Create a Firebase project at `https://console.firebase.google.com/`.
2. Add a Web App inside that project.
3. Enable `Authentication` and turn on `Anonymous` sign-in.
4. Create a `Firestore Database` in production or test mode.
5. In the Firestore rules screen, paste in [`firestore.rules`](./firestore.rules) and publish them.
6. Open [`firebase-config.js`](./firebase-config.js) and replace every `REPLACE_ME` value with your Firebase web app config.
7. Set `commissionerPin` to a simple PIN only your group knows.

## GitHub Pages deploy

1. Push this repo to GitHub.
2. In the repo settings, open `Pages`.
3. Set the source to `Deploy from a branch`.
4. Choose your main branch and the `/ (root)` folder.
5. Save, then wait for GitHub Pages to publish the site.

Your site URL will look like:

`https://your-username.github.io/your-repo-name/`

## Important note

This build is designed for a trusted friend group. The Firestore rules allow any signed-in anonymous user to read and write the game document, so it is convenient but not hardened against bad actors. If you want stronger lock-down later, the next upgrade would be Firebase Functions plus stricter auth/rules.

## Files you care about

- [`index.html`](./index.html)
- [`styles.css`](./styles.css)
- [`app.js`](./app.js)
- [`firebase-config.js`](./firebase-config.js)
- [`firestore.rules`](./firestore.rules)
