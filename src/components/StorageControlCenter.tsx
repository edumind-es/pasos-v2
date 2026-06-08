import { useCallback, useEffect, useState } from 'react';
import { Database, HardDrive, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useStore } from '../store/boardStore';
import { APP_EVENTS_KEY, clearAppEvents, getAllAppEvents } from '../services/appTelemetry';
import {
    SHARED_BOARDS_KEY,
    STUDENT_PROGRESS_KEY,
    clearSharedBoards,
    clearStudentProgress,
    getAllStudentProgress,
} from '../utils/shareCode';

const APP_STORAGE_KEY = 'pasos-v2-storage';
const STUDENT_ALIAS_KEY = 'pasos-student-alias';
const SHARE_LEARNER_PREFIX = 'pasos-share-learner:';
const PWA_DISMISS_KEY = 'pwa-install-dismissed';

interface StorageControlCenterProps {
    onClose: () => void;
}

interface StorageDiagnostics {
    localStorageBytes: number;
    sessionStorageBytes: number;
    localStorageKeys: string[];
    cookieNames: string[];
    cacheNames: string[];
    serviceWorkerScopes: string[];
}

function estimateStorageBytes(storage: Storage): number {
    let total = 0;
    for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key) continue;
        const value = storage.getItem(key) || '';
        total += new Blob([key, value]).size;
    }
    return total;
}

