# Scheduler: rejilla 96n para tresillos exactos

- **Fecha:** 2026-10-15
- **Autor:** ROBER (motor); documentado por JORGE (UI/UX)
- **Rama:** `feature/reusable-blocks-gui`
- **Estado:** implementado, en verde y validado por el usuario en la app
- **Referencias:** `src/app/model/song.player.ts`

---

## 1. Motivo

El loop de reproducción corría sobre una rejilla de **16n**. Toda duración debía cuantizarse a un número entero de ticks de 16n, pero los **tresillos** no caen en esa rejilla:

- `4t` dura 2,667 ticks de 16n y `8t` 1,333.
- Al redondear, `4t` saltaba de tick: el grupo quedaba desigual y se colaban **silencios** entre notas. La alternativa probada (reparto fraccionario «3-2-3» con carry entre notas) seguía produciendo *jitter* audible y el usuario la **rechazó**.

## 2. Cambio

La resolución del loop pasa a **`96n` (1/24 de negra)** (`SongPlayer.SCHEDULER_INTERVAL = '96n'`). 96n es el **mínimo común múltiplo** de las subdivisiones binarias (hasta 32n) y ternarias (4t/8t/16t), así que toda duración del dominio cae en un número **entero** de ticks:

| Duración | Ticks de 96n |
|---|---|
| `4t` | 16 |
| `16n` | 6 |
| `8t` | 8 |
| `16t` | 4 |
| `32n` | 3 |

Con esto los tresillos son **exactos y parejos**, sin redondeo ni reparto fraccionario.

## 3. Alcance (`song.player.ts`)

- El loop (`scheduleLoop`) usa la nueva rejilla; el cálculo de ticks por nota pasa a ser entero.
- **Metrónomo y `beatCount` no cambian**: se calculan cada `96n × 6 = 16n` (`TICKS_PER_SIXTEENTH`), de modo que la UI (puntos del metrónomo, compases) mantiene su cadencia.
- Las duraciones **binarias** suenan idénticas (antes y ahora enteras).
- El **carry fraccionario** (`fractionalTurns`) se conserva como red de seguridad, pero con 96n ya no hace falta para los valores del dominio.

## 4. Verificación

- Suite completa en verde (**853 tests**) y `npm run build` correcto.
- Validación del usuario en la app: los tresillos (`4t`, `8t`) suenan parejos y sin huecos.
