# StudyDeck

StudyDeck es una Single-Page Application (SPA) para escritorio para la creación, gestión, estudio activo e impresión física de fichas de memorización (flashcards), con un panel de inicio tipo dashboard y un calendario para organizar exámenes y deberes.

**Objetivo principal:** centralizar el repaso de conceptos mediante una interfaz estilo software de productividad desktop, con carpetas de color/icono propios para diferenciar temarios de un vistazo.

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

## Selección y acciones en bloque

Marcar una o varias tarjetas hace aparecer una barra de acciones con tres opciones: **eliminar**, **compartir** (usa la Web Share API si el navegador la soporta, o copia el texto al portapapeles) e **imprimir**.

## Impresión física

Integra reglas `@media print` que ocultan toda la UI de la aplicación y generan una plantilla de fichas enfrentadas en horizontal (pregunta a la izquierda y respuesta a la derecha) separadas por una línea de puntos (`dashed`), diseñadas para recortar y doblar por la mitad como flashcard física a doble cara.

## Persistencia con Netlify Blobs

Las tarjetas, carpetas y eventos se guardan en un Netlify Blob a través de una función serverless (`netlify/functions/state.mjs`, expuesta en `/api/state`). Si la función no está disponible (por ejemplo, al abrir `index.html` directamente como archivo local, sin desplegar en Netlify), la aplicación sigue funcionando con normalidad usando solo el estado en memoria de esa sesión.

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

No hace falta configurar nada más: `@netlify/blobs` toma automáticamente las credenciales del sitio cuando la función corre dentro de Netlify (local con `netlify dev`, o ya desplegada).

## Aviso sobre el login

La pantalla de inicio de sesión es solo una puerta de entrada de interfaz: acepta cualquier correo y contraseña y no implementa autenticación real. Sirve para el flujo de usuario (mostrar el perfil, poder cerrar sesión), no como control de acceso.

## Uso

Sin Netlify (solo lectura/prueba en memoria): basta con abrir [`index.html`](index.html) en un navegador.

Con persistencia (recomendado): `npm install` y `netlify dev`, luego abrir la URL local que indique la CLI.
