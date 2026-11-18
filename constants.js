// Single source of truth for allowed values.
// Used by the LLM prompt AND by the validation code.
const CATEGORIES = ['Account Access', 'Billing', 'Bug', 'Feature Request', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High'];

module.exports = { CATEGORIES, PRIORITIES };
