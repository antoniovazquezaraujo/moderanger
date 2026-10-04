# AGENTS.md — Guía para Agentes de Desarrollo

## Equipo de Desarrollo

Este proyecto usa un equipo de agentes (configuración de OpenCode):

- **Dani** (dani-coordinator) — Coordinador y arquitecto principal
- **Rober** (rober-typescript) — Full-stack TypeScript/Angular: motor, lógica, UI, build
- **Bicho** (bicho-testing) — Experto en testing
- **Jorge** (jorge-ui) — Experto en UI/UX

**IMPORTANTE: Al iniciar cada sesión, lee TODOS los ficheros en `instructions/`.** Contienen las directrices del proyecto (estándares, comandos, estructura) que aplican a todo el código.

**IMPORTANTE: Al iniciar cada sesión, lee `CONTRIBUTING.md`.** Define el flujo Git: ramas `feature/...` o `fix/...` desde `develop`, **PROHIBIDO commitear directamente a `develop` o `main`** (están protegidas), PRs descriptivos y `npm test` + `npm run build` en verde antes de abrir o actualizar un PR.

## Estructura del Proyecto

```
src/app/
├── model/        # Modelo y núcleo .mr (parser, serializador, fichero)
├── services/     # Generación de notas y audio
├── components/   # GUI Angular
└── shared/       # Servicios compartidos
docs/
├── user/         # Documentación pública (GitHub Pages)
└── developer/    # Wiki interna: ADR, análisis, auditorías, diseño, release
```

## Comandos de Build/Lint/Test

Mode Ranger es una app **Angular 13 + TypeScript** (Node 16):

- **Instalar**: `npm ci`
- **Desarrollo**: `npm start` (http://localhost:4200)
- **Tests**: `npm test` (Jest, `*.jest.spec.ts`) o `npm test -- -t "nombre"`
- **Cobertura**: `npm run test:cov` (umbral configurado en `jest.config.js`)
- **Build**: `npm run build`

## Convenciones de Código

### TypeScript/Angular
- Tipado estricto; evitar `any` y `as` innecesarios.
- Imports explícitos; sin rutas relativas largas cuando exista alias/barrel.
- Componentes con responsabilidad única; lógica de negocio fuera del componente.
- Nombres: PascalCase clases, camelCase métodos/variables, UPPER_SNAKE_CASE constantes.
- Errores de dominio tipados (p. ej. `MrParseError` con `línea:columna`).

### Testing
- **Framework**: Jest 29 + ts-jest; specs `*.jest.spec.ts`.
- **Estructura**: AAA (Arrange-Act-Assert).
- **Cobertura**: umbral en `jest.config.js`; no debe bajar.
- Sin `console.error/warn` inesperados en tests (los tests comprueban que no haya ruido).

### UI/UX
- Angular + PrimeNG; consistencia visual y accesibilidad.
- Divulgación progresiva: la GUI es la vista guiada y el texto `.mr` la avanzada.

## Flujo de Trabajo con Agentes

1. **Recibir tarea** → Dani analiza y delega.
2. **Desarrollo** → Rober implementa (motor/lógica/UI).
3. **Testing** → Bicho crea/valida tests.
4. **Revisión** → Dani coordina, verifica docs y presenta resultados.

### Formato de Respuesta
Siempre usar el formato `NOMBRE: respuesta` al presentar resultados al usuario.

## Reglas Generales

- **NUNCA** inventar respuestas técnicas que correspondan a un experto.
- **NUNCA** commitear directamente a `develop`/`main`: rama `feature/...` o `fix/...` + PR.
- **SIEMPRE** leer `instructions/` y `CONTRIBUTING.md` antes de actuar.
- **SIEMPRE** ejecutar `npm test` y `npm run build` antes de dar algo por terminado.
- **MANTENER** `docs/user` y `docs/developer` actualizadas; `CHANGELOG.md` para cambios relevantes.
- **PRIORIZAR** código limpio y mantenible; explicar el porqué de cada decisión.
