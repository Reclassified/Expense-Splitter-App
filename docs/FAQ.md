# Frequently Asked Questions (FAQ)

## General

**Q: What is Splitter App?**  
A: A full-stack app for splitting group expenses, tracking payments, and settling debts.

**Q: What tech stack does it use?**  
A: React (frontend), Node.js/Express (backend), SQLite (database), Docker, Jest, and more.

## Usage

**Q: How do I run the app locally?**  
A: See the Quick Start in the [README](../README.md). Use Docker Compose for easiest setup.

**Q: How do I reset my database?**  
A: Delete the `expense_splitter.db` file in `server/` and restart the backend.

## Development

**Q: How do I run tests?**  
A: `npm test --prefix client` for frontend, `npm test --prefix server` for backend.

**Q: How do I add a new language?**  
A: Add translations to `client/src/i18n.js` and update the language switcher in `App.js`.

## Troubleshooting

**Q: I get a port conflict error.**  
A: Make sure nothing else is running on ports 3000/3001, or change the ports in `docker-compose.yml`.

**Q: Swagger docs show a YAML error.**  
A: Check for unquoted colons or indentation issues in JSDoc comments in the route files.

---
For more help, open an issue or see [SUPPORT.md](../SUPPORT.md) (if available). 