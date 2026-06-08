import type { BoardTemplate } from '../store/boardStore';

export const BUILT_IN_BOARD_TEMPLATES: BoardTemplate[] = [
    {
        id: 'builtin-rutina-manana',
        title: 'Rutina de la mañana',
        description: 'Secuencia visual para preparar la entrada al cole o a terapia.',
        category: 'routine',
        createdAt: 0,
        updatedAt: 0,
        columns: [
            { id: 'todo', title: 'Por hacer', order: 0 },
            { id: 'doing', title: 'En proceso', order: 1 },
            { id: 'done', title: 'Terminado', order: 2 },
        ],
        tasks: [
            { id: 'wake-up', columnId: 'todo', title: 'Despertarse y lavarse la cara', description: 'Comenzar la mañana con higiene básica.', objective: 'Iniciar la rutina con autonomía.', supportText: 'Usa apoyos visuales paso a paso si lo necesitas.', expectedEvidence: 'Completar la secuencia de higiene.', nextStep: 'Vestirse', pedagogicalStatus: 'not_started', labels: ['rutina'], color: '#45B7D1', createdAt: 0, durationSeconds: 300 },
            { id: 'dress', columnId: 'todo', title: 'Vestirse', description: 'Preparar la ropa del día y revisar si falta algo.', objective: 'Elegir y ponerse la ropa del día.', supportText: 'Consulta la secuencia visual del armario.', expectedEvidence: 'Ropa puesta y preparada.', nextStep: 'Desayunar', pedagogicalStatus: 'not_started', labels: ['autonomía'], color: '#96CEB4', createdAt: 0, durationSeconds: 420 },
            { id: 'breakfast', columnId: 'todo', title: 'Desayunar', description: 'Completar desayuno y recoger la mesa.', objective: 'Finalizar el desayuno y dejar el espacio recogido.', supportText: 'Marca cada alimento cuando lo termines.', expectedEvidence: 'Mesa recogida y desayuno terminado.', nextStep: 'Preparar mochila', pedagogicalStatus: 'not_started', labels: ['alimentación'], color: '#FFEEAD', createdAt: 0, durationSeconds: 900 },
            { id: 'bag', columnId: 'todo', title: 'Preparar mochila', description: 'Revisar agenda, material y botella de agua.', objective: 'Salir con todo el material necesario.', supportText: 'Comprueba agenda, estuche y botella.', expectedEvidence: 'Mochila cerrada con material completo.', pedagogicalStatus: 'not_started', labels: ['colegio'], color: '#D4A5A5', createdAt: 0, durationSeconds: 480 },
        ],
    },
    {
        id: 'builtin-aula-estructurada',
        title: 'Bloque de aula estructurada',
        description: 'Plantilla para una sesión de aula con inicio, trabajo guiado y cierre.',
        category: 'classroom',
        createdAt: 0,
        updatedAt: 0,
        columns: [
            { id: 'welcome', title: 'Bienvenida', order: 0 },
            { id: 'work', title: 'Trabajo guiado', order: 1 },
            { id: 'close', title: 'Cierre', order: 2 },
        ],
        tasks: [
            { id: 'greet', columnId: 'welcome', title: 'Saludo y anticipación visual', description: 'Revisar con apoyo visual lo que ocurrirá en la sesión.', objective: 'Comprender el plan de trabajo de hoy.', supportText: 'Acompañar con agenda visual o pictogramas.', expectedEvidence: 'El alumno anticipa el orden de la sesión.', nextStep: 'Actividad principal', pedagogicalStatus: 'not_started', labels: ['inicio'], color: '#4ECDC4', createdAt: 0, durationSeconds: 300 },
            { id: 'objective', columnId: 'work', title: 'Actividad principal', description: 'Resolver la tarea prioritaria con apoyo graduado.', objective: 'Completar la actividad nuclear del aprendizaje.', supportText: 'Ofrecer ayuda graduada y modelado.', expectedEvidence: 'Producto, respuesta o desempeño observable.', nextStep: 'Generalización', pedagogicalStatus: 'not_started', labels: ['curricular'], color: '#FF6B6B', createdAt: 0, durationSeconds: 1200 },
            { id: 'generalize', columnId: 'work', title: 'Generalización', description: 'Practicar la habilidad en un formato diferente.', objective: 'Transferir la habilidad a otro contexto.', supportText: 'Reducir apoyos de forma progresiva.', expectedEvidence: 'Realiza la tarea en una situación nueva.', nextStep: 'Revisión y despedida', pedagogicalStatus: 'not_started', labels: ['generalización'], color: '#9B59B6', createdAt: 0, durationSeconds: 600 },
            { id: 'review', columnId: 'close', title: 'Revisión y despedida', description: 'Cerrar la sesión y preparar la transición.', objective: 'Consolidar lo aprendido y anticipar el siguiente momento.', supportText: 'Usar feedback visual o verbal positivo.', expectedEvidence: 'El alumno identifica qué ha logrado.', pedagogicalStatus: 'not_started', labels: ['cierre'], color: '#45B7D1', createdAt: 0, durationSeconds: 300 },
        ],
    },
    {
        id: 'builtin-lenguaje',
        title: 'Sesión de lenguaje y comunicación',
        description: 'Secuencia breve para trabajo de comprensión, producción y cierre.',
        category: 'therapy',
        createdAt: 0,
        updatedAt: 0,
        columns: [
            { id: 'prepare', title: 'Preparación', order: 0 },
            { id: 'practice', title: 'Práctica', order: 1 },
            { id: 'feedback', title: 'Terminado', order: 2 },
        ],
        tasks: [
            { id: 'warmup', columnId: 'prepare', title: 'Calentamiento oral', description: 'Respiración, praxias o activación inicial.', labels: ['oral'], color: '#D4A5A5', createdAt: 0, durationSeconds: 240 },
            { id: 'vocabulary', columnId: 'practice', title: 'Vocabulario visual', description: 'Trabajar palabras objetivo con apoyo visual.', labels: ['vocabulario'], color: '#FFEEAD', createdAt: 0, durationSeconds: 720 },
            { id: 'sentence', columnId: 'practice', title: 'Construcción de frase', description: 'Encadenar apoyos para producir estructura simple.', labels: ['expresión'], color: '#96CEB4', createdAt: 0, durationSeconds: 900 },
            { id: 'closure', columnId: 'feedback', title: 'Refuerzo y despedida', description: 'Cerrar con feedback positivo y anticipar siguiente sesión.', labels: ['refuerzo'], color: '#45B7D1', createdAt: 0, durationSeconds: 300 },
        ],
    },
];
