import { describe, expect, it } from 'vitest';
import type { Board } from '../store/boardStore';
import type { ProBoardInsightsResponse } from '../services/pasosApi';
import { buildBoardPedagogicalReport } from './boardReports';

const board: Board = {
    id: 'board-1',
    title: 'Rutina aula',
    ownerId: 'teacher-1',
    createdAt: Date.now(),
    columns: [
        { id: 'todo', title: 'Por hacer', order: 0 },
        { id: 'done', title: 'Terminado', order: 1 },
    ],
    tasks: [
        {
            id: 'task-1',
            columnId: 'todo',
            title: 'Anticipación visual',
            description: 'Explicar la secuencia del día.',
            labels: ['inicio'],
            color: '#45B7D1',
            pictograms: [{ id: 1, url: 'https://example.com/picto.png', title: 'Picto' }],
            attachments: [{ id: 'att-1', kind: 'link', url: 'https://example.com', title: 'Recurso' }],
            durationSeconds: 600,
            objective: 'Comprender la secuencia',
            expectedEvidence: 'Explicar el orden del día',
            supportText: 'Usar apoyo visual',
            createdAt: 1,
        },
        {
            id: 'task-2',
            columnId: 'done',
            title: 'Cierre',
            labels: [],
            createdAt: 2,
        },
    ],
};

const insights: ProBoardInsightsResponse = {
    board_id: 'board-1',
    board_title: 'Rutina aula',
    total_tasks: 2,
    active_share_count: 1,
    share_access_count: 3,
    learner_count: 1,
    completed_learners: 1,
    learners: [
        {
            learner_key: 'learner-1',
            learner_label: 'Marta',
            share_code: 'ABC-1234',
            completed_count: 2,
            total_tasks: 2,
            progress_percent: 100,
            last_event_type: 'board_completed',
            last_access_at: new Date().toISOString(),
            help_task_count: 0,
            evidence_count: 1,
            feedback_count: 1,
            validated_count: 1,
            help_task_ids: [],
            validated_task_ids: ['task-1'],
            evidence_entries: [
                {
                    task_id: 'task-1',
                    note: 'Foto entregada',
                    url: null,
                    submitted_at: new Date().toISOString(),
                },
            ],
            feedback_entries: [
                {
                    task_id: 'task-1',
                    message: 'Bien hecho',
                    status: 'validated',
                    author_label: 'Docente',
                    created_at: new Date().toISOString(),
                },
            ],
        },
    ],
    recent_events: [
        {
            id: 'event-1',
            event_type: 'board_completed',
            actor_type: 'student',
            actor_id: 'learner-1',
            actor_label: 'Marta',
            metadata: { progress_percent: 100 },
            occurred_at: new Date().toISOString(),
        },
    ],
};

describe('boardReports', () => {
    it('builds a pedagogical report with summary, evidence and learners', () => {
        const report = buildBoardPedagogicalReport(board, insights);

        expect(report.summary.totalColumns).toBe(2);
        expect(report.summary.totalTasks).toBe(2);
        expect(report.summary.tasksWithPictograms).toBe(1);
        expect(report.summary.tasksWithResources).toBe(1);
        expect(report.summary.tasksWithTimers).toBe(1);
        expect(report.evidence).toHaveLength(1);
        expect(report.learners[0]?.learner_label).toBe('Marta');
        expect(report.columns[0]?.tasks[0]?.durationMinutes).toBe(10);
        expect(report.columns[0]?.tasks[0]?.objective).toBe('Comprender la secuencia');
    });
});
