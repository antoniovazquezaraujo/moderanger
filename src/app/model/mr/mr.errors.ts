/**
 * Errores del formato `.mr` con posición de origen.
 *
 * Convención: línea y columna son 1-based, contando columnas sobre la línea
 * física (la indentación cuenta). El formato de presentación es
 * `fichero:línea:columna  error: mensaje`, el mismo que usa el ADR-001.
 */
export interface MrSourcePosition {
  /** Línea 1-based. */
  line: number;
  /** Columna 1-based. */
  column: number;
}

export class MrParseError extends Error {
  readonly position: MrSourcePosition;

  constructor(message: string, position: MrSourcePosition) {
    super(message);
    this.name = 'MrParseError';
    this.position = position;
    // Necesario para `instanceof` con el target de TS a CommonJS.
    Object.setPrototypeOf(this, MrParseError.prototype);
  }

  get line(): number {
    return this.position.line;
  }

  get column(): number {
    return this.position.column;
  }

  /** `fichero.mr:4:7  error: ...` (sin `fichero` si no se indica). */
  format(fileName?: string): string {
    const where = fileName ? `${fileName}:${this.position.line}:${this.position.column}` : `${this.position.line}:${this.position.column}`;
    return `${where}  error: ${this.message}`;
  }
}

/**
 * Error de serialización: el modelo no se puede expresar como texto canónico
 * (notas inválidas, comando vacío, versión desconocida, …).
 */
export class MrSerializeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MrSerializeError';
    Object.setPrototypeOf(this, MrSerializeError.prototype);
  }
}
