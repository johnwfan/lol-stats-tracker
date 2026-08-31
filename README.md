# Scuttle

A full-stack **League of Legends stats tracker** built with Next.js and TypeScript. Search any Riot ID to view ranked progress, champion mastery, recent performance, match history, and detailed lobby statistics across 11 regions.

**Live Demo:** https://lol-stats-tracker-johnf.vercel.app/

---

## Screenshots

<img width="1253" height="713" alt="Scuttle home page" src="https://github.com/user-attachments/assets/0f872dcb-b1e0-4902-9f4c-90c4bc178fae" />

<img width="1037" height="850" alt="Scuttle player profile" src="https://github.com/user-attachments/assets/d912d0fe-2e62-48ee-82aa-4d0b92608e09" />

<img width="1017" height="850" alt="Scuttle match analytics" src="https://github.com/user-attachments/assets/5b35b707-eaec-4681-877f-011f0172dcf9" />

---

## Features

### Player Search
- Search players by Riot ID and region
- Supports 11 regions including NA, EUW, EUNE, KR, JP, BR, LAN, LAS, OCE, TR, and RU
- Displays summoner level, profile icon, and account information
- Resolves Riot platform routes to the appropriate regional API endpoints

### Ranked & Champion Data
- View Solo/Duo and Flex ranked information
- Display tier, division, LP, wins, and losses
- View top champion masteries with champion data from Riot Data Dragon

### Match History & Analytics
- Browse recent matches with champion, role, KDA, CS, vision score, damage, items, and game result
- View full match pages with both teams and lobby-wide player statistics
- Calculate recent performance summaries from match data
- Visualize KDA trends across recent games with Recharts
- Handle multikills and non-standard game modes

### Authentication & Search History
- GitHub authentication using NextAuth
- JWT-based user sessions
- MongoDB-backed recent searches for authenticated users
- Automatically deduplicates searches and stores each user's 10 most recent players

### API Reliability & Caching
- Typed Riot API client written in TypeScript
- Handles Riot's platform and regional routing requirements
- Retries requests on rate limits (`429`) and server errors (`5xx`)
- Honors Riot's `Retry-After` response when available
- Uses Upstash Redis to cache frequently requested Riot data
- Match data is cached for **7 days**
- Champion mastery data is cached for **1 hour**
- Fetches match details in small batches to reduce rate-limit pressure

---

## Tech Stack

### Frontend
- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion**
- **Recharts**
- **Lucide React**

### Backend
- **Next.js Route Handlers**
- **Riot Games API**
- **NextAuth**
- **MongoDB / Mongoose**
- **Upstash Redis**

### Deployment
- **Vercel**

---

## Architecture

Scuttle uses the Next.js App Router for both the frontend and backend.

A player search follows roughly this flow:

```text
Riot ID + Region
       |
       v
Next.js API Routes
       |
       +--> Riot Account API
       |
       +--> Summoner API
       |
       +--> Ranked API
       |
       +--> Champion Mastery API
       |
       +--> Match-V5 API
       |
       v
Normalize + aggregate data
       |
       +--> Redis cache
       |
       +--> MongoDB
       |
       v
Player dashboard + match analytics
```

Riot's API separates endpoints between **platform routes** such as `na1`, `euw1`, and `kr`, and **regional routes** such as `americas`, `europe`, and `asia`. Scuttle maps between the two automatically depending on the endpoint being requested.

---

## API Design

The application exposes internal Next.js API routes that isolate Riot API logic from the frontend:

```text
/api/lol/profile
/api/lol/ranked
/api/lol/mastery
/api/lol/matches
/api/lol/match
/api/recent-searches
/api/auth/*
```

Riot requests are centralized through a typed API client, allowing routing, error handling, retries, and response types to be shared across endpoints.

### Retry Strategy

Requests are retried up to three times when Riot returns:

- `429 Too Many Requests`
- `5xx Server Errors`

If Riot provides a `Retry-After` header, Scuttle waits for the specified duration before retrying. Otherwise, it applies a short incremental delay.

---

## Caching

Scuttle uses **Upstash Redis** to reduce redundant Riot API requests and avoid unnecessary rate-limit usage.

| Data | Cache TTL |
| --- | ---: |
| Match details | 7 days |
| Champion mastery | 1 hour |

Caching is optional during development. If Redis environment variables are not configured, the application continues to fetch directly from Riot.

---

## Database

MongoDB is used for persistent application data.

### Summoner Records

Player profiles are upserted using their platform and PUUID so Scuttle can maintain the latest fetched account information.

### Recent Searches

Authenticated users can access their 10 most recent searches.

Searches are uniquely identified by:

```text
user + platform + Riot name + tag
```

Repeated searches update the existing entry rather than creating duplicates.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/johnwfan/lol-stats-tracker.git
cd lol-stats-tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
RIOT_API_KEY=your_riot_api_key

MONGODB_URI=your_mongodb_connection_string

UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

GitHub authentication also requires GitHub OAuth credentials and a NextAuth secret.

For a standard NextAuth v5 setup, these are commonly configured as:

```env
AUTH_SECRET=your_auth_secret
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
```

### 4. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── lol/
│   │   │   ├── mastery/
│   │   │   ├── match/
│   │   │   ├── matches/
│   │   │   ├── profile/
│   │   │   └── ranked/
│   │   └── recent-searches/
│   ├── match/
│   ├── settings/
│   └── [platform]/[gameName]/[tagLine]/
│
├── components/
│   └── ui/
│
├── lib/
│   ├── cache/
│   └── riot/
│       ├── regions.ts
│       ├── riotClient.ts
│       ├── riotFetch.ts
│       └── types.ts
│
├── models/
└── types/
```

---

## Riot API

Scuttle uses the official **Riot Games Developer API**.

A Riot API key is required to run the project locally. Development keys expire periodically and may need to be regenerated through the Riot Developer Portal.

Because Riot enforces request rate limits, Scuttle combines Redis caching, batched match fetching, and automatic retry logic to reduce unnecessary requests.

---

## Disclaimer

Scuttle isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.

---

Built by **John Fan**.
