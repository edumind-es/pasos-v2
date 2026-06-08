import { useState } from 'react';
import type { Board } from '../store/boardStore';

interface Props {
    board: Board;
    onSave: (title: string) => void;
}

export function EditableBoardTitle({ board, onSave }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(board.title);

    const handleSave = () => {
        const next = draft.trim();
        if (!next) { setDraft(board.title); setIsEditing(false); return; }
        if (next !== board.title) onSave(next);
        setDraft(next);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') { setDraft(board.title); setIsEditing(false); }
                }}
                className="text-sm text-ink bg-black/20 border border-line rounded-md px-2 py-1 max-w-[220px] focus:outline-none focus:border-mint"
                autoFocus
                aria-label="Nombre del tablero"
            />
        );
    }

    return (
        <button
            onClick={() => { setDraft(board.title); setIsEditing(true); }}
            className="text-sm text-sub font-medium truncate max-w-[200px] hover:text-ink transition-colors"
            title="Cambiar nombre del tablero"
        >
            {board.title}
        </button>
    );
}
