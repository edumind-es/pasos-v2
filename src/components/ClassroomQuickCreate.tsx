import { useState } from 'react';
import type { Board } from '../store/boardStore';

interface Props {
    columns: Board['columns'];
    disabled: boolean;
    onCreate: (columnId: string, title: string) => void;
}

export function ClassroomQuickCreate({ columns, disabled, onCreate }: Props) {
    const [title, setTitle] = useState('');
    const [columnId, setColumnId] = useState(columns[0]?.id ?? '');
    const resolvedColumnId = columns.some((c) => c.id === columnId) ? columnId : columns[0]?.id ?? '';

    const handleSubmit = () => {
        const next = title.trim();
        if (!next || !resolvedColumnId || disabled) return;
        onCreate(resolvedColumnId, next);
        setTitle('');
    };

    return (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto]">
            <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                disabled={disabled || !columns.length}
                className="w-full rounded-xl border border-line bg-black/20 px-4 py-2.5 text-sm text-ink placeholder:text-sub focus:border-sky focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Ej. Resolver ejercicio 3 o Preparar evidencia final"
                autoFocus={false}
            />
            <select
                value={resolvedColumnId}
                onChange={(e) => setColumnId(e.target.value)}
                disabled={disabled || !columns.length}
                className="w-full rounded-xl border border-line bg-black/20 px-4 py-2.5 text-sm text-ink focus:border-sky focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
                {columns.map((col) => (
                    <option key={col.id} value={col.id}>{col.title}</option>
                ))}
            </select>
            <button
                type="button"
                onClick={handleSubmit}
                disabled={disabled || !title.trim() || !resolvedColumnId}
                className="rounded-xl bg-sky px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
                Añadir
            </button>
        </div>
    );
}
