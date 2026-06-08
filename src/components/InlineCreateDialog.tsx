import { useState } from 'react';
import { getApiErrorMessage } from '../services/pasosApi';

interface Props {
    title: string;
    confirmLabel: string;
    placeholder: string;
    onClose: () => void;
    onConfirm: (value: string) => Promise<void>;
}

export function InlineCreateDialog({ title, confirmLabel, placeholder, onClose, onConfirm }: Props) {
    const [value, setValue] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        const next = value.trim();
        if (!next) { setError('Escribe un nombre para continuar.'); return; }
        setSubmitting(true);
        setError(null);
        try {
            await onConfirm(next);
            onClose();
        } catch (issue) {
            setError(getApiErrorMessage(issue, 'No se pudo completar la acción.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="inline-create-title" className="glass-panel w-full max-w-md rounded-2xl p-6">
                <h2 id="inline-create-title" className="text-lg font-bold text-ink">{title}</h2>
                <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleConfirm();
                        if (e.key === 'Escape') onClose();
                    }}
                    placeholder={placeholder}
                    className="mt-4 w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                    autoFocus
                />
                {error && <p className="mt-2 text-sm text-lme-danger/80">{error}</p>}
                <div className="mt-5 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-sub transition-colors hover:text-ink">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleConfirm()}
                        disabled={submitting}
                        className="rounded-xl bg-sky px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-sky/80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? 'Guardando…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
