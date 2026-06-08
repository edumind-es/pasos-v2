import { describe, expect, it } from 'vitest';
import { getTaskColorEinkLabel, getTaskColorLabel } from './taskColorSemantics';

describe('taskColorSemantics', () => {
    it('maps the palette to readable labels', () => {
        expect(getTaskColorLabel('#45B7D1')).toBe('Azul');
        expect(getTaskColorEinkLabel('#45B7D1')).toBe('Etiqueta azul');
    });

    it('falls back for custom colors', () => {
        expect(getTaskColorLabel('#000000')).toBe('Color personalizado');
        expect(getTaskColorEinkLabel('#000000')).toBe('Etiqueta con color');
    });
});
