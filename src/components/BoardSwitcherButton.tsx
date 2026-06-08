import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, Settings } from 'lucide-react';
import { useStore, type Board } from '../store/boardStore';

interface Props {
    onCreateBoard: () => void;
    visibleBoards: Board[];
    disabled?: boolean;
}

export function BoardSwitcherButton({ onCreateBoard, visibleBoards, disabled = false }: Props) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; right: number }>({ top: 68, right: 8 });
    const btnRef = useRef<HTMLButtonElement>(null);
    const { activeBoardId, setActiveBoard } = useStore();

    const handleOpen = () => {
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({
                top: rect.bottom + 6,
                right: window.innerWidth - rect.right,
            });
        }
        setOpen(v => !v);
    };

    const close = () => setOpen(false);

    return (
        <>
            <button
                ref={btnRef}
                onClick={handleOpen}
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-line hover:bg-white/5 transition-colors text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Mis Tableros</span>
                <ChevronDown className="w-3 h-3 text-sub hidden sm:inline" />
            </button>

            {open && createPortal(
                <>
                    <div className="fixed inset-0" style={{ zIndex: 490 }} onClick={close} />
                    <div
                        className="fixed w-64 bg-lme-surface-alt border border-lme-border rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150"
                        style={{ top: pos.top, right: pos.right, zIndex: 500 }}
                    >
                        <div className="max-h-60 overflow-y-auto space-y-1 mb-2">
                            <p className="px-2 py-1 text-xs font-bold text-sub uppercase mb-1">Cambiar Tablero</p>
                            {visibleBoards.map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => { setActiveBoard(b.id); close(); }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between ${activeBoardId === b.id ? 'bg-mint/10 text-mint font-bold' : 'text-ink hover:bg-white/5'}`}
                                >
                                    <span className="truncate">{b.title}</span>
                                    {activeBoardId === b.id && <div className="w-1.5 h-1.5 rounded-full bg-mint" />}
                                </button>
                            ))}
                        </div>
                        <div className="border-t border-line/50 pt-2">
                            <button
                                onClick={() => { onCreateBoard(); close(); }}
                                className="w-full text-left px-3 py-2 text-sm text-sky hover:bg-white/5 rounded-lg flex items-center gap-2 font-medium"
                            >
                                <Plus className="w-4 h-4" /> Crear Nuevo
                            </button>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
