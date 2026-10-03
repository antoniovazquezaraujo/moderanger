/**
 * Estado de sesión del editor para `.mr` (Fase 3 del ADR-001): meta
 * (`repeats`, `bpm`) y nombres de fichero. Angular-free para poder probarlo
 * con Jest.
 *
 * Decisión de dónde vive el bpm: `Song` no guarda bpm (el modelo no lo
 * necesita para tocar; `SongPlayer` fija 120). El bpm es *meta de sesión* y
 * vive en `SongEditorComponent` junto a `repeats`; la vista de texto lo recibe
 * por `@Input()` y lo devuelve dentro de `applied`. Guardar/cargar traducen
 * entre esa meta de sesión y `MrMeta` con las funciones de este módulo.
 */
import { MR_FILE_EXTENSION } from './mr.file';
import { MR_FORMAT_VERSION, MrMeta } from './mr.types';

/** Nombre base por defecto cuando la canción no tiene nombre utilizable. */
export const DEFAULT_MR_BASE_NAME = 'cancion';

/** Longitud máxima del nombre base (sin extensión). */
export const MAX_MR_BASE_NAME_LENGTH = 80;

/**
 * Meta de sesión del editor: lo que no vive en `Song` pero viaja en el `.mr`.
 * `repeats` normalizado a 1 cuando no hay repetición extra.
 */
export interface MrSessionMeta {
  repeats: number;
  bpm?: number;
}

/** Meta de sesión → `MrMeta` lista para `serializeSong`/`createDocumentFromContext`. */
export function sessionMetaToMrMeta(session: MrSessionMeta): MrMeta {
  return {
    version: MR_FORMAT_VERSION,
    repeats: session.repeats > 1 ? session.repeats : undefined,
    bpm: session.bpm
  };
}

/** `MrMeta` de un documento → meta de sesión del editor (por defecto, una repetición). */
export function mrMetaToSessionMeta(meta: MrMeta): MrSessionMeta {
  return {
    repeats: meta.repeats ?? 1,
    bpm: meta.bpm
  };
}

/** Caracteres prohibidos en ficheros (Windows/Unix) más BOM, con espacios colindantes. */
const INVALID_FILE_CHARS = /\s*[<>:"/\\|?*\u0000-\u001f\u007f\uFEFF]+\s*/g;

/** Puntos, espacios y guiones sobrantes en los extremos. */
const EDGE_SEPARATORS = /^[\s.\-]+|[\s.\-]+$/g;

/** Nombres de dispositivo reservados en Windows (no se pueden usar como base). */
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Saneado de un nombre de canción para usarlo como nombre de fichero `.mr`
 * (sin extensión): normaliza a NFC, sustituye los caracteres prohibidos (y los
 * espacios que los rodean) por `-`, colapsa espacios, quita separadores de los
 * extremos, retira un `.mr` final (para no duplicar la extensión), trunca a
 * {@link MAX_MR_BASE_NAME_LENGTH} y evita nombres reservados de Windows. Si no
 * queda nada utilizable, devuelve {@link DEFAULT_MR_BASE_NAME}.
 */
export function sanitizeMrBaseName(name: string | undefined | null): string {
  let base = (name ?? '').normalize('NFC');
  base = base.replace(INVALID_FILE_CHARS, '-');
  base = base.replace(/-{2,}/g, '-');
  base = base.replace(/\s+/g, ' ').trim();
  base = base.replace(EDGE_SEPARATORS, '');
  if (base.toLowerCase().endsWith(MR_FILE_EXTENSION)) {
    base = base.slice(0, -MR_FILE_EXTENSION.length).replace(EDGE_SEPARATORS, '');
  }
  if (base.length > MAX_MR_BASE_NAME_LENGTH) {
    base = base.slice(0, MAX_MR_BASE_NAME_LENGTH).replace(EDGE_SEPARATORS, '');
  }
  if (base.length === 0) {
    return DEFAULT_MR_BASE_NAME;
  }
  return WINDOWS_RESERVED_NAME.test(base) ? `_${base}` : base;
}

/** Nombre de descarga completo `<nombre-saneado>.mr` (fallback `cancion.mr`). */
export function buildMrFileName(name: string | undefined | null): string {
  return `${sanitizeMrBaseName(name)}${MR_FILE_EXTENSION}`;
}
