import { Activity, BookOpenCheck, Clock3, Link2, NotebookPen, TriangleAlert } from 'lucide-react';
import type { Board, ProSyncState, WorkspacePanelKey, WorkspacePanelPreference } from '../store/boardStore';
import { getRecentAppEvents } from '../services/appTelemetry';
import type { ProBoardInsightsResponse } from '../services/pasosApi';
import { WorkspacePanelAccordion } from './WorkspacePanelAccordion';

interface BoardInsightsPanelProps {
    board: Board | null;
    shareCode: string | null;
    shareSource: 'local' | 'pro';
    shareExpiresAt: string | null;
    proSyncState: ProSyncState;
    lastProSyncAt: string | null;
    lastProSyncError: string | null;
    remoteInsights?: ProBoardInsightsResponse | null;
    remoteInsightsLoading?: boolean;
    remoteInsightsError?: string | null;
    onSelectLearner?: (learnerKey: string) => void;
    panelPreferences: Record<'teacher_summary' | 'teacher_share_sync' | 'teacher_recent_activity' | 'teacher_learners', WorkspacePanelPreference>;
    onUpdatePanelPreference: (panel: WorkspacePanelKey, updates: Partial<WorkspacePanelPreference>) => void;
}

function formatTimestamp(value: string | null): string {
    if (!value) return 'Pendiente';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Pendiente' : date.toLocaleString();
}

