# LLD: Smart Ticket Triage

## 1. Folder Structure
```
smart-ticket-triage/
├── server.js              app setup and middleware order
├── db.js                  PostgreSQL connection pool
├── constants.js           allowed categories and priorities
├── schema.sql             tables and seed data
├── middleware/
│   ├── logger.js
│   ├── validateTicket.js
│   ├── rateLimiter.js     closure example
│   └── errorHandler.js
├── routes/
│   └── tickets.js         API endpoints
├── services/
│   └── groq.js            LLM call, prompt, validation
├── public/
│   ├── index.html         structure only
│   ├── style.css
│   └── app.js
├── .env.example
├── .gitignore
└── package.json
```

## 2. Database Design (PostgreSQL)

```sql
CREATE TABLE users (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE tickets (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id),
  category_id INT REFERENCES categories(id),
  title       VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority    VARCHAR(10) NOT NULL CHECK (priority IN ('Low','Medium','High')),
  summary     TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

| Table | PK | FK | Notes |
|---|---|---|---|
| users | id | none | `name` is UNIQUE |
| categories | id | none | `name` is UNIQUE, seeded |
| tickets | id | `user_id` -> users.id, `category_id` -> categories.id | `category_id` can be NULL; `priority` has a CHECK constraint |

**Relationships:** users 1-N tickets, categories 1-N tickets.
**Why `category_id` is nullable:** if the AI returns a category we do not know, the ticket is still saved, with NULL.

## 3. SQL Queries

**Ticket list (INNER JOIN + LEFT JOIN)**
```sql
SELECT t.id, u.name AS user_name, t.title, c.name AS category, t.priority, t.summary
FROM tickets t
INNER JOIN users u ON t.user_id = u.id
LEFT JOIN categories c ON t.category_id = c.id
ORDER BY t.id DESC;
```
- `INNER JOIN users`: every ticket has a user (NOT NULL FK), so rows are never lost.
- `LEFT JOIN categories`: keeps tickets whose `category_id` is NULL; their `category` column is NULL.

**Category counts (LEFT JOIN + GROUP BY)**
```sql
SELECT c.name AS category, COUNT(t.id)::int AS total
FROM categories c
LEFT JOIN tickets t ON t.category_id = c.id
GROUP BY c.name
ORDER BY c.name;
```
Starting from `categories` with a LEFT JOIN means a category with zero tickets still shows `0`. An INNER JOIN would drop it.

**Find or create user**
```sql
INSERT INTO users (name) VALUES ($1)
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
RETURNING id;
```

## 4. API Design

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/tickets` | Create and triage a ticket |
| GET | `/api/tickets` | List all tickets |
| GET | `/api/tickets/stats` | Ticket count per category |

**POST /api/tickets**
Request:
```json
{ "name": "Priya", "title": "Can't log in", "description": "Reset password twice, still failing." }
```
Success (201):
```json
{ "id": 2, "category": "Account Access", "priority": "High", "summary": "User is locked out after two password resets." }
```
Error:
```json
{ "error": "name, title and description are required (max 100, 200, 2000 characters)." }
```

| Status | Cause |
|---|---|
| 400 | Validation failed |
| 429 | Rate limit exceeded |
| 502 | Groq failed or returned bad output |
| 500 | Unexpected error |

## 5. Middleware Design

Order in `server.js`:
```
logger -> express.json -> express.static -> /api/tickets router -> errorHandler
```
Inside the POST route: `rateLimiter -> validateTicket -> handler`.

| Middleware | What it does | On problem |
|---|---|---|
| `logger` | Logs method, URL, status, time after the response finishes | n/a |
| `rateLimiter` | Allows 5 requests per minute per IP | `next(err)` with status 429 |
| `validateTicket` | Checks that name, title, description are non-empty strings within length limits | `next(err)` with status 400 |
| `errorHandler` | Four parameters `(err, req, res, next)`; sends JSON error. Hides details for 500 | n/a |

Each middleware either calls `next()` to continue or `next(err)` to jump to the error handler.

