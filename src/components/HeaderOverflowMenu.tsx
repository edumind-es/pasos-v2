import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';

export type OverflowItem =
    | { kind: 'link'; label: string; icon: React.ReactNode; href: string }
    | { kind: 'action'; label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }
    | { kind: 'separator' };

interface Props {
    items: OverflowItem[];
}

export function HeaderOverflowMenu({ items }: Props) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; right: number }>({ top: 68, right: 8 });
    const btnRef = useRef<HTMLButtonElement>(null);

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
                type="button"
                onClick={handleOpen}
                className="w-9 h-9 rounded-full border border-line bg-black/20 flex items-center justify-center hover:bg-white/5 transition-colors"
                aria-haspopup="menu"
                aria-expanded={open}
                title="Más opciones"
            >
                <MoreHorizontal className="w-4 h-4 text-sub" />
            </button>

            {open && createPortal(
                <>
                    {/* Backdrop: cierra al hacer clic fuera */}
                    <div className="fixed inset-0" style={{ zIndex: 490 }} onClick={close} />
                    {/* Dropdown: fixed en root stacking context, por encima de todo */}
                    <div
                        className="fixed w-52 bg-lme-surface-alt border border-lme-border rounded-xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150"
                        style={{ top: pos.top, right: pos.right, zIndex: 500 }}
                    >
                        {items.map((item, i) => {
                            if (item.kind === 'separator') {
                                return <div key={i} className="my-1 border-t border-line/50" />;
                            }
                            if (item.kind === 'link') {
                                return (
                                    <Link
                                        key={i}
                                        to={item.href}
                                        onClick={close}
                                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-ink hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        {item.icon}
                                        {item.label}
                                    </Link>
                                );
                            }
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => { item.onClick(); close(); }}
                                    disabled={item.disabled}
                                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-ink hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {item.icon}
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
