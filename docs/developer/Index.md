# 🎼 Wiki de Mode Ranger — Índice principal

Bienvenido a la documentación técnica de **Mode Ranger**. Está pensada para navegarse como wiki (Obsidian, VS Code, GitHub).

## 🏗️ Arquitectura y diseño
- [[analysis/MODERANGER-ARCHITECTURE-GUIDE|Guía de arquitectura del proyecto]]
- [[design/propuesta-sintaxis-mr|Propuesta de sintaxis `.mr` (aprobada)]]
- [[analysis/sintaxis-mr-implementada|Sintaxis `.mr` implementada y contrato de round-trip]]
- [[design/propuesta-bloques-reutilizables|Propuesta: bloques reutilizables (`blocks` + `use`)]]
- [[design/compilador-mr-a-midi|Propuesta: compilador `.mr` → MIDI (CLI)]]
- [[analysis/codigo-v2-sin-cablear|Inventario del código v2 sin cablear]]

## 🎯 Decisiones
- [[adr/ADR-001-texto-canonico-y-sintaxis-mr|ADR-001: Texto canónico y sintaxis `.mr`]]
- [[adr/ADR-002-bloques-reutilizables|ADR-002: Bloques reutilizables (`blocks` + `use`)]]
- [[adr/ADR-003-compilador-midi|ADR-003: Compilador `.mr` → MIDI (MVP)]]

## ✨ Fases y estado
- [[analysis/mr-fase2-vista-texto|Fase 2: vista de texto en la app]]
- [[analysis/mr-fase3-guardar-cargar|Fase 3: guardar/cargar `.mr`]]
- [[analysis/bloques-reutilizables-implementados|Bloques reutilizables: núcleo implementado (fase 1)]]
- [[analysis/bloques-reutilizables-gui|Bloques reutilizables: GUI (fase 2)]]
- [[analysis/compilador-midi-mvp|Compilador `.mr` → MIDI: MVP implementado]]
- [[analysis/scheduler-rejilla-96n|Scheduler: rejilla 96n para tresillos exactos]]
- [[analysis/duracion-de-grupos|Duración de grupos y `useDefaultDuration`]]
- [[analysis/pulido-bpm-variables|BPM canónico, `$var` y repeticiones]]
- [[analysis/BACKLOG|Backlog del proyecto]]

## 🧪 Calidad
- [[testing/validacion-manual-v1|Checklist de validación manual v1]]
- [[audits/testing-things-vs-main|Auditoría: testing-things vs main]]
- [[audits/ramas-pendientes-vs-main|Auditoría: ramas pendientes vs main]]

## 📦 Release
- [[release/Release_Process|Proceso de release y despliegue]]

## 📚 Histórico
- [[analysis/limpieza-post-merge|Limpieza post-merge]]
- [[analysis/saneo-bloque-b|Saneo Bloque B]]
- [[refactors/REFACTORING-SUMMARY|Resúmenes de refactor (histórico)]]
