import type { Board } from '../store/boardStore';

export interface AgendaEvent {
    id: string;
    eventType: 'task_due' | 'assignment_due';
    title: string;
    description?: string;
    startAt: string;
    endAt: string;
    boardId: string;
    boardTitle: string;
    organizationId?: string;
    teamId?: string;
    targetLabel?: string;
}

function toDate(value: string | undefined): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function deriveLocalAgendaEvents(
    boards: Board[],
    scopeType: 'personal' | 'team' = 'personal',
    teamId?: string | null,
): AgendaEvent[] {
    const scopedBoards = boards.filter((board) => {
        if (scopeType === 'team') {
            return board.teamId === teamId;
        }
        return !board.teamId;
    });

    return scopedBoards
        .flatMap((board) => (
            board.tasks
                .map<AgendaEvent | null>((task) => {
                    const dueDate = toDate(task.dueDate);
                    if (!dueDate) {
                        return null;
                    }
                    return {
                        id: `local-${board.id}-${task.id}`,
                        eventType: 'task_due' as const,
                        title: task.title,
                        description: task.description,
                        startAt: dueDate.toISOString(),
                        endAt: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(),
                        boardId: board.id,
                        boardTitle: board.title,
                        organizationId: board.organizationId,
                        teamId: board.teamId,
                    };
                })
                .filter((item): item is AgendaEvent => item !== null)
        ))
        .sort((left, right) => left.startAt.localeCompare(right.startAt) || left.title.localeCompare(right.title));
}

export function startOfWeek(referenceDate: Date): Date {
    const start = new Date(referenceDate);
    const day = start.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + offset);
    start.setHours(0, 0, 0, 0);
    return start;
}

export function getWeekDates(referenceDate: Date): Date[] {
    const start = startOfWeek(referenceDate);
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
    });
}

export function buildMonthGrid(referenceDate: Date): Date[] {
    const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + index);
        return date;
    });
}

export function isSameDay(left: Date, right: Date): boolean {
    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
}

export function isSameMonth(left: Date, right: Date): boolean {
    return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}
