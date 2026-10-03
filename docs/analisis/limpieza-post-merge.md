# Limpieza post-merge de `testing-things`

- **Fecha:** 2026-10-03
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `integration/testing-things-cleanup` (base `main` @ `f93eda5`, que ya contiene el merge `73bc235` de `testing-things`)
- **Worktree:** `/tmp/opencode/moderanger-cleanup`
- **Entorno:** Node v16.20.2 / npm 8.19.4 (portable, `/tmp/opencode/node/node16`)
- **Alcance:** limpieza técnica, sin features nuevas. `main` no se ha tocado.

## 1. Re-codificación de `error-handler.service.ts`

- **Antes:** UTF-16 LE con BOM y finales CRLF → git lo trataba como binario.
- **Después:** UTF-8 sin BOM y finales LF (ASCII puro); 52 líneas.
- **Verificación de contenido:** decodificación del original y comparación normalizada (ignorando CRLF) → contenido idéntico. No se modificó ni una línea de código.
- **Decisión:** el fichero **no se elimina** aunque no tenga importadores (instrucción explícita). Si finalmente no se va a usar, es candidato a eliminación junto con `config.service.ts`, `keyboard.service.ts` y `unsaved-changes.guard.ts` (ver inventario v2).
- **Estado en git:** tras el commit, `git ls-files --eol` lo reporta como `i/lf w/lf` (texto), y diffs/editores funcionan con normalidad.

## 2. `uuid` declarado en `dependencies`

- `src/app/shared/services/note-generation-unified.service.ts` importa `uuid`, que no estaba declarado. El árbol lo resolvía solo por hoisting transitivo de Angular CLI (`@angular/cli@13.1.4`, `webpack-dev-server@sockjs`).
- **Versión elegida:** `^8.3.2`, que es la resuelta en el árbol actual (`npm ls uuid` → `uuid@8.3.2 deduped`).
- **Cambios:** `package.json` (+1 línea) y `package-lock.json` (mínimo: entrada raíz + `uuid` deja de ser dependencia de desarrollo, se elimina su `"dev": true`). `npm install` añadió además el campo `"deprecated"` del registro: uuid ≤ 10 ya no tiene soporte; para CommonJS recomiendan uuid@11.
- **Decisión pendiente:** valorar actualización a `uuid@11` (CommonJS) o sustituirlo por generación local de ids. No se hace en esta limpieza para no introducir cambios funcionales ni tocar más el lockfile.

## 3. Documentación movida de la raíz a `docs/`

12 ficheros `.md` que estaban en la raíz, movidos con `git mv` (nombres conservados):

- `docs/analisis/`: `COMPREHENSIVE-PROJECT-ANALYSIS-2025.md`, `MODERANGER-ARCHITECTURE-GUIDE.md`, `IMPROVEMENTS.md`, `NEXT-PRIORITIES.md`.
- `docs/refactors/`: `COMPONENT-REFACTORING-SUMMARY.md`, `CRUD-OPERATIONS-CONSOLIDATION.md`, `CSS-OPTIMIZATION-SUMMARY.md`, `MELODY-REFACTORING-COMPARISON.md`, `NOTE-GENERATION-UNIFICATION.md`, `NOTE-GENERATION-UNIFICATION-PHASE2.md`, `REFACTORING-COMPARISON.md`, `REFACTORING-SUMMARY.md`.

No había enlaces relativos entre ellos (solo code-spans con rutas desde la raíz del repo, que siguen siendo válidas como texto). `README.md`, `LICENSE` y `docs/audits/` no se han tocado. Criterio: `analisis/` = visión de proyecto/arquitectura/prioridades; `refactors/` = informes de refactorización y consolidación.

## 4. Eliminación de `console.log` de depuración

