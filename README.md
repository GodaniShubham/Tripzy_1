# Tripzy

Tripzy is a React + Vite travel planner with AI itinerary generation, live route views, trip sharing, feedback capture, and a lightweight usage-metrics backend.

## What the backend tracks

The new backend tracks:

- `uniqueVisitors`: how many unique users opened the app
- `usersWhoUsedPlanner`: how many unique users actually used the planner flow
- `itinerariesGenerated`: how many successful itineraries were generated

These numbers are shown on the Account page and are also available from the backend API.

## Frontend setup

Create a frontend env file:

```env
VITE_GEOAPIFY_API_KEY=your_geoapify_api_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_GROQ_MODEL=llama-3.1-8b-instant
VITE_USAGE_API_URL=https://your-backend-service.onrender.com
```

Run the frontend:

```bash
npm install
npm run dev
```

## Backend setup

The backend is a normal Node + Express service. No Docker is required.

Create a backend env file from [server/.env.example](/d:/Tripzy/tripzy/tripzy-react/server/.env.example):

```env
PORT=4000
DATA_DIR=./server/data
CORS_ORIGIN=https://tripzy-2.onrender.com,http://localhost:5173
```

Run the backend locally:

```bash
npm run server:dev
```

Production start:

```bash
npm run server
```

## Render deploy notes

For the backend Render service:

- Build Command: `npm install`
- Start Command: `npm run server`
- Add env vars from `server/.env.example`
- Set `CORS_ORIGIN=https://tripzy-2.onrender.com`

If you want analytics to survive restarts and redeploys, attach a persistent disk in Render and point `DATA_DIR` to that mounted path, for example `/var/data/tripzy`.

For the frontend:

- Set `VITE_USAGE_API_URL` to your backend Render URL

## Analytics API

- `GET /health`
- `GET /api/usage/summary`
- `POST /api/usage/track`

Example body:

```json
{
  "eventType": "visit",
  "visitorId": "some-unique-client-id"
}
```
