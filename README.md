# StudyDeck

StudyDeck es una Single-Page Application (SPA) para escritorio desarrollada en HTML, CSS nativo y JavaScript (sin dependencias externas), diseñada para la creación, gestión, estudio activo e impresión física de fichas de memorización (flashcards).

**Objetivo principal:** centralizar el repaso de conceptos mediante una interfaz estilo software de productividad desktop con paleta azul claro/cielo, transiciones 3D y maquetación de corte para impresión.

## Arquitectura de vistas (navegación lateral)

- **Banco de Tarjetas (`Mis Tarjetas`)**: vista de catálogo en cuadrícula responsive para administrar el mazo (CRUD básico en memoria). Permite categorizar cada ficha mediante `folder` (temario/carpeta) y `tag` (etiqueta), además de filtrarlas dinámicamente mediante desplegables.
- **Modo Repaso (`Empezar a Estudiar`)**: interfaz de enfoque individual tipo carrusel con barra de progreso reactiva (X/Y), controles de navegación anterior/siguiente y efecto de volteo de tarjeta con perspectiva 3D (`rotateY(180deg)` y `backface-visibility: hidden`).

## Sistema de selección e impresión física

- Cada ficha cuenta con un estado booleano de selección (`selectedForPrint`), controlable individualmente o en bloque mediante una casilla "Marcar todas".
- Integra reglas de impresión `@media print` que ocultan toda la UI de la aplicación (sidebar, barras, modales) y generan una plantilla de fichas enfrentadas en horizontal (pregunta a la izquierda y respuesta a la derecha) separadas por una línea de puntos (`dashed`), diseñadas para recortar y doblar por la mitad como flashcard física a doble cara.

## Uso

Al no depender de librerías externas ni de un backend, basta con abrir [`index.html`](index.html) en un navegador para ejecutar la aplicación.
