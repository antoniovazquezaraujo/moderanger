/**
 * Servicio de fichero `.mr` (Fase 1): lectura/escritura UTF-8 y LF,
 * desacoplado de Node y de Angular mediante el puerto `MrFileSystem`.
 *
 * El núcleo no importa `fs`: el adaptador Node vive en `mr.file.node.ts` y
 * los tests usan un filesystem en memoria.
 */
import { parseSong } from './mr.parser';
import { serializeSong } from './mr.serializer';
import { SongDocument } from './mr.types';

export const MR_FILE_EXTENSION = '.mr';

export interface MrFileSystem {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
}

export class MrFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MrFileError';
    Object.setPrototypeOf(this, MrFileError.prototype);
  }
}

export function hasMrExtension(path: string): boolean {
  return path.toLowerCase().endsWith(MR_FILE_EXTENSION);
}

/** Quita BOM y normaliza CRLF/CR a LF (el formato canónico es UTF-8 sin BOM y LF). */
export function normalizeMrText(text: string): string {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return withoutBom.replace(/\r\n?/g, '\n');
}

export class MrFileService {
  constructor(private readonly fileSystem: MrFileSystem) {}

  /** Lee un fichero `.mr` y devuelve el documento; lanza `MrFileError` si la extensión no es `.mr`. */
  async read(path: string): Promise<SongDocument> {
    this.assertExtension(path);
    const raw = await this.fileSystem.read(path);
    return parseSong(normalizeMrText(raw));
  }

  /** Serializa el documento y lo escribe terminado en LF. */
  async write(path: string, document: SongDocument): Promise<void> {
    this.assertExtension(path);
    await this.fileSystem.write(path, serializeSong(document));
  }

  private assertExtension(path: string): void {
    if (!hasMrExtension(path)) {
      throw new MrFileError(`el fichero '${path}' no tiene extensión ${MR_FILE_EXTENSION}`);
    }
  }
}
