# Bus Ticket Reservation and Booking System

A web-based bus ticket reservation and booking system developed for **Bicol Isarog Transport System, Inc.** as an IPT 102 Pre-Final Project.

The project is based on the Software Requirements Specification (SRS) v1.0 and uses automated testing and continuous integration to support reliable development and deployment.

## Team Members

| Member | Role |
|---|---|
| Jay Rhomer Vidor | Frontend and Interface Lead |
| Ronelyn Santillan | Backend and Pipeline Lead |

## Project Links

- **Frontend:** [Add your Netlify or Vercel deployment URL]
- **Backend Health Check:** [Add your Render URL]/api/health
- **GitHub Repository:** https://github.com/bananamyi8/Bus_Reservation_Booking_System

## System Architecture

The system follows a client-server architecture:

1. **Frontend:** A static web application built with HTML, CSS, and JavaScript, hosted on Netlify.
2. **Backend:** A REST API developed using Node.js and Express, hosted on Render.
3. **Database:** MongoDB Atlas stores system data, including user accounts, trips, bookings, and related records.
4. **CI/CD:** GitHub Actions automatically runs backend and frontend tests whenever changes are pushed or pull requests are created for the `main` branch.

Render deployment is configured to run after the required CI checks pass.

For architecture diagrams and additional documentation, see `docs/DIAGRAMS.md`.

## Project Structure

```text
Bus_Reservation_Booking_System/
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── backend/
│   ├── src/
│   │   └── server.js
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── css/
│   ├── js/
│   ├── tests/
│   ├── index.html
│   └── package.json
│
├── docs/
│   └── DIAGRAMS.md
│
├── .gitignore
├── netlify.toml
├── render.yaml
└── README.md
```

## Technologies Used

| Technology | Purpose |
|---|---|
| HTML, CSS, JavaScript | Frontend development |
| Node.js | Backend runtime |
| Express.js | REST API development |
| MongoDB Atlas | Cloud database |
| Mongoose | MongoDB object modeling |
| Jest | Automated testing |
| Git and GitHub | Version control and collaboration |
| GitHub Actions | Continuous integration |
| Netlify | Frontend hosting |
| Render | Backend hosting |

## Installation and Local Setup

### Prerequisites

Make sure the following are installed:

- Node.js and npm
- Git
- MongoDB Atlas account or an accessible MongoDB database
- Visual Studio Code (recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/bananamyi8/Bus_Reservation_Booking_System.git
cd Bus_Reservation_Booking_System
```

### 2. Set Up the Backend

Open a terminal and run:

```bash
cd backend
npm install
```

Create your local environment file:

```bash
copy .env.example .env
```

Open `backend/.env` and configure the required values:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
FRONTEND_ORIGIN=http://localhost:8080
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

Replace the sample values with your actual configuration. Use a strong administrator password of at least 10 characters.

Start the backend:

```bash
npm start
```

The backend should be available at:

```text
http://localhost:5000
```

### 3. Set Up the Frontend

Open a second terminal and run:

```bash
cd frontend
npm install
npm start
```

Open the frontend in your browser:

```text
http://localhost:8080
```

Make sure the frontend API configuration points to your local backend.

### 4. Initial Administrator Setup

When the backend starts with an empty database, it can create the initial administrator using the configured `ADMIN_USERNAME` and `ADMIN_PASSWORD` values.

After signing in, the administrator can create staff accounts and manage trips and fares through the system.

## Environment Variables

The following environment variables are required for backend configuration:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB database connection string |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `FRONTEND_ORIGIN` | Allowed frontend origin for CORS |
| `ADMIN_USERNAME` | Initial administrator username |
| `ADMIN_PASSWORD` | Initial administrator password |
| `PORT` | Backend server port; Render provides this in deployment |

**Security Notice:** Never upload your actual `.env` files, database credentials, administrator passwords, or JWT secrets to GitHub. Keep sensitive configuration in local environment files or your hosting provider's environment settings.

The `window.API_BASE` setting in `frontend/js/config.js` is a public API URL and should not contain private credentials.

## System Features and API Endpoints

The backend provides REST API endpoints for the following operations:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check backend health |
| POST | `/api/v1/auth/login` | Authenticate a user |
| POST | `/api/v1/auth/staff` | Create staff accounts (admin) |
| GET | `/api/v1/trips` | Retrieve available trips |
| GET | `/api/v1/trips/:id/seats` | Retrieve seat availability |
| POST | `/api/v1/trips` | Create a trip (admin) |
| PATCH | `/api/v1/trips/:id` | Update a trip (admin) |
| POST | `/api/v1/bookings` | Create a booking |
| GET | `/api/v1/bookings?reference=&name=` | Search bookings |
| GET | `/api/v1/bookings/:id` | Retrieve booking details |
| PATCH | `/api/v1/bookings/:id/payment` | Update payment information |
| PATCH | `/api/v1/bookings/:id/cancel` | Cancel a booking |
| GET | `/api/v1/reports/bookings?from=&to=` | Generate booking reports (admin) |

The system uses a unique MongoDB index to prevent two active bookings from reserving the same seat for the same trip and travel date.

## Automated Testing

Automated tests are included for both backend and frontend functionality.

### Backend Tests

| Test ID | Description |
|---|---|
| B-T1 | Checks whether `/api/health` returns HTTP 200 and `status: ok` |
| B-T2 | Validates passenger names and contact information |
| B-T3 | Validates payment amounts and payment consistency |
| B-T4 | Checks authentication protection on restricted routes |
| B-T5 | Checks booking reference format and remaining seat calculations |

### Frontend Tests

| Test ID | Description |
|---|---|
| F-T1 | Validates passenger form inputs |
| F-T2 | Checks Philippine peso currency formatting |
| F-T3 | Checks whether occupied seats are displayed correctly |

### Run the Tests

Backend:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend
npm test
```

## Continuous Integration and Deployment

The project uses GitHub Actions to automate testing and support a consistent development workflow.

- Backend and frontend tests run automatically on pushes and pull requests targeting `main`.
- Changes should be submitted through pull requests.
- Both CI checks must pass before changes are approved for integration.
- Render deployment is configured to occur after the required CI checks pass.

The workflow configuration is located at:

```text
.github/workflows/ci.yml
```

## Known Limitations

The current project has the following limitations:

- Online passenger booking (FR-14, classified as Could in the SRS) is not yet implemented.
- Trip fares are stored as part of each trip's information.
- Payments are recorded by authorized staff; no external payment gateway is integrated.
- The free Render hosting service may become idle. The first request after inactivity can take approximately one minute while the service starts.

## Project Information

**Project:** Bus Ticket Reservation and Booking System  
**Client:** Bicol Isarog Transport System, Inc.  
**Course:** IPT 102 – Integrative Programming and Technologies 2  
**Project Type:** Pre-Final Project  
**SRS Version:** 1.0

---

Developed by **Jay Rhomer Vidor** and **Ronelyn Santillan**.
