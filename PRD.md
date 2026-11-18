# PRD: Smart Ticket Triage

## 1. Problem Statement
Support teams receive tickets written in free text. Someone has to read each one, decide its category and priority, and write a short summary. This is slow, repetitive, and inconsistent between people.

## 2. Goal
Automatically triage a support ticket the moment it is submitted: an LLM assigns a **category**, a **priority**, and a **one-line summary**, and the result is stored and displayed.

## 3. Target User
- **Customer:** submits a ticket.
- **Support agent:** reads the triaged list.

(No login system. A user is identified by name only, to keep the project simple.)

## 4. Problem Modeling
Breaking the real-world problem into parts.

**Entities**

| Entity | Meaning | Key attributes |
|---|---|---|
| User | Person who raises a ticket | name |
| Category | Fixed type of issue | name |
| Ticket | The support request | title, description, priority, summary |

**Relationships**
- One User raises many Tickets (1 to N).
- One Category groups many Tickets (1 to N).
- A Ticket belongs to exactly one User, and to at most one Category.

**Inputs and outputs**
- Input: name, title, description.
- AI output: category, priority, summary (structured JSON).
- System output: a saved ticket row shown in a table.

**Flow:** Submit form -> validate -> ask LLM -> validate LLM output -> save in database -> show in table.

**Rules**
- Categories are fixed: Account Access, Billing, Bug, Feature Request, Other.
- Priorities are fixed: Low, Medium, High.

## 5. Functional Requirements

| ID | Requirement |
|---|---|
| FR1 | User can submit a ticket with name, title, description. |
| FR2 | System rejects empty or too-long input with a clear error. |
| FR3 | System sends the ticket text to the Groq LLM. |
| FR4 | LLM replies with JSON containing category, priority, summary. |
| FR5 | System validates the JSON before saving. |
| FR6 | System saves the user, ticket and category link in PostgreSQL. |
| FR7 | User can view all tickets with user name, category, priority, summary. |
| FR8 | User can view the number of tickets per category. |
| FR9 | System limits ticket submissions to 5 per minute per IP. |

## 6. Non-Functional Requirements
- **Security:** API key and database URL are kept in environment variables, never committed.
- **Reliability:** an AI failure returns a clean error and nothing is saved.
- **Simplicity:** minimal dependencies, no ORM, raw SQL.
- **Maintainability:** separate folders for routes, middleware and services.

## 7. Scope
**In scope:** ticket submission, AI triage, storage, listing, category counts.
**Out of scope:** login, ticket status updates, editing or deleting tickets, email notifications, file attachments.

## 8. Success Criteria
- A submitted ticket appears in the table with a valid category, priority and summary.
- Invalid input and AI failures show an error message and save nothing.
- No secret appears in the repository.

## 9. Tech Stack
HTML, CSS, JavaScript (frontend) | Node.js + Express (backend) | PostgreSQL on NeonDB | Groq LLM API
