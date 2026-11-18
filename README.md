# Bus Ticket Reservation and Booking System

IPT 102 Pre-Final project, deployed with automated tests and continuous deployment.
Client: Bicol Isarog Transport System, Inc. Based on the project's Software Requirements Specification v1.0.

## Team

| Member | Role |
| --- | --- |
| Jay Rhomer Vidor | Frontend and Interface Lead |
| Ronelyn Santillan | Backend and Pipeline Lead |

## Live links

- Frontend: `<paste Netlify or Vercel URL>`
- Backend health check: `<paste Render URL>/api/health`
- Repository: `<paste GitHub URL>`

## Architecture

Browser (static frontend on Netlify) calls the REST API (Node and Express on Render), which reads and writes MongoDB Atlas.
GitHub Actions runs the tests on every push and pull request to `main`. Render deploys only after the checks pass.
See `docs/DIAGRAMS.md` for what Diagram 1 and Diagram 2 must show.

## Folder structure

```
.github/workflows/ci.yml   CI: backend and frontend jobs
backend/                   Express API, Mongoose models, Jest tests
frontend/                  Static HTML, CSS and JavaScript, Jest tests
docs/                       Diagram notes
netlify.toml               Netlify build settings
render.yaml                Render service settings
```

## Run it locally

Backend:

```
cd backend
cp .env.example .env     # then fill in your own values
npm install
npm start
```

Frontend (second terminal):

```
cd frontend
npm install
npm start                # serves http://localhost:8080
```

Set `FRONTEND_ORIGIN=http://localhost:8080` in `backend/.env`. On first start, with an empty database, the backend creates one
administrator from `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Sign in, then create staff accounts under Staff, and add routes under Trips and fares.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Render, `backend/.env` | MongoDB Atlas connection string |
| `JWT_SECRET` | Render, `backend/.env` | Signs login tokens |
| `FRONTEND_ORIGIN` | Render, `backend/.env` | Allowed browser origin (CORS) |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Render, `backend/.env` | First administrator, used only when no users exist |
| `PORT` | Render sets it | Server port |

Real values live only in `.env` files (ignored by git) and in the Render dashboard. `window.API_BASE` in `frontend/js/config.js`
is a public URL, not a secret.

## Tests

| ID | What it checks |
| --- | --- |
| B-T1 | `/api/health` returns 200 and `status: ok` |
| B-T2 | Passenger validation rejects blank name and bad contact |
| B-T3 | Payment validation rejects negative, non-numeric and inconsistent amounts |
| B-T4 | Protected routes return 401 without a valid token |
| B-T5 | Booking reference format and seats-left calculation |
| F-T1 | Passenger form validation |
| F-T2 | Peso formatting |
| F-T3 | Seat map marks taken seats |

Run with `npm test` inside `backend/` or `frontend/`.

## CI/CD

`.github/workflows/ci.yml` runs a `backend` job and a `frontend` job on every push and pull request to `main`.
`main` is protected: changes enter through an approved pull request with both checks passing.
Render Auto-Deploy is set to After CI Checks Pass.

## API summary

`GET /api/health` and, under `/api/v1`: `POST /auth/login`, `POST /auth/staff` (admin), `GET /trips`, `GET /trips/:id/seats`,
`POST /trips` and `PATCH /trips/:id` (admin), `POST /bookings`, `GET /bookings?reference=|name=`, `GET /bookings/:id`,
`PATCH /bookings/:id/payment`, `PATCH /bookings/:id/cancel`, `GET /reports/bookings?from=&to=` (admin).
Two active bookings for the same seat, trip and date are blocked by a unique index in MongoDB.

## Known limits

Online passenger booking (FR-14, Could) is not built. Fares are stored on each trip. Payments are recorded by staff, with no payment gateway.
The free Render service sleeps when idle, so the first request after a pause can take about a minute.
