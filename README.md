# Sentient Mini Dashboard

Dual-mode (Manual/API) dashboard for X/Twitter highlights, Galxe quest progress, Community highlights, and Quick Links. Clean, responsive, and themed with Sentient gradients.

## Why this repo?
- **Dual Mode:**
  - API Mode: Live tweets via Twitter API proxy
  - Manual Mode: Add your own proofs/screenshots + metadata
- **Persistent data:** Manual entries saved in browser `localStorage`
- **Export/Share:** Export as PDF and copy share link

## Features
- Manual mode: add screenshots and metadata, stored locally (localStorage)
- API mode: fetch latest tweets via backend proxy to Twitter API v2
- Galxe quests with animated progress and optional completed badge
- Community highlights carousel with optional Top Contributor badge
- Quick links section
- Responsive UI, cards and carousels

## Project Structure
- `/index.html` – main dashboard
- `/styles.css` – theme and layout
- `/app.js` – logic for modes, forms, rendering, carousels
- `/backend/` – optional Express server for Twitter API proxy
  - `server.js`, `package.json`, `.env.example`

## Quick Start (Manual Mode — no API)
Manual mode me app seedha chal jata hai. Bas static host chahiye.

1) Local dev server (recommended):
```
cd sentient-mini-dashboard
python -m http.server 5173
# open http://localhost:5173
```
2) Ya seedha `index.html` open kar sakte ho (features work kareinge, but some browsers block localStorage/file URLs).

## Run Backend (API mode)
```
cd backend
copy .env.example .env  # Fill TWITTER_BEARER_TOKEN
npm install
npm run dev
```
This starts http://localhost:5174 and allows the frontend to call `/api/twitter`.

Set CLIENT_ORIGIN in `.env` if your frontend runs elsewhere.

On the frontend tab (http://localhost:5173), point to backend URL once:
```js
localStorage.setItem('backendUrl', 'http://localhost:5174')
```
Switch to API Mode from the header toggle and Fetch.

## Deploy
- **GitHub Pages (Manual Mode only):**
  1) Create a new GitHub repo and push this folder.
  2) In repo Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` → `/ (root)`.
  3) Open the Pages URL; the dashboard will run in Manual Mode. API Mode won’t work from Pages (no server).

- **Netlify/Vercel (Static Frontend):**
  - Connect repo, pick root as publish directory.
  - Manual Mode works out-of-the-box.
  - For API Mode, deploy backend separately (Railway/Render/Serverless).

- **API backend options:**
  - Railway/Render/Heroku: deploy `/backend` as a Node service. Set env `TWITTER_BEARER_TOKEN` and CORS origin to your site.
  - Vercel/Netlify Functions: port the `/api/twitter` route into a serverless function.
  - After deploy, set frontend setting in browser:
    ```js
    localStorage.setItem('backendUrl', 'https://your-backend.example.com')
    ```

## Twitter API Key
You need a Twitter API v2 Bearer Token. Put it in `backend/.env` as `TWITTER_BEARER_TOKEN`.

## Demo & Shareable Link
- Deploy static to Netlify/Vercel and share the site URL for AGI application.
- Record a screen capture showing toggling Manual/API modes, adding cards, and API fetch.

## Notes
- Local data persists via `localStorage` in your browser.
- API rate limits and access depend on your Twitter API plan.

## How to Use (Summary)
- **Manual Mode:**
  - Tweets: Description, Date, Likes/Retweets/Replies, optional screenshot.
  - Galxe: Name, %, optional date + badge image.
  - Community: Description, Top Contributor, optional role badge (Helper/Educator/Builder), screenshot.
  - Edit/Delete available on cards.
- **API Mode:**
  - Enter Twitter username (without @) and count, then Fetch.
  - Requires backend + token.
- **Charts:** Likes/Retweets trend (Chart.js) in Tweets section.
- **Theme:** Dark/Light toggle.
- **Export:** Print to PDF via Export button; Share Link copies current URL.

## Troubleshooting
- Blank API results: check `TWITTER_BEARER_TOKEN`, CORS `CLIENT_ORIGIN`, and `localStorage.backendUrl`.
- Manual data missing: use same browser/profile; `localStorage` is per-origin.
- Images too large: click to zoom (lightbox) or reduce size before upload.