function downloadJson(filename: string, value: unknown): void {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function StorageControlCenter({ onClose }: StorageControlCenterProps) {
    const { boards, boardTemplates } = useStore();
    const [diagnostics, setDiagnostics] = useState<StorageDiagnostics>({
        localStorageBytes: 0,
        sessionStorageBytes: 0,
        localStorageKeys: [],
        cookieNames: [],
        cacheNames: [],
        serviceWorkerScopes: [],
    });
    const [busyAction, setBusyAction] = useState<'operational' | 'pwa' | 'reset' | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);

    const refreshDiagnostics = useCallback(async () => {
        const cacheNames = typeof caches !== 'undefined' ? await caches.keys() : [];
        const registrations = 'serviceWorker' in navigator
            ? await navigator.serviceWorker.getRegistrations()
            : [];
        const cookieNames = document.cookie
            ? document.cookie.split('; ').map(cookie => cookie.split('=')[0]).filter(Boolean)
            : [];

        setDiagnostics({
            localStorageBytes: estimateStorageBytes(localStorage),
            sessionStorageBytes: estimateStorageBytes(sessionStorage),
            localStorageKeys: Object.keys(localStorage).sort(),
            cookieNames,
            cacheNames,
            serviceWorkerScopes: registrations.map(registration => registration.scope),
        });
    }, []);

    useEffect(() => {
        void refreshDiagnostics();
    }, [refreshDiagnostics]);

    const handleExportTelemetry = () => {
        downloadJson(`pasos-telemetria-${new Date().toISOString().slice(0, 10)}.json`, getAllAppEvents());
    };

    const handleClearOperationalData = async () => {
        setBusyAction('operational');
        try {
            clearAppEvents();
            clearSharedBoards();
            clearStudentProgress();
            localStorage.removeItem(STUDENT_ALIAS_KEY);
            Object.keys(localStorage)
                .filter(key => key.startsWith(SHARE_LEARNER_PREFIX))
                .forEach(key => localStorage.removeItem(key));
            await refreshDiagnostics();
        } finally {
            setBusyAction(null);
        }
    };

    const handleResetPwa = async () => {
        setBusyAction('pwa');
        try {
            if (typeof caches !== 'undefined') {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(registration => registration.unregister()));
            }
            localStorage.removeItem(PWA_DISMISS_KEY);
            await refreshDiagnostics();
        } finally {
            setBusyAction(null);
        }
    };

    const handleHardReset = async () => {
        setBusyAction('reset');
        try {
            clearAppEvents();
            clearSharedBoards();
            clearStudentProgress();
            localStorage.removeItem(APP_STORAGE_KEY);
            localStorage.removeItem(STUDENT_ALIAS_KEY);
            localStorage.removeItem(PWA_DISMISS_KEY);
            Object.keys(localStorage)
                .filter(key => key.startsWith(SHARE_LEARNER_PREFIX))
                .forEach(key => localStorage.removeItem(key));
            sessionStorage.clear();
            if (typeof caches !== 'undefined') {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(registration => registration.unregister()));
            }
            window.location.assign('/login');
        } finally {
            setBusyAction(null);
        }
    };

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="storage-center-title"
                className="glass-panel w-full max-w-5xl rounded-3xl p-6 sm:p-8"
            >
                <div className="flex flex-col gap-4 border-b border-line/50 pb-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-sub">Centro de almacenamiento</p>
                        <h2 id="storage-center-title" className="mt-1 text-2xl font-black text-ink">Centro de almacenamiento y observabilidad</h2>
                        <p className="mt-2 max-w-3xl text-sm text-sub">
                            Pasos guarda trabajo local en `localStorage`, usa `sessionStorage` para la sesión Pro y emplea cachés PWA para trabajo offline. Aquí puedes auditar esos datos y limpiarlos sin inspección manual del navegador.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="self-start rounded-xl px-4 py-2 text-sm font-medium text-sub transition-colors hover:text-ink"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_1fr]">
                    <section className="space-y-4">
                        <div className="rounded-2xl border border-lme-border bg-black/20 p-5">
                            <div className="flex items-center gap-2 text-ink">
                                <Database className="h-4 w-4 text-mint" />
                                <h3 className="text-base font-bold">Qué guarda Pasos</h3>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-lme-border bg-lme-surface/40 p-4">
                                    <p className="text-xs font-bold uppercase text-sub">Trabajo docente</p>
                                    <p className="mt-2 text-2xl font-black text-ink">{boards.length}</p>
                                    <p className="mt-1 text-sm text-sub">tableros locales o cacheados</p>
                                </div>
                                <div className="rounded-xl border border-lme-border bg-lme-surface/40 p-4">
                                    <p className="text-xs font-bold uppercase text-sub">Plantillas</p>
                                    <p className="mt-2 text-2xl font-black text-ink">{boardTemplates.length}</p>
                                    <p className="mt-1 text-sm text-sub">plantillas personalizadas</p>
                                </div>
                                <div className="rounded-xl border border-lme-border bg-lme-surface/40 p-4">
                                    <p className="text-xs font-bold uppercase text-sub">Progreso alumnado</p>
                                    <p className="mt-2 text-2xl font-black text-ink">{getAllStudentProgress().length}</p>
                                    <p className="mt-1 text-sm text-sub">entradas locales por código</p>
                                </div>
                                <div className="rounded-xl border border-lme-border bg-lme-surface/40 p-4">
                                    <p className="text-xs font-bold uppercase text-sub">Eventos</p>
                                    <p className="mt-2 text-2xl font-black text-ink">{getAllAppEvents().length}</p>
                                    <p className="mt-1 text-sm text-sub">registros estructurados</p>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2 text-sm text-sub">
                                <p><strong className="text-ink">`localStorage`:</strong> {diagnostics.localStorageBytes} bytes aproximados en {diagnostics.localStorageKeys.length} claves.</p>
                                <p><strong className="text-ink">`sessionStorage`:</strong> {diagnostics.sessionStorageBytes} bytes aproximados.</p>
                                <p><strong className="text-ink">Cookies visibles:</strong> {diagnostics.cookieNames.length > 0 ? diagnostics.cookieNames.join(', ') : 'ninguna en esta sesión.'}</p>
                                <p><strong className="text-ink">Cachés PWA:</strong> {diagnostics.cacheNames.length > 0 ? diagnostics.cacheNames.join(', ') : 'sin cachés activas.'}</p>
                                <p><strong className="text-ink">Service workers:</strong> {diagnostics.serviceWorkerScopes.length > 0 ? diagnostics.serviceWorkerScopes.join(', ') : 'sin registros activos.'}</p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-lme-border bg-black/20 p-5">
                            <div className="flex items-center gap-2 text-ink">
                                <ShieldCheck className="h-4 w-4 text-sky" />
                                <h3 className="text-base font-bold">Política operativa visible</h3>
                            </div>
                            <ul className="mt-4 space-y-2 text-sm text-sub">
                                <li>Express y Local con nombre guardan tableros en `localStorage` del navegador.</li>
                                <li>Modo Pro usa cookies seguras para refresh y `sessionStorage` para el token de acceso.</li>
                                <li>Los códigos compartidos y el progreso de alumnado pueden existir localmente, y en enlaces Pro también se registran en backend.</li>
                                <li>Las cachés PWA se usan para recursos estáticos y trabajo offline; pueden limpiarse desde este panel.</li>
                                <li>No se activan cookies analíticas de terceros desde la app actual.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="rounded-2xl border border-lme-border bg-black/20 p-5">
                            <div className="flex items-center gap-2 text-ink">
                                <HardDrive className="h-4 w-4 text-sky" />
                                <h3 className="text-base font-bold">Acciones de mantenimiento</h3>
                            </div>
                            <div className="mt-4 space-y-3">
                                <button
                                    type="button"
                                    onClick={handleExportTelemetry}
                                    className="w-full rounded-xl border border-sky/30 bg-sky/10 px-4 py-3 text-sm font-bold text-sky transition-colors hover:bg-sky/20"
                                >
                                    Exportar telemetría local
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleClearOperationalData()}
                                    disabled={busyAction !== null}
                                    className="w-full rounded-xl border border-mint/30 bg-mint/10 px-4 py-3 text-sm font-bold text-mint transition-colors hover:bg-mint/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {busyAction === 'operational' ? 'Limpiando...' : 'Limpiar datos operativos'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleResetPwa()}
                                    disabled={busyAction !== null}
                                    className="w-full rounded-xl border border-line px-4 py-3 text-sm font-bold text-ink transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {busyAction === 'pwa' ? 'Restableciendo...' : 'Restablecer caché y PWA'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmReset(value => !value)}
                                    disabled={busyAction !== null}
                                    className="w-full rounded-xl border border-lme-danger/30 bg-lme-danger/10 px-4 py-3 text-sm font-bold text-lme-danger/80 transition-colors hover:bg-lme-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {confirmReset ? 'Cancelar borrado total' : 'Borrado total del navegador'}
                                </button>
                            </div>

                            {confirmReset && (
                                <div className="mt-4 rounded-2xl border border-lme-danger/30 bg-lme-danger/10 p-4">
                                    <p className="text-sm text-lme-danger/70">
                                        Esta acción eliminará tableros locales, plantillas, eventos, progreso de alumnado, sesión y cachés PWA de este navegador.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => void handleHardReset()}
                                        disabled={busyAction !== null}
                                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-lme-danger/80 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {busyAction === 'reset' ? 'Borrando...' : 'Confirmar borrado total'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-lme-border bg-black/20 p-5">
                            <div className="flex items-center gap-2 text-ink">
                                <RefreshCw className="h-4 w-4 text-mint" />
                                <h3 className="text-base font-bold">Claves actuales</h3>
                            </div>
                            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto text-sm text-sub">
                                {diagnostics.localStorageKeys.length === 0 ? (
                                    <p>No hay claves locales en este navegador.</p>
                                ) : (
                                    diagnostics.localStorageKeys.map(key => (
                                        <div key={key} className="rounded-lg border border-lme-border bg-lme-surface/30 px-3 py-2 font-mono text-xs">
                                            {key}
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="mt-4 rounded-xl bg-black/20 p-3 text-xs text-sub">
                                Claves críticas esperadas:
                                {' '}
                                <code>{APP_STORAGE_KEY}</code>
                                {', '}
                                <code>{APP_EVENTS_KEY}</code>
                                {', '}
                                <code>{SHARED_BOARDS_KEY}</code>
                                {', '}
                                <code>{STUDENT_PROGRESS_KEY}</code>
                                .
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