- **Eliminados 206 `console.log`** introducidos por `testing-things`, en 26 ficheros (el informe de auditoría cifraba +206 / −45). Método: AST de TypeScript limitado a sentencias `console.log` que arrancan en líneas añadidas por la rama (para no tocar logs preexistentes de `main`), verificación de que cada sentencia ocupa líneas completas y borrado de líneas; sin tocar nada más.
- **`environment.debug` no existe.** `environment.ts` define `production`, `enableLogging`, `apiUrl` y `audioSettings`; ninguno tiene consumidores. Según la instrucción (condicionar a `environment.debug` solo si existiera), se eliminaron todos los logs de depuración añadidos.
- **No se han tocado** las llamadas `console.error` / `console.warn` / `console.debug` / `console.info` añadidas por la rama (valor diagnóstico).
- **Fuera de alcance:** quedan `console.log` heredados de `main` en `song.player.ts` (~33) y `operation.ts` (1). Una segunda pasada de limpieza sobre ellos sería un cambio separado.

## 5. Código v2 sin cablear

No se ha borrado nada. Inventario completo (fichero, LOC, importadores reales y recomendación) en `docs/analisis/codigo-v2-sin-cablear.md`. Resumen: ~5.538 LOC sin cablear; `global-state.service.ts` y `note-generation-unified.service.ts` sí están en uso real y no deben tocarse.

## 6. Budgets de `angular.json` (documentado, NO revertido)

`testing-things` cambió el budget `anyComponentStyle` de `2kb/4kb` (warning/error) a **`8kb/10kb`**:

```diff
- "maximumWarning": "2kb",
- "maximumError": "4kb"
+ "maximumWarning": "8kb",
+ "maximumError": "10kb"
```

- El budget `initial` (`10mb/10mb`) ya estaba así en `main` y no se ha tocado.
- **No se revierte sin aprobación** (instrucción explícita).
- Contexto para la decisión: `styles.css` creció +282 líneas en la rama y el bundle de estilos pesa ~599,59 KB raw (~36 KB transferidos). El budget `anyComponentStyle` aplica a los estilos *por componente*; subirlo 4× enmascara crecimiento de CSS. Recomendación: tras revisar/optimizar los SCSS de componentes, restaurarlo a valores razonables (p. ej. volver a `2/4` o fijar un intermedio justificado).

## 7. Validación

| Comprobación | Resultado |
|---|---|
| `npm ci` en el worktree | exit 0 |
| `npm run build` (Node 16.20.2, sin `--prod`) | **exit 0**, 20,2 s, Initial Total 1,53 MB |
| Bundle | main 931,65 KB / styles 599,59 KB / polyfills 33,02 KB / runtime 1,22 KB |
| `npm ls uuid` | `uuid@8.3.2` como dependencia directa + dedupe transitivo |
| `console.log` añadidos por la rama restantes | 0 |

Warnings de build (no bloqueantes, preexistentes): `Unable to locate stylesheet: dist/moderanger/styles.css` y 2 reglas CSS de PrimeNG omitidas por selector no soportado. Ninguno lo introduce esta limpieza.

## 8. Decisiones pendientes del usuario

1. **Código v2:** cablear o eliminar (~5.500 LOC; inventario en `docs/analisis/codigo-v2-sin-cablear.md`).
2. **Budgets CSS:** mantener `8/10 KB` o volver a `2/4 KB` tras optimizar estilos.
3. **`uuid`:** aceptar `^8.3.2` (deprecado por el registro) o migrar a `uuid@11` / generación local.
4. **Servicios sin importadores no v2:** `config.service.ts`, `keyboard.service.ts`, `unsaved-changes.guard.ts` (y `error-handler.service.ts`, conservado de momento).
5. **Logs heredados de `main`:** segunda pasada opcional sobre `song.player.ts` / `operation.ts`.
6. **Infraestructura de tests:** no hay specs ni script/target de test; hay restos de Jest en `main` (`babel.config.cjs`, `src/tsconfig.jest.json`, mocks). Decidir entre montar Jest o limpiar los restos (ya venía del informe de auditoría; no se ha tocado).
