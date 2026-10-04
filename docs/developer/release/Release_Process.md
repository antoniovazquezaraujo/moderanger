# 🚀 Proceso de release y despliegue (Mode Ranger)

Este documento describe los procesos automatizados del repositorio para publicar la **documentación de usuario** y las **versiones** de la aplicación.

---

## 0. Modelo de ramas

- **`develop`** — rama de integración (por defecto y protegida). Todo entra por PR (`feature/...`, `fix/...`); nunca se commitea directamente.
- **`main`** — rama estable; refleja lo publicado. También protegida.
- **`gh-pages`** — rama generada automáticamente con la documentación de usuario publicada. No se toca a mano.

El CI (`.github/workflows/ci.yml`) corre en pushes y PRs a `develop`/`main`:
tests → cobertura (con umbral) → build.

---

## 1. Publicación de la documentación de usuario

La documentación pública (`docs/user/`) se publica sola con `.github/workflows/deploy-pages.yml`.

**¿Qué tienes que hacer?** Nada. Cada push a `develop` que toque `docs/user/**` copia esa carpeta a la rama `gh-pages`, y GitHub Pages sirve:

👉 <https://antoniovazquezaraujo.github.io/moderanger/>

(La fuente de Pages está configurada a la rama `gh-pages`, raíz `/`.)

---

## 2. Publicación de una versión de la aplicación

El workflow `.github/workflows/release.yml` se dispara al empujar un tag que empiece por `v` (o manualmente con `workflow_dispatch`).

### Pasos para sacar una versión

**Paso 1: Asegura que `develop` está estable y verde**
```bash
npm test && npm run build
```

**Paso 2: Integra `develop` en `main` con un PR**
```bash
# desde GitHub: PR develop -> main, CI en verde, merge
git checkout main && git pull origin main
```

**Paso 3: Actualiza `CHANGELOG.md`** (mueve `[No publicado]` a la nueva versión con fecha) y súbelo con un PR a `develop` y luego a `main`.

**Paso 4: Crea y sube el tag** (¡obligatorio que empiece por `v` minúscula!)
```bash
git tag v0.1.0
git push origin v0.1.0
```

### ¿Qué ocurre entonces?
1. GitHub crea una **Release** oficial con el **changelog automático** (notas generadas desde los commits/PRs).
2. Compila la app (`npm ci` → tests → `ng build --base-href ./`).
3. Empaqueta `dist/moderanger` en `moderanger-web.zip` y lo adjunta a la Release.

---

## 3. Versionado

- [SemVer](https://semver.org/lang/es/): `vMAJOR.MINOR.PATCH` y pre-releases (`v0.2.0-beta.1`).
- El `CHANGELOG.md` sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
- Todo cambio visible para el usuario debe quedar anotado en el changelog antes del release.