## 6. JavaScript Closure (`middleware/rateLimiter.js`)

```js
function createRateLimiter(maxRequests, windowMs) {
  const hits = {};                       // private state
  return function rateLimiter(req, res, next) {
    // uses hits, maxRequests, windowMs from the outer function
  };
}
```
- `createRateLimiter` runs once and returns an inner function.
- The inner function still remembers `hits`, `maxRequests` and `windowMs` after the outer function has finished. That is a closure.
- `hits` is private: no other code can read or change it.
- Calling `createRateLimiter` again creates a new, separate `hits` object.

## 7. LLM Integration (`services/groq.js`)

**Request**
- Endpoint: `https://api.groq.com/openai/v1/chat/completions`
- Model: `GROQ_MODEL` from env (default `llama-3.3-70b-versatile`)
- `temperature: 0` for consistent answers
- `response_format: { type: "json_object" }` (JSON mode)
- Header: `Authorization: Bearer <GROQ_API_KEY>`

**Prompt engineering**
System prompt contains:
1. **Role:** "You are a support ticket triage assistant."
2. **Task:** read the ticket, reply with JSON only.
3. **Allowed values:** categories and priorities, injected from `constants.js`.
4. **Priority definitions:** High = blocked/urgent, Medium = workaround exists, Low = minor.
5. **Format rules:** summary is one sentence, maximum 20 words, no extra keys.
6. **Example output:** one sample JSON (few-shot).

User message: `Title: ...` and `Description: ...`.

**Structured output validation**
JSON mode guarantees valid JSON syntax, not valid values. So the code:
1. `JSON.parse` the reply (failure -> 502).
2. Check `priority` is in the allowed list and `summary` is a non-empty string (failure -> 502).
3. Check `category` is in the allowed list; if not, set it to `null` and continue.

## 8. Request Sequence: POST /api/tickets

```
Browser          Express                 Groq            Postgres
  | POST            |                      |                 |
  |---------------->| logger               |                 |
  |                 | rateLimiter          |                 |
  |                 | validateTicket       |                 |
  |                 |--- prompt + ticket ->|                 |
  |                 |<---- JSON -----------|                 |
  |                 | validate JSON        |                 |
  |                 |------------- upsert user ------------->|
  |                 |------------- find category id -------->|
  |                 |------------- insert ticket ----------->|
  |<-- 201 JSON ----|                      |                 |
```

## 9. Frontend Design (`public/`)
- `index.html`: markup only, linking `style.css` and `app.js`. No inline CSS or JS.
- `app.js`:
  - `loadTickets()` calls `GET /api/tickets` and builds table rows.
  - `loadStats()` calls `GET /api/tickets/stats` and builds the count badges.
  - The submit handler calls `POST /api/tickets`, shows the message, and reloads both lists.
  - Cells are created with `textContent` (safe from HTML injection).
- `style.css`: layout, form styling, priority colours.

## 10. Environment Variables and Secrets

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Authenticates with Groq |
| `GROQ_MODEL` | Model name (optional) |
| `DATABASE_URL` | NeonDB connection string |
| `PORT` | Server port (optional, default 3000) |

- Loaded by `dotenv` into `process.env`.
- `.env` is listed in `.gitignore`, so it is never committed.
- `.env.example` is committed with placeholder values so others know what to set.
- If a secret is ever committed by mistake, rotate (replace) it, because deleting the file does not remove it from Git history.

## 11. Git Workflow

**Branches**
- `main`: stable.
- `dev`: integration.
- `feature/*`: one per task.

**Typical flow**
```bash
git checkout dev
git checkout -b feature/rate-limiter
# ...work...
git add middleware/rateLimiter.js
git commit -m "feat: add closure-based rate limiter"
git checkout dev
git merge feature/rate-limiter
# when dev is tested
git checkout main
git merge dev
```

**Commit message style:** `feat:` new feature, `fix:` bug fix, `docs:` documentation, `chore:` setup or config.
