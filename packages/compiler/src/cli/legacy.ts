#!/usr/bin/env node
/**
 * Alias de compatibilidad del antiguo binario `moderanger-mid`.
 *
 * Fijamos el nombre antes de cargar el CLI para que el despachador lo trate
 * como `compile` también en Windows, donde el shim de npm no conserva el
 * nombre del enlace en `process.argv[1]`.
 */
process.argv[1] = 'moderanger-mid';
require('./main');
