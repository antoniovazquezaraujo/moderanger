# UI refresh · Warm Studio

- **Fecha:** 2026-10-30
- **Autor:** DANI (coordinación y arquitectura)
- **Estado:** implementado en la rama `feature/ui-refresh`
- **Alcance:** lavado de cara visual y primera capa de ayuda contextual, sin reestructurar el modelo ni el flujo de edición.

---

## 1. Objetivo

La app funcionaba, pero la GUI transmitía poca jerarquía: fondo blanco continuo, controles de 20 px, paneles sin diferenciación y un arranque vacío sin orientación. El objetivo es que la primera impresión sea la de una herramienta de estudio cuidada, clara y fácil de explorar.

La premisa de producto:

- profesional y atractiva;
- ordenada, clara y concisa;
- sencilla de usar sin esconder la potencia del editor;
- con una identidad propia, no una plantilla SaaS genérica;
- con ayuda visible para quien llega por primera vez.

## 2. Dirección visual

**Warm Studio**: papel cálido, tinta oscura y un acento verde azulado.

- **Fondo:** `#f4f1ea` con una retícula de puntos muy sutil.
- **Superficies:** `#fffdf8`, bordes `#e3dccf` y sombras suaves.
- **Acento:** `#0f766e` para acciones primarias, foco y estados activos.
- **Tipografía UI:** Manrope (400–700).
- **Tipografía editorial:** Fraunces para marca, títulos de canción y encabezados de ayuda.
- **Radios:** 8/12/18 px; controles principales de 32–36 px de alto.

Los tokens viven en `src/theme.css` y se cargan después de `styles.css`. La intención es no reescribir las reglas históricas del editor, sino construir una capa visual por encima y mantener los contratos de comportamiento.

## 3. Cambios principales

### Shell

- Barra superior con monograma, marca, tagline y enlace a la guía.
- Pantalla de carga con tarjeta y spinner, en lugar de texto plano.
- Selector claro/oscuro en la barra superior, persistido en `localStorage` y con arranque sin flash mediante un script inline en `index.html`.
- El editor ocupa el resto de la altura sin scroll global.
- El botón `.mr` abre un panel lateral fijo con el texto canónico en vivo; **Edit** abre el editor avanzado existente.

### Editor

- Cabecera de canción tipo tarjeta, con título editorial y controles agrupados: transporte, Repeat, BPM, duración, metrónomo y acciones.
- Botones de 32–36 px, foco visible y color primario reservado para Play.
- Paneles Variables, Blocks y Parts como tarjetas con cabecera, contador y contenido.
- Parts como tarjetas independientes, con nombre editorial y contenido separado.
- Bloques con hover suave, cuerpo separado y secciones Notes/Commands/Operations más legibles.
- Repeticiones (`×N`) inline en la misma fila que el nombre, antes de duplicar/eliminar; las definiciones reutilizables ya no muestran una segunda cabecera plegable.
- Estado vacío de Parts con explicación y dos acciones: **Add a part** y **Load example**.

### Ayuda

- Botón **Help** visible en la barra de acciones.
- Panel lateral con:
  - cuatro pasos para crear una canción;
  - botón **Load example**;
  - recordatorios sobre el texto canónico, bloques reutilizables y privacidad local;
  - enlace al manual completo.
- Canción de ejemplo `First Light` (dos parts, bloques y comandos) validada por test.

## 4. Fuera de alcance

- Reorganizar el workspace con sidebar/inspector.
- Rediseñar el editor de melodía nota a nota.
- Cambiar el modelo `.mr`, la reproducción o el compilador MIDI.
- Onboarding persistente con `localStorage` o tour guiado paso a paso.
- Publicación de la web.

## 5. Accesibilidad y responsive

- Etiquetas `aria-label` en el botón de ayuda, cierre del panel y nombre de canción.
- Foco visible con anillo de acento en controles.
- El toolbar envuelve controles y pasa a columna por debajo de 960 px.
- El estado vacío pasa a una columna en pantallas estrechas.
- Los botones principales mantienen una altura mínima de 32–36 px.

## 6. Validación

- `npm test` en verde.
- `npm run test:cov` por encima del umbral.
- `npm run build` en verde.
- Revisión visual con Firefox headless a 1440 px y 1024 px para editor, guía, estado vacío, pantalla de carga y temas claro/oscuro.
