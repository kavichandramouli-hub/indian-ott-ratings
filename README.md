# Indian OTT Ratings Hub

Indian OTT Ratings Hub is a content discovery app for Indian streaming subscribers who are tired of checking four platforms separately, and then having to check the ratings and synopsis on IMDB or Rotten Tomatoes. You can browse or check the ratings for any movies and series from Netflix, Prime Video, Apple TV+, and Jio Hotstar in one place.

**Live site:** https://indian-ott-ratings.bolt.host/

---

## What's localized and how

| Aspect | Details |
|---|---|
| **Region** | India |
| **OTT Platforms** | Netflix, Prime Video, Apple TV+, Jio Hotstar -- filtered to Indian streaming availability |
| **Content** | Only titles available to stream in India (region set to `IN` via TMDB watch provider data) |

All content discovery uses TMDB's `watch_region=IN` and `with_watch_monetization_types=flatrate` parameters, so you only see titles that are actually streamable on subscription plans in India.

---

## Features

- **Browse by platform** -- switch between Netflix, Prime Video, Apple TV+, and Jio Hotstar, or view all platforms at once
- **Search any title** -- search across movies and series, with platform badges showing where each title is streaming
- **Ratings in one place** -- IMDb and Rotten Tomatoes scores displayed directly on each card and in the detail view
- **Detailed view** -- click any title to see synopsis, genres, cast, ratings, and which platform it's on
- **Filter by genre** -- narrow results by genre across all platforms
- **Movies and Series** -- toggle between movies, TV series, or both
- **Infinite scroll** -- load more titles as you browse

---

## How it was built

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript, Vite 5 |
| **Styling** | Tailwind CSS 3 |
| **Icons** | Lucide React |
| **Backend / Database** | Supabase (PostgreSQL + Edge Functions) |
| **Content data** | TMDB API (The Movie Database) |
| **Ratings** | OMDb API + MDBList API |
| **Hosting** | Bolt (bolt.new) |

### Architecture

The app uses a Supabase Edge Function (`media-proxy`) as a secure proxy between the browser and the external APIs (TMDB, OMDb, MDBList). API keys are stored as Supabase Edge Function secrets and never exposed to the client. The proxy also caches API responses in a Supabase `content_cache` table to reduce redundant calls and speed up load times.

```
Browser  -->  Supabase Edge Function (media-proxy)  -->  TMDB / OMDb / MDBList APIs
                        |
                content_cache table (PostgreSQL)
```

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or higher
- A [Supabase](https://supabase.com/) account (free tier works)
- API keys for:
  - [TMDB](https://www.themoviedb.org/settings/api)
  - [OMDb](https://www.omdbapi.com/apikey.aspx)
  - [MDBList](https://mdblist.com/) (optional, used as a fallback for ratings)

### 1. Clone the repository

```bash
git clone https://github.com/kavichandramouli-hub/indian-ott-ratings.git
cd indian-ott-ratings
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
TMDB_API_KEY=your-tmdb-api-key
OMDB_API_KEY=your-omdb-api-key
MDBLIST_API_KEY=your-mdblist-api-key
```

The `VITE_` prefixed variables are exposed to the browser. The others are used only by the Edge Function and should be set as Supabase Edge Function secrets (see below).

### 4. Set up the Supabase database

Run the SQL migrations in your Supabase project's SQL editor, in order:

1. `supabase/migrations/20260604021524_create_content_cache.sql` -- creates the cache table
2. `supabase/migrations/20260816065921_revoke_anon_insert_on_content_cache.sql` -- secures the table
3. `supabase/migrations/20260816065938_revoke_anon_update_on_content_cache.sql` -- secures the table
4. `supabase/migrations/20260816065959_revoke_client_delete_on_content_cache.sql` -- secures the table

### 5. Deploy the Edge Function

Deploy the `media-proxy` edge function to Supabase, then set these secrets in your Supabase project under Edge Functions > Secrets:

- `TMDB_API_KEY`
- `OMDB_API_KEY`
- `MDBLIST_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 6. Run locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 7. Build for production

```bash
npm run build
```

The built files will be in the `dist/` directory.

---

## Project structure

```
src/
  components/        UI components (Header, ContentCard, ContentGrid, etc.)
  constants/         Platform and genre definitions
  services/          API service layer (tmdb.js, omdb.js, cache.js)
  App.jsx            Main application component
  main.tsx           React entry point
supabase/
  functions/
    media-proxy/     Edge function proxying TMDB/OMDb/MDBList APIs
  migrations/        Database migrations for the cache table
```

---

## Supported platforms

| Platform | TMDB Provider ID |
|---|---|
| Netflix | 8 |
| Prime Video | 119 |
| Apple TV+ | 350 |
| Jio Hotstar | 2336 |

---

## License

This project is licensed under the **MIT License** -- see below.

MIT is the recommended license for this project. It is permissive, widely understood, and lets anyone fork and use your code freely while requiring attribution. Since the app relies on third-party APIs (TMDB, OMDb, MDBList), note that the MIT license covers your code only -- the data itself is subject to each API's respective terms of use.

```
MIT License

Copyright (c) 2026 Kavichandramouli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
