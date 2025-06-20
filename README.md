# Expense Splitter Application

This is a full-stack expense splitting application built with React on the frontend and Node.js/Express on the backend, using SQLite as the database.

## Features

- **User Authentication:** Secure user registration and login with JWT.
- **Group Management:** Create and manage expense groups with other users.
- **Expense Tracking:** Add, edit, and delete expenses within groups.
- **Custom Splits:** Split expenses equally, by specific amounts, or by percentage.
- **Recurring Expenses:** Set up expenses that repeat on a schedule (e.g., monthly).
- **Currency Support:** Handle expenses in different currencies with automatic conversion.
- **Payments & Debt Settlement:** Track payments between users to settle debts.
- **Notifications:** Receive reminders for outstanding payments.
- **Data Portability:** Export expenses to CSV/PDF and import from CSV.

## Tech Stack

- **Frontend:** React, Axios
- **Backend:** Node.js, Express, SQLite (with `better-sqlite3`)
- **Testing:** Jest, Supertest, React Testing Library
- **API Documentation:** Swagger (OpenAPI)

---

## Getting Started

### Prerequisites

- Node.js and npm
- Git

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd expense-splitter-app
    ```

2.  **Install backend dependencies:**
    ```bash
    cd server
    npm install
    ```

3.  **Install frontend dependencies:**
    ```bash
    cd ../client
    npm install
    ```

### Running the Application

1.  **Start the backend server:**
    ```bash
    cd server
    npm start
    ```
    The server will run on `http://localhost:5000`.

2.  **Start the frontend development server:**
    ```bash
    cd client
    npm start
    ```
    The React app will open in your browser at `http://localhost:3000`.

---

## Testing

### Backend Tests

To run the backend integration tests:

```bash
cd server
npm test
```
This command runs Jest in the test environment, using an in-memory SQLite database to avoid affecting your development data.

### Frontend Tests

To run the frontend component tests:

```bash
cd client
npm test
```
This will launch the Jest test runner for the React components.

---

## API Documentation

This project uses Swagger for API documentation. With the backend server running, you can access the interactive API documentation at:

[http://localhost:5000/api-docs](http://localhost:5000/api-docs)

From this UI, you can view all available endpoints, see their expected payloads, and even execute requests directly. To test protected endpoints, click the "Authorize" button and enter your JWT token in the format `Bearer <token>`.

---

## Deployment

This project is configured for containerized deployment using Docker.

1.  **Build and run with Docker Compose:**
    ```bash
    docker-compose up --build
    ```
    This will build the images for both the client and server and start the containers. The application will be accessible at `http://localhost:3000`.

---

## Project Structure
```
Splitter App/
  client/      # React frontend
  server/      # Node.js/Express backend
  .gitignore
  README.md
```

---

## Usage
1. Register a new account or log in.
2. Create a group and invite members by username.
3. Add expenses to groups and split them among members.
4. View balances and settle up as needed.

---

## Environment Variables
- **Backend:** See `.env.example` (create your own `.env`)
- **Frontend:** API URLs are currently hardcoded to `http://localhost:5000`. For deployment, update these URLs or use environment variables as needed.

---

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License
[ISC](LICENSE) (or specify your license here) 