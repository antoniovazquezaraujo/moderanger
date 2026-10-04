# Mode Ranger — Documentación de desarrollo 🎼

Wiki interna para desarrollo: arquitectura, decisiones, análisis, auditorías y proceso de release. La documentación pública para usuarios vive en [`docs/user/`](../user/index.md) (se publica en GitHub Pages).

> 🌐 **Nota de idioma:** la documentación interna está en **español**, el idioma de trabajo del proyecto.

---

## Arquitectura de un vistazo

Mode Ranger es una app **Angular 13 + TypeScript** con un núcleo desacoplado:

```
                    ┌────────────────────────────────────────────┐
                    │              Modelo (TS puro)              │
                    │  Song · Part · Block · Command · Operation │
                    │           VariableContext · Scale          │
                    └────────────────┬───────────────────────────┘
                                     │
       ┌─────────────────────────────┼───────────────────────────────┐
       ▼                             ▼                               ▼
┌───────────────┐          ┌──────────────────┐            ┌─────────────────┐
│  Núcleo .mr   │          │   Generación     │            │       GUI       │
│ parser/ser.   │◄────────►│  de notas/audio  │◄──────────►│   (Angular)     │
│ round-trip    │          │  Tone.js         │            │   PrimeNG       │
└───────────────┘          └──────────────────┘            └─────────────────┘
```

### Principios
- **El texto `.mr` es canónico**: la canción vive en texto; el modelo en memoria y la GUI son vistas derivadas.
- **Pipeline de generación**: `PATTERN` (si existe) expande cada nota → `PLAYMODE` genera el sonido (nota/acorde/arpegio); los grupos heredan en `notes` y subdividen en `PATTERN`.
- **Testabilidad**: el núcleo `.mr`, el modelo y los servicios son TS puro y se prueban con Jest sin navegador.
- **Divulgación progresiva**: GUI de componentes como vista guiada; vista `.mr` avanzada.

## Navegación de la wiki

- ✔️ **[Índice principal](Index.md)**
- **Análisis y estado**: [`analysis/`](analysis/) — backlog, arquitectura, fases `.mr`, limpieza.
- **Decisiones**: [`adr/`](adr/) — ADR-001 (texto canónico y sintaxis `.mr`).
- **Diseño**: [`design/`](design/) — propuesta de sintaxis aprobada.
- **Auditorías**: [`audits/`](audits/) — `testing-things`, ramas pendientes.
- **Refactors históricos**: [`refactors/`](refactors/).
- **Testing**: [`testing/validacion-manual-v1.md`](testing/validacion-manual-v1.md).
- **Release**: [`release/Release_Process.md`](release/Release_Process.md).

## Comandos imprescindibles

```sh
export PATH="$HOME/.nvm/versions/node/v16.20.2/bin:$PATH"   # Node 16

npm ci && npm test && npm run build
```

Detalles de flujo y convenciones en [`CONTRIBUTING.md`](../../CONTRIBUTING.md) y [`instructions/`](../../instructions/).
