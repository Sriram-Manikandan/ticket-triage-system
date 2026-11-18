# Smart Ticket Triage

Submit a support ticket. A Groq LLM returns its category, priority and a one-line summary as JSON. The ticket is stored in PostgreSQL (NeonDB) and shown in a table.

Docs: [PRD.md](PRD.md) | [HLD.md](HLD.md) | [LLD.md](LLD.md)

## Setup

1. **Requirements:** Node.js 18 or newer.
2. **Database:** create a NeonDB project, open its SQL editor, and run `schema.sql`.
3. **Environment:** copy `.env.example` to `.env` and fill in `GROQ_API_KEY` and `DATABASE_URL`.
4. **Install and run:**
   ```bash
   npm install
   npm start
   ```
5. Open http://localhost:3000

## Git setup
```bash
git init
git checkout -b main
git add .
git commit -m "chore: initial project setup"
git checkout -b dev
```
Check that `.env` does not appear in `git status` before your first commit.
