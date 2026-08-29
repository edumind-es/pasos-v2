/**
 * Apodo del alumnado, calculado a partir de su clave aleatoria.
 *
 * Por qué existe: el nombre de un menor no tiene por qué llegar al servidor.
 * En vez de cifrarlo, no se recoge. Cada alumno tiene ya una `learner_key`
 * que es un UUID que genera su propio navegador; de ahí se deriva un apodo
 * memorable —«Lince 7»— que docente y alumno calculan por separado sin que
 * nadie lo guarde.
 *
 * El docente puede ponerle encima el nombre real desde su propia libreta,
 * que vive solo en su dispositivo (ver `libretaDocente.ts`).
 */

/** Palabras cortas, reconocibles en gallego y castellano, sin género marcado. */
const PALABRAS = [
    'Lince', 'Faro', 'Nube', 'Río', 'Robles', 'Ámbar', 'Coral', 'Duna',
    'Eco', 'Fresa', 'Granate', 'Hiedra', 'Iris', 'Jade', 'Lúa', 'Malva',
    'Norte', 'Olivo', 'Pino', 'Quilla', 'Rocío', 'Salvia', 'Trébol', 'Uva',
    'Verde', 'Xasmín', 'Zafiro', 'Abeto', 'Brisa', 'Cedro', 'Delta', 'Estrela',
    'Fento', 'Gaivota', 'Hélice', 'Illa', 'Xuncal', 'Kiwi', 'Loureiro', 'Menta',
    'Néboa', 'Ourizo', 'Prado', 'Quenlla', 'Ruada', 'Sendeiro', 'Toxo', 'Ulmo',
    'Vento', 'Xeada', 'Ynés', 'Zume', 'Álamo', 'Bidueiro', 'Carballo', 'Dorna',
    'Espiga', 'Faísca', 'Gaita', 'Horizonte',
] as const;

const NUMEROS = 100;

/**
 * Hash determinista y estable entre navegadores (FNV-1a de 32 bits).
 * No necesita ser criptográfico: no protege nada, solo reparte.
 */
function repartir(texto: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < texto.length; i += 1) {
        h ^= texto.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/** Apodo estable de una clave de alumno. La misma clave da siempre lo mismo. */
export function apodoDeClave(clave: string): string {
    const limpia = clave.trim();
    if (!limpia) return 'Alumno';
    const h = repartir(limpia);
    const palabra = PALABRAS[h % PALABRAS.length];
    const numero = Math.floor(h / PALABRAS.length) % NUMEROS;
    return `${palabra} ${numero}`;
}

/**
 * Apodos de un grupo, garantizando que no se repitan.
 *
 * Con 6000 combinaciones y una clase de 30, la probabilidad de choque ronda
 * el 7 %: bastante como para que pase alguna vez y muy molesto cuando pasa
 * —dos alumnos indistinguibles en la pantalla del docente—. Aquí se desempata
 * con una letra, de forma estable: se ordena por clave, así que el mismo
 * grupo produce siempre el mismo reparto.
 */
export function apodosDeGrupo(claves: readonly string[]): Map<string, string> {
    const resultado = new Map<string, string>();
    const usados = new Map<string, number>();

    for (const clave of [...claves].sort()) {
        const base = apodoDeClave(clave);
        const vistas = usados.get(base) ?? 0;
        usados.set(base, vistas + 1);
        resultado.set(clave, vistas === 0 ? base : `${base}${String.fromCharCode(97 + vistas)}`);
    }

    return resultado;
}
