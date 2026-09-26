/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Lector de la «plantilla de sesión» en Markdown que Luis genera desde la
 * programación de aula. Convierte ese documento en un tablero de Pasos.
 *
 * Estructura esperada (todas las secciones son opcionales salvo Secuencia):
 *
 *   # {Día} {Fecha} · {Hora} · {Título de la sesión}
 *   ## Secuencia
 *   - [ ] **Apertura (1-2 min)** — semáforo emocional: ...
 *   ### Núcleo
 *   - [ ] {Paso 1}
 *   - [ ] **Cierre (1-2 min)** — semáforo emocional de cierre
 *   ## Accesibilidad
 *   - [ ] Cuerpo 14-16 pt ...
 *   ## Notas
 *   texto libre
 */

import { v4 as uuidv4 } from 'uuid';
import type { Board, Column, Task } from '../store/boardStore';

/** Disposición del tablero resultante. */
export type SessionLayout = 'fases' | 'kanban';

/** Fase de la sesión a la que pertenece un paso. */
export type SessionPhase = 'apertura' | 'nucleo' | 'cierre';

export interface SessionStep {
    /** Título corto y legible del paso (lo que se ve en la tarjeta). */
    title: string;
    /** Explicación larga del paso, si la línea traía un «—» o unos dos puntos. */
    detail?: string;
    /** Término depurado con el que buscar el pictograma ARASAAC. */
    pictogramTerm: string;
    phase: SessionPhase;
    durationSeconds?: number;
}

export interface ParsedSession {
    /** Título de la sesión (último segmento del H1). */
    title: string;
    /** «Lun 15/09» o lo que venga antes del primer «·» del H1. */
    dateLabel?: string;
    /** «10:00» o lo que venga en el segmento central del H1. */
    timeLabel?: string;
    steps: SessionStep[];
    /** Puntos de la sección «Accesibilidad». */
    reminders: string[];
    /** Texto libre de la sección «Notas». */
    notes?: string;
}

const PHASE_TITLES: Record<SessionPhase, string> = {
    apertura: 'Apertura',
    nucleo: 'Núcleo',
    cierre: 'Cierre',
};

const PHASE_COLORS: Record<SessionPhase, string> = {
    apertura: '#4ECDC4',
    nucleo: '#FF6B6B',
    cierre: '#45B7D1',
};

const STOPWORDS = new Set([
    'la', 'el', 'las', 'los', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'en',
    'para', 'con', 'y', 'o', 'que', 'a', 'su', 'sus', 'lo', 'se', 'por', 'cada',
    'todo', 'toda', 'todos', 'todas', 'durante', 'sin', 'si', 'es', 'está', 'esta',
]);

const SECTION_SEQUENCE = /^secuencia$/i;
const SECTION_ACCESSIBILITY = /^accesibilidad$/i;
const SECTION_NOTES = /^notas?$/i;

type Section = 'secuencia' | 'accesibilidad' | 'notas' | 'otra';

/**
 * ¿Este texto parece la plantilla de sesión? Pedimos un encabezado «Secuencia»
 * (con o sin almohadillas) y al menos una casilla de verificación.
 */
export function isSessionTemplate(text: string): boolean {
    const hasSequenceHeading = /^\s{0,3}#{1,4}\s*secuencia\s*$/im.test(text);
    const hasCheckbox = /^\s*[-*•]\s*\[[ xX]\]/m.test(text);
    return hasSequenceHeading && hasCheckbox;
}

/** Quita los marcadores `{...}` de los huecos sin rellenar de la plantilla. */
function stripPlaceholder(text: string): string {
    return text.replace(/^\{(.+)\}$/, '$1').trim();
}

/** ¿El segmento sigue siendo un hueco sin rellenar de la plantilla? */
function isPlaceholder(text: string): boolean {
    return /^\{.*\}$/.test(text.trim());
}

/** Convierte «(1-2 min)», «(10 min)» o «(30 s)» en segundos (cota superior). */
function parseDuration(text: string): number | undefined {
    const match = text.match(/\((?:\s*(\d+)\s*[-–a]\s*)?(\d+)\s*(min|minutos?|s|seg|segundos?)\s*\)/i);
    if (!match) return undefined;
    const amount = Number(match[2]);
    if (!Number.isFinite(amount) || amount <= 0) return undefined;
    const isSeconds = /^s/i.test(match[3]);
    return isSeconds ? amount : amount * 60;
}

/** Elimina el énfasis Markdown (**negrita**, *cursiva*, `código`). */
function stripEmphasis(text: string): string {
    return text
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .trim();
}

/**
 * Deriva el término de búsqueda del pictograma: nos quedamos con la primera
 * oración y con las tres primeras palabras con carga semántica. Buscar en
 * ARASAAC con la frase entera casi nunca devuelve nada útil.
 */
