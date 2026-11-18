const express = require('express');
const pool = require('../db');
const { triageTicket } = require('../services/groq');
const validateTicket = require('../middleware/validateTicket');
const createRateLimiter = require('../middleware/rateLimiter');

const router = express.Router();
const limiter = createRateLimiter(5, 60 * 1000); // max 5 submissions per minute per IP

// POST /api/tickets : middleware chain runs first, then the handler
router.post('/', limiter, validateTicket, async (req, res, next) => {
  try {
    const { name, title, description } = req.body;

    // 1. Ask the LLM for category, priority, summary
    const ai = await triageTicket(title, description);

    // 2. Find or create the user
    const user = await pool.query(
      `INSERT INTO users (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name.trim()]
    );

    // 3. Look up the category id (stays NULL if the AI category is not matched)
    let categoryId = null;
    if (ai.category) {
      const cat = await pool.query('SELECT id FROM categories WHERE name = $1', [ai.category]);
      categoryId = cat.rows[0] ? cat.rows[0].id : null;
    }

    // 4. Save the ticket
    const saved = await pool.query(
      `INSERT INTO tickets (user_id, category_id, title, description, priority, summary)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [user.rows[0].id, categoryId, title.trim(), description.trim(), ai.priority, ai.summary]
    );

    res.status(201).json({ id: saved.rows[0].id, category: ai.category, priority: ai.priority, summary: ai.summary });
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets : INNER JOIN users, LEFT JOIN categories
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT t.id, u.name AS user_name, t.title, c.name AS category, t.priority, t.summary
       FROM tickets t
       INNER JOIN users u ON t.user_id = u.id
       LEFT JOIN categories c ON t.category_id = c.id
       ORDER BY t.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/stats : LEFT JOIN + GROUP BY, so categories with 0 tickets still appear
router.get('/stats', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.name AS category, COUNT(t.id)::int AS total
       FROM categories c
       LEFT JOIN tickets t ON t.category_id = c.id
       GROUP BY c.name
       ORDER BY c.name`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
