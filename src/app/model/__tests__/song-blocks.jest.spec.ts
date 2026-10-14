import { Block } from '../block';
import { BlockReference } from '../block-reference';
import { Part } from '../part';
import { Song } from '../song';
import {
  blockDefinitions,
  blockUsages,
  createBlockDefinition,
  createBlockReference,
  findBlockDefinition,
  isBlockLabelAvailable,
  nextBlockLabel,
  removeBlockDefinition,
  renameBlockDefinition
} from '../song-blocks';

function songWith(...labels: string[]): Song {
  const song = new Song();
  song.blocks = labels.map(label => {
    const block = new Block();
    block.label = label;
    return block;
  });
  return song;
}

function referenceTo(targetLabel: string): BlockReference {
  const reference = new BlockReference();
  reference.targetLabel = targetLabel;
  return reference;
}

describe('song-blocks · biblioteca de definiciones (fase 2)', () => {
  it('findBlockDefinition resuelve por label exacto y devuelve undefined si no existe', () => {
    const song = songWith('Riff', 'Coro');

    expect(findBlockDefinition(song, 'Coro')).toBe(song.blocks[1]);
    expect(findBlockDefinition(song, 'Nope')).toBeUndefined();
  });

  it('blockUsages recoge cada referencia con su parte', () => {
    const song = songWith('Riff');
    const first = new Part();
    first.name = 'Piano';
    first.items = [referenceTo('Riff'), new Block()];
    const second = new Part();
    second.name = 'Cuerdas';
    second.items = [referenceTo('Riff')];
    song.parts = [first, second];

    const usages = blockUsages(song, 'Riff');

    expect(usages).toHaveLength(2);
    expect(usages[0].partName).toBe('Piano');
    expect(usages[0].reference).toBe(first.items[0]);
    expect(usages[1].partName).toBe('Cuerdas');
  });

  it('isBlockLabelAvailable rechaza vacío y duplicados (salvo la propia definición)', () => {
    const song = songWith('Riff', 'Coro');

    expect(isBlockLabelAvailable(song, 'Nuevo')).toBe(true);
    expect(isBlockLabelAvailable(song, '   ')).toBe(false);
    expect(isBlockLabelAvailable(song, 'Coro')).toBe(false);
    expect(isBlockLabelAvailable(song, 'Coro', song.blocks[1])).toBe(true);
  });

  it('renameBlockDefinition actualiza en cascada todas las referencias', () => {
    const song = songWith('Riff');
    const part = new Part();
    part.items = [referenceTo('Riff'), new Block(), referenceTo('Riff')];
    song.parts = [part];

    const ok = renameBlockDefinition(song, song.blocks[0], 'Riff', 'Riff principal');

    expect(ok).toBe(true);
    expect(song.blocks[0].label).toBe('Riff principal');
    expect((part.items[0] as BlockReference).targetLabel).toBe('Riff principal');
    expect((part.items[2] as BlockReference).targetLabel).toBe('Riff principal');
    expect(part.items[1].kind).toBe('block');
  });

  it('renameBlockDefinition no toca nada si el label está en uso o vacío', () => {
    const song = songWith('Riff', 'Coro');
    const part = new Part();
    part.items = [referenceTo('Riff')];
    song.parts = [part];

    expect(renameBlockDefinition(song, song.blocks[0], 'Riff', 'Coro')).toBe(false);
    expect(renameBlockDefinition(song, song.blocks[0], 'Riff', '')).toBe(false);
    expect(song.blocks[0].label).toBe('Riff');
    expect((part.items[0] as BlockReference).targetLabel).toBe('Riff');
  });

  it('createBlockDefinition propone labels libres y respeta el sugerido si está libre', () => {
    const song = songWith('Block 1');

    const auto = createBlockDefinition(song);
    expect(auto.label).toBe('Block 2');
    expect(nextBlockLabel(song)).toBe('Block 2');

    const suggested = createBlockDefinition(song, 'Puente');
    expect(suggested.label).toBe('Puente');
  });

  it('createBlockReference crea una referencia al label indicado', () => {
    const reference = createBlockReference('Riff');

    expect(reference.kind).toBe('reference');
    expect(reference.targetLabel).toBe('Riff');
  });

  it('removeBlockDefinition elimina la definición y todas sus referencias', () => {
    const song = songWith('Riff', 'Coro');
    const part = new Part();
    part.items = [referenceTo('Riff'), referenceTo('Coro'), referenceTo('Riff')];
    song.parts = [part];

    const removed = removeBlockDefinition(song, song.blocks[0]);

    expect(removed).toBe(2);
    expect(song.blocks.map(block => block.label)).toEqual(['Coro']);
    expect(part.items).toHaveLength(1);
    expect((part.items[0] as BlockReference).targetLabel).toBe('Coro');
  });

  it('renameBlockDefinition admite nombres con espacios (comillados en .mr) y propaga en cascada', () => {
    const song = songWith('Riff');
    const part = new Part();
    part.items = [referenceTo('Riff')];
    song.parts = [part];

    const ok = renameBlockDefinition(song, song.blocks[0], 'Riff', 'Riff principal (v2)');

    expect(ok).toBe(true);
    expect(song.blocks[0].label).toBe('Riff principal (v2)');
    expect((part.items[0] as BlockReference).targetLabel).toBe('Riff principal (v2)');
  });

  it('renameBlockDefinition es idempotente con el mismo label', () => {
    const song = songWith('Riff');
    const part = new Part();
    part.items = [referenceTo('Riff')];
    song.parts = [part];

    expect(renameBlockDefinition(song, song.blocks[0], 'Riff', 'Riff')).toBe(true);
    expect(song.blocks[0].label).toBe('Riff');
    expect((part.items[0] as BlockReference).targetLabel).toBe('Riff');
  });

  it('renameBlockDefinition no renombra una definición a un label ya usado por otra', () => {
    const song = songWith('Riff', 'Coro');
    const part = new Part();
    part.items = [referenceTo('Coro')];
    song.parts = [part];

    expect(renameBlockDefinition(song, song.blocks[1], 'Coro', 'Riff')).toBe(false);
    expect(song.blocks[1].label).toBe('Coro');
    expect((part.items[0] as BlockReference).targetLabel).toBe('Coro');
  });

  it('renameBlockDefinition solo propaga a referencias que apuntan al label anterior', () => {
    const song = songWith('Riff');
    const part = new Part();
    part.items = [referenceTo('Coro')];
    song.parts = [part];

    expect(renameBlockDefinition(song, song.blocks[0], 'Riff', 'Nuevo')).toBe(true);
    expect((part.items[0] as BlockReference).targetLabel).toBe('Coro');
  });

  it('createBlockDefinition cae al siguiente label libre si el sugerido está duplicado o vacío', () => {
    const song = songWith('Riff');

    expect(createBlockDefinition(song, 'Riff').label).toBe('Block 2');
    expect(createBlockDefinition(song, '   ').label).toBe('Block 2');
    expect(createBlockDefinition(song, '').label).toBe('Block 2');
  });

  it('nextBlockLabel salta los números ya ocupados', () => {
    const song = songWith('Block 1', 'Block 2');

    expect(nextBlockLabel(song)).toBe('Block 3');
  });

  it('blockUsages devuelve vacío para un label inexistente o un label vacío', () => {
    const song = songWith('Riff');
    const part = new Part();
    part.items = [referenceTo('Riff')];
    song.parts = [part];

    expect(blockUsages(song, 'Fantasma')).toEqual([]);
    expect(blockUsages(song, '')).toEqual([]);
  });

  it('removeBlockDefinition no falla si la definición no pertenece a la biblioteca', () => {
    const song = songWith('Riff');
    const stray = new Block();
    stray.label = 'Fantasma';

    expect(removeBlockDefinition(song, stray)).toBe(0);
    expect(song.blocks.map(block => block.label)).toEqual(['Riff']);
  });

  it('blockDefinitions y blockUsages toleran una canción sin biblioteca', () => {
    const song = new Song();
    song.blocks = undefined as unknown as Block[];

    expect(blockDefinitions(song)).toEqual([]);
    expect(blockUsages(song, 'Riff')).toEqual([]);
    expect(findBlockDefinition(song, 'Riff')).toBeUndefined();
  });
});