export function BoardInsightsPanel({
    board,
    shareCode,
    shareSource,
    shareExpiresAt,
    proSyncState,
    lastProSyncAt,
    lastProSyncError,
    remoteInsights,
    remoteInsightsLoading = false,
    remoteInsightsError = null,
    onSelectLearner,
    panelPreferences,
    onUpdatePanelPreference,
}: BoardInsightsPanelProps) {
    const tasks = board?.tasks ?? [];
    const columns = board?.columns ?? [];
    const completedColumnIds = new Set(
        columns
            .filter(column => {
                const title = column.title.toLowerCase();
                return title.includes('terminado') || title.includes('hecho');
            })
            .map(column => column.id)
    );
    const completedTasks = tasks.filter(task => completedColumnIds.has(task.columnId));
    const pictogramReadyTasks = tasks.filter(task => (task.pictograms?.length ?? 0) > 0 || task.icon).length;
    const resourceTasks = tasks.filter(task => (task.attachments?.length ?? 0) > 0).length;
    const timedTasks = tasks.filter(task => Boolean(task.durationSeconds)).length;
    const recentLocalEvents = getRecentAppEvents(5);
    const recentRemoteEvents = remoteInsights?.recent_events ?? [];
    const recentEvents = recentRemoteEvents.length > 0 ? recentRemoteEvents : recentLocalEvents;
    const learnersNeedingHelp = remoteInsights?.learners.filter(learner => learner.help_task_count > 0).length ?? 0;
    const pendingValidationCount = remoteInsights?.learners.reduce((total, learner) => (
        total + Math.max(0, learner.completed_count - learner.validated_count)
    ), 0) ?? 0;

    const cards = [
        {
            label: 'Tareas totales',
            value: String(tasks.length),
            icon: NotebookPen,
        },
        {
            label: 'Completadas',
            value: String(completedTasks.length),
            icon: BookOpenCheck,
        },
        {
            label: 'Con pictogramas',
            value: `${pictogramReadyTasks}/${tasks.length || 0}`,
            icon: Activity,
        },
        {
            label: 'Con temporizador',
            value: String(timedTasks),
            icon: Clock3,
        },
        {
            label: 'Alumnos activos',
            value: remoteInsights ? String(remoteInsights.learner_count) : 'Pendiente',
            icon: Activity,
        },
        {
            label: 'Alumnos completados',
            value: remoteInsights ? String(remoteInsights.completed_learners) : 'Pendiente',
            icon: BookOpenCheck,
        },
        {
            label: 'Piden ayuda',
            value: remoteInsights ? String(learnersNeedingHelp) : 'Pendiente',
            icon: TriangleAlert,
        },
        {
            label: 'Pendiente validar',
            value: remoteInsights ? String(pendingValidationCount) : 'Pendiente',
            icon: NotebookPen,
        },
    ];

    return (
        <div className="space-y-3">
            {panelPreferences.teacher_summary.visible && (
                <WorkspacePanelAccordion
                    title="Resumen docente"
                    description="Métricas pedagógicas rápidas para seguir el tablero sin quitar protagonismo al Kanban."
                    badge={proSyncState === 'error' ? 'Incidencia' : proSyncState === 'syncing' ? 'Sincronizando' : 'Estable'}
                    expanded={panelPreferences.teacher_summary.expanded}
                    onToggleExpanded={() => onUpdatePanelPreference('teacher_summary', { expanded: !panelPreferences.teacher_summary.expanded })}
                >
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {cards.map(({ label, value, icon: Icon }) => (
                            <div key={label} className="rounded-xl border border-lme-border bg-black/20 p-4">
                                <div className="flex items-center gap-2 text-sub">
                                    <Icon className="h-4 w-4" />
                                    <span className="text-xs uppercase tracking-wide">{label}</span>
                                </div>
                                <p className="mt-3 text-2xl font-black text-ink">{value}</p>
                            </div>
                        ))}
                    </div>
                </WorkspacePanelAccordion>
            )}

            {panelPreferences.teacher_share_sync.visible && (
                <WorkspacePanelAccordion
                    title="Compartir y sincronización"
                    description="Estado operativo del enlace de alumno y de la sincronización Pro."
                    expanded={panelPreferences.teacher_share_sync.expanded}
                    onToggleExpanded={() => onUpdatePanelPreference('teacher_share_sync', { expanded: !panelPreferences.teacher_share_sync.expanded })}
                >
                    <div className="rounded-xl border border-lme-border bg-black/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                            <Link2 className="h-4 w-4 text-mint" />
                            Estado del enlace y de la sincronización
                        </div>
                        <div className="mt-3 space-y-2 text-sm text-sub">
                            <p>
                                Código actual: <span className="font-mono text-ink">{shareCode ?? 'No generado'}</span>
                            </p>
                            <p>
                                Tipo de enlace: <span className="text-ink">{shareCode ? (shareSource === 'pro' ? 'Sincronizado entre dispositivos' : 'Local del navegador') : 'Sin compartir'}</span>
                            </p>
                            <p>
                                Última sincronización: <span className="text-ink">{formatTimestamp(lastProSyncAt)}</span>
                            </p>
                            <p>
                                Tareas con recursos: <span className="text-ink">{resourceTasks}</span>
                            </p>
                            {remoteInsights && (
                                <>
                                    <p>
                                        Accesos al enlace: <span className="text-ink">{remoteInsights.share_access_count}</span>
                                    </p>
                                    <p>
                                        Enlaces activos: <span className="text-ink">{remoteInsights.active_share_count}</span>
                                    </p>
                                </>
                            )}
                            {shareExpiresAt && (
                                <p>
                                    Enlace válido hasta: <span className="text-ink">{formatTimestamp(shareExpiresAt)}</span>
                                </p>
                            )}
                            {remoteInsightsError && (
                                <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-200">
                                    <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                    <span>{remoteInsightsError}</span>
                                </div>
                            )}
                            {lastProSyncError && (
                                <div className="mt-3 flex items-start gap-2 rounded-lg border border-lme-danger/30 bg-lme-danger/10 p-3 text-lme-danger/80">
                                    <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                    <span>{lastProSyncError}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </WorkspacePanelAccordion>
            )}

            {panelPreferences.teacher_recent_activity.visible && (
                <WorkspacePanelAccordion
                    title={recentRemoteEvents.length > 0 ? 'Actividad del alumnado' : 'Actividad reciente'}
                    description="Registro de señales recientes para revisar solo cuando necesites contexto."
                    expanded={panelPreferences.teacher_recent_activity.expanded}
                    onToggleExpanded={() => onUpdatePanelPreference('teacher_recent_activity', { expanded: !panelPreferences.teacher_recent_activity.expanded })}
                >
                    <div className="rounded-xl border border-lme-border bg-black/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                            <Activity className="h-4 w-4 text-sky" />
                            {recentRemoteEvents.length > 0 ? 'Actividad remota del alumnado' : 'Actividad reciente'}
                        </div>
                        <div className="mt-3 space-y-3">
                            {remoteInsightsLoading ? (
                                <p className="text-sm text-sub">Cargando visibilidad docente desde Pasos Pro...</p>
                            ) : recentEvents.length === 0 ? (
                                <p className="text-sm text-sub">Todavía no hay eventos registrados en este navegador.</p>
                            ) : (
                                recentEvents.map(event => (
                                    <div key={event.id} className="border-l-2 border-lme-border pl-3">
                                        <p className="text-sm font-medium text-ink">
                                            {'message' in event ? event.message : `${event.actor_label || event.actor_type} · ${event.event_type}`}
                                        </p>
                                        <p className="text-xs text-sub">
                                            {'createdAt' in event
                                                ? `${new Date(event.createdAt).toLocaleString()} · ${event.type}`
                                                : `${new Date(event.occurred_at).toLocaleString()} · ${event.event_type}`}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </WorkspacePanelAccordion>
            )}

            {panelPreferences.teacher_learners.visible && (
                <WorkspacePanelAccordion
                    title="Seguimiento del alumnado"
                    description="Accesos, progreso y señales de ayuda por alumno o alumna."
                    expanded={panelPreferences.teacher_learners.expanded}
                    onToggleExpanded={() => onUpdatePanelPreference('teacher_learners', { expanded: !panelPreferences.teacher_learners.expanded })}
                >
                    {!remoteInsights || remoteInsights.learners.length === 0 ? (
                        <div className="rounded-xl border border-lme-border bg-black/20 p-4">
                            <p className="text-sm text-sub">
                                El seguimiento individual aparecerá aquí cuando el alumnado empiece a usar el tablero compartido.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-lme-border bg-black/20 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                                <NotebookPen className="h-4 w-4 text-mint" />
                                Seguimiento del alumnado
                            </div>
                            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                {remoteInsights.learners.slice(0, 6).map(learner => (
                                    <button
                                        type="button"
                                        key={`${learner.share_code ?? 'share'}-${learner.learner_key}`}
                                        onClick={() => onSelectLearner?.(learner.learner_key)}
                                        className="rounded-lg border border-lme-border bg-lme-surface/40 p-3 text-left transition-colors hover:bg-lme-surface/60"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-ink">
                                                    {learner.learner_label || 'Alumno anónimo'}
                                                </p>
                                                <p className="text-xs text-sub">
                                                    {learner.share_code ? `Código ${learner.share_code}` : 'Sin código visible'} · {new Date(learner.last_access_at).toLocaleString()}
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-mint/10 px-2 py-1 text-xs font-bold text-mint">
                                                {learner.progress_percent}%
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs text-sub">
                                            {learner.completed_count}/{learner.total_tasks} tareas · {learner.last_event_type || 'sin evento reciente'}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-sub">
                                            <span className="rounded-full bg-white/5 px-2 py-1">
                                                Ayuda: {learner.help_task_count}
                                            </span>
                                            <span className="rounded-full bg-white/5 px-2 py-1">
                                                Evidencias: {learner.evidence_count}
                                            </span>
                                            <span className="rounded-full bg-white/5 px-2 py-1">
                                                Validadas: {learner.validated_count}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </WorkspacePanelAccordion>
            )}
        </div>
    );
}
