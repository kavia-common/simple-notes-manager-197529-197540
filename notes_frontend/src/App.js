import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
} from './api/notesApi';

function formatUpdatedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function compareNotesByUpdatedAtDesc(a, b) {
  const aTime = new Date(a.updated_at || 0).getTime();
  const bTime = new Date(b.updated_at || 0).getTime();
  return bTime - aTime;
}

// PUBLIC_INTERFACE
function App() {
  /** Notes app main UI: sidebar list + editor panel for create/update/delete. */
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // Editor (controlled inputs)
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');

  // Basic UI state
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const selectedNote = useMemo(
    () => notes.find((n) => String(n.id) === String(selectedId)) || null,
    [notes, selectedId]
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedNote) return draftTitle.trim() !== '' || draftContent.trim() !== '';
    return (
      (draftTitle ?? '') !== (selectedNote.title ?? '') ||
      (draftContent ?? '') !== (selectedNote.content ?? '')
    );
  }, [draftTitle, draftContent, selectedNote]);

  async function refreshNotesAndKeepSelection(nextSelectedId = selectedId) {
    setError('');
    setIsLoadingList(true);
    const controller = new AbortController();
    try {
      const list = await listNotes({ signal: controller.signal });
      const sorted = Array.isArray(list) ? [...list].sort(compareNotesByUpdatedAtDesc) : [];
      setNotes(sorted);

      // Keep selection if possible; otherwise select first note if exists.
      const stillExists = nextSelectedId != null && sorted.some((n) => String(n.id) === String(nextSelectedId));
      const newSelected = stillExists ? nextSelectedId : (sorted[0]?.id ?? null);
      setSelectedId(newSelected);

      // If selection changed due to refresh, ensure draft matches selected note.
      const nextNote = sorted.find((n) => String(n.id) === String(newSelected)) || null;
      setDraftTitle(nextNote?.title ?? '');
      setDraftContent(nextNote?.content ?? '');
    } catch (e) {
      setError(e?.message || 'Failed to load notes');
    } finally {
      setIsLoadingList(false);
    }
  }

  useEffect(() => {
    // Initial load
    refreshNotesAndKeepSelection(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectNote(note) {
    setError('');

    // Minimal protection: don’t auto-discard edits without warning.
    if (hasUnsavedChanges) {
      const ok = window.confirm('You have unsaved changes. Discard them and switch notes?');
      if (!ok) return;
    }

    setSelectedId(note.id);
    setDraftTitle(note.title ?? '');
    setDraftContent(note.content ?? '');
  }

  async function handleNewNote() {
    setError('');

    if (hasUnsavedChanges) {
      const ok = window.confirm('You have unsaved changes. Discard them and create a new note?');
      if (!ok) return;
    }

    setSelectedId(null);
    setDraftTitle('');
    setDraftContent('');
  }

  async function handleSave() {
    setError('');
    setIsSaving(true);

    const title = draftTitle.trim();
    const content = draftContent;

    if (!title) {
      setIsSaving(false);
      setError('Title is required.');
      return;
    }

    try {
      if (selectedId == null) {
        const created = await createNote({ title, content });
        // Refresh list and select the new note if backend returns it.
        const newId = created?.id ?? null;
        await refreshNotesAndKeepSelection(newId);
      } else {
        await updateNote(selectedId, { title, content });
        await refreshNotesAndKeepSelection(selectedId);
      }
    } catch (e) {
      setError(e?.message || 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setError('');

    if (selectedId == null) return;

    const ok = window.confirm('Delete this note? This cannot be undone.');
    if (!ok) return;

    setIsDeleting(true);
    try {
      await deleteNote(selectedId);
      await refreshNotesAndKeepSelection(null);
    } catch (e) {
      setError(e?.message || 'Failed to delete note');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="App NotesApp">
      <header className="NotesHeader">
        <div className="NotesHeader__left">
          <h1 className="NotesHeader__title">Notes</h1>
          <p className="NotesHeader__subtitle">Create, edit, and delete your notes</p>
        </div>

        <div className="NotesHeader__right">
          <button className="btn" type="button" onClick={handleNewNote}>
            New
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleSave}
            disabled={isSaving || isDeleting}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={handleDelete}
            disabled={selectedId == null || isSaving || isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </header>

      {error ? (
        <div className="Alert Alert--error" role="alert">
          {error}
        </div>
      ) : null}

      <main className="NotesLayout" aria-busy={isLoadingList ? 'true' : 'false'}>
        <aside className="Sidebar" aria-label="Notes list">
          <div className="Sidebar__header">
            <h2 className="Sidebar__title">Your notes</h2>
            {isLoadingList ? <span className="Sidebar__meta">Loading…</span> : null}
          </div>

          <ul className="NoteList">
            {notes.length === 0 && !isLoadingList ? (
              <li className="NoteList__empty">No notes yet. Click “New” to create one.</li>
            ) : null}

            {notes.map((n) => {
              const isActive = selectedId != null && String(n.id) === String(selectedId);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`NoteListItem ${isActive ? 'is-active' : ''}`}
                    onClick={() => selectNote(n)}
                  >
                    <div className="NoteListItem__title" title={n.title || ''}>
                      {n.title || '(Untitled)'}
                    </div>
                    <div className="NoteListItem__meta">
                      {n.updated_at ? `Updated ${formatUpdatedAt(n.updated_at)}` : ''}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="Editor" aria-label="Note editor">
          <div className="Editor__header">
            <h2 className="Editor__title">
              {selectedId == null ? 'New note' : 'Edit note'}
            </h2>
            {selectedNote?.updated_at ? (
              <div className="Editor__meta">Last updated: {formatUpdatedAt(selectedNote.updated_at)}</div>
            ) : (
              <div className="Editor__meta"> </div>
            )}
          </div>

          <div className="Editor__form">
            <label className="Field">
              <span className="Field__label">Title</span>
              <input
                className="Input"
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Note title"
                autoComplete="off"
              />
            </label>

            <label className="Field">
              <span className="Field__label">Content</span>
              <textarea
                className="Textarea"
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Write your note…"
                rows={12}
              />
            </label>

            {hasUnsavedChanges ? (
              <div className="Editor__unsaved" aria-live="polite">
                Unsaved changes
              </div>
            ) : (
              <div className="Editor__unsaved" aria-live="polite">
                {selectedId == null ? ' ' : 'All changes saved'}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
