/**
 * Modelo del documento `.mr` (Fase 1 del ADR-001).
 *
 * El texto es la representación canónica: `parseSong` construye este documento
 * y `serializeSong` lo devuelve a texto estable. Las variables declaradas
 * viven en `variables` (Map en orden de declaración) y **no** se aplican al
 * `VariableContext` global; la app decide cuándo hacerlo.
 */
import { Song } from '../song';
import { VariableValue } from '../variable.context';

/** Versión del formato que implementa este módulo. */
export const MR_FORMAT_VERSION = 1;

export interface MrMeta {
  /** Versión del formato `.mr` (siempre presente al serializar). */
  version: number;
  /**
   * Repeticiones de canción leídas de la cabecera (`repeats`). Reflejo de
   * `Song.repeats` (canónico): `undefined`/1 = una vez.
   */
  repeats?: number;
  /**
   * Tempo leído de la cabecera (`bpm`). Reflejo de `Song.bpm` (canónico):
   * `undefined`/120 = el valor por defecto del player.
   */
  bpm?: number;
}

export interface SongDocument {
  song: Song;
  /** Variables declaradas, en orden de declaración. */
  variables: Map<string, VariableValue>;
  meta: MrMeta;
}
