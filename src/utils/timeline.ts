import type { Board, Task } from '../store/boardStore';

export interface TimelineItem {
    taskId: string;
    boardId: string;
    boardTitle: string;
    title: string;
    taskType: NonNullable<Task['taskType']>;
    ownerLabel?: string;
    effortPoints: number;
    columnTitle?: string;
    dependencyTaskIds: string[];
    blockedByTaskIds: string[];
    startAt?: string;
    endAt?: string;
    isBlocked: boolean;
    isDelayed: boolean;
    isMilestone: boolean;
    isCompleted: boolean;
    contextType?: Board['contextType'];
    organizationId?: string;
    teamId?: string;
}

export interface TimelineAlert {
    alertType: 'blocked' | 'delayed' | 'milestone_at_risk';
    severity: 'warning' | 'critical';
    taskId: string;
    boardId: string;
    boardTitle: string;
    title: string;
    ownerLabel?: string;
    message: string;
}

export interface TimelineCapacity {
    ownerLabel: string;
    taskCount: number;
    effortPoints: number;
    blockedCount: number;
    delayedCount: number;
}

export interface TimelineOverview {
    scopeType: 'personal' | 'organization' | 'team';
    organizationId?: string;
    teamId?: string;
    boardId?: string;
    itemCount: number;
    blockedCount: number;
    delayedCount: number;
    milestoneRiskCount: number;
    items: TimelineItem[];
    alerts: TimelineAlert[];
    capacities: TimelineCapacity[];
}

const COMPLETED_COLUMN_TOKENS = ['terminado', 'hecho', 'validado', 'publicado', 'cerrado', 'done', 'complete'];

function normalizeDate(value?: string): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isCompletedTask(task: Task, board: Board): boolean {
    const columnTitle = board.columns.find((column) => column.id === task.columnId)?.title.toLowerCase() ?? '';
    return COMPLETED_COLUMN_TOKENS.some((token) => columnTitle.includes(token)) || task.pedagogicalStatus === 'validated';
}

