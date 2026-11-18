# Diagram notes

Draw both diagrams in draw.io, Excalidraw, Figma or Lucidchart, export them as images, and put them in the PDF.

## Diagram 1: Deployment architecture

Boxes and arrows, left to right:
1. User browser
2. Netlify (static frontend: `frontend/`), HTTPS arrow from the browser
3. Render (Express API: `backend/`), arrow labelled "HTTPS, JSON, Bearer token" from the browser to Render
4. MongoDB Atlas, arrow labelled "mongodb+srv" from Render
5. Label on Render: environment variables `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_ORIGIN` (names only, never values)
6. Label on the health check: `GET /api/health`

## Diagram 2: CI/CD pipeline

Left to right:
1. Developer pushes a branch and opens a pull request to `main`
2. GitHub Actions runs two jobs in parallel: `backend` (npm install, npm test) and `frontend` (npm install, npm test)
3. Decision: checks pass? No: merge blocked, fix and push again. Yes: partner approves the pull request
4. Merge to `main`
5. Netlify rebuilds the frontend, and Render deploys the backend after CI checks pass
6. Live site updated
