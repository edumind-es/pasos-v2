/**
 * Barra de navegación completa para vistas secundarias
 * (Agenda, Cronograma, Panel ejecutivo, etc.)
 * Mismo nivel funcional que el header del BoardView:
 * logo · tabs Aula/Claustro · breadcrumb · accesibilidad · modo visual · sync · usuario
 */
import { useRef, useState } from 'react';
import { AlertCircle, Building2, Database, GraduationCap, LogOut, Palette, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useStore } from '../store/boardStore';
import { AccessibilityControls } from './AccessibilityControls';

interface Props {
    breadcrumb: string;
    workspaceMode: 'classroom' | 'organization';
}

export function ViewNavHeader({ breadcrumb, workspaceMode }: Props) {
    const navigate = useNavigate();
    const { currentUser, visualMode, setVisualMode, logout, lastProSyncError } = useStore();
    const isProUser = currentUser?.mode === 'pro';

    const [showUserMenu, setShowUserMenu] = useState(false);
    const [userMenuPos, setUserMenuPos] = useState<{ top: number; right: number }>({ top: 68, right: 8 });
    const avatarRef = useRef<HTMLButtonElement>(null);

    const handleAvatarClick = () => {
        if (!showUserMenu && avatarRef.current) {
            const rect = avatarRef.current.getBoundingClientRect();
            setUserMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
        }
        setShowUserMenu(v => !v);
    };

    const handleLogout = () => {
        setShowUserMenu(false);
        logout();
        navigate('/login');
    };

    return (
        <div className="sticky top-0 z-sticky glass-panel border-b border-lme-border/50 px-4 py-3 sm:px-6 mb-6">
            <div className="mx-auto max-w-[1500px] flex items-center gap-3">

                {/* Logo → home */}
                <Link to="/" title="Inicio" className="shrink-0 hover:opacity-80 transition-opacity">
                    <img src="/icons/icon-192.png" alt="Pasos" className="w-8 h-8 rounded-xl shadow-sm" />
                </Link>

                {/* Tabs Aula / Claustro */}
                <div className="flex items-center bg-black/20 border border-line rounded-full p-0.5 shrink-0">
                    <Link
                        to="/aula"
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                            workspaceMode === 'classroom' ? 'bg-sky/20 text-sky' : 'text-sub hover:text-ink'
                        }`}
                    >
                        <GraduationCap className="w-3 h-3" />
                        Aula
                    </Link>
                    {isProUser && (
                        <Link
                            to="/organizacion"
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                                workspaceMode === 'organization' ? 'bg-mint/20 text-mint' : 'text-sub hover:text-ink'
                            }`}
                        >
                            <Building2 className="w-3 h-3" />
                            Claustro
                        </Link>
                    )}
                </div>

                {/* Breadcrumb */}
                <span className="text-sub text-sm">›</span>
                <span className="text-sm font-medium text-ink truncate">{breadcrumb}</span>

                {/* Espaciador */}
                <div className="flex-1" />

                {/* Controles de accesibilidad */}
                <AccessibilityControls />

                {/* Toggle modo visual */}
                <button
                    type="button"
                    onClick={() => setVisualMode(visualMode === 'eink' ? 'edumind' : 'eink')}
                    title={visualMode === 'eink' ? 'Modo EDUmind (color)' : 'Modo E-Ink'}
                    className="w-9 h-9 rounded-full border border-line bg-black/20 flex items-center justify-center hover:bg-white/5 transition-colors"
                >
                    <Palette className="w-4 h-4 text-sub" />
                </button>

                {/* Badge error sync */}
                {isProUser && lastProSyncError && (
                    <button
                        type="button"
                        title={lastProSyncError}
                        onClick={handleAvatarClick}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-lme-danger/40 bg-lme-danger/10 text-lme-danger/80 text-xs font-semibold hover:bg-lme-danger/20 transition-colors"
                    >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Sin sync
                    </button>
                )}

                {/* Avatar + menú de usuario */}
                <button
                    ref={avatarRef}
                    type="button"
                    onClick={handleAvatarClick}
                    className="w-9 h-9 rounded-full bg-lme-primary/20 flex items-center justify-center border border-lme-primary/30 hover:bg-lme-primary/30 transition-colors"
                    title="Cuenta de usuario"
                    aria-haspopup="menu"
                    aria-expanded={showUserMenu}
                >
                    <User className="w-4 h-4 text-lme-primary" />
                </button>

                {showUserMenu && createPortal(
                    <>
                        <div className="fixed inset-0" style={{ zIndex: 490 }} onClick={() => setShowUserMenu(false)} />
                        <div
                            className="fixed w-56 bg-lme-surface-alt border border-lme-border rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150"
                            style={{ top: userMenuPos.top, right: userMenuPos.right, zIndex: 500 }}
                        >
                            <div className="px-3 py-2 border-b border-line/50">
                                <p className="text-sm font-bold text-ink">{currentUser?.username ?? 'Usuario'}</p>
                                <p className="text-xs text-sub">{currentUser?.role === 'teacher' ? 'Docente' : 'Alumno'}</p>
                                {currentUser?.workspaceCode && (
                                    <p className="mt-1 text-[11px] font-mono tracking-[0.16em] text-mint">{currentUser.workspaceCode}</p>
                                )}
                            </div>
                            <Link
                                to="/"
                                onClick={() => setShowUserMenu(false)}
                                className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-white/5 rounded-lg flex items-center gap-2 font-medium mt-1"
                            >
                                <Database className="w-4 h-4" />
                                Inicio
                            </Link>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full text-left px-3 py-2 text-sm text-lme-danger hover:bg-white/5 rounded-lg flex items-center gap-2 font-medium mt-1"
                            >
                                <LogOut className="w-4 h-4" />
                                Cerrar sesión
                            </button>
                        </div>
                    </>,
                    document.body
                )}
            </div>
        </div>
    );
}