export function buildTimelineOverview(
    boards: Board[],
    options?: {
        organizationId?: string | null;
        teamId?: string | null;
        boardId?: string | null;
    },
): TimelineOverview {
    const filteredBoards = boards.filter((board) => {
        if (options?.boardId) {
            return board.id === options.boardId;
        }
        if (options?.teamId) {
            return board.teamId === options.teamId;
        }
        if (options?.organizationId) {
            return board.organizationId === options.organizationId && !board.teamId;
        }
        return !board.teamId;
    });

    const now = new Date();
    const items: TimelineItem[] = [];

    filteredBoards.forEach((board) => {
        const taskMap = new Map(board.tasks.map((task) => [task.id, task]));
        const columnMap = new Map(board.columns.map((column) => [column.id, column.title]));
        const cache = new Map<string, TimelineItem>();

        const buildItem = (taskId: string, path = new Set<string>()): TimelineItem => {
            const cached = cache.get(taskId);
            if (cached) {
                return cached;
            }

            const task = taskMap.get(taskId);
            if (!task) {
                return {
                    taskId,
                    boardId: board.id,
                    boardTitle: board.title,
                    title: 'Dependencia no encontrada',
                    taskType: 'task',
                    effortPoints: 0,
                    dependencyTaskIds: [],
                    blockedByTaskIds: [],
                    isBlocked: false,
                    isDelayed: false,
                    isMilestone: false,
                    isCompleted: false,
                    contextType: board.contextType,
                    organizationId: board.organizationId,
                    teamId: board.teamId,
                };
            }

            if (path.has(taskId)) {
                return {
                    taskId: task.id,
                    boardId: board.id,
                    boardTitle: board.title,
                    title: task.title,
                    taskType: task.taskType ?? 'task',
                    ownerLabel: task.ownerLabel,
                    effortPoints: task.effortPoints ?? 0,
                    columnTitle: columnMap.get(task.columnId),
                    dependencyTaskIds: task.dependencyTaskIds ?? [],
                    blockedByTaskIds: [],
                    startAt: task.startDate,
                    endAt: task.dueDate ?? task.startDate,
                    isBlocked: false,
                    isDelayed: false,
                    isMilestone: task.taskType === 'milestone',
                    isCompleted: isCompletedTask(task, board),
                    contextType: board.contextType,
                    organizationId: board.organizationId,
                    teamId: board.teamId,
                };
            }

            const nextPath = new Set(path);
            nextPath.add(taskId);
            const dependencyItems = (task.dependencyTaskIds ?? [])
                .filter((dependencyId) => taskMap.has(dependencyId))
                .map((dependencyId) => buildItem(dependencyId, nextPath));
            const dependencyEndDates = dependencyItems
                .map((dependency) => normalizeDate(dependency.endAt))
                .filter((value): value is Date => value !== null);

            let derivedStart = normalizeDate(task.startDate);
            const derivedEnd = normalizeDate(task.dueDate) ?? derivedStart;
            if (!derivedStart && dependencyEndDates.length > 0) {
                derivedStart = new Date(Math.max(...dependencyEndDates.map((value) => value.getTime())));
            }
            if (!derivedStart) {
                derivedStart = derivedEnd;
            }
            const safeEnd = derivedEnd && derivedStart && derivedEnd < derivedStart ? derivedStart : derivedEnd;

            const blockedByTaskIds = dependencyItems
                .filter((dependency) => !dependency.isCompleted)
                .map((dependency) => dependency.taskId);
            const isBlocked = blockedByTaskIds.length > 0;
            const isCompleted = isCompletedTask(task, board);
            const isDelayed = Boolean(safeEnd && safeEnd < now && !isCompleted);

            const item: TimelineItem = {
                taskId: task.id,
                boardId: board.id,
                boardTitle: board.title,
                title: task.title,
                taskType: task.taskType ?? 'task',
                ownerLabel: task.ownerLabel,
                effortPoints: task.effortPoints ?? 0,
                columnTitle: columnMap.get(task.columnId),
                dependencyTaskIds: task.dependencyTaskIds ?? [],
                blockedByTaskIds,
                startAt: derivedStart?.toISOString(),
                endAt: safeEnd?.toISOString(),
                isBlocked,
                isDelayed,
                isMilestone: task.taskType === 'milestone',
                isCompleted,
                contextType: board.contextType,
                organizationId: board.organizationId,
                teamId: board.teamId,
            };
            cache.set(task.id, item);
            return item;
        };

        board.tasks
            .filter((task) => Boolean(task.startDate || task.dueDate || (task.dependencyTaskIds?.length ?? 0) > 0 || task.taskType === 'milestone'))
            .forEach((task) => items.push(buildItem(task.id)));
    });

    items.sort((left, right) => (left.startAt ?? left.endAt ?? '').localeCompare(right.startAt ?? right.endAt ?? '') || left.title.localeCompare(right.title));

    const alerts: TimelineAlert[] = [];
    items.forEach((item) => {
        if (item.isDelayed) {
            alerts.push({
                alertType: 'delayed',
                severity: 'critical',
                taskId: item.taskId,
                boardId: item.boardId,
                boardTitle: item.boardTitle,
                title: item.title,
                ownerLabel: item.ownerLabel,
                message: 'La tarjeta ha superado su fecha objetivo sin quedar cerrada.',
            });
        }
        if (item.isBlocked) {
            alerts.push({
                alertType: 'blocked',
                severity: 'warning',
                taskId: item.taskId,
                boardId: item.boardId,
                boardTitle: item.boardTitle,
                title: item.title,
                ownerLabel: item.ownerLabel,
                message: 'La tarjeta depende de otras tareas todavía abiertas.',
            });
        }
        const endDate = normalizeDate(item.endAt);
        const dueSoon = Boolean(endDate && endDate.getTime() <= now.getTime() + 3 * 24 * 60 * 60 * 1000 && !item.isCompleted);
        if (item.isMilestone && (item.isBlocked || item.isDelayed || dueSoon)) {
            alerts.push({
                alertType: 'milestone_at_risk',
                severity: item.isDelayed ? 'critical' : 'warning',
                taskId: item.taskId,
                boardId: item.boardId,
                boardTitle: item.boardTitle,
                title: item.title,
                ownerLabel: item.ownerLabel,
                message: 'El hito necesita seguimiento porque está bloqueado, vencido o demasiado próximo.',
            });
        }
    });

    const capacityMap = new Map<string, TimelineCapacity>();
    items.forEach((item) => {
        if (item.isCompleted) return;
        const ownerLabel = item.ownerLabel?.trim() || 'Sin responsable';
        const current = capacityMap.get(ownerLabel) ?? {
            ownerLabel,
            taskCount: 0,
            effortPoints: 0,
            blockedCount: 0,
            delayedCount: 0,
        };
        current.taskCount += 1;
        current.effortPoints += item.effortPoints;
        current.blockedCount += item.isBlocked ? 1 : 0;
        current.delayedCount += item.isDelayed ? 1 : 0;
        capacityMap.set(ownerLabel, current);
    });

    const capacities = Array.from(capacityMap.values()).sort((left, right) => right.effortPoints - left.effortPoints || right.taskCount - left.taskCount);
    const blockedCount = items.filter((item) => item.isBlocked).length;
    const delayedCount = items.filter((item) => item.isDelayed).length;
    const milestoneRiskCount = alerts.filter((alert) => alert.alertType === 'milestone_at_risk').length;

    return {
        scopeType: options?.teamId ? 'team' : options?.organizationId ? 'organization' : 'personal',
        organizationId: options?.organizationId ?? undefined,
        teamId: options?.teamId ?? undefined,
        boardId: options?.boardId ?? undefined,
        itemCount: items.length,
        blockedCount,
        delayedCount,
        milestoneRiskCount,
        items,
        alerts,
        capacities,
    };
}
