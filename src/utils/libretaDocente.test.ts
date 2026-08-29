import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anotarNombre, comoMostrar, libretaDe, nombreDe, vaciarLibreta } from './libretaDocente';

describe('libretaDocente', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('sin anotar, se muestra el apodo', () => {
        expect(comoMostrar('tablero-1', 'Lince 7')).toBe('Lince 7');
        expect(nombreDe('tablero-1', 'Lince 7')).toBeUndefined();
    });

    it('anota y recupera el nombre real', () => {
        anotarNombre('tablero-1', 'Lince 7', 'Marta');
        expect(comoMostrar('tablero-1', 'Lince 7')).toBe('Marta');
    });

    it('cada tablero tiene su propia libreta', () => {
        anotarNombre('tablero-1', 'Lince 7', 'Marta');
        expect(comoMostrar('tablero-2', 'Lince 7')).toBe('Lince 7');
    });

    it('un nombre vacío borra la anotación', () => {
        anotarNombre('tablero-1', 'Lince 7', 'Marta');
        anotarNombre('tablero-1', 'Lince 7', '   ');
        expect(comoMostrar('tablero-1', 'Lince 7')).toBe('Lince 7');
        expect(libretaDe('tablero-1')).toEqual({});
    });

    it('vaciar la libreta lo borra todo', () => {
        anotarNombre('tablero-1', 'Lince 7', 'Marta');
        anotarNombre('tablero-2', 'Nube 3', 'Iago');
        vaciarLibreta();
        expect(comoMostrar('tablero-1', 'Lince 7')).toBe('Lince 7');
        expect(comoMostrar('tablero-2', 'Nube 3')).toBe('Nube 3');
    });

    it('un localStorage corrupto no rompe la pantalla', () => {
        localStorage.setItem('pasos-libreta-docente', 'esto no es json');
        expect(comoMostrar('tablero-1', 'Lince 7')).toBe('Lince 7');
    });

    it('si localStorage falla al escribir, no propaga el error', () => {
        const fallo = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('sin espacio');
        });
        expect(() => anotarNombre('tablero-1', 'Lince 7', 'Marta')).not.toThrow();
        fallo.mockRestore();
    });
});
