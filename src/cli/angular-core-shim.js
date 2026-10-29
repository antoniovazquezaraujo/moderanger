/**
 * Shim de `@angular/core` para el CLI.
 *
 * El compilador reutiliza `SongPlayer` y los servicios del proyecto, que
 * llevan decoradores `@Injectable`. El CLI no arranca Angular: los
 * decoradores se convierten en no-ops y las clases se instancian a mano.
 */
module.exports = {
  Injectable: () => () => undefined,
  Inject: () => () => undefined,
  Optional: () => () => undefined
};
