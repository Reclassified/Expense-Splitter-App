# Architecture Overview

This document provides a high-level overview of the Splitter App architecture.

## Structure
- **client/**: React frontend
- **server/**: Node.js/Express backend
- **uploads/**: File uploads (CSV/PDF)
- **database**: SQLite (file-based)

## Data Flow
1. User interacts with the React frontend
2. Frontend makes API calls to the Express backend
3. Backend handles authentication, business logic, and database operations
4. Responses are sent back to the frontend

## To Do
- Add diagrams and more detailed explanations 