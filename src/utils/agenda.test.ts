import { describe, expect, it } from 'vitest';

import { buildMonthGrid, deriveLocalAgendaEvents, getWeekDates, startOfWeek } from './agenda';

describe('agenda utilities', () => {
    it('derives local task due events in chronological order', () => {
        const events = deriveLocalAgendaEvents([
            {
                id: 'board-1',
                title: 'Aula',
                ownerId: 'teacher-1',
                columns: [],
                tasks: [
                    { id: 'task-2', columnId: 'todo', title: 'Segundo', labels: [], dueDate: '2026-03-24T09:00:00.000Z', createdAt: 2 },
                    { id: 'task-1', columnId: 'todo', title: 'Primero', labels: [], dueDate: '2026-03-23T09:00:00.000Z', createdAt: 1 },
                ],
                createdAt: 1,
            },
        ]);

        expect(events).toHaveLength(2);
        expect(events[0].title).toBe('Primero');
        expect(events[1].title).toBe('Segundo');
    });

    it('builds stable week and month ranges', () => {
        const referenceDate = new Date('2026-03-18T10:00:00.000Z');
        const weekStart = startOfWeek(referenceDate);
        const weekDates = getWeekDates(referenceDate);
        const monthGrid = buildMonthGrid(referenceDate);

        expect(weekStart.toISOString()).toBe('2026-03-16T00:00:00.000Z');
        expect(weekDates).toHaveLength(7);
        expect(monthGrid).toHaveLength(42);
        expect(monthGrid[0].toISOString()).toBe('2026-02-23T00:00:00.000Z');
    });
});
