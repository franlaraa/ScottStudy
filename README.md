# StudyDeck

StudyDeck es una Single-Page Application (SPA) para escritorio para la creación, gestión, estudio activo e impresión física de fichas de memorización (flashcards), con un panel de inicio tipo dashboard y un calendario para organizar exámenes y deberes.

**Objetivo principal:** centralizar el repaso de conceptos mediante una interfaz estilo software de productividad desktop, con carpetas de color/icono propios para diferenciar temarios de un vistazo.

## Presentación y cuentas

Antes de entrar a la app hay una página de presentación (landing) con una explicación breve del producto y un botón para ir a inicio de sesión / registro. Las cuentas son reales: el correo y la contraseña se validan contra un usuario guardado en Netlify Blobs (contraseña con hash, nunca en texto plano), y cada cuenta tiene sus propias tarjetas, carpetas y eventos, completamente independientes de las demás. La sesión se recuerda en el navegador (localStorage) para no tener que iniciar sesión cada vez, y caduca a los 30 días.

No hay recuperación de contraseña por email por ahora (requeriría un proveedor de correo tipo Resend, con dominio propio verificado para poder enviar a cualquier destinatario) — si se pierde una contraseña, toca registrar una cuenta nueva.

## Arquitectura de vistas (navegación lateral)

- **Inicio**: dashboard con estadísticas rápidas, accesos directos, la cuadrícula de carpetas y un panel de próximos eventos.
- **Mis Tarjetas**: catálogo en cuadrícula responsive para administrar el mazo (CRUD en memoria, persistido vía Netlify Blobs). Cada ficha pertenece a una carpeta (o a ninguna) y puede marcarse para aplicar acciones en bloque.
- **Calendario**: vista mensual para crear y editar eventos (exámenes, deberes u otros), con un panel de próximos eventos.
- **Modo Repaso (`Empezar a Estudiar`)**: interfaz de enfoque individual tipo carrusel con barra de progreso reactiva (X/Y), controles de navegación anterior/siguiente y efecto de volteo de tarjeta con perspectiva 3D (`rotateY(180deg)` y `backface-visibility: hidden`).

## Carpetas: color, icono y estilo

Cada carpeta (temario) se crea y edita desde un modal dedicado, donde se elige:

- **Color**: se usa como acento (borde/badge) en las tarjetas de esa carpeta.
- **Icono**: uno de un set de iconos de Font Awesome, para reconocer la carpeta de un vistazo.
- **Estilo**: "solo contorno" (tarjeta blanca con borde de color) o "fondo de color" (tarjeta con un tinte de fondo del color de la carpeta).

Las tarjetas sin carpeta asignada usan un estilo neutro. Al eliminar una carpeta, sus tarjetas pasan a "Sin carpeta" (no se eliminan).

## Importar en bloque

Desde "Mis Tarjetas" → Importar, se puede pegar una lista de texto y convertirla en carpetas y tarjetas de golpe:

```
### Nombre de la carpeta
* Pregunta - Respuesta
* Otra pregunta - Otra respuesta

### Otra carpeta
* ...
```

Cada `### Encabezado` (de `#` a `######`) abre una carpeta — si ya existe una con ese nombre (sin distinguir mayúsculas), reutiliza esa en vez de duplicarla, asignando color/icono automáticamente solo a las nuevas. Cada línea con `*`, `-` o `•` crea una tarjeta dentro de la carpeta activa, partiendo por el primer `" - "` en pregunta/respuesta; las líneas sin ese separador se omiten. Hay una vista previa en vivo con el recuento antes de confirmar.

## Selección y acciones en bloque

Marcar una o varias tarjetas hace aparecer una barra de acciones: **eliminar**, **mover** (reasignar carpeta), **compartir** (usa la Web Share API si el navegador la soporta, o copia el texto al portapapeles) e **imprimir**. "Marcar todas" y el checkbox de cabecera solo afectan a las tarjetas visibles según los filtros/búsqueda activos, nunca a toda la cuenta.

## Deshacer

Eliminar una tarjeta, una carpeta (junto con la reasignación de sus tarjetas a "Sin carpeta") o un evento no pide confirmación: se elimina al momento y aparece un aviso con un botón "Deshacer" durante unos segundos, que restaura exactamente lo eliminado.

## Impresión física

Integra reglas `@media print` que ocultan toda la UI de la aplicación y generan una plantilla de fichas enfrentadas en horizontal (pregunta a la izquierda y respuesta a la derecha) separadas por una línea de puntos (`dashed`), diseñadas para recortar y doblar por la mitad como flashcard física a doble cara.

## Persistencia y autenticación con Netlify Blobs

Dos funciones serverless respaldan la app:

- `netlify/functions/auth.mjs` (`/api/auth`): registro e inicio de sesión. Guarda cada usuario (correo + hash de contraseña con `scrypt`) en un store de Blobs y devuelve un token de sesión (también en Blobs) que el cliente reenvía en la cabecera `Authorization`.
- `netlify/functions/state.mjs` (`/api/state`): lee y guarda las tarjetas/carpetas/eventos del usuario autenticado por ese token, en un documento propio por cada correo — nunca comparte datos entre cuentas.

Si estas funciones no están disponibles (por ejemplo, al abrir `index.html` directamente como archivo local, sin desplegar en Netlify), el inicio de sesión y el registro no funcionarán — la app muestra un aviso claro en vez de fallar en silencio.

Para activar la persistencia:

```bash
npm install
netlify login
netlify init      # crea o vincula el sitio de Netlify
netlify dev        # entorno local con Blobs emulados
```

o, para producción:

```bash
netlify deploy --prod
```

`@netlify/blobs` toma automáticamente las credenciales del sitio cuando la función corre dentro de Netlify (local con `netlify dev`, o ya desplegada) — no hace falta configurar nada más.

## Uso

Sin Netlify desplegado, la landing y el volteo de tarjetas se pueden ver, pero el registro/login no funcionará (necesitan `/api/auth`).

Con persistencia (recomendado): `npm install` y `netlify dev`, luego abrir la URL local que indique la CLI. Para producción, `netlify deploy --prod`.
