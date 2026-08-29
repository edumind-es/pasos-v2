import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export interface KebabItem {
    label: string;
    icon?: React.ReactNode;
    danger?: boolean;
    onClick: () => void;
}

interface Props {
    ariaLabel: string;
    items: KebabItem[];
    /** Nota informativa al final (p. ej. explicación de por qué no hay acción de borrado). */
    note?: string;
}

/**
 * Menú de acciones "⋯" para tarjetas. El desplegable se renderiza en un portal
 * anclado al botón, NO como hijo de la tarjeta: así queda desacoplado de los
 * efectos hover de la tarjeta (nada de "baile") y los clics aterrizan fiables.
 */
export function KebabMenu({ ariaLabel, items, note }: Props) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
        }
        setOpen(v => !v);
    };

    const close = () => setOpen(false);

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={toggle}
                aria-label={ariaLabel}
                aria-haspopup="menu"
                aria-expanded={open}
                className="grid h-7 w-7 shrink-0 place-items-center rounded border border-line bg-lme-background text-sub transition-colors hover:border-ink hover:text-ink"
            >
                <MoreHorizontal className="h-4 w-4" />
            </button>

            {open && createPortal(
                <>
                    <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={close} />
                    <div
                        role="menu"
                        className="fixed w-56 rounded-lg border border-lme-border bg-lme-surface-alt p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                        style={{ top: pos.top, right: pos.right, zIndex: 9999 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {items.map((item, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => { item.onClick(); close(); }}
                                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${item.danger ? 'text-lme-danger hover:bg-lme-danger/10' : 'text-ink hover:bg-white/5'}`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                        {note && <p className="px-3 py-2 text-xs text-sub">{note}</p>}
                    </div>
                </>,
                document.body,
            )}
        </>
    );
}
