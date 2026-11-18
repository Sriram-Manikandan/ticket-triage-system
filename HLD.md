# HLD: Smart Ticket Triage

## 1. Overview
A three-tier web app. The browser talks to an Express server. The server calls the Groq LLM API and stores data in PostgreSQL on NeonDB.

## 2. Architecture

```
+-----------+   HTTP/JSON   +------------------------------+
|  Browser  | ------------> |        Express Server        |
| HTML CSS  | <------------ |  middleware -> routes ->     |
|    JS     |               |  services                    |
+-----------+               +---------+----------------+---+
                                      |                |
                              HTTPS   |                | SQL (pg)
                                      v                v
                            +-----------------+  +----------------+
                            |   Groq LLM API  |  | PostgreSQL     |
                            | (JSON response) |  | (NeonDB)       |
                            +-----------------+  +----------------+
```

## 3. Components

| Component | Responsibility |
|---|---|
| Frontend (`public/`) | Form, ticket table, category counts. Calls the REST API with `fetch`. |
| Middleware | Logging, input validation, rate limiting, central error handling. |
| Routes | Define the API endpoints and orchestrate the steps. |
| LLM service | Builds the prompt, calls Groq, validates the JSON reply. |
| Database | Stores users, categories, tickets. |
| Environment config | Holds secrets outside the code. |

## 4. Main Data Flow: Submit a Ticket
1. User fills the form; `app.js` sends `POST /api/tickets`.
2. Logger middleware records the request.
3. Rate limiter checks the request count for this IP.
4. Validation middleware checks the fields.
5. Route handler calls the LLM service.
6. LLM service sends the prompt to Groq and receives JSON.
7. The JSON is parsed and validated (allowed category and priority).
8. Handler finds or creates the user, finds the category id, inserts the ticket.
9. Server returns the result; the frontend refreshes the table and counts.

Any error at any step goes to the **error handler**, which returns a clean message.

## 5. Concept Coverage

| Concept | How it is used |
|---|---|
| LLM API integration | Server calls the Groq chat completions endpoint with `fetch`. |
| Prompt engineering | System prompt with role, rules, allowed values, priority definitions, and one example. `temperature: 0` for consistency. |
| Structured outputs | Groq JSON mode (`response_format: json_object`) plus server-side validation. |
| Middleware | Logger, validator, rate limiter, error handler in an Express pipeline. |
| Problem modeling | Entities, relationships, flow and rules defined in the PRD and reflected in the schema. |
| Env vars and secrets | `GROQ_API_KEY` and `DATABASE_URL` in `.env`; `.env` is git-ignored; `.env.example` is committed. |
| Git workflow | `main` / `dev` / `feature/*` branches, small commits, merge by pull request. |
| JS closures | `createRateLimiter` keeps a private `hits` object in its closure. |
| Relational schema (PK/FK) | Three tables; `tickets` references `users` and `categories`. |
| SQL JOINs | `INNER JOIN` and `LEFT JOIN` for the ticket list; `LEFT JOIN` + `GROUP BY` for counts. |

## 6. Database Overview

```
users (id PK, name)          categories (id PK, name)
        |  1                          |  1
        |                             |
        |  N                          |  N
        +---------- tickets ----------+
          (id PK, user_id FK, category_id FK, title,
           description, priority, summary, created_at)
```

## 7. Security
- Secrets live only in environment variables; the browser never sees the Groq key.
- The LLM is called from the server, not from the frontend.
- SQL uses parameterised queries (`$1, $2`) to prevent SQL injection.
- The frontend writes data with `textContent`, preventing script injection.
- The rate limiter protects the free Groq quota.

## 8. Error Handling Strategy
- 400: invalid input.
- 429: too many requests.
- 502: the LLM failed or returned invalid output.
- 500: unexpected server error (details hidden from the user, logged on the server).

## 9. Git Workflow
- `main`: stable, working code only.
- `dev`: integration branch.
- `feature/<name>`: one branch per feature, for example `feature/llm-service`.
- Commits are small with clear messages, for example `feat: add rate limiter middleware`.
- Features merge into `dev`, and `dev` merges into `main` when tested.
