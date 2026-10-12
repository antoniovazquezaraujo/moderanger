/**
 * Valor de un comando `DECORATION` en la GUI.
 *
 * El editor de melodía emite texto de notas (`0 -2 6`, `4t:0 4t:-2`); antes de
 * guardarlo en `command.value` se canonicaliza con el parser compartido
 * (`decoration.parser.ts`), para que el modelo y el `.mr` mantengan la forma
 * canónica (espacios colapsados, duración explícita solo si procede).
 *
 * Si el texto todavía no es parseable (p. ej. vacío mientras se edita, o un
 * grupo que el editor permite crear pero DECORATION v1 no admite), se conserva
 * tal cual para poder seguir editando; el error real lo dará el parser al
 * cargar/serializar.
 */
import { canonicalDecoration } from 'src/app/model/mr/decoration.parser';

export function canonicalDecorationValueOrRaw(value: string): string {
    try {
        return canonicalDecoration(value);
    } catch {
        return value;
    }
}
