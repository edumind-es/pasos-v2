import type { DeletedTaskEntry } from '../store/boardStore';

interface TrashProps {
    entries: DeletedTaskEntry[];
    onRestore: (taskId: string) => void;
    onClose: () => void;
}

/** Papelera del tablero: recupera tareas eliminadas recientemente. */
export function BoardTrashModal({ entries, onRestore, onClose }: TrashProps) {
    return (
        <div className="fixed inset-0 z-dropdown flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass-panel p-6 rounded-2xl max-w-lg w-full mx-4 animate-scale-in">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-ink">Papelera del tablero</h2>
                        <p className="text-xs text-sub">Recupera tareas eliminadas recientemente.</p>
                    </div>
                    <button onClick={onClose} className="text-sub hover:text-ink">
                        ✕
                    </button>
                </div>

                {entries.length === 0 ? (
                    <div className="text-sm text-sub bg-black/20 p-4 rounded-xl text-center">
                        No hay tareas para recuperar.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {entries.slice().reverse().map(entry => (
                            <div
                                key={entry.task.id}
                                className="flex items-center justify-between gap-3 bg-lme-surface p-3 rounded-xl border border-lme-border"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm text-ink font-medium truncate">{entry.task.title}</p>
                                    <p className="text-xs text-sub">
                                        Eliminada: {new Date(entry.deletedAt).toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => onRestore(entry.task.id)}
                                    className="px-3 py-1.5 text-xs font-bold bg-sky/20 text-sky rounded-lg hover:bg-sky/30 transition-colors"
                                >
                                    Restaurar
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full mt-4 py-2 text-sub hover:text-ink text-sm transition-colors"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
}

interface UndoToastProps {
    lastDeleted: DeletedTaskEntry;
    onUndo: () => void;
}

/** Aviso flotante para deshacer la última tarea eliminada. */
export function UndoDeleteToast({ lastDeleted, onUndo }: UndoToastProps) {
    return (
        <div className="fixed bottom-6 right-6 z-dropdown-backdrop bg-lme-surface-alt border border-lme-border shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
            <div>
                <p className="text-sm text-ink font-medium">Tarea eliminada</p>
                <p className="text-xs text-sub truncate max-w-[220px]">{lastDeleted.task.title}</p>
            </div>
            <button
                onClick={onUndo}
                className="px-3 py-1.5 text-sm font-bold bg-mint/20 text-mint rounded-lg hover:bg-mint/30 transition-colors"
            >
                Deshacer
            </button>
        </div>
    );
}
