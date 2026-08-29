import { describe, expect, it } from 'vitest';
import { apodoDeClave, apodosDeGrupo } from './apodoAlumno';

describe('apodoDeClave', () => {
    it('es estable: la misma clave da siempre el mismo apodo', () => {
        const clave = '19e5f223-c7fc-4684-bef6-45c2217e0cad';
        expect(apodoDeClave(clave)).toBe(apodoDeClave(clave));
    });

    it('claves distintas dan apodos distintos', () => {
        const a = apodoDeClave('4ebd0dbb-510f-4828-ad3b-1cd3eed205dd');
        const b = apodoDeClave('b09cffb1-e118-4afa-96c9-13814c403fb4');
        expect(a).not.toBe(b);
    });

    it('el apodo no contiene la clave ni nada que identifique a nadie', () => {
        const clave = '19e5f223-c7fc-4684-bef6-45c2217e0cad';
        const apodo = apodoDeClave(clave);
        expect(apodo).toMatch(/^[A-Za-zÁÉÍÓÚÑáéíóúñ]+ \d{1,2}$/);
        expect(clave).not.toContain(apodo);
    });

    it('aguanta una clave vacía sin romperse', () => {
        expect(apodoDeClave('')).toBe('Alumno');
        expect(apodoDeClave('   ')).toBe('Alumno');
    });

    it('reparte de forma razonable: 200 claves dan muchos apodos distintos', () => {
        const claves = Array.from({ length: 200 }, (_, i) => `clave-de-prueba-${i}`);
        const apodos = new Set(claves.map(apodoDeClave));
        // Con 6000 combinaciones, 200 claves deberían dar casi 200 apodos.
        expect(apodos.size).toBeGreaterThan(190);
    });
});

describe('apodosDeGrupo', () => {
    it('no repite ningún apodo dentro del grupo', () => {
        const claves = Array.from({ length: 300 }, (_, i) => `alumno-${i}`);
        const mapa = apodosDeGrupo(claves);
        expect(new Set(mapa.values()).size).toBe(claves.length);
    });

    it('es estable: el mismo grupo produce siempre el mismo reparto', () => {
        const claves = ['c', 'a', 'b'];
        const primero = apodosDeGrupo(claves);
        const segundo = apodosDeGrupo([...claves].reverse());
        for (const clave of claves) {
            expect(primero.get(clave)).toBe(segundo.get(clave));
        }
    });

    it('desempata con una letra cuando dos claves chocan', () => {
        // Se buscan dos claves con el mismo apodo base para probar el desempate.
        const vistos = new Map<string, string>();
        let choque: [string, string] | null = null;
        for (let i = 0; i < 20000 && !choque; i += 1) {
            const clave = `k${i}`;
            const base = apodoDeClave(clave);
            const previa = vistos.get(base);
            if (previa) choque = [previa, clave];
            else vistos.set(base, clave);
        }
        expect(choque).not.toBeNull();

        const mapa = apodosDeGrupo(choque!);
        const [uno, dos] = choque!.map((c) => mapa.get(c));
        expect(uno).not.toBe(dos);
        expect([uno, dos].some((a) => a?.endsWith('b'))).toBe(true);
    });
});
