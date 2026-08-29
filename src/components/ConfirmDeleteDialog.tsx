import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    /** Tipo de entidad, tal cual aparece en los textos ("organización" | "equipo"). */
    kind: string;
    /** Nombre exacto que el usuario debe teclear para confirmar. */
    name: string;
    /** Explicación de qué ocurre al eliminar (archivado, recuperación…). */
    warning: string;
    busy?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * Diálogo de borrado seguro: exige teclear el nombre exacto para habilitar la
 * acción. Deja claro que el borrado es un archivado recuperable, no destructivo.
 */
export function ConfirmDeleteDialog({ kind, name, warning, busy = false, onCancel, onConfirm }: Props) {
    const [value, setValue] = useState('');
    // Sin distinguir mayusculas: la etiqueta de abajo va en versalitas por CSS
    // y quien copiaba lo que leia en pantalla nunca lograba activar el boton.
    const confirmed = value.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase();

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onCancel}>
            <div
                className="w-full max-w-md rounded-2xl border-2 border-lme-danger bg-lme-surface-alt p-6 animate-scale-in"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >
                <span className="inline-flex items-center gap-1.5 rounded border border-lme-danger px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.09em] text-lme-danger">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Acción irreversible
                </span>
                <h3 className="mt-3 text-xl font-black text-ink">Eliminar {kind}</h3>
                <p className="mt-2 text-sm leading-6 text-sub">
                    Vas a eliminar <b className="text-ink">{name}</b>. Esta acción no se puede deshacer desde aquí.
                </p>

                <div className="mt-3 border-l-[3px] border-lme-danger bg-lme-danger/10 px-3 py-2.5 text-sm leading-6 text-ink">
                    {warning}
                </div>

                <label className="mt-4 block font-mono text-[11px] uppercase tracking-wide text-sub">
                    Escribe <span className="normal-case text-lme-danger">{name}</span> para confirmar
                </label>
                <input
                    type="text"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && confirmed && !busy) onConfirm(); }}
                    placeholder="Nombre exacto"
                    className="mt-1.5 w-full rounded-lg border border-lme-border bg-lme-background px-3 py-2.5 font-mono text-sm text-ink focus:border-lme-danger focus:outline-none"
                />

                <div className="mt-5 flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-white/5 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!confirmed || busy}
                        className="flex-1 rounded-lg border border-lme-danger px-4 py-2.5 text-sm font-bold text-lme-danger transition-colors hover:bg-lme-danger hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {busy ? 'Eliminando…' : 'Eliminar definitivamente'}
                    </button>
                </div>
            </div>
        </div>
    );
}
