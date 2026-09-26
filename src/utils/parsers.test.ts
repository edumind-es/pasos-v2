import { describe, expect, it } from 'vitest';
import { detectInputType, parseInputToBoard } from './parsers';

describe('detectInputType', () => {
    it('reconoce JSON, Markdown y texto plano', () => {
        expect(detectInputType('{"columns":[]}')).toBe('json');
        expect(detectInputType('- Uno\n- Dos')).toBe('markdown');
        expect(detectInputType('Una sola frase larga sin estructura alguna.')).toBe('text');
    });
});

describe('parseInputToBoard con casillas de verificación', () => {
    // Regresión: el grupo opcional de la casilla era codicioso y dejaba
    // como título solo la última palabra de la línea.
    it('conserva el texto completo de la tarea', () => {
        const { board } = parseInputToBoard('## Secuencia\n- [ ] **Apertura** — semáforo emocional de entrada');
        expect(board.tasks?.[0].title).toBe('**Apertura** — semáforo emocional de entrada');
    });

    it('admite casillas marcadas', () => {
        const { board } = parseInputToBoard('## Secuencia\n- [x] Recoger el material');
        expect(board.tasks?.[0].title).toBe('Recoger el material');
    });

    it('trata los encabezados de tercer nivel como columnas, sin almohadillas', () => {
        const { board } = parseInputToBoard('## Secuencia\n- [ ] Uno\n### Núcleo\n- [ ] Dos');
        expect(board.columns?.map(c => c.title)).toEqual(['Secuencia', 'Núcleo']);
        const nucleo = board.columns?.find(c => c.title === 'Núcleo');
        expect(board.tasks?.find(t => t.title === 'Dos')?.columnId).toBe(nucleo?.id);
    });
});
