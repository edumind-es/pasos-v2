# Privacidad en Pasos

Documento honesto sobre qué datos guarda esta aplicación, dónde, y durante
cuánto tiempo. Escrito para que un centro educativo pueda decidir con
conocimiento de causa, no para cubrir el expediente.

Última revisión: 25 de agosto de 2026.

## Dónde viven los datos

Pasos tiene **dos modos** y la diferencia importa mucho:

| | Dónde vive | Quién puede leerlo |
|---|---|---|
| **Local** (sin cuenta) | Solo en el navegador, en `localStorage` | Solo quien use ese dispositivo |
| **Pro** (con cuenta) | PostgreSQL, en el servidor de EDUmind | El servidor, en claro |

En modo Pro **los datos no están cifrados en el servidor**. Esto es distinto
de EDUmind MiClase, donde lo que sube al servidor son sobres cifrados que el
servidor no puede abrir. Aquí no: si tienes acceso a la base de datos, ves el
contenido.

## Qué se guarda del profesorado

Quien inicia sesión lo hace por SSO contra `auth.edumind.es`. De cada docente
se guarda: identificador, correo, nombre visible, el `sub` de OIDC y la fecha
del último acceso.

Las contraseñas —cuando las hay, el camino normal es el SSO— se guardan con
*hash*, nunca en claro. Los tokens de refresco, también con *hash*.
**Las direcciones IP se guardan con *hash***, no en claro: sirven para detectar
un uso anómalo, no para saber desde dónde se conecta nadie.

## Qué se guarda del alumnado

El alumnado **no tiene cuenta**. Entra con un código compartido, de forma
anónima. Su identificador es un UUID aleatorio que genera su propio navegador
y que no sale de él salvo para acompañar a su progreso.

**A ningún alumno se le pide el nombre.** No hay ningún campo donde
escribirlo. Su apodo —«Lince 7», «Néboa 42»— se **calcula** a partir de su
propia clave aleatoria, tanto en su pantalla como en la del docente, sin que
nadie lo guarde en ningún sitio.

Junto a esa clave, el servidor guarda:

- qué tareas ha completado;
- en qué tareas ha pedido ayuda;
- qué le ha validado el docente;
- las evidencias que haya subido;
- el feedback del docente sobre su trabajo.

Sigue siendo seguimiento del trabajo de una persona, y por eso se borra sola
pasado el plazo (más abajo). Pero **sin nombre no hay forma de saber de quién
es**: la clave nace en el navegador del alumno, es un UUID al azar y no está
asociada a ninguna identidad en el servidor.

**Si el docente quiere ver nombres reales**, puede anotarlos en su propio
dispositivo: «Lince 7 es Marta». Esa libreta vive en `localStorage` del
navegador del docente, **no se envía a ninguna parte** y no la ve nadie más.
Si cambia de navegador, vuelve a ver los apodos: es el precio de que el
servidor no los tenga.

Las asignaciones de tareas a un alumno concreto se guardan también con el
apodo, elegido de una lista, no escrito a mano.

## Cuánto tiempo se conserva

| Dato | Se borra |
|---|---|
| Progreso del alumnado | **30 días después** de que caduque o se revoque el código |
| Eventos de actividad | a los **90 días** |
| Tableros, documentos, comentarios | mientras exista el tablero |
| Cuentas docentes | mientras la cuenta esté activa |

La purga se ejecuta **sola, todas las madrugadas** (`pasos-purga.timer`), no
depende de que nadie se acuerde. Se puede ver qué haría sin borrar nada:

```
python backend/purgar_datos.py --simular
```

(en una instalación desplegada, con el intérprete del entorno virtual y el
usuario del servicio)

## Códigos compartidos

Cada código tiene **fecha de caducidad obligatoria**, se puede **revocar** en
cualquier momento y admite un **límite de usos**. Los tableros de equipo o de
organización **no se pueden compartir de forma anónima**: ahí hace falta
cuenta.

## Lo que todavía no está resuelto

Se dice aquí porque callarlo sería peor:

1. **No hay borrado a petición del interesado desde la interfaz.** Hoy hay que
   revocar el código y esperar a la purga, o pedirlo al administrador.
2. **No hay registro de tratamiento ni contrato de encargado.** En un centro
   público el responsable del tratamiento es la Consellería o el centro, no la
   persona que desarrolla la herramienta; usar Pasos con alumnado real exige
   ese papeleo.
3. **Los informes que exporta el docente sí llevan los nombres** que él haya
   anotado en su libreta: se generan en su equipo y son su documento, pero
   viajan con él y hay que tratarlos como tales.
4. **El contenido de los tableros no está cifrado.** Si escribes el nombre de
   un alumno en el título de una tarea, ahí queda. La aplicación no puede
   impedirlo.

## Si eres un centro y te lo estás planteando

El modo **local** no envía nada a ningún servidor: es el más conservador y
para muchos usos basta. El modo **Pro** tiene sentido cuando hace falta que
varios docentes compartan tableros, y entonces conviene tener resuelto el
punto 3 de la lista anterior.
