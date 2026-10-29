# Block Space (demo prototype)

A clickable consumer banking app prototype. Demo data only. No real payment API is connected, and no real money moves anywhere.

## What's in it

- Login screen with four fake demo users (Chidi, Amara, Tunde, Ngozi). Pick one to sign in. Use "Switch" (the avatar on the home screen) to change users.
- Home dashboard: total balance, wallet balance, savings pots total, quick actions, recent activity.
- Send money: search demo users by name or account number, enter an amount in naira (₦), add a note, review, and confirm. Both the sender and receiver balances update, and both transaction histories get the entry.
- Savings pots: create a pot with a name, target and icon. Add money from your wallet, withdraw back, see the growth chart, and "Simulate 30 days" to show interest accruing at a demo rate of 12% p.a. Close a pot to return its balance to the wallet.
- Activity: full transaction history with in/out filters.
- Virtual card: a designed fake card (number, expiry, holder, ₦ spending summary). Freeze/unfreeze toggle blocks card spends. Edit the daily and per-transaction spending limits. "Test a card spend" runs a fake spend against the freeze state and limits, debiting the demo wallet.
- Installable PWA: manifest.json, a service worker (sw.js) that caches the app shell for offline use, and an icon. Mobile polish: safe-area padding, 16px inputs (no iOS zoom), 44px tap targets, tuned viewport.
- Demo top-up button adds ₦50,000 fake money to the wallet.

## How to run it

No build step, no installs. It's plain HTML, CSS and JavaScript.

Option 1 (simplest): open `index.html` in a browser (Chrome, Edge, Firefox or Safari).

Option 2 (local server, recommended: the service worker and install prompt need http, not file://):

    cd block-space
    python3 -m http.server 8080

Then open http://localhost:8080 in your browser.

To install on a phone: serve it on your network (for example `python3 -m http.server 8080 --bind 0.0.0.0` and open http://<your-computer-ip>:8080 on the phone), then use "Add to Home Screen" (iPhone Safari) or "Install app" (Android Chrome). Phones usually need HTTPS for the service worker outside localhost, so a plain LAN http address may install without offline caching.

## Where the data lives

All data is fake and stored in your browser's localStorage under the key `blockspace-demo-v1`. To reset the demo to its starting state, run `localStorage.removeItem('blockspace-demo-v1')` in the browser console, or clear this site's data, then reload.

## Files

- `index.html`: page shell (PWA meta tags)
- `manifest.json`: web app manifest
- `sw.js`: service worker
- `icons/icon.svg`: app icon
- `styles.css`: dark fintech theme
- `app.js`: all logic, seed data, transfers, pots, virtual card, rendering

## Notes for the next step

- Everything is client-side. Real use would need a backend, authentication, a ledger, and a licensed banking or payments partner. That's out of scope here.
- The 12% pot rate and the ₦0 transfer fee are placeholders for the demo.
