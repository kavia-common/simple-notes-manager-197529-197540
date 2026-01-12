/**
 * API base URL resolution.
 *
 * Priority:
 *  1) REACT_APP_API_BASE (full base for notes endpoints, e.g. "http://localhost:3001/api/notes")
 *  2) REACT_APP_BACKEND_URL (backend origin, e.g. "http://localhost:3001")
 *  3) Default local dev origin "http://localhost:3001"
 *
 * This keeps local dev working out-of-the-box while supporting environment wiring.
 */
const BACKEND_ORIGIN =
  (process.env.REACT_APP_BACKEND_URL || '').trim() ||
  'http://localhost:3001';

const API_BASE_URL =
  (process.env.REACT_APP_API_BASE || '').trim() ||
  `${BACKEND_ORIGIN.replace(/\/$/, '')}/api/notes`;

/**
 * Parse JSON from a fetch Response with a helpful error when non-2xx.
 * Keeps error handling consistent across the app.
 */
async function parseJsonOrThrow(response) {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    if (isJson) {
      try {
        const body = await response.json();
        message = body?.detail || body?.message || message;
      } catch {
        // ignore json parse errors
      }
    } else {
      try {
        const text = await response.text();
        if (text) message = text;
      } catch {
        // ignore
      }
    }
    throw new Error(message);
  }

  if (!isJson) return null;
  return response.json();
}

// PUBLIC_INTERFACE
export async function listNotes({ signal } = {}) {
  /** Fetch list of notes. Returns an array of note summaries. */
  const response = await fetch(API_BASE_URL, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  return parseJsonOrThrow(response);
}

// PUBLIC_INTERFACE
export async function getNote(noteId, { signal } = {}) {
  /** Fetch a single note by id. */
  const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(noteId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  return parseJsonOrThrow(response);
}

// PUBLIC_INTERFACE
export async function createNote(payload, { signal } = {}) {
  /** Create a new note. Payload: {title, content}. */
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  return parseJsonOrThrow(response);
}

// PUBLIC_INTERFACE
export async function updateNote(noteId, payload, { signal } = {}) {
  /** Update an existing note. Payload: {title, content}. */
  const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(noteId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  return parseJsonOrThrow(response);
}

// PUBLIC_INTERFACE
export async function deleteNote(noteId, { signal } = {}) {
  /** Delete a note by id. */
  const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(noteId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
    signal,
  });

  // Some backends return 204 No Content, some return JSON. Both are fine.
  if (response.status === 204) return null;
  return parseJsonOrThrow(response);
}
