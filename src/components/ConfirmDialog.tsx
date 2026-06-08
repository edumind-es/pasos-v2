interface Props {
    title: string;
    description: string;
    confirmLabel: string;
    onClose: () => void;
    onConfirm: () => void;
}

export function ConfirmDialog({ title, description, confirmLabel, onClose, onConfirm }: Props) {
    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="glass-panel w-full max-w-md rounded-2xl p-6">
                <h2 id="confirm-dialog-title" className="text-lg font-bold text-ink">{title}</h2>
                <p className="mt-2 text-sm text-sub">{description}</p>
                <div className="mt-5 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-sub transition-colors hover:text-ink">
                        Cancelar
                    </button>
                    <button type="button" onClick={onConfirm} className="rounded-xl bg-lme-danger px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-lme-danger/80">
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
