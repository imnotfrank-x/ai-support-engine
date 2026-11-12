export const CATEGORIES = ['ACCESS', 'BUG', 'FEATURE', 'SECURITY'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const MODES = ['traditional', 'generative'];

export function validateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'El cuerpo debe ser un objeto JSON.';
  }
  if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 4000) {
    return 'message debe ser texto no vacio de hasta 4000 caracteres.';
  }
  if (!MODES.includes(body.mode)) {
    return 'mode debe ser traditional o generative.';
  }
  return null;
}

export function isValidResult(result, mode) {
  return result !== null && typeof result === 'object'
    && CATEGORIES.includes(result.category)
    && PRIORITIES.includes(result.priority)
    && typeof result.response === 'string' && result.response.trim().length > 0
    && typeof result.requiresHumanReview === 'boolean'
    && result.mode === mode
    && (result.category !== 'SECURITY' || result.requiresHumanReview);
}
