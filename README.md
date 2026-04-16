# NBA Playoffs Challenge

Simple static browser app for a four-player NBA playoff snake draft.

## How it works

- Pick one of the four players
- Use Commissioner mode to set names and start the draft
- Draft 4 teams each in snake order
- Score teams as `wins - losses`
- Lock a Finals winner pick after the draft
- Award `+5` if the player drafted the champion, or `+3` if they predicted the champion without drafting them

## Important note

This version is intentionally simple:

- no Firebase
- no backend
- no account system
- no cross-device sync

The whole game is saved in the browser's local storage, so it works best on one shared device or one shared browser profile.

## Use it

1. Open `index.html` in a browser, or publish the folder with GitHub Pages.
2. Click `Commissioner` to set a PIN for this browser.
3. Choose player names if needed.
4. Start the snake draft.
5. Update team wins and losses as the playoffs happen.

## Main files

- `index.html`
- `styles.css`
- `app.js`
