# Splitter App

A full-stack expense splitter app with React frontend, Node.js/Express backend, and SQLite database.

## Table of Contents
- [Features](#features)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Deployment Tips](#deployment-tips)
- [Documentation](#documentation)
- [Contributing](#contributing)

## Features
- Group expense splitting
- Custom splits
- Recurring expenses
- Currency conversion
- Payments and debt settlement
- Notifications
- CSV/PDF import/export
- Internationalization (i18n)
- Dark mode
- Dockerized deployment
- CI/CD with GitHub Actions

## Quick Start

1. Clone the repo
2. Install dependencies in both `client` and `server`
3. Set up your `.env` files (see `.env.example`)
4. Run with Docker Compose:
   ```sh
   docker-compose up --build
   ```
5. Access the app at http://localhost:3000

## Environment Variables
- Backend: Copy `.env.example` to `.env` in the `server` folder and fill in the required values.
- Frontend: API URLs are set for local development. For production, update them in `client/src/api.js` or use environment variables as needed.

## Deployment Tips
- Use Docker Compose for local or production deployment.
- For production, set secure values in your `.env` files and configure HTTPS in your reverse proxy (e.g., Nginx).
- Regularly update dependencies and rebuild images.

## Documentation
- API: Swagger docs at `/api-docs`
- More: See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines

---

For detailed contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md). 