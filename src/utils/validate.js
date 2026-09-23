function validateContactPayload({ name, email, message }) {
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) errors.push('name must be at least 2 characters');
  else if (name.trim().length > 100) errors.push('name must be under 100 characters');

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('a valid email is required');
  else if (email.trim().length > 254) errors.push('email must be under 254 characters');

  if (!message || typeof message !== 'string' || message.trim().length < 10) errors.push('message must be at least 10 characters');
  else if (message.trim().length > 5000) errors.push('message must be under 5000 characters');

  return errors;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { validateContactPayload, escapeHtml };
