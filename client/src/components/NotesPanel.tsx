import { useState, useEffect } from "react";
import CollapsiblePanel from "./CollapsiblePanel";
import { getNotes, createNote, deleteNote } from "../services/api";

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface Props {
  refreshKey?: number;
  bare?: boolean;
}

export default function NotesPanel({ refreshKey, bare }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  const fetchNotes = (searchTerm?: string) => {
    getNotes(searchTerm || undefined)
      .then(({ data }) => setNotes(data.notes || []))
      .catch(() => setNotes([]));
  };

  useEffect(() => {
    fetchNotes(search);
  }, [refreshKey]);

  const handleCreate = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    createNote(trimmed)
      .then(() => {
        setInput("");
        fetchNotes(search);
      })
      .catch(() => {});
  };

  const handleDelete = (id: string) => {
    deleteNote(id)
      .then(() => fetchNotes(search))
      .catch(() => {});
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchNotes(value);
  };

  const content = (
    <>
      <div className="notes-panel__input-row">
        <input
          className="notes-panel__input"
          type="text"
          placeholder="Add a note..."
          value={input}
          maxLength={500}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <button className="btn-sm btn-buy" onClick={handleCreate}>
          Save
        </button>
      </div>
      <div className="notes-panel__input-row">
        <input
          className="notes-panel__input"
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      {notes.length === 0 ? (
        <div className="text-muted">No notes</div>
      ) : (
        notes.map((n) => (
          <div key={n.id} className="note-entry">
            <div className="note-entry__content">
              {n.content}
              <div className="note-entry__id">
                {new Date(n.createdAt).toLocaleDateString()}
              </div>
            </div>
            <button
              className="note-entry__delete"
              onClick={() => handleDelete(n.id)}
              title="Delete note"
            >
              X
            </button>
          </div>
        ))
      )}
    </>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return (
    <CollapsiblePanel title="NOTES" badge={notes.length || null}>
      {content}
    </CollapsiblePanel>
  );
}
