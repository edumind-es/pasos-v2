import { useMemo } from 'react';
import { AlertTriangle, CalendarClock, FileText, Layers3 } from 'lucide-react';
import type { Board, Task } from '../store/boardStore';

interface TeamCoordinationPanelProps {
    board: Board;
}

function isClosedColumn(board: Board, columnId: string): boolean {
    const column = board.columns.find((item) => item.id === columnId);
    const title = column?.title.toLowerCase() ?? '';
    return title.includes('cerrado') || title.includes('hecho') || title.includes('terminado') || title.includes('acordado') || title.includes('completado');
}

function formatTaskType(taskType: Task['taskType']): string {
    switch (taskType) {
        case 'agreement':
            return 'Acuerdos';
        case 'document':
            return 'Documentos';
        case 'incident':
            return 'Incidencias';
        case 'milestone':
            return 'Hitos';
        case 'resource':
            return 'Recursos';
        case 'learning_step':
            return 'Pasos';
        case 'evidence':
            return 'Evidencias';
        default:
            return 'Tareas';
    }
}

function classifyDueDate(value?: string): 'overdue' | 'soon' | 'future' | null {
    if (!value) return null;
    const due = new Date(value);
    if (Number.isNaN(due.getTime())) return null;
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const soonLimit = new Date(startToday);
    soonLimit.setDate(soonLimit.getDate() + 7);
    if (due < startToday) return 'overdue';
    if (due <= soonLimit) return 'soon';
    return 'future';
}

export function TeamCoordinationPanel({ board }: TeamCoordinationPanelProps) {
    const openTasks = useMemo(() => (
        board.tasks.filter((task) => !isClosedColumn(board, task.columnId))
    ), [board]);
    const blockedTasks = useMemo(() => (
        openTasks.filter((task) => {
            const column = board.columns.find((item) => item.id === task.columnId)?.title.toLowerCase() ?? '';
            return column.includes('bloque') || task.taskType === 'incident';
        })
    ), [board, openTasks]);
    const dueTasks = useMemo(() => (
        openTasks
            .filter((task) => task.dueDate)
            .sort((left, right) => new Date(left.dueDate ?? '').getTime() - new Date(right.dueDate ?? '').getTime())
    ), [openTasks]);
    const overdueTasks = dueTasks.filter((task) => classifyDueDate(task.dueDate) === 'overdue');
    const dueSoonTasks = dueTasks.filter((task) => classifyDueDate(task.dueDate) === 'soon');
    const linkedDocuments = useMemo(() => (
        board.tasks.filter((task) => task.taskType === 'document' || (task.attachments?.length ?? 0) > 0)
    ), [board.tasks]);
    const swimlanes = useMemo(() => {
        const lanes = new Map<string, Task[]>();
        for (const task of openTasks) {
            const key = task.taskType ?? 'task';
            lanes.set(key, [...(lanes.get(key) ?? []), task]);
        }
        return Array.from(lanes.entries())
            .sort((left, right) => right[1].length - left[1].length)
            .slice(0, 5);
    }, [openTasks]);

    return (
        <section className="rounded-2xl border border-lme-border bg-lme-surface-alt/90 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-sub">Pasos Equipo</p>
                    <h2 className="mt-1 text-xl font-bold text-ink">Coordinación semanal</h2>
                    <p className="mt-1 text-sm text-sub">
                        Resumen rápido de bloqueos, vencimientos, documentos y carriles de trabajo del equipo.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-sub">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-ink">Abiertas: {openTasks.length}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-ink">Bloqueos: {blockedTasks.length}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-ink">Documentos: {linkedDocuments.length}</span>
                </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <article className="rounded-2xl border border-lme-border bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-ink">
                        <AlertTriangle className="h-4 w-4 text-lme-warning" />
                        <h3 className="text-sm font-semibold">Bloqueos e incidencias</h3>
                    </div>
                    <div className="mt-3 space-y-2">
                        {blockedTasks.length === 0 ? (
                            <p className="text-sm text-sub">Sin bloqueos abiertos en este momento.</p>
                        ) : (
                            blockedTasks.slice(0, 4).map((task) => (
                                <div key={task.id} className="rounded-xl border border-lme-warning/20 bg-lme-warning/10 p-3">
                                    <p className="text-sm font-semibold text-lme-warning/85">{task.title}</p>
                                    <p className="mt-1 text-xs text-lme-warning/80">
                                        {board.columns.find((column) => column.id === task.columnId)?.title ?? 'Pendiente'}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </article>

                <article className="rounded-2xl border border-lme-border bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-ink">
                        <CalendarClock className="h-4 w-4 text-sky" />
                        <h3 className="text-sm font-semibold">Vencimientos</h3>
                    </div>
                    <div className="mt-3 space-y-2">
                        {dueTasks.length === 0 ? (
                            <p className="text-sm text-sub">Todavía no hay fechas objetivo marcadas en el tablero.</p>
                        ) : (
                            [...overdueTasks, ...dueSoonTasks].slice(0, 5).map((task) => (
                                <div key={task.id} className="rounded-xl border border-lme-border bg-lme-surface/40 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-ink">{task.title}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${classifyDueDate(task.dueDate) === 'overdue' ? 'bg-lme-danger/10 text-lme-danger/80' : 'bg-sky/10 text-sky'}`}>
                                            {classifyDueDate(task.dueDate) === 'overdue' ? 'Vencida' : 'Esta semana'}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-sub">
                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Sin fecha'}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </article>

                <article className="rounded-2xl border border-lme-border bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-ink">
                        <FileText className="h-4 w-4 text-mint" />
                        <h3 className="text-sm font-semibold">Documentos vinculados</h3>
                    </div>
                    <div className="mt-3 space-y-2">
                        {linkedDocuments.length === 0 ? (
                            <p className="text-sm text-sub">No hay documentos o recursos enlazados todavía.</p>
                        ) : (
                            linkedDocuments.slice(0, 4).map((task) => (
                                <div key={task.id} className="rounded-xl border border-lme-border bg-lme-surface/40 p-3">
                                    <p className="text-sm font-semibold text-ink">{task.title}</p>
                                    <p className="mt-1 text-xs text-sub">
                                        {(task.attachments?.length ?? 0) > 0
                                            ? `${task.attachments?.length ?? 0} recurso(s) enlazados`
                                            : 'Documento en seguimiento'}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </article>
            </div>

            <div className="mt-4 rounded-2xl border border-lme-border bg-black/20 p-4">
                <div className="flex items-center gap-2 text-ink">
                    <Layers3 className="h-4 w-4 text-vio" />
                    <h3 className="text-sm font-semibold">Swimlanes de trabajo</h3>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    {swimlanes.length === 0 ? (
                        <p className="text-sm text-sub">Sin elementos activos para agrupar por carriles.</p>
                    ) : (
                        swimlanes.map(([lane, tasks]) => (
                            <article key={lane} className="rounded-xl border border-lme-border bg-lme-surface/30 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-ink">{formatTaskType(lane as Task['taskType'])}</p>
                                    <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-sub">{tasks.length}</span>
                                </div>
                                <div className="mt-2 space-y-2">
                                    {tasks.slice(0, 3).map((task) => (
                                        <div key={task.id} className="rounded-lg border border-lme-border/60 bg-black/20 px-3 py-2">
                                            <p className="text-sm text-ink">{task.title}</p>
                                            <p className="mt-1 text-[11px] text-sub">
                                                {board.columns.find((column) => column.id === task.columnId)?.title ?? 'Pendiente'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
