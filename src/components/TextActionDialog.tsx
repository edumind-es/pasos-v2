interface Props {
    title: string;
    description: string;
    value: string;
    confirmLabel: string;
    onValueChange: (value: string) => void;
    onClose: () => void;
    onConfirm: () => void;
}

export function TextActionDialog({ title, description, value, confirmLabel, onValueChange, onClose, onConfirm }: Props) {
    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="text-action-dialog-title" className="glass-panel w-full max-w-md rounded-2xl p-6">
                <h2 id="text-action-dialog-title" className="text-lg font-bold text-ink">{title}</h2>
                <p className="mt-1 text-sm text-sub">{description}</p>
                <input
                    value={value}
                    onChange={(e) => onValueChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onConfirm();
                        if (e.key === 'Escape') onClose();
                    }}
                    className="mt-4 w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none"
                    autoFocus
                />
                <div className="mt-5 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-sub transition-colors hover:text-ink">
                        Cancelar
                    </button>
                    <button type="button" onClick={onConfirm} className="rounded-xl bg-sky px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-sky/80">
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
