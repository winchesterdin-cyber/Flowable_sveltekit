# Setup Guide

This guide covers how to set up and run the application locally.

## Prerequisites

- **Java 17+** (for Backend)
- **Node.js 20+** (for Frontend)
- **Docker & Docker Compose** (for Database and/or full stack)
- **Maven** (optional, wrapper provided)

## Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and set your configuration variables. Important ones include:
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
   - `SPRING_MAIL_*` (for email notifications)

## Running with Docker Compose (Recommended)

To run the full stack (Database + Backend + Frontend):

```bash
docker-compose up --build
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:8080](http://localhost:8080)

To run only the database:

```bash
docker-compose up -d postgres
```

## Manual Development

### 1. Database
Start the PostgreSQL database:
```bash
docker-compose up -d postgres
```

### 2. Backend
Navigate to the `backend` directory:
```bash
cd backend
```

Build and run:
```bash
./mvnw clean install
./mvnw spring-boot:run
```
The backend will start on port 8080.

### 2a. Resetting the local dev database (H2)
Use the provided script to clear the local H2 database and seed sample data:
```bash
./scripts/reset-dev-db.sh
SPRING_PROFILES_ACTIVE=h2 ./mvnw spring-boot:run
```
The reset script removes local DB files under `backend/data` and triggers `/api/database/seed` if the backend is running.

### 3. Frontend
Navigate to the `frontend` directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```
The frontend will start on [http://localhost:5173](http://localhost:5173).

## Troubleshooting

- **Database Connection**: Ensure `POSTGRES_USER` and `POSTGRES_PASSWORD` in `.env` match what's in `application.yml` (or override via environment variables).
- **Frontend API**: The frontend proxies requests to `http://localhost:8080` by default. If your backend is on a different port, update `vite.config.ts`.
- **Docker Compose Not Found**: Some environments (like restricted CI or sandboxed shells) do not include Docker/Docker Compose. In that case, install Docker Desktop locally or use the manual database setup steps instead of `docker-compose up -d postgres`.
