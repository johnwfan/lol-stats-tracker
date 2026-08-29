# League of Legends Stats Tracker

A full-stack web app that pulls **League of Legends player + match data** and turns it into a clean stats dashboard (match history, performance trends, and quick comparisons). Built to be fast to use, easy to extend, and deployable.

---

## Demo

- Live: [https://lol-stats-tracker-johnf.vercel.app/](https://lol-stats-tracker-johnf.vercel.app/)
- Screenshots:
<img width="1253" height="713" alt="image" src="https://github.com/user-attachments/assets/0f872dcb-b1e0-4902-9f4c-90c4bc178fae" />
<img width="1037" height="850" alt="image" src="https://github.com/user-attachments/assets/d912d0fe-2e62-48ee-82aa-4d0b92608e09" />
<img width="1017" height="850" alt="image" src="https://github.com/user-attachments/assets/5b35b707-eaec-4681-877f-011f0172dcf9" />



---

## Features

### Summoner Search
- Search any summoner by **name + region**
- View profile info (level, icon, ranked info, etc.)

### Match History + Detailed Stats
- Recent match list (champion, role, KDA, duration, result)
- Match details: items, runes, CS/min, vision, damage *(if implemented)*
- Filters by queue / role / champion *(if implemented)*
<img width="950" height="849" alt="image" src="https://github.com/user-attachments/assets/de5b6cfb-b378-4067-af8c-7aae088db0e7" />


### Performance Insights
- Rolling averages (KDA, KP%, CS/min, vision score) *(if implemented)*
- Most played champions + winrates
- Trend view across last **N** games *(if implemented)*

### Comparison Mode *(optional)*
- Compare two players side-by-side (rank, champ pool, winrate, recent form)

---

## Tech Stack

**Frontend**
- React / Next.js (JavaScript)
- UI: *(Tailwind / CSS / MUI / Chakra — fill in)*
- Data fetching: *(fetch / axios — fill in)*

**Backend**
- Node.js + Express *(or your backend framework)*
- Riot Games API integration
- Rate limiting + caching *(if implemented)*

**Database (optional)**
- MongoDB / Postgres / SQLite *(if used)*
- Stores match snapshots + user lookups to reduce API calls

**Deployment**
- Frontend: Vercel / Netlify
- Backend: Render / Railway / Fly.io
- Environment variables for Riot API key

---

## How It Works (High Level)

1. User searches a summoner.
2. Backend fetches **PUUID + account details** from the Riot API.
3. Backend pulls recent match IDs, then fetches match details for each match.
4. App aggregates raw match data into human-readable stats.
5. *(Optional)* Cache/DB stores results to reduce repeated API calls and handle rate limits.

---

## Getting Started (Local Setup)

### 1) Clone

```bash
git clone https://github.com/<your-username>/<repo>.git
cd <repo>
```

### 2) Add environment variables

Create a .env file in your backend folder (or root, depending on your structure):

RIOT_API_KEY=your_riot_api_key_here
PORT=5000


(Add any other vars you use, like CLIENT_URL, MONGO_URI, etc.)

### 3) Install + run
Backend
cd server
npm install
npm run dev

Frontend
cd client
npm install
npm run dev


Open http://localhost:3000

## Project Structure (Example)
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

Riot API Notes

This project uses the Riot Games Developer API.

You need an API key from the Riot Developer Portal.

Dev keys can expire/rotate — if requests fail, regenerate your key.

Rate limits are strict; caching helps a lot.
