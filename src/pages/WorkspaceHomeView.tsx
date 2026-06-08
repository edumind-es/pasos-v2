import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building2, Copy, GraduationCap, Lock, LogOut, Palette, Sparkles, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/boardStore';
import { AccessibilityControls } from '../components/AccessibilityControls';

function StatBadge({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-lme-border bg-black/20 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-sub">{label}</p>
            <p className="mt-1 text-lg font-bold text-ink">{value}</p>
        </div>
    );
}

export default function WorkspaceHomeView() {
    const { boards, currentUser, currentOrganizationId, currentTeamId } = useStore();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return undefined;
        const timer = window.setTimeout(() => setCopied(false), 1800);
        return () => window.clearTimeout(timer);
    }, [copied]);

    const personalBoards = useMemo(
        () => boards.filter((board) => !board.organizationId && !board.teamId && board.ownerId === currentUser?.id),
        [boards, currentUser?.id],
    );
    const organizationBoards = useMemo(
        () => boards.filter((board) => Boolean(board.organizationId || board.teamId)),
        [boards],
    );
    const lastOrganizationLabel = currentTeamId
        ? 'Equipo activo listo para retomar'
        : currentOrganizationId
            ? 'Organización activa lista para retomar'
            : 'Elige o crea una organización al entrar';

    const handleCopyCode = async () => {
        if (!currentUser?.workspaceCode) return;
        await navigator.clipboard.writeText(currentUser.workspaceCode);
        setCopied(true);
    };

    const { visualMode, setVisualMode, logout } = useStore();

    return (
        <div className="min-h-screen bg-lme-background text-lme-text">
            {/* Barra de navegación superior */}
            <header className="sticky top-0 z-sticky glass-panel border-b border-lme-border/50 px-4 py-3 sm:px-6">
                <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <img src="/icons/icon-192.png" alt="Pasos" className="w-9 h-9 rounded-xl shadow-sm" />
                        <span className="text-base font-bold text-ink">Pasos</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            to="/aula"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border border-sky/20 bg-sky/10 text-sky hover:bg-sky/20 transition-colors"
                        >
                            <GraduationCap className="w-3.5 h-3.5" />
                            Aula
                        </Link>
                        {currentUser?.mode === 'pro' && (
                            <Link
                                to="/organizacion"
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border border-mint/20 bg-mint/10 text-mint hover:bg-mint/20 transition-colors"
                            >
                                <Building2 className="w-3.5 h-3.5" />
                                Claustro
                            </Link>
                        )}
                        <div className="w-px h-5 bg-line mx-1" />
                        <AccessibilityControls />
                        <button
                            type="button"
                            onClick={() => setVisualMode(visualMode === 'eink' ? 'edumind' : 'eink')}
                            title={visualMode === 'eink' ? 'Modo EDUmind (color)' : 'Modo E-Ink'}
                            className="w-9 h-9 rounded-full border border-line bg-black/20 flex items-center justify-center hover:bg-white/5 transition-colors"
                        >
                            <Palette className="w-4 h-4 text-sub" />
                        </button>
                        <button
                            type="button"
                            onClick={() => logout()}
                            title="Cerrar sesión"
                            className="w-9 h-9 rounded-full border border-line bg-black/20 flex items-center justify-center hover:bg-white/5 transition-colors text-sub hover:text-lme-danger"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="px-4 py-6 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-6xl">
                <section className="overflow-hidden rounded-3xl border border-lme-border bg-gradient-to-br from-lme-surface-alt via-[#122038] to-[#0d1628] p-6 shadow-2xl shadow-black/20 sm:p-8">
                    <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
                        <div>
                            <div className="flex items-center gap-4 mb-4">
                                <img src="/icons/icon-192.png" alt="Pasos" className="w-16 h-16 rounded-2xl shadow-lg shrink-0" />
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-mint">Panel de acceso</p>
                                    <p className="text-2xl font-black text-ink leading-tight">Pasos</p>
                                    <p className="text-[11px] text-sub">una app de EDUmind®</p>
                                </div>
                            </div>
                            <h1 className="max-w-3xl text-2xl font-black text-ink sm:text-3xl">
                                Bienvenido a tu espacio. Elige el camino de trabajo.
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-6 text-sub sm:text-base">
                                <strong className="text-ink">Pasos Aula</strong> se centra en secuencias, evidencias y seguimiento del alumnado.{' '}
                                <strong className="text-ink">Pasos Claustro</strong> organiza proyectos, equipos y coordinación institucional sin mezclarse con el trabajo pedagógico diario.
                            </p>

                            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                <StatBadge label="Modo" value={currentUser?.mode === 'pro' ? 'Pro sincronizado' : 'Local'} />
                                <StatBadge label="Aula" value={`${personalBoards.length} tablero(s)`} />
                                <StatBadge label="Claustro" value={`${organizationBoards.length} tablero(s)`} />
                            </div>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-black/20 p-6 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-white/10 p-3">
                                    <UserRound className="h-6 w-6 text-sky" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-sub">Cuenta activa</p>
                                    <p className="text-lg font-bold text-ink">{currentUser?.username ?? 'Usuario'}</p>
                                </div>
                            </div>

                            <div className="mt-5 grid gap-3">
                                <div className="rounded-2xl border border-lme-border bg-white/5 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-sub">Rol</p>
                                    <p className="mt-1 text-sm text-ink">
                                        {currentUser?.role === 'teacher' ? 'Docente' : 'Alumno'} · {currentUser?.mode === 'pro' ? 'Cuenta Pro' : 'Uso local'}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-lme-border bg-white/5 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-sub">Código de usuario</p>
                                            <p className="mt-1 font-mono text-base font-bold tracking-[0.16em] text-mint">
                                                {currentUser?.workspaceCode ?? 'Disponible en Pro'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => void handleCopyCode()}
                                            disabled={!currentUser?.workspaceCode}
                                            className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs font-semibold text-sub transition-colors hover:bg-white/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                            {copied ? 'Copiado' : 'Copiar'}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-xs text-sub">
                                        Úsalo para incorporarte a equipos de claustro sin depender solo del correo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    <article className="rounded-3xl border border-sky/20 bg-gradient-to-br from-sky/10 via-white/5 to-white/0 p-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-sky/15 p-3">
                                <GraduationCap className="h-6 w-6 text-sky" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-sky">Pasos Aula</p>
                                <h2 className="text-2xl font-black text-ink">Trabajo con alumnado</h2>
                            </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-sub">
                            Un kanban ágil y fresco para introducir tareas rápido, presentar secuencias, revisar evidencias y
                            sostener el seguimiento del aprendizaje sin ruido organizativo.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-ink">Secuencias</span>
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-ink">Vista Hoy</span>
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-ink">Evidencias</span>
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-ink">Presentación</span>
                        </div>
                        <Link
                            to="/aula"
                            className="mt-6 inline-flex items-center gap-2 rounded-full border border-sky/30 bg-sky/10 px-5 py-3 text-sm font-bold text-sky transition-colors hover:bg-sky/20"
                        >
                            Entrar en Pasos Aula
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </article>

                    <article className="rounded-3xl border border-mint/20 bg-gradient-to-br from-mint/10 via-white/5 to-white/0 p-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-mint/15 p-3">
                                <Building2 className="h-6 w-6 text-mint" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-mint">Pasos Claustro</p>
                                <h2 className="text-2xl font-black text-ink">Organización y equipos</h2>
                            </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-sub">
                            Coordina equipos, documentos, hitos, reuniones y cronogramas del centro con un espacio propio
                            que no se mezcla con la intervención en aula.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-ink">Equipos</span>
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-ink">Documentos</span>
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-ink">Agenda</span>
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-ink">Gantt</span>
                        </div>
                        {currentUser?.mode === 'pro' ? (
                            <>
                                <Link
                                    to="/organizacion"
                                    className="mt-6 inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-5 py-3 text-sm font-bold text-mint transition-colors hover:bg-mint/20"
                                >
                                    Entrar en Pasos Claustro
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <p className="mt-3 text-xs text-sub">{lastOrganizationLabel}</p>
                            </>
                        ) : (
                            <div className="mt-6 rounded-2xl border border-lme-warning/30 bg-lme-warning/10 p-4 text-sm text-lme-warning/85">
                                <div className="flex items-start gap-3">
                                    <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold">Disponible en cuenta Pro docente</p>
                                        <p className="mt-1 text-xs leading-5">
                                            Activa una cuenta Pro para trabajar con organizaciones, equipos y coordinación de claustro.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </article>
                </div>

                <section className="mt-8 rounded-3xl border border-lme-border bg-lme-surface-alt/70 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-sub">Criterio de diseño</p>
                            <h3 className="mt-1 text-xl font-black text-ink">Dos contextos, una experiencia coherente</h3>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-sub">
                                La app separa explícitamente el trabajo pedagógico del trabajo organizativo. Así reducimos ruido,
                                evitamos errores de contexto y hacemos más claro qué se comparte con alumnado y qué se coordina entre docentes.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-ink">
                            <Sparkles className="h-4 w-4 text-mint" />
                            Listo para retomar trabajo
                        </div>
                    </div>
                </section>

                {/* Footer EDUmind */}
                <div className="mt-8 flex items-center justify-center gap-3 opacity-50">
                    <img src="/icons/edumind_logo.png" alt="EDUmind" className="w-6 h-6 rounded-lg" />
                    <p className="text-xs text-sub">
                        Pasos es una app de <strong className="text-ink">EDUmind</strong> · Luis Vilela Acuña
                        <span className="mx-2">·</span>
                        <a
                            href="https://edumind.es"
                            target="_blank"
                            rel="noreferrer noopener"
                            className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                        >
                            edumind.es
                        </a>
                    </p>
                </div>
            </div>
            </div>
        </div>
    );
}
