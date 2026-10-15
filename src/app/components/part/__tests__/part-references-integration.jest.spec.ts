/**
 * Integración `.mr` → GUI de bloques reutilizables (fase 2).
 *
 * Verifica que el documento que produce la vista de texto (mismo camino que
 * `applyLoadedDocument`) deja el modelo que consume la GUI: la biblioteca que
 * alimenta `block-library`/`definitionOptions` y los ítems `use` que se pintan
 * como chips (con sus `×N` y comandos de llamada). También cubre la coherencia
 * GUI → modelo: editar el chip vuelve a serializar como `use`.
 */
import { BlockReference } from 'src/app/model/block-reference';
import { Command, CommandType } from 'src/app/model/command';
import { Part } from 'src/app/model/part';
import { Song } from 'src/app/model/song';
import { prepareSongText } from 'src/app/model/mr/mr.integration';
import { serializeSong } from 'src/app/model/mr/mr.serializer';
import { blockUsages, findBlockDefinition } from 'src/app/model/song-blocks';

const SOURCE = `song Demo
version 1

blocks
  block Riff
    notes
      0
      3

part Piano
  use Riff repeats 2
    commands
      OCT 5
  block Inline
    notes
      7
`;

const SOURCE_TWO_BLOCKS = `song Demo
version 1

blocks
  block Riff
    notes
      0
      3

  block Coro
    notes
      5

part Piano
  use Riff repeats 2
    commands
      OCT 5
`;

describe('Integración `.mr` → GUI de bloques reutilizables', () => {
  it('aplicar un .mr con blocks/use produce biblioteca y chip de referencia en la part', () => {
    const result = prepareSongText(SOURCE);

    expect(result.errors).toEqual([]);
    expect(result.serializeError).toBeUndefined();

    const song = result.document!.song;
    expect(song.blocks.map(definition => definition.label)).toEqual(['Riff']);

    const part = song.parts[0];
    expect(part.items.map(item => item.kind)).toEqual(['reference', 'block']);

    const reference = part.items[0] as BlockReference;
    expect(reference.targetLabel).toBe('Riff');
    expect(reference.repeatingTimes).toBe(2);
    expect(reference.commands.map(command => command.type)).toEqual([CommandType.OCT]);

    // Datos que consume la GUI de la part/biblioteca.
    expect(findBlockDefinition(song, reference.targetLabel)).toBe(song.blocks[0]);
    expect(blockUsages(song, 'Riff')).toHaveLength(1);
  });

  it('editar el chip (×N y comandos de llamada) se refleja al serializar', () => {
    const song = prepareSongText(SOURCE).document!.song;
    const reference = song.parts[0].items[0] as BlockReference;

    // Simula la edición desde `app-block-reference` (ngModel del ×N + app-block-commands).
    reference.repeatingTimes = 3;
    reference.commands = [new Command({ type: CommandType.OCT, value: 9 })];

    const text = serializeSong({ song, variables: new Map(), meta: { version: 1 } });

    expect(text).toContain('  use Riff repeats 3\n');
    expect(text).toContain('      OCT 9\n');
  });

  it('un `use` huérfano (modelo a mano) no rompe la resolución de la GUI', () => {
    const song = new Song();
    const part = new Part();
    const reference = new BlockReference();
    reference.targetLabel = 'Fantasma';
    part.items = [reference];
    song.parts = [part];

    expect(findBlockDefinition(song, reference.targetLabel)).toBeUndefined();
    expect(blockUsages(song, 'Fantasma')).toHaveLength(1);
  });

  it('cambiar el bloque destino desde el chip re-serializa use con el nuevo label conservando repeats y comandos', () => {
    const song = prepareSongText(SOURCE_TWO_BLOCKS).document!.song;
    const reference = song.parts[0].items[0] as BlockReference;
    expect(reference.targetLabel).toBe('Riff');
    expect(reference.repeatingTimes).toBe(2);

    // Simula el cambio de destino desde `app-block-reference` (icono del chip):
    // solo cambia `targetLabel`; `×N` y comandos de llamada se conservan.
    reference.targetLabel = 'Coro';

    const text = serializeSong({ song, variables: new Map(), meta: { version: 1 } });

    expect(text).toContain('  use Coro repeats 2\n');
    expect(text).toContain('      OCT 5\n');
    expect(text).not.toContain('use Riff');
  });
});
