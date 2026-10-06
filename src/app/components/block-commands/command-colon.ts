/**
 * Reglas de presentación del separador `:` en Commands/Operations.
 *
 * El `:` de la lectura se oculta cuando el control de valor es un select de
 * variable en estado placeholder (`Select ... variable`): sin valor elegido
 * no hay nada que separar. Es solo presentación; el modelo y el `.mr` no
 * cambian.
 */
export interface VariableAwareCommand {
  isVariable: boolean;
  getVariableName(): string | null;
}

export function showCommandColon(command: VariableAwareCommand): boolean {
  return !(command.isVariable && !command.getVariableName());
}

export function showOperationColon(operation: { variableName: string }): boolean {
  return !!operation.variableName;
}
