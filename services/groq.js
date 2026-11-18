// LLM API integration + prompt engineering + structured output validation.
require('dotenv').config();
const { CATEGORIES, PRIORITIES } = require('../constants');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Prompt engineering: role + rules + allowed values + output format + one example (few-shot).
const SYSTEM_PROMPT = `You are a support ticket triage assistant.
Read the ticket and reply with a JSON object only.

Rules:
- "category" must be exactly one of: ${CATEGORIES.join(', ')}.
- "priority" must be exactly one of: ${PRIORITIES.join(', ')}.
- High = user is blocked, losing money, or has an urgent deadline.
- Medium = something is broken but the user can work around it.
- Low = questions, suggestions, or minor issues.
- "summary" must be one sentence, maximum 20 words.
- Do not add any other keys or any text outside the JSON.

Example output:
{"category": "Billing", "priority": "Medium", "summary": "User was charged twice this month and wants a refund."}`;

async function triageTicket(title, description) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set in the environment.');
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}` // secret read from env
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
      temperature: 0,                              // consistent, repeatable answers
      response_format: { type: 'json_object' },    // structured output: JSON mode
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Title: ${title}\nDescription: ${description}` }
      ]
    })
  });

  if (!response.ok) {
    let providerMessage = '';
    try {
      const body = await response.json();
      if (body.error && typeof body.error.message === 'string') {
        providerMessage = body.error.message.replace(/\s+/g, ' ').slice(0, 300);
      }
    } catch (parseError) {
      console.error(`Groq returned a non-JSON error response (HTTP ${response.status}).`);
    }
    console.error(`Groq API request failed (HTTP ${response.status})${providerMessage ? `: ${providerMessage}` : ''}`);
    const err = new Error('The AI service failed. Please try again.');
    err.status = 502;
    throw err;
  }

  const data = await response.json();
  return parseAndValidate(data.choices[0].message.content);
}

// JSON mode guarantees valid JSON syntax, not valid values, so we validate ourselves.
function parseAndValidate(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const err = new Error('AI returned invalid JSON.');
    err.status = 502;
    throw err;
  }

  const { category, priority, summary } = parsed;
  if (!PRIORITIES.includes(priority) || typeof summary !== 'string' || summary.trim() === '') {
    const err = new Error('AI returned an unexpected response format.');
    err.status = 502;
    throw err;
  }

  // An unknown category is not fatal: it is saved as NULL (shown as "Uncategorised").
  return {
    category: CATEGORIES.includes(category) ? category : null,
    priority,
    summary: summary.trim()
  };
}

module.exports = { triageTicket };
