/**
 * Notas en texto libre y compactas (`style/free-text-compact`).
 *
 * jsdom no calcula layout, así que el contrato se fija leyendo las fuentes:
 * borde transparente reservado (misma caja) y sin fondo en reposo, altura
 * única de 20px, sin transform/scale al seleccionar y espaciados reducidos.
 */
import * as fs from 'fs';
import * as path from 'path';

const note = fs.readFileSync(path.resolve(__dirname, '../melody-note.component.ts'), 'utf8');
const editor = fs.readFileSync(path.resolve(__dirname, '../../melody-editor/melody-editor.component.scss'), 'utf8');

describe('notas en texto libre (contrato CSS)', () => {
  it('el reposo reserva un borde transparente y no pinta fondo', () => {
    const item = /\.note-item\s*\{([\s\S]*?)\}/.exec(note);

    expect(item).not.toBeNull();
    expect(item![1]).toContain('border: 1px solid transparent');
    expect(item![1]).toContain('background-color: transparent');
    expect(item![1]).toContain('height: 20px');
    expect(item![1]).toContain('box-sizing: border-box');
    expect(item![1]).not.toMatch(/scale\(/);
  });

  it('hover y selección solo cambian borde/fondo (sin tamaño)', () => {
    expect(note).toMatch(/\.note-item:hover\s*\{[\s\S]*?border-color:\s*#ccc/);
    expect(note).toMatch(/\.note-item\.selected\s*\{[\s\S]*?border-color:\s*#2196F3/);
    expect(note).not.toMatch(/transform:\s*scale/);
    expect(note).not.toMatch(/box-shadow/);
  });

  it('el editor reduce gaps/paddings y elimina el margen legacy de 30px', () => {
    expect(editor).toMatch(/\.note-container\s*\{[\s\S]*?margin:\s*0;/);
    expect(editor).not.toContain('margin: 0 30px');
    expect(editor).toMatch(/\.notes-container\s*\{[\s\S]*?gap:\s*2px/);
    // Ninguna regla de nota escala ni añade sombra (el icono `$` sí puede
    // escalar: es decorativo y no forma parte de la nota).
    const noteItemRules = (editor.match(/\.note-item[^{]*\{[^}]*\}/g) ?? []).join('\n');
    expect(noteItemRules).not.toMatch(/transform/);
    expect(noteItemRules).not.toMatch(/box-shadow/);
  });
});
