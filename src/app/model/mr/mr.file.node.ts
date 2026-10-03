/**
 * Adaptador Node del puerto `MrFileSystem` (UTF-8).
 *
 * No se exporta desde el barrel del módulo para que el bundle web no arrastre
 * `fs`: solo lo importan consumidores Node (CLI, tests de integración).
 */
import * as fs from 'fs';
import { MrFileSystem } from './mr.file';

export function createNodeMrFileSystem(): MrFileSystem {
  return {
    read: (path: string): Promise<string> => fs.promises.readFile(path, 'utf8'),
    write: (path: string, content: string): Promise<void> => fs.promises.writeFile(path, content, 'utf8')
  };
}
