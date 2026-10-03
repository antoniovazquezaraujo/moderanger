/**
 * Verifica que todos los ejemplos completos ```mr de la documentación de la v1
 * son documentos válidos y canónicos.
 *
 * Documentos cubiertos:
 * - `docs/guia/lenguaje-mr.md` (guía del lenguaje: 14 ejemplos completos).
 * - `docs/guia/validacion-manual-v1.md` (fixtures del checklist manual).
 *
 * Convención de la guía: los bloques ```mr son ficheros completos; los
 * fragmentos y ejemplos inválidos usan ```text. Este test convierte esa
 * convención en un contrato: si un ejemplo deja de parsear o deja de ser
 * canónico, `npm test` falla y obliga a actualizar guía y parser a la vez.
 */
import * as fs from 'fs';
import * as path from 'path';
import { parseSong } from '../mr.parser';
import { serializeSong } from '../mr.serializer';

const DOCS_DIR = path.resolve(__dirname, '../../../../..', 'docs/guia');

interface GuardedDoc {
  file: string;
  title: string;
  minBlocks: number;
}

const DOCS: GuardedDoc[] = [
  { file: 'lenguaje-mr.md', title: '# Guía del lenguaje `.mr` (v1)', minBlocks: 10 },
  { file: 'validacion-manual-v1.md', title: '# Validación manual de la v1', minBlocks: 2 }
];

/** Extrae el contenido de los bloques cercados con ```mr (uno por ejemplo). */
function extractMrBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  const pattern = /```mr[ \t]*\r?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    blocks.push(match[1].replace(/\r\n/g, '\n'));
  }
  return blocks;
}

describe('documentación .mr v1: ejemplos completos', () => {
  for (const doc of DOCS) {
    describe(doc.file, () => {
      const markdown = fs.readFileSync(path.join(DOCS_DIR, doc.file), 'utf8');
      const blocks = extractMrBlocks(markdown);

      it(`existe, tiene portada y al menos ${doc.minBlocks} ejemplos \`\`\`mr`, () => {
        expect(markdown).toContain(doc.title);
        expect(blocks.length).toBeGreaterThanOrEqual(doc.minBlocks);
      });

      it('todos los bloques ```mr terminan en un único salto de línea', () => {
        for (const block of blocks) {
          expect(block.endsWith('\n')).toBe(true);
          expect(block.endsWith('\n\n')).toBe(false);
        }
      });

      blocks.forEach((block, index) => {
        const preview = block.split('\n')[0];
        it(`ejemplo #${index + 1} (${preview}) parsea y es canónico`, () => {
          const document = parseSong(block);

          expect(serializeSong(document)).toBe(block);
        });
      });
    });
  }
});
