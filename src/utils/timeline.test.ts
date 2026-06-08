import { describe, expect, it } from 'vitest';

import { buildTimelineOverview } from './timeline';

describe('timeline utilities', () => {
    it('detects blocked tasks, delayed work and milestone risk', () => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

        const overview = buildTimelineOverview([
            {
                id: 'board-1',
                title: 'Proyecto',
                ownerId: 'teacher-1',
                contextType: 'team',
                teamId: 'team-1',
                columns: [
                    { id: 'todo', title: 'Por hacer', order: 0 },
                    { id: 'done', title: 'Hecho', order: 1 },
                ],
                tasks: [
                    { id: 'task-1', columnId: 'todo', title: 'Base', labels: [], startDate: yesterday, dueDate: yesterday, createdAt: 1 },
                    { id: 'task-2', columnId: 'todo', title: 'Dependiente', labels: [], dueDate: tomorrow, dependencyTaskIds: ['task-1'], ownerLabel: 'Ana', effortPoints: 5, createdAt: 2 },
                    { id: 'task-3', columnId: 'todo', title: 'Hito', labels: [], taskType: 'milestone', dueDate: tomorrow, dependencyTaskIds: ['task-2'], ownerLabel: 'Luis', effortPoints: 2, createdAt: 3 },
                ],
                createdAt: 1,
            },
        ], { teamId: 'team-1' });

        expect(overview.itemCount).toBe(3);
        expect(overview.blockedCount).toBe(2);
        expect(overview.delayedCount).toBe(1);
        expect(overview.milestoneRiskCount).toBe(1);
        expect(overview.capacities[0].ownerLabel).toBe('Ana');
        expect(overview.alerts.some((alert) => alert.alertType === 'milestone_at_risk')).toBe(true);
    });
});
