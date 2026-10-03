/**
 * Adaptador browser para guardar/cargar `.mr` (Fase 3 del ADR-001).
 *
 * El puerto `MrFileSystem` es path-based (Node/CLI) y no aplica al navegador:
 * aquí no hay rutas, la descarga la dispara un anchor con `download` y la
 * lectura llega como `File` del `<input type="file">`. Se mantiene fuera del
 * barrel `mr/index.ts` (igual que `mr.file.node.ts`) para que el núcleo no
 * dependa del DOM.
 */

/**
 * Descarga `text` como fichero de texto UTF-8 con nombre `fileName`
 * (Blob + `URL.createObjectURL` + anchor temporal).
 */
export function downloadTextFile(fileName: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // El navegador empieza la descarga al hacer click; se revoca un poco después
  // para no cancelarla en navegadores que resuelven la URL de forma asíncrona.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Lee un `File` como texto UTF-8. Se usa `FileReader` (en vez de
 * `Blob.text()`) por compatibilidad con los navegadores objetivo de Angular 13.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error(`no se pudo leer '${file.name}'`));
    reader.readAsText(file, 'utf-8');
  });
}
