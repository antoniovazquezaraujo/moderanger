/**
 * Núcleo puro de Mode Ranger: modelo, `.mr` y generación de notas.
 *
 * No importa Angular, Tone ni APIs de navegador/Node. Lo consumen la app y el
 * compilador MIDI.
 */
export * from './block.content';
export * from './block-reference';
export * from './block';
export * from './command.notes';
export * from './command';
export * from './duration';
export * from './event';
export * from './instrument-type';
export * from './keyboard';
export * from './melody';
export * from './music-element-utils';
export * from './note';
export * from './octaved-grade';
export * from './operation';
export * from './part';
export * from './player';
export * from './play.mode';
export * from './play.state';
export * from './scale';
export * from './song-blocks';
export * from './song';
export * from './variable.context';
export * from './mr';
export * from './services/note-generation.service';
export * from './services/note-generation-unified.service';
