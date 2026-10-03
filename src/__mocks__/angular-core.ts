/**
 * Stub mínimo de `@angular/core` para tests unitarios de Jest.
 *
 * El núcleo (modelo + servicios) sólo usa decoradores de metadatos
 * (`@Injectable`). En Jest no arrancamos Angular/DI, por lo que el decorador
 * se convierte en un no-op en runtime. Los tipos reales siguen viniendo de
 * `@angular/core` en tiempo de compilación (ts-jest), así que el source no
 * pierde el type-checking de Angular.
 */

export function Injectable(_providedIn?: unknown): ClassDecorator {
  return () => undefined;
}

export function Inject(_token?: unknown): ParameterDecorator {
  return () => undefined;
}

export function Optional(): ParameterDecorator {
  return () => undefined;
}
