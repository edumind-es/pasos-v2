/**
 * Libreta del docente: apodo del alumno → nombre real.
 *
 * Vive **solo en el navegador del docente**, en `localStorage`. No se envía a
 * ningún servidor, no viaja en las exportaciones automáticas y no la ve nadie
 * más. Es el equivalente digital de la anotación a lápiz que ya haces en
 * clase: «Lince 7 es Marta».
 *
 * Consecuencia asumida: si cambias de navegador o de dispositivo, la libreta
 * no te sigue y vuelves a ver los apodos. Es el precio de que el servidor no
 * tenga nunca los nombres. Se puede exportar e importar a mano.
 */

import { apodosDeGrupo } from './apodoAlumno';

const CLAVE = 'pasos-libreta-docente';

type Libreta = Record<string, Record<string, string>>;

function leer(): Libreta {
    try {
        const crudo = localStorage.getItem(CLAVE);
        if (!crudo) return {};
        const dato = JSON.parse(crudo);
        return dato && typeof dato === 'object' ? (dato as Libreta) : {};
    } catch {
        // Un localStorage corrupto o bloqueado no debe tumbar la pantalla.
        return {};
    }
}

function escribir(libreta: Libreta): void {
    try {
        localStorage.setItem(CLAVE, JSON.stringify(libreta));
    } catch {
        // Sin espacio o en modo privado: se pierde la anotación, no la app.
    }
}

/** Nombre que el docente le ha puesto a ese apodo en ese tablero, si lo hay. */
export function nombreDe(boardId: string, apodo: string): string | undefined {
    const valor = leer()[boardId]?.[apodo]?.trim();
    return valor ? valor : undefined;
}

/** Todas las anotaciones de un tablero. */
export function libretaDe(boardId: string): Record<string, string> {
    return { ...(leer()[boardId] ?? {}) };
}

/** Anota o borra el nombre de un apodo. Un nombre vacío borra la anotación. */
export function anotarNombre(boardId: string, apodo: string, nombre: string): void {
    const libreta = leer();
    const delTablero = { ...(libreta[boardId] ?? {}) };
    const limpio = nombre.trim();

    if (limpio) delTablero[apodo] = limpio;
    else delete delTablero[apodo];

    if (Object.keys(delTablero).length) libreta[boardId] = delTablero;
    else delete libreta[boardId];

    escribir(libreta);
}

/** Lo que se muestra en pantalla: el nombre anotado si lo hay, el apodo si no. */
export function comoMostrar(boardId: string, apodo: string): string {
    return nombreDe(boardId, apodo) ?? apodo;
}

/** Borra la libreta entera. La usa el centro de control de datos. */
export function vaciarLibreta(): void {
    try {
        localStorage.removeItem(CLAVE);
    } catch {
        // nada que hacer
    }
}

/**
 * Etiqueta con la que el docente ve a cada alumno: el nombre que haya
 * anotado, y si no, el apodo calculado de su clave.
 *
 * Se resuelve el grupo entero de una vez porque el desempate de apodos
 * repetidos necesita conocer a todos.
 */
export function etiquetasDeAlumnado(
    boardId: string,
    claves: readonly string[],
): Map<string, string> {
    const apodos = apodosDeGrupo(claves);
    const libreta = libretaDe(boardId);
    const etiquetas = new Map<string, string>();

    for (const [clave, apodo] of apodos) {
        etiquetas.set(clave, libreta[apodo]?.trim() || apodo);
    }

    return etiquetas;
}
