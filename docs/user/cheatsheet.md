# Chuleta de sintaxis `.mr`

## Estructura

```mr
song "Nombre de la canción"
version 1
repeats 2        # repeticiones de canción (1 = se omite)
bpm 90           # tempo (120 = se omite)

vars
  $oct = 2
  $scale = WHITE
  $motif = "4t:0 4t:2"

part Piano instrument PIANO
  block Tema repeats 2
    notes default 8n     # duración por defecto del bloque
      4n:0
      4n:( 0 2 )
      s
    commands
      OCT $oct
      SCALE WHITE
      PLAYMODE ASCENDING
    operations
      VARY $oct 1
      ASSIGN $scale BLACK

    block Respuesta
      notes $motif
```

## Notas

- Un evento por línea dentro de `notes`; los grupos van completos en su línea.
- `duración:grado` (`4n:0`), silencios `s`, grados negativos (`-7`), grupos `4n:( 0 2 )`, variables de nota `8t:$grado`.
- Sin duración propia: hereda la del grupo; en una sección `notes` los grupos **heredan**; dentro de un `PATTERN` los grupos **subdividen** (los hijos sin duración se reparten el tiempo restante).

## Duraciones

| Token | Figura | Pulsos | A 120 BPM |
|---|---|---|---|
| `1n` | Redonda | 4 | 2 s |
| `2n` | Blanca | 2 | 1 s |
| `4n` | Negra | 1 | 0,5 s |
| `8n` | Corchea | ½ | 0,25 s |
| `16n` | Semicorchea | ¼ | 0,125 s |
| `4t` | Tresillo de negra | ⅔ | 0,333 s |
| `8t` | Tresillo de corchea | ⅓ | 0,167 s |

## Comandos

| Comando | Para qué | Ejemplo |
|---|---|---|
| `OCT` | Octava base | `OCT 2` |
| `SCALE` | Escala activa | `SCALE BLACK` |
| `GAP` | Salto entre notas del acorde | `GAP 2` |
| `PLAYMODE` | Cómo suenan los grados | `PLAYMODE ASCENDING` |
| `WIDTH` | Notas extra del acorde | `WIDTH 3` |
| `INV` | Inversión | `INV 1` |
| `KEY` | Transposición en semitonos | `KEY 0` |
| `SHIFTSTART`/`SHIFTSIZE`/`SHIFTVALUE` | Desplazamiento (heredado) | `SHIFTSIZE 3` |
| `PATTERN` | Melodía del patrón (o `$variable`) | `PATTERN 4t:0 4t:2` |
| `PATTERN_GAP` | Separación de la decoración (heredado) | `PATTERN_GAP 1` |

Los comandos numéricos admiten `$variable`.

## Operaciones

- `VARY $variable paso` — incrementa/decrementa (números) o cicla (escalas/playmodes).
- `ASSIGN $variable valor` — asigna.
- Azúcar de entrada: `+=`, `-=`, `++`, `--`, `=` (nunca se emite).

## Atajos del editor de melodía

| Acción | Cómo |
|---|---|
| Seleccionar nota | Clic |
| Cambiar valor | Rueda sobre el número |
| Cambiar duración | Rueda sobre la duración (vacío = heredada) |
| Nota ↔ silencio | `Espacio` |
| Duración del grupo padre | `Shift+Espacio` |
| Borrar | `Supr` |
| Mover el foco | ← → |
| Valor arriba/abajo | ↑ ↓ |

## Vista `.mr`

- Botón **`.mr`**: muestra el texto canónico de la canción.
- **Validar** en vivo; **Aplicar** reconstruye la GUI; **Revertir** recarga desde el modelo.
- **Guardar** descarga `<nombre>.mr`; **Cargar** valida y adopta el fichero (errores con `fichero:línea:columna`).
