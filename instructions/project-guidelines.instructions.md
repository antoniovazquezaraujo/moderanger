---
applyTo: "**/*"
description: "Directrices de código y flujo de trabajo para Mode Ranger."
---

# Mode Ranger - Project Guidelines

## Purpose

Este documento fija los estándares de código, comandos de build y flujo de trabajo del repositorio para que cualquier colaborador (humano o agente) trabaje de forma consistente.

## Coding Standards

### Principios generales
- Código limpio y legible, con nombres descriptivos.
- Responsabilidad única por clase/componente/servicio.
- La lógica de negocio no vive en componentes: componentes finos, servicios/modelo testeables.
- Evitar acoplamiento a Angular en el núcleo (`src/app/model/mr/` es TypeScript puro).
- El texto `.mr` es la representación canónica de la canción; la GUI es una vista derivada.

### Naming
- Clases: PascalCase (`MrTextEditorComponent`, `NoteGenerationService`).
- Métodos/variables: camelCase (`serializeSong`, `defaultDuration`).
- Constantes: UPPER_SNAKE_CASE (`DEFAULT_BPM`, `MR_FORMAT_VERSION`).
- Specs: `*.jest.spec.ts` junto al código (`__tests__/`).

### Tipos
- TypeScript estricto; evitar `any` (si es inevitable, justificarlo).
- Preferir uniones discriminadas e interfaces explícitas.
- Errores de dominio tipados con posición (`MrParseError`).

### Formato
- 2 espacios; comillas simples; punto y coma al final de sentencia (estilo del proyecto).
- Sin espacios colgantes; un import por línea.

### Errores y logging
- Errores accionables con contexto (`línea:columna`, fichero).
- Nada de `console.log` de depuración en rutas calientes; `console.error/warn` solo para casos reales.

### Testing
- Jest + ts-jest; patrón AAA.
- Tests deterministas y aislados; sin depender de red/audio real (mocks en `src/__mocks__`).
- No bajar la cobertura (`npm run test:cov`).

## Idioma

- Artefactos del repositorio en **inglés**: PRs, commits, issues, código y `docs/user/`.
- `docs/developer/` en **español**.

## Comandos de Build (⚠️ obligatorios)

- **Node 16** (nvm): `export PATH="$HOME/.nvm/versions/node/v16.20.2/bin:$PATH"`.
- **Instalar**: `npm ci` (no `npm install` salvo cambio de dependencias).
- **Tests**: `npm test` (antes de cada PR).
- **Cobertura**: `npm run test:cov`.
- **Build**: `npm run build`.
- **Dev**: `npm start`.

## Estructura del Proyecto

- `src/app/model/` — modelo de dominio y núcleo `.mr`.
- `src/app/services/` — generación de notas, motor de audio.
- `src/app/components/` — GUI.
- `src/app/features/` — código v2 sin cablear (no tocar sin decisión).
- `docs/user/` — documentación pública; `docs/developer/` — wiki interna.
- `src/app/model/mr/__tests__/corpus/` — corpus canónico `.mr`.

## Tareas comunes

### Añadir un comando al DSL
1. Parser: `COMMAND_TYPES` y validación en `mr.parser.ts`.
2. Modelo/ejecución: `CommandType` y `Command.execute` en `command.ts`.
3. Serializador: `formatCommand` en `mr.serializer.ts`.
4. UI: `block-commands.component`.
5. Tests: parser + serializador + ejecución; actualizar manual (`docs/user/manual.md`) y corpus si aplica.

### Añadir un test
1. Crea `*.jest.spec.ts` en `__tests__/` del módulo.
2. AAA + nombre descriptivo.
3. `npm test` en verde.

### Cambios visibles para el usuario
Actualiza `docs/user/` (manual/chuleta), `README.md` y `CHANGELOG.md`.

## QA
- Tests y build en verde antes de commit/PR.
- CI (`.github/workflows/ci.yml`) es obligatorio en cada PR a `develop`/`main`.
