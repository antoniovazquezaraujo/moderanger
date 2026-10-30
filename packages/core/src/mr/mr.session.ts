/**
 * Estado de sesión del editor para `.mr` (Fase 3 del ADR-001): nombres de
 * fichero y derivación de la meta del documento desde el modelo.
 * Angular-free para poder probarlo con Jest.
 *
 * Dónde vive la cabecera (decisiones #16 y #20): `Song.bpm` y `Song.repeats`
 * son la fuente de verdad en memoria. `MrMeta` es solo el reflejo en el
 * fichero: `parseSong` copia la cabecera a `Song` al cargar y al guardar se
 * deriva con `songToMrMeta` (los valores por defecto se omiten).
 */
import { DEFAULT_BPM, DEFAULT_REPEATS, Song } from '../song';
import { MR_FILE_EXTENSION } from './mr.file';
import { MR_FORMAT_VERSION, MrMeta } from './mr.types';

/** Nombre base por defecto cuando la canción no tiene nombre utilizable. */
export const DEFAULT_MR_BASE_NAME = 'cancion';

/** Longitud máxima del nombre base (sin extensión). */
export const MAX_MR_BASE_NAME_LENGTH = 80;

/**
 * `MrMeta` derivada del modelo canónico: `repeats` y `bpm` se toman de `Song`
 * y los valores por defecto (1 / 120) se omiten, como manda el formato.
 */
export function songToMrMeta(song: Song): MrMeta {
  return {
    version: MR_FORMAT_VERSION,
    repeats: song.repeats !== DEFAULT_REPEATS ? song.repeats : undefined,
    bpm: song.bpm !== DEFAULT_BPM ? song.bpm : undefined
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
