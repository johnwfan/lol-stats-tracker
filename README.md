League of Legends Stats Tracker

A full-stack web app that pulls League of Legends player + match data and turns it into clean, readable stats dashboards (match history, performance trends, and quick comparisons). Built to be fast to use, easy to extend, and actually deployable.

Demo

Live: [(add link)](https://lol-stats-tracker-johnf.vercel.app/)


Screenshots:
<img width="959" height="911" alt="Screenshot 2025-12-27 034816" src="https://github.com/user-attachments/assets/46a280c2-f7e3-4db0-97f4-1db854777390" />
<img width="1009" height="913" alt="Screenshot 2025-12-27 034904" src="https://github.com/user-attachments/assets/0c4c4e41-c63c-4c22-b9fc-54a82501948d" />



Features
Summoner Search

Search any summoner by name + region

View profile info (icon, level, ranked details, etc.)

Match History + Deep Stats

Recent match list with core metadata (champion, role, KDA, duration, result)

Match details: items, runes, CS/min, vision, damage charts (if you implemented these)

Filters (queue type, role, champion) (if applicable)

Performance Insights

Rolling averages (KDA, KP%, CS/min, vision score) (if applicable)

“Most played champs” and winrates

Trend view across last N games

Comparison Mode (optional)

Compare two players side-by-side: champ pool, rank, winrate, recent form

Tech Stack

Frontend

React (or Next.js) + JavaScript

UI: (Tailwind / CSS / MUI / Chakra — whatever you used)

Data fetching: (fetch/axios)

Backend

Node.js + Express (or FastAPI / whatever you used)

Riot Games API integration

Rate limiting + caching (if you added this)

Database (optional)

MongoDB / Postgres / SQLite (if used)

Stores match snapshots + user lookups to reduce API calls

Deployment

Frontend: Vercel / Netlify

Backend: Render / Railway / Fly.io

Env vars for Riot API Key

How It Works (High Level)

User searches a summoner.

Backend fetches PUUID + account details from Riot API.

Backend pulls recent match IDs, then match details for each match.

App aggregates raw match data into human-readable stats.

(Optional) Cache / DB stores results to reduce repeated API calls + handle rate limits.

Getting Started (Local Setup)
1) Clone
git clone https://github.com/<your-username>/<repo>.git
cd <repo>

2) Add environment variables

Create a .env file in the backend folder (or root, depending on your structure):

RIOT_API_KEY=your_riot_api_key_here
PORT=5000


(If you have regions, database URLs, etc., add them here too.)

3) Install + run
Backend
cd server
npm install
npm run dev

Frontend
cd client
npm install
npm run dev


Open: http://localhost:3000

API Notes (Riot)

This project uses the Riot Games Developer API.

You’ll need an API key from the Riot Developer Portal.

Keys can expire (dev keys rotate), so if requests fail, regenerate the key.

Rate limits are real — caching helps a lot.

Project Structure (example)
.
├── client/                 # frontend
│   ├── src/
│   └── ...
├── server/                 # backend
│   ├── routes/
│   ├── services/           # riot api wrappers
│   ├── utils/              # caching, helpers
│   └── ...
└── README.md

What I’d Improve Next

Smarter caching (Redis) + background refresh

Better visualizations (damage share, gold diff over time)

Champion matchup insights + draft tools

Auth + saved profiles / “watchlist”

Automated tests + CI
