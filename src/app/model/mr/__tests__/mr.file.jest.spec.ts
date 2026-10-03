import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Song } from '../../song';
import { createNodeMrFileSystem } from '../mr.file.node';
import { hasMrExtension, MrFileError, MrFileService, MrFileSystem, normalizeMrText } from '../mr.file';
import { serializeSong } from '../mr.serializer';
import { SongDocument } from '../mr.types';

class MemoryFileSystem implements MrFileSystem {
  private readonly files = new Map<string, string>();

  async read(filePath: string): Promise<string> {
    const content = this.files.get(filePath);
    if (content === undefined) {
      throw new Error(`no existe '${filePath}'`);
    }
    return content;
  }

  async write(filePath: string, content: string): Promise<void> {
    this.files.set(filePath, content);
  }

  get(filePath: string): string | undefined {
    return this.files.get(filePath);
  }
}

function createDocument(name: string): SongDocument {
  const song = new Song();
  song.name = name;
  song.parts = [];
  return { song, variables: new Map(), meta: { version: 1 } };
}

describe('mr.file: helpers', () => {
  it('detecta la extensión .mr sin distinguir mayúsculas', () => {
    expect(hasMrExtension('cancion.mr')).toBe(true);
    expect(hasMrExtension('CANCION.MR')).toBe(true);
    expect(hasMrExtension('cancion.json')).toBe(false);
    expect(hasMrExtension('mr')).toBe(false);
  });

  it('normaliza BOM y CRLF a UTF-8/LF', () => {
    expect(normalizeMrText('\uFEFFsong X\r\nversion 1\r\n')).toBe('song X\nversion 1\n');
    expect(normalizeMrText('a\rb')).toBe('a\nb');
  });
});

describe('MrFileService con filesystem en memoria', () => {
  it('escribe en LF y vuelve a leer un documento equivalente', async () => {
    const fileSystem = new MemoryFileSystem();
    const service = new MrFileService(fileSystem);
    const document = createDocument('Órbita');

    await service.write('orbita.mr', document);

    const raw = fileSystem.get('orbita.mr')!;
    expect(raw.endsWith('\n')).toBe(true);
    expect(raw).not.toContain('\r');
    expect(raw).toContain('song "Órbita"');

    const read = await service.read('orbita.mr');
    expect(read.song.name).toBe('Órbita');
    expect(serializeSong(read)).toBe(raw);
  });

  it('normaliza BOM/CRLF al leer', async () => {
    const fileSystem = new MemoryFileSystem();
    await fileSystem.write('semilla.mr', '\uFEFFsong Semilla\r\nversion 1\r\npart Piano\r\n  block Origen\r\n');
    const service = new MrFileService(fileSystem);

    const document = await service.read('semilla.mr');

    expect(document.song.name).toBe('Semilla');
    expect(document.song.parts[0].blocks[0].label).toBe('Origen');
  });

  it('rechaza rutas sin extensión .mr', async () => {
    const service = new MrFileService(new MemoryFileSystem());

    await expect(service.read('cancion.txt')).rejects.toBeInstanceOf(MrFileError);
    await expect(service.write('cancion.txt', createDocument('X'))).rejects.toBeInstanceOf(MrFileError);
  });
});

describe('mr.file.node: integración real con disco', () => {
  it('escribe y lee un .mr UTF-8 en un directorio temporal', async () => {
    const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'moderanger-mr-'));
    try {
      const service = new MrFileService(createNodeMrFileSystem());
      const songPath = path.join(directory, 'orbita.mr');
      const document = createDocument('Órbita');
      document.song.repeats = 2;
      document.meta = { version: 1, repeats: 2, bpm: 90 };

      await service.write(songPath, document);

      const bytes = await fs.promises.readFile(songPath, 'utf8');
      expect(bytes).toContain('song "Órbita"');
      expect(bytes.endsWith('\n')).toBe(true);

      const read = await service.read(songPath);
      expect(read.song.name).toBe('Órbita');
      expect(read.meta).toEqual({ version: 1, repeats: 2, bpm: 90 });
      expect(serializeSong(read)).toBe(bytes);
    } finally {
      const rmSync = (fs as unknown as { rmSync?: (target: string, options: { recursive: boolean; force: boolean }) => void }).rmSync;
      if (rmSync) {
        rmSync(directory, { recursive: true, force: true });
      } else {
        fs.rmdirSync(directory, { recursive: true });
      }
    }
  });
});