function derivePictogramTerm(text: string): string {
    const firstClause = stripEmphasis(text)
        .replace(/\([^)]*\)/g, ' ')
        .split(/[:;.—–|/]/)[0];

    const words = firstClause
        .toLowerCase()
        .replace(/[.,;:!?¿¡"']/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !STOPWORDS.has(word));

    const term = words.slice(0, 3).join(' ').trim();
    return term || stripEmphasis(firstClause).trim();
}

/** Primera letra en mayúscula, sin tocar el resto (respeta siglas). */
function capitalize(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convierte una línea de casilla en un paso. La regla clave para que el
 * pictograma sea preciso: si la negrita es un marcador de fase
 * («Apertura», «Cierre», «Núcleo»), el contenido real está en la explicación.
 */
function buildStep(rawLine: string, phase: SessionPhase): SessionStep | null {
    const content = stripPlaceholder(rawLine.trim());
    if (!content) return null;

    const durationSeconds = parseDuration(content);

    const boldMatch = content.match(/^\*\*(.+?)\*\*\s*(?:[—–-]\s*)?(.*)$/);
    const boldLabel = boldMatch ? stripEmphasis(boldMatch[1]).replace(/\([^)]*\)/g, '').trim() : '';
    const rest = boldMatch ? boldMatch[2].trim() : '';
    const isPhaseMarker = boldLabel !== '' && /^(apertura|cierre|núcleo|nucleo|inicio|final)\b/i.test(boldLabel);

    // 1. Negrita con contenido propio: es el título, el resto es la explicación.
    if (boldLabel && !isPhaseMarker) {
        return {
            title: capitalize(boldLabel),
            detail: rest ? capitalize(stripEmphasis(rest)) : undefined,
            pictogramTerm: derivePictogramTerm(boldLabel),
            phase,
            durationSeconds,
        };
    }

    // 2. Marcador de fase: el paso real es lo que viene después del guion.
    if (isPhaseMarker && rest) {
        const clean = stripEmphasis(rest);
        const shortTitle = clean.split(/[:.]/)[0].trim() || clean;
        return {
            title: capitalize(shortTitle),
            detail: clean.length > shortTitle.length ? capitalize(clean) : undefined,
            pictogramTerm: derivePictogramTerm(clean),
            phase,
            durationSeconds,
        };
    }

    // 3. Línea corriente sin negrita.
    const clean = stripEmphasis(content);
    return {
        title: capitalize(clean),
        pictogramTerm: derivePictogramTerm(clean),
        phase,
        durationSeconds,
    };
}

/** ¿Esta línea cambia de fase? («### Núcleo», «**Cierre …**»). */
function detectPhase(text: string): SessionPhase | null {
    const clean = stripEmphasis(text).toLowerCase();
    if (/^(núcleo|nucleo|desarrollo)\b/.test(clean)) return 'nucleo';
    if (/^(cierre|final|despedida)\b/.test(clean)) return 'cierre';
    if (/^(apertura|inicio|entrada)\b/.test(clean)) return 'apertura';
    return null;
}

export function parseSessionTemplate(markdown: string): ParsedSession {
    const lines = markdown.split('\n');

    let title = 'Sesión';
    let dateLabel: string | undefined;
    let timeLabel: string | undefined;
    let section: Section = 'secuencia';
    let phase: SessionPhase = 'apertura';

    const steps: SessionStep[] = [];
    const reminders: string[] = [];
    const noteLines: string[] = [];

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        // Título de la sesión
        if (/^#\s+/.test(line)) {
            const heading = line.replace(/^#\s+/, '').trim();
            const segments = heading.split('·').map(s => s.trim()).filter(Boolean);
            const named = segments.filter(s => !isPlaceholder(s));
            if (segments.length >= 3) {
                dateLabel = isPlaceholder(segments[0]) ? undefined : segments[0];
                timeLabel = isPlaceholder(segments[1]) ? undefined : segments[1];
            }
            const last = segments[segments.length - 1] ?? heading;
            title = stripEmphasis(isPlaceholder(last) ? (named[named.length - 1] ?? 'Sesión') : last);
            if (isPlaceholder(last) && named.length === 0) title = 'Sesión';
            continue;
        }

        // Encabezados de sección y de fase
        const headingMatch = line.match(/^(#{2,4})\s+(.*)$/);
        if (headingMatch) {
            const text = stripEmphasis(headingMatch[2]);
            if (SECTION_SEQUENCE.test(text)) {
                section = 'secuencia';
                phase = 'apertura';
                continue;
            }
            if (SECTION_ACCESSIBILITY.test(text)) {
                section = 'accesibilidad';
                continue;
            }
            if (SECTION_NOTES.test(text)) {
                section = 'notas';
                continue;
            }
            const phaseFromHeading = detectPhase(text);
            if (phaseFromHeading && section === 'secuencia') {
                phase = phaseFromHeading;
                continue;
            }
            section = 'otra';
            continue;
        }

        const bulletMatch = line.match(/^[-*•]\s+(?:\[[ xX]\]\s*)?(.*)$/);

        if (section === 'accesibilidad') {
            if (bulletMatch) reminders.push(stripEmphasis(stripPlaceholder(bulletMatch[1])));
            continue;
        }

        if (section === 'notas') {
            const text = bulletMatch ? bulletMatch[1] : line;
            const clean = stripPlaceholder(stripEmphasis(text));
            if (clean) noteLines.push(clean);
            continue;
        }

        if (section !== 'secuencia') continue;

        if (!bulletMatch) continue;

        // Un «**Cierre …**» dentro de la secuencia abre la fase de cierre.
        const phaseFromBullet = detectPhase(bulletMatch[1].replace(/^\*\*(.+?)\*\*.*$/, '$1'));
        if (phaseFromBullet && /^\*\*/.test(bulletMatch[1])) {
            phase = phaseFromBullet;
        }

        const step = buildStep(bulletMatch[1], phase);
        if (step) steps.push(step);
    }

    const notes = noteLines.join('\n').trim() || undefined;
    return { title, dateLabel, timeLabel, steps, reminders, notes };
}

/** Título del tablero: «Equilibrios — Lun 15/09» cuando hay fecha. */
export function buildBoardTitle(session: ParsedSession): string {
    return session.dateLabel ? `${session.title} — ${session.dateLabel}` : session.title;
}

function newTask(partial: Omit<Task, 'id' | 'createdAt' | 'labels'> & { labels?: string[] }): Task {
    return {
        id: uuidv4(),
        labels: partial.labels ?? [],
        createdAt: Date.now(),
        ...partial,
    };
}

/**
 * Convierte la sesión leída en un tablero. `fases` da una columna por fase
 * (mapa de la sesión); `kanban` deja todos los pasos en «Por hacer» para irlos
 * moviendo durante la clase. En ambos casos «Accesibilidad» y «Notas» van a una
 * columna «Recordatorios» aparte, para no mezclarlas con los pasos.
 */
export interface SessionBoard {
    board: Partial<Board>;
    /** Mapa `id de tarea → término depurado` para la búsqueda en ARASAAC. */
    pictogramTerms: Record<string, string>;
}

export function sessionToBoard(session: ParsedSession, layout: SessionLayout): SessionBoard {
    const columns: Column[] = [];
    const tasks: Task[] = [];
    const pictogramTerms: Record<string, string> = {};

    const addColumn = (title: string): Column => {
        const column: Column = { id: uuidv4(), title, order: columns.length };
        columns.push(column);
        return column;
    };

    const addStep = (step: SessionStep, columnId: string) => {
        const task = newTask({
            columnId,
            title: step.title,
            description: step.detail,
            objective: undefined,
            labels: [PHASE_TITLES[step.phase].toLowerCase()],
            color: PHASE_COLORS[step.phase],
            taskType: 'learning_step',
            pedagogicalStatus: 'not_started',
            durationSeconds: step.durationSeconds,
        });
        pictogramTerms[task.id] = step.pictogramTerm;
        tasks.push(task);
    };

    if (layout === 'fases') {
        const phases: SessionPhase[] = ['apertura', 'nucleo', 'cierre'];
        for (const phase of phases) {
            const phaseSteps = session.steps.filter(step => step.phase === phase);
            if (phaseSteps.length === 0) continue;
            const column = addColumn(PHASE_TITLES[phase]);
            phaseSteps.forEach(step => addStep(step, column.id));
        }
        if (columns.length === 0) {
            const column = addColumn('Secuencia');
            session.steps.forEach(step => addStep(step, column.id));
        }
    } else {
        const todo = addColumn('Por hacer');
        addColumn('En proceso');
        addColumn('Hecho');
        session.steps.forEach(step => addStep(step, todo.id));
    }

    const metaLine = [session.dateLabel, session.timeLabel].filter(Boolean).join(' · ');
    const hasReminders = session.reminders.length > 0 || Boolean(session.notes) || Boolean(metaLine);

    if (hasReminders) {
        const column = addColumn('Recordatorios');
        session.reminders.forEach(reminder => {
            tasks.push(newTask({
                columnId: column.id,
                title: reminder,
                labels: ['accesibilidad'],
                color: '#FFEEAD',
                taskType: 'agreement',
            }));
        });
        if (session.notes || metaLine) {
            tasks.push(newTask({
                columnId: column.id,
                title: 'Notas de la sesión',
                description: [metaLine, session.notes].filter(Boolean).join('\n'),
                labels: ['notas'],
                color: '#D4A5A5',
                taskType: 'document',
            }));
        }
    }

    return {
        board: {
            id: uuidv4(),
            title: buildBoardTitle(session),
            columns,
            tasks,
            createdAt: Date.now(),
        },
        pictogramTerms,
    };
}

