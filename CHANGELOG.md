# Changelog

Todos los cambios relevantes de **Mode Ranger**. Formato basado en
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado
[SemVer](https://semver.org/lang/es/).

## [No publicado]

### Añadido

- Lenguaje `.mr` v1 completo: parser, serializador, round-trip estable, errores `línea:columna` y fichero `.mr` (Fase 1).
- Vista de texto `.mr` en la app (Fase 2): validación en vivo, aplicar/revertir y source map por parte/bloque.
- Guardar/cargar `.mr` desde la interfaz (Fase 3).
- `PATTERN` admite variables string; el patrón se aplica **antes** del playmode (nuevo `PLAYMODE SINGLE`).
- Grupos dentro de `PATTERN` con subdivisión y validación estricta de medida.
- El sidebar lista y edita variables string (melodías).
- Duración heredada de nota visible/editable con la rueda (hover); ciclo con vuelta al estado “vacío”.
- Infraestructura de proyecto: CI (tests + cobertura + build), flujo `develop`/`main` con PRs, release con artefacto web y publicación automática de la documentación de usuario.

### Cambiado

- `Repeat` y `BPM` viven en `Song` (canónicos) y se aplican al player; live-tempo al editar BPM sonando.
- Los silencios del editor se muestran como `s` (antes `x`).
- Documentación reorganizada en `docs/user/` (pública) y `docs/developer/` (interna).

### Corregido

- Herencia de duración de grupos (`4n:( 0 2 )` → hijos con la duración del grupo).
- El editor recargaba el texto `.mr` con el modelo viejo tras Aplicar.
- El combo de variables de una operación perdía la selección al reproducir (VARY).
- Las variables string no aparecían en el sidebar.
- El editor de melodía no resolvía tokens `$var` string (rompía el render).

### Interno

- Retirados el parser antiguo (ohm-js/tspeg), mocks huérfanos y ~34 logs de depuración.
- Reparada la build de producción que estaba rota en `main`.
- Corpus canónico `.mr` y 393 tests Jest con umbral de cobertura.
