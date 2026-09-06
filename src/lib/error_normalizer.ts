/**
 * RiskLens AI - Response & Error Normalizer
 * 
 * Guarantees that arbitrary error objects, Axios/Fetch payload bodies, or structured
 * JSON error objects (such as `{ code: string, message: string }` or `{ error: { message } }`)
 * are never passed directly as React children into JSX.
 */

export function normalizeErrorMessage(
  error: any,
  fallback = 'AI Copilot is temporarily unavailable. The investigation data is still available.'
): string {
  if (error === null || error === undefined) {
    return fallback;
  }

  if (typeof error === 'string') {
    const trimmed = error.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (typeof error === 'number' || typeof error === 'boolean') {
    return String(error);
  }

  if (error instanceof Error) {
    return error.message && error.message.trim().length > 0 ? error.message.trim() : fallback;
  }

  if (typeof error === 'object') {
    // Check if error has a direct message field
    if (typeof error.message === 'string' && error.message.trim().length > 0) {
      return error.message.trim();
    }

    // Check if error has a reply field
    if (typeof error.reply === 'string' && error.reply.trim().length > 0) {
      return error.reply.trim();
    }

    // Check nested error field: { error: "..." } or { error: { message: "..." } }
    if (error.error) {
      if (typeof error.error === 'string' && error.error.trim().length > 0) {
        return error.error.trim();
      }
      if (typeof error.error === 'object') {
        if (typeof error.error.message === 'string' && error.error.message.trim().length > 0) {
          return error.error.message.trim();
        }
        if (typeof error.error.code === 'string') {
          return `${error.error.code}: ${error.error.message || fallback}`;
        }
      }
    }

    // Check code and details
    if (typeof error.code === 'string' && error.code) {
      return `${error.code}: ${error.message || fallback}`;
    }

    // Check statusText
    if (typeof error.statusText === 'string' && error.statusText) {
      return error.statusText;
    }
  }

  return fallback;
}

/**
 * Safely renders text in JSX children without risking React child object crashing
 */
export function safeRenderText(value: any, fallback = ''): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return normalizeErrorMessage(value, fallback);
}
