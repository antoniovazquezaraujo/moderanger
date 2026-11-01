# Spike: gramática ANTLR para `.mr`

- **Fecha:** 2026-11-01
- **Autor:** DANI (coordinación y arquitectura)
- **Estado:** spike de viabilidad; **no integrado** en producción
- **Rama:** `feature/mr-antlr-spike`
- **Gramática:** [`spikes/antlr-mr/Mr.g4`](../../../spikes/antlr-mr/Mr.g4)
- **Runner:** [`spikes/antlr-mr/run.ts`](../../../spikes/antlr-mr/run.ts)

---

## 1. Veredicto

Sí es viable describir `.mr` con una gramática ANTLR separada. La indentación
no es el bloqueante: se resuelve con una capa léxica pequeña que emite
`INDENT`/`DEDENT`, como hace Python. El coste real está en la integración:

- conservar los errores accionables con `línea:columna`;
- conservar source maps y posiciones originales;
- mantener la validación semántica que el parser actual hace a mano;
- encajar `antlr4ng` con Angular 13, TypeScript 4.5 y Node 16.

El spike demuestra la gramática y la estrategia de indentación, pero **no
sustituye todavía** al parser de `packages/core/src/mr/`.

## 2. Toolchain evaluado

| Pieza | Versión | Nota |
|---|---|---|
| `antlr-ng` | `1.0.10` | Generador actual; port TypeScript de ANTLR 4.13.2 |
| `antlr4ng` | `3.0.16` | Runtime TypeScript de nueva generación |
| `antlr4ng-cli` | `2.0.0` | **Deprecado**; usar `antlr-ng` |
| TypeScript del spike | `4.5.5` | El mismo que usa la app |
| Node del spike | `16.20.2` | El baseline del repo |

## 3. Estrategia de gramática e indentación

`Mr.g4` es una gramática combinada (lexer + parser) que cubre:

- cabecera, `vars`, `blocks`, `part`, `block` y `use`;
- secciones `notes`, `commands` y `operations`;
- sublanguage de notas con duraciones, grupos, silencios y variables;
- comandos, escalas, playmodes, `PATTERN` y `DECORATION`;
- operaciones `VARY`/`ASSIGN` y azúcar de entrada;
- nombres sin comillas, strings escapados, comentarios y líneas en blanco.

La indentación se resuelve fuera de las reglas de estructura:

1. El token source recorre las líneas y valida 2 espacios por nivel, tabs
   prohibidos, saltos de indentación y dedents válidos.
2. Emite `INDENT`/`DEDENT` antes del contenido de cada línea.
3. El lexer ignora comentarios y líneas en blanco; la gramática solo consume
   tokens de estructura.

Esto mantiene la gramática legible y deja la política de indentación en una
pieza pequeña y testeable. En producción esa pieza debe ser un `TokenSource`
real, no un preprocesador de texto: así se conservan las posiciones originales
para errores y source maps.

El preprocesador del spike conserva los números de línea (las líneas en blanco
se convierten en comentarios), pero **no conserva las columnas originales**:
al sustituir la indentación por sentinelas, las columnas que reporta ANTLR no
son las del fichero. Es una limitación aceptada del spike; la fase 1 debe
resolverla con un token source que mantenga el flujo original o que traduzca
posiciones.

## 4. Validación del spike

El runner parsea el corpus canónico y los ejemplos de la app.

| Caso | Resultado |
|---|---|
| Corpus canónico (11 ficheros) | **11/11 PASS** |
| Ejemplos de la galería (11 canciones) | **11/11 PASS** |
| Indentación con tab | Rechazado; línea correcta, columna pendiente |
| Tab como separador | Rechazado; línea correcta, columna pendiente |
| Indentación impar | Rechazado con línea/columna del preprocesador |
| Grupo sin cerrar | Rechazado; línea correcta, columna pendiente |
| Comando en minúsculas | Rechazado; línea correcta, columna pendiente |
| `notes $var` con líneas hijas | Rechazado; línea correcta, columna pendiente |
| `notes` dentro de un `use` | Rechazado; línea correcta, columna pendiente |
| Escala desconocida | Rechazado; línea correcta, columna pendiente |

Casos que la gramática acepta y que deben seguir validándose en una fase
semántica:

- BPM fuera de rango;
- versión no soportada;
- `repeats` de canción negativo;
- secciones duplicadas;
- variables duplicadas;
- rangos de `repeats` por bloque y referencias;
- resolución de `use` contra `blocks`;
- reglas de duración de grupos en `PATTERN`.

Tiempo medido en el runner: **por debajo de 1 ms/documento** sobre el corpus,
en Node 16 (0,3–0,5 ms en ejecuciones aisladas). No es un benchmark de
producción; sirve para descartar que el parser sea el cuello de botella.

## 5. Compatibilidad

### Node 16

`antlr4ng` funciona en Node 16. `antlr-ng` instala y genera, pero su dependencia
`commander@13` declara **Node >= 18** y `npm install` avisa con `EBADENGINE`.
Si el parser generado se commitea, CI solo compila y no necesita ejecutar el
generador. Si se regenera en CI, hay que subir Node o usar un job aparte.

### TypeScript 4.5

El parser generado compila con TypeScript 4.5.5 si se activa `skipLibCheck`.
Sin `skipLibCheck`, TS 4.5 falla en `antlr4ng/dist/CommonToken.d.ts` con
`TS2380` (getter/setter con tipos incompatibles). El proyecto hoy no tiene
`skipLibCheck`, así que hay que decidir:

- activarlo globalmente;
- subir TypeScript/Angular (cambio mayor);
- o aislar el runtime con una configuración propia.

### Angular 13 / navegador

`antlr4ng` declara ES2022; la app compila a ES2017. El runtime precompilado
debería funcionar en navegadores modernos, pero falta medir el bundle real y
confirmar que Angular 13 lo integra sin problemas. No se ha tocado el build de
la app en este spike.

## 6. Riesgos y costes

1. **Errores.** Los mensajes de ANTLR son genéricos; hay que implementar un
   `ErrorListener`/`ErrorStrategy` que produzca los mensajes actuales en
   español, con contexto y `línea:columna`.
2. **Source maps.** El preprocesador del spike conserva líneas, pero no es un
   token source de producción. Hay que garantizar posiciones originales para
   el panel de texto y el resaltado.
3. **Semántica.** La gramática valida sintaxis; no valida rangos, duplicados,
   nombres reservados, referencias ni duración de grupos. Esa capa sigue siendo
   necesaria.
4. **Doble parser.** Durante la migración conviven el parser manual y el
   generado; hay que evitar que las dos gramáticas deriven. El `.g4` debe ser
   la fuente de verdad en cuanto se adopte.
5. **Toolchain.** Node 18 para regenerar, `skipLibCheck` o actualización de
   TypeScript, y una política para el código generado.

## 7. Plan de migración propuesto

### Fase 0 — spike (esta rama)

- Gramática separada y runner de validación.
- Resultados de compatibilidad y riesgos.
- Sin cambios en producción.

### Fase 1 — parser generado en paralelo

- Token source de producción con posiciones originales.
- Visitante que construye `SongDocument`/`Song`.
- Adaptador detrás de `parseSong`, con el parser manual como fallback.
- Tests diferenciales contra corpus, ejemplos y casos inválidos.

### Fase 2 — paridad funcional

- Error listener con los mensajes actuales.
- Validación semántica y source map.
- Round-trip y serializador sin cambios.
- Cobertura y build en verde.

### Fase 3 — retirada del parser manual

- El `.g4` pasa a ser la fuente de verdad.
- Se elimina el parser duplicado y se actualizan los documentos de gramática.
- Se decide la política de generación: código generado en repo o job Node 18.

## 8. Recomendación

Adoptar ANTLR, pero **por fases y como feature separada**. La gramática ya
demuestra que el lenguaje se puede describir sin perder el corpus ni los
ejemplos; el trabajo pendiente es de integración, no de sintaxis.

Antes de la fase 1 hay que resolver dos decisiones:

1. **Toolchain:** `skipLibCheck` global o actualización de TypeScript/Angular.
2. **Generación:** commitear el parser generado (CI solo compila) o ejecutar
   `antlr-ng` en un job con Node 18+.

No mezclaría esta migración con la PR de UI ni con cambios de comportamiento
del editor.
