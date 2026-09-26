import { describe, expect, it } from 'vitest';
import {
    buildBoardTitle,
    isSessionTemplate,
    parseSessionTemplate,
    sessionToBoard,
} from './sessionTemplate';

// Plantilla real de sesión (la que genera Claude desde la programación).
const PLANTILLA = `# Lun 15/09 · 10:00 · Equilibrios y giros

## Secuencia

- [ ] **Apertura (1-2 min)** — semáforo emocional: cada alumno/a coloca su marcador (rojo/ámbar/verde), sin explicaciones públicas obligatorias
- [ ] **Anticipación visible** — verbalizar/mostrar la secuencia de hoy: qué vamos a hacer, en qué orden, cuánto dura cada parte
- [ ] Recordar que el rincón de autorregulación está disponible durante toda la sesión

### Núcleo

- [ ] Calentamiento con desplazamientos (5 min)
- [ ] Circuito de equilibrios por parejas
- [ ] Recoger el material

- [ ] **Cierre (1-2 min)** — semáforo emocional de cierre (compararlo con el de apertura)
- [ ] Frase de cierre breve, sin comparar resultados ni exponer errores en público
- [ ] Anticipar qué toca después (siguiente sesión)

## Accesibilidad

- [ ] Cuerpo 14-16 pt en todo material impreso/proyectado, alto contraste
- [ ] Nada codificado solo por color

## Notas

Criterio EF 3.2 · se califica
`;

describe('isSessionTemplate', () => {
    it('reconoce la plantilla de sesión', () => {
        expect(isSessionTemplate(PLANTILLA)).toBe(true);
    });

    it('no confunde una lista suelta con una plantilla', () => {
        expect(isSessionTemplate('- Lavarse las manos\n- Secarse')).toBe(false);
    });

    it('exige casillas, no solo el encabezado', () => {
        expect(isSessionTemplate('## Secuencia\n\nTexto libre')).toBe(false);
    });
});

describe('parseSessionTemplate', () => {
    const sesion = parseSessionTemplate(PLANTILLA);

    it('extrae título, fecha y hora del encabezado', () => {
        expect(sesion.title).toBe('Equilibrios y giros');
        expect(sesion.dateLabel).toBe('Lun 15/09');
        expect(sesion.timeLabel).toBe('10:00');
    });

    it('asigna cada paso a su fase', () => {
        const porFase = (fase: string) => sesion.steps.filter(s => s.phase === fase).map(s => s.title);
        expect(porFase('apertura')).toHaveLength(3);
        expect(porFase('nucleo')).toEqual([
            'Calentamiento con desplazamientos (5 min)',
            'Circuito de equilibrios por parejas',
            'Recoger el material',
        ]);
        expect(porFase('cierre')).toHaveLength(3);
    });

    it('separa la etiqueta corta de la explicación larga', () => {
        const anticipacion = sesion.steps[1];
        expect(anticipacion.title).toBe('Anticipación visible');
        expect(anticipacion.detail).toContain('Verbalizar/mostrar la secuencia de hoy');
    });

    it('usa la explicación cuando la negrita es solo el marcador de fase', () => {
        const apertura = sesion.steps[0];
        expect(apertura.title).toBe('Semáforo emocional');
        expect(apertura.detail).toContain('cada alumno/a coloca su marcador');
    });

    it('convierte la duración entre paréntesis en segundos', () => {
        expect(sesion.steps[0].durationSeconds).toBe(120);
        expect(sesion.steps[3].durationSeconds).toBe(300);
        expect(sesion.steps[1].durationSeconds).toBeUndefined();
    });

    it('deriva términos cortos para el pictograma, no la frase entera', () => {
        expect(sesion.steps[0].pictogramTerm).toBe('semáforo emocional');
        expect(sesion.steps[2].pictogramTerm).toBe('recordar rincón autorregulación');
        expect(sesion.steps[5].pictogramTerm).toBe('recoger material');
    });

    it('recoge accesibilidad y notas por separado', () => {
        expect(sesion.reminders).toHaveLength(2);
        expect(sesion.reminders[0]).toContain('Cuerpo 14-16 pt');
        expect(sesion.notes).toBe('Criterio EF 3.2 · se califica');
    });

    it('tolera la plantilla vacía con los huecos sin rellenar', () => {
        const vacia = parseSessionTemplate('# {Día} {Fecha} · {Hora} · {Título de la sesión}\n\n## Secuencia\n\n- [ ] {Paso 1}\n');
        expect(vacia.title).toBe('Sesión');
        expect(vacia.dateLabel).toBeUndefined();
        expect(vacia.steps.map(s => s.title)).toEqual(['Paso 1']);
    });
});

describe('sessionToBoard', () => {
    const sesion = parseSessionTemplate(PLANTILLA);

    it('titula el tablero con la sesión y la fecha', () => {
        expect(buildBoardTitle(sesion)).toBe('Equilibrios y giros — Lun 15/09');
    });

    it('crea una columna por fase más Recordatorios', () => {
        const { board } = sessionToBoard(sesion, 'fases');
        expect(board.columns?.map(c => c.title)).toEqual(['Apertura', 'Núcleo', 'Cierre', 'Recordatorios']);
    });

    it('en kanban deja todos los pasos en Por hacer', () => {
        const { board } = sessionToBoard(sesion, 'kanban');
        const porHacer = board.columns?.find(c => c.title === 'Por hacer');
        const enPorHacer = board.tasks?.filter(t => t.columnId === porHacer?.id);
        expect(board.columns?.map(c => c.title)).toEqual(['Por hacer', 'En proceso', 'Hecho', 'Recordatorios']);
        expect(enPorHacer).toHaveLength(sesion.steps.length);
    });

    it('lleva accesibilidad y notas a Recordatorios, fuera de los pasos', () => {
        const { board } = sessionToBoard(sesion, 'fases');
        const recordatorios = board.columns?.find(c => c.title === 'Recordatorios');
        const tareas = board.tasks?.filter(t => t.columnId === recordatorios?.id) ?? [];
        expect(tareas).toHaveLength(3); // 2 de accesibilidad + 1 de notas
        expect(tareas.at(-1)?.title).toBe('Notas de la sesión');
        expect(tareas.at(-1)?.description).toContain('Lun 15/09 · 10:00');
        expect(tareas.every(t => t.taskType !== 'learning_step')).toBe(true);
    });

    it('asocia el término de pictograma al id real de cada tarea', () => {
        const { board, pictogramTerms } = sessionToBoard(sesion, 'fases');
        const pasos = board.tasks?.filter(t => t.taskType === 'learning_step') ?? [];
        expect(Object.keys(pictogramTerms)).toHaveLength(pasos.length);
        const semaforo = pasos.find(t => t.title === 'Semáforo emocional');
        expect(pictogramTerms[semaforo!.id]).toBe('semáforo emocional');
    });

    it('no deja tareas huérfanas sin columna', () => {
        const { board } = sessionToBoard(sesion, 'fases');
        const ids = new Set(board.columns?.map(c => c.id));
        expect(board.tasks?.every(t => ids.has(t.columnId))).toBe(true);
    });
});
