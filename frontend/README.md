# irid.ai — Frontend

React + Vite + Tailwind CSS frontend for the irid.ai biometric verification platform.

## Setup

```bash
npm install
cp .env.example .env   # adjust VITE_API_URL if not using the Docker nginx proxy
npm run dev
```

The app runs at `http://localhost:3000` by default and expects a FastAPI backend
(`POST /enroll`, `POST /recognize`) reachable at `VITE_API_URL` (defaults to
`http://localhost:8000` for local dev, or same-origin `/api` behind the bundled
nginx reverse proxy in Docker).

## Build

```bash
npm run build
npm run preview
```

## Docker

```bash
docker build -t iridai-frontend .
docker run -p 80:80 iridai-frontend
```

`nginx.conf` proxies `/api/*` to a `backend` container on port 8000 — update the
`proxy_pass` target if your backend service has a different name/port.

## Pages

- `/login` — admin sign in; sessions auto-lock after 15 minutes of inactivity
- `/dashboard` — landing page with quick links to every section
- `/logs` — system log data grid (known/unknown detections) with pagination, status
  filter, search, and 1-click CSV export
- `/live` — live camera recognition: device settings modal, real-time confidence
  slider (with undo/redo), and an SVG bounding-box overlay (emerald = match,
  rose = unknown)
- `/recognize` — image-upload verification with a confidence threshold slider and
  bounding-box overlay
- `/enroll` — single identity enrollment (name + photo upload)
- `/bulk-enroll` — drag-and-drop batch enrollment with a per-file encoding progress bar
- `/entities` — delete identities by name (confirmation modal required) and view the
  read-only deletion audit log; requires the `admin` role

## Backend endpoints expected

In addition to the existing `POST /enroll` and `POST /recognize`, the pages above call:

```
POST   /auth/login        { username, password } -> { token, user: { name, role } }
GET    /logs              -> [{ id, timestamp, name, status, confidence, camera }]
GET    /identities        -> [{ id, name, enrolledAt, samples }]
DELETE /identities/:name
GET    /audit-log         -> [{ id, action, target, actor, timestamp }]
```

If any of these aren't implemented yet, the corresponding page falls back to demo
data automatically and shows a toast noting the backend is unreachable, so the UI
stays fully explorable during frontend development.

## Structure

```
src/
├── pages/
│   ├── DashboardPage.jsx
│   ├── EnrollPage.jsx
│   └── RecognizePage.jsx
├── components/
│   ├── Sidebar.jsx
│   ├── UploadZone.jsx
│   ├── StatusBanner.jsx
│   └── BoundingBoxOverlay.jsx
├── api.js        (fetch-based API client)
├── App.jsx        (router setup)
├── main.jsx
└── index.css
```
