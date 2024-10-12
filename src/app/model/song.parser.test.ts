// Importar PEG.js para compilar la gramática
import * as parser from "./song.parser"

// Cargar el archivo de gramática

  // Test para verificar que el parser funciona con entrada válida
  test('Parser procesa entrada válida correctamente', () => {
    const input = "Cmaj7 Dm7 G7"; // Ejemplo de entrada válida
    let result;
    try {
      result = parser.parse(input);
    } catch (error) {
      console.error("Error durante el parseo:", (error as Error).message);
    }
    expect(result).toBeDefined();  // Verifica que el resultado es válido
  });

  // Test para verificar que el parser falla con entrada inválida
  test('Parser falla con entrada inválida', () => {
    const invalidInput = "C#maj^5 Gmin/4"; // Ejemplo de entrada inválida
    expect(() => {
      parser.parse(invalidInput);
    }).toThrow();  // Verifica que lanza un error con entrada inválida
  });
 
