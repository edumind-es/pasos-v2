import type { Board } from '../store/boardStore';
import type { ProBoardInsightsResponse } from '../services/pasosApi';

interface BoardReportSummary {
    totalColumns: number;
    totalTasks: number;
    tasksWithPictograms: number;
    tasksWithResources: number;
    tasksWithTimers: number;
}

interface BoardReport {
    generatedAt: string;
    board: {
        id: string;
        title: string;
        ownerId: string;
    };
    summary: BoardReportSummary;
    columns: Array<{
        id: string;
        title: string;
        tasks: Array<{
            title: string;
            description?: string;
            objective?: string;
            expectedEvidence?: string;
            supportText?: string;
            labels: string[];
            durationMinutes?: number;
            pictogramCount: number;
            resourceCount: number;
        }>;
    }>;
    evidence: Array<{
        taskTitle: string;
        resourceTitle: string;
        kind: string;
        url: string;
    }>;
    learners: ProBoardInsightsResponse['learners'];
    events: ProBoardInsightsResponse['recent_events'];
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export function buildBoardPedagogicalReport(
    board: Board,
    insights: ProBoardInsightsResponse | null,
): BoardReport {
    const summary: BoardReportSummary = {
        totalColumns: board.columns.length,
        totalTasks: board.tasks.length,
        tasksWithPictograms: board.tasks.filter(task => (task.pictograms?.length ?? 0) > 0 || task.icon).length,
        tasksWithResources: board.tasks.filter(task => (task.attachments?.length ?? 0) > 0).length,
        tasksWithTimers: board.tasks.filter(task => Boolean(task.durationSeconds)).length,
    };

    const columns = board.columns
        .sort((left, right) => left.order - right.order)
        .map(column => ({
            id: column.id,
            title: column.title,
            tasks: board.tasks
                .filter(task => task.columnId === column.id)
                .map(task => ({
                    title: task.title,
                    description: task.description,
                    objective: task.objective,
                    expectedEvidence: task.expectedEvidence,
                    supportText: task.supportText,
                    labels: task.labels,
                    durationMinutes: task.durationSeconds ? Math.round(task.durationSeconds / 60) : undefined,
                    pictogramCount: task.pictograms?.length ?? (task.icon ? 1 : 0),
                    resourceCount: task.attachments?.length ?? 0,
                })),
        }));

    const evidence = board.tasks.flatMap(task => (
        (task.attachments ?? []).map(attachment => ({
            taskTitle: task.title,
            resourceTitle: attachment.title || attachment.url,
            kind: attachment.kind,
            url: attachment.url,
        }))
    ));

    return {
        generatedAt: new Date().toISOString(),
        board: {
            id: board.id,
            title: board.title,
            ownerId: board.ownerId,
        },
        summary,
        columns,
        evidence,
        learners: insights?.learners ?? [],
        events: insights?.recent_events ?? [],
    };
}

function downloadBlob(filename: string, content: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function downloadBoardReportJson(board: Board, insights: ProBoardInsightsResponse | null): void {
    const report = buildBoardPedagogicalReport(board, insights);
    downloadBlob(
        `pasos-informe-${board.title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(report, null, 2),
        'application/json',
    );
}

export function downloadBoardReportHtml(board: Board, insights: ProBoardInsightsResponse | null): void {
    const report = buildBoardPedagogicalReport(board, insights);
    const columnsMarkup = report.columns.map(column => `
        <section>
            <h3>${escapeHtml(column.title)}</h3>
            <ul>
                ${column.tasks.map(task => `
                    <li>
                        <strong>${escapeHtml(task.title)}</strong>
                        ${task.description ? `<div>${escapeHtml(task.description)}</div>` : ''}
                        ${task.objective ? `<div>Objetivo: ${escapeHtml(task.objective)}</div>` : ''}
                        ${task.expectedEvidence ? `<div>Evidencia esperada: ${escapeHtml(task.expectedEvidence)}</div>` : ''}
                        ${task.supportText ? `<div>Apoyo: ${escapeHtml(task.supportText)}</div>` : ''}
                        <div>Etiquetas: ${escapeHtml(task.labels.join(', ') || 'Sin etiquetas')}</div>
                        <div>Duración: ${task.durationMinutes ? `${task.durationMinutes} min` : 'Sin temporizador'}</div>
                        <div>Pictogramas: ${task.pictogramCount} · Recursos: ${task.resourceCount}</div>
                    </li>
                `).join('')}
            </ul>
        </section>
    `).join('');

    const evidenceMarkup = report.evidence.length > 0
        ? `<ul>${report.evidence.map(item => `
            <li>
                <strong>${escapeHtml(item.taskTitle)}</strong>: ${escapeHtml(item.resourceTitle)} (${escapeHtml(item.kind)})
            </li>
        `).join('')}</ul>`
        : '<p>No hay recursos o evidencias adjuntas en este tablero.</p>';

    const learnersMarkup = report.learners.length > 0
        ? `<ul>${report.learners.map(learner => `
            <li>
                <strong>${escapeHtml(learner.learner_label || 'Alumno anónimo')}</strong>
                · ${learner.completed_count}/${learner.total_tasks} tareas
                · ${learner.progress_percent}%
                · ${escapeHtml(learner.last_event_type || 'sin evento')}
                · ayuda: ${learner.help_task_count}
                · evidencias: ${learner.evidence_count}
                · validadas: ${learner.validated_count}
            </li>
        `).join('')}</ul>`
        : '<p>No hay seguimiento remoto de alumnado disponible.</p>';

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Informe pedagógico · ${escapeHtml(report.board.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #172033; margin: 32px; line-height: 1.5; }
    h1, h2, h3 { color: #10213b; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 24px 0; }
    .card { border: 1px solid #d7deea; border-radius: 16px; padding: 16px; background: #f8fbff; }
    section { margin: 24px 0; }
    ul { padding-left: 20px; }
    li { margin: 10px 0; }
    .muted { color: #5a6578; }
  </style>
</head>
<body>
  <h1>Informe pedagógico</h1>
  <p class="muted">Generado el ${new Date(report.generatedAt).toLocaleString()}</p>
  <p><strong>Tablero:</strong> ${escapeHtml(report.board.title)}</p>

  <div class="summary">
    <div class="card"><strong>Columnas</strong><div>${report.summary.totalColumns}</div></div>
    <div class="card"><strong>Tareas</strong><div>${report.summary.totalTasks}</div></div>
    <div class="card"><strong>Con pictogramas</strong><div>${report.summary.tasksWithPictograms}</div></div>
    <div class="card"><strong>Con recursos</strong><div>${report.summary.tasksWithResources}</div></div>
    <div class="card"><strong>Con temporizador</strong><div>${report.summary.tasksWithTimers}</div></div>
    <div class="card"><strong>Alumnado seguido</strong><div>${report.learners.length}</div></div>
  </div>

  <section>
    <h2>Secuencia didáctica</h2>
    ${columnsMarkup}
  </section>

  <section>
    <h2>Recursos y evidencias</h2>
    ${evidenceMarkup}
  </section>

  <section>
    <h2>Seguimiento del alumnado</h2>
    ${learnersMarkup}
  </section>
</body>
</html>`;

    downloadBlob(
        `pasos-informe-${board.title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.html`,
        html,
        'text/html;charset=utf-8',
    );
}
