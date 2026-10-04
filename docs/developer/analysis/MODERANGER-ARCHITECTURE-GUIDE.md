# 🎼 ModernRanger - Guía Completa de Arquitectura

## **📖 Índice de Contenidos**

1. [🎯 ¿Qué es ModernRanger?](#1-qué-es-modernranger)
2. [🏗️ Arquitectura General](#2-arquitectura-general)
3. [🎵 Modelo de Datos Musical](#3-modelo-de-datos-musical)
4. [⚙️ Servicios Principales](#4-servicios-principales)
5. [🖼️ Componentes de UI](#5-componentes-de-ui)
6. [🔄 Flujos de Datos](#6-flujos-de-datos)
7. [👤 Casos de Uso Principales](#7-casos-de-uso-principales)
8. [🎨 Patrones de Diseño](#8-patrones-de-diseño)
9. [📊 Diagramas de Arquitectura](#9-diagramas-de-arquitectura)

---

## **1. 🎯 ¿Qué es ModernRanger?**

### **Concepto Principal**
ModernRanger es una **aplicación web de estudio musical** que permite:
- **Componer melodías** usando una notación textual
- **Reproducir música** con diferentes instrumentos y efectos
- **Estudiar armonía** aplicando escalas, acordes y patrones
- **Experimentar** con diferentes modos de reproducción

### **Filosofía del Sistema**
```
📝 ENTRADA: Notación textual (ej: "1 2 3 4")
⚙️ PROCESAMIENTO: Conversión a estructuras musicales
🎵 SALIDA: Audio sincronizado con visualización
```

### **Arquitectura Conceptual**
```
Usuario escribe → Parser convierte → Servicios procesan → Audio reproduce
     "1 2 3"         NoteData[]        Player logic        Tone.js
```

---

## **2. 🏗️ Arquitectura General**

### **2.1 Estructura de Directorios**
```
src/app/
├── components/           # Componentes de UI
│   ├── melody-editor/   # Editor principal de melodías
│   ├── block/           # Gestión de bloques musicales
│   ├── song-manager/    # Gestión de canciones
│   └── ...
├── features/            # Servicios especializados (NUEVA ARQUITECTURA)
│   ├── audio/          # Motor de audio
│   ├── player/         # Control de reproducción
│   ├── song/           # Estado de canciones
│   └── melody/         # Gestión de melodías
├── model/              # Modelos de datos
│   ├── melody.ts       # Estructura de notas
│   ├── song.player.ts  # Motor de reproducción
│   └── note.ts         # Definición de notas
├── services/           # Servicios legacy
├── shared/             # Servicios unificados (NUEVOS)
└── app.module.ts       # Módulo principal
```

### **2.2 Capas de la Aplicación**
```
┌─────────────────────────────────────┐
│           UI COMPONENTS             │ ← Angular Components
├─────────────────────────────────────┤
│         BUSINESS LOGIC              │ ← Services & Features
├─────────────────────────────────────┤
│          DATA MODELS               │ ← Melody, NoteData, Player
├─────────────────────────────────────┤
│          AUDIO ENGINE              │ ← Tone.js Integration
└─────────────────────────────────────┘
```

---

## **3. 🎵 Modelo de Datos Musical**

### **3.1 Jerarquía de Elementos Musicales**

#### **NoteData - El Átomo Musical**
```typescript
class NoteData {
  type: 'note' | 'rest' | 'chord' | 'arpeggio' | 'group'
  note?: number        // Valor MIDI (ej: 60 = Do central)
  duration?: string    // Duración (ej: '4n' = negra)
  noteDatas?: NoteData[] // Para acordes/arpegios
  children?: NoteData[]  // Para grupos
}
```

#### **MusicElement - La Nueva Estructura**
```typescript
// Nota simple
interface SingleNote {
  id: string
  type: 'note' | 'rest'
  value: number | null
  duration?: NoteDuration
}

// Acorde o arpegio
interface CompositeNote {
  type: 'chord' | 'arpeggio'
  notes: SingleNote[]
}

// Grupo con paréntesis
interface GenericGroup {
  type: 'group'
  children: MusicElement[]
}
```

### **3.2 Flujo de Transformación Musical**
```
Texto → Parser → NoteData[] → MusicElement[] → Audio
"1 2 3"   OHM     [{note:1},     [SingleNote,    Tone.js
                   {note:2},      SingleNote,
                   {note:3}]      SingleNote]
```

### **3.3 Escalas y Tonalidades**
```typescript
// Sistema de escalas
ScaleTypes = {
  WHITE: [0, 2, 4, 5, 7, 9, 11],    // Do mayor
  BLUE: [0, 3, 5, 6, 7, 10],        // Blues
  RED: [0, 1, 4, 5, 7, 8, 11],      // Española
  // ...
}

// Cálculo de notas MIDI
grade + octave*12 + tonality = MIDI_NOTE
  1   +   4*12    +    0     =   49
```

---

## **4. ⚙️ Servicios Principales**

### **4.1 Nueva Arquitectura (POST-REFACTORING)**

#### **🎵 MusicTransportService**
```typescript
// RESPONSABILIDAD: Control de play/pause/stop
class MusicTransportService {
  play()    // Inicia reproducción
  pause()   // Pausa reproducción  
  stop()    // Detiene y resetea
  seek()    // Navega a posición específica
}
```

#### **🎛️ InstrumentManagerService**
```typescript
// RESPONSABILIDAD: Gestión de instrumentos
class InstrumentManagerService {
  createInstrument(type, id)    // Crea nuevo instrumento
  getInstrument(id)             // Obtiene instrumento existente
  disposeInstrument(id)         // Libera recursos
}
```

#### **🎼 NoteGenerationUnifiedService**
```typescript
// RESPONSABILIDAD: Creación consistente de notas
class NoteGenerationUnifiedService {
  createNoteData(options)       // Crea cualquier tipo de nota
  createSingleNote(options)     // Crea nota simple
  createRestNoteData(duration)  // Crea silencio
  validateCreation(data)        // Valida antes de crear
}
```

### **4.2 Servicios Legacy (PRE-REFACTORING)**

#### **🎵 SongPlayer - El Motor Principal**
```typescript
class SongPlayer {
  // Estado principal
  currentSong: Song
  isPlaying: boolean
  currentPattern: NoteData[]
  
  // Métodos principales
  playSong()          // Reproduce canción completa
  playBlock()         // Reproduce bloque específico
  scheduleNotes()     // Programa notas en Tone.js
  applyCommands()     // Aplica comandos de configuración
}
```

#### **🎭 Player - Configuración Musical**
```typescript
class Player {
  // Configuración musical
  scale: ScaleTypes        // Escala activa
  tonality: number        // Tonalidad (0-11)
  octave: number          // Octava base
  density: number         // Número de notas simultáneas
  gap: number            // Separación entre notas
  inversion: number      // Inversión de acordes
  
  // Generación de notas
  getSelectedNotes()     // Calcula notas según configuración
}
```

### **4.3 Servicios de Procesamiento**

#### **📝 NoteGenerationService**
```typescript
// RESPONSABILIDAD: Convierte texto en notas musicales
class NoteGenerationService {
  generateNotesFromBlock(block)     // Procesa bloque de texto
  applyPatternsIfNeeded()          // Aplica patrones melódicos
  processVariables()               // Resuelve variables
}
```

#### **🔄 AudioEngineService**
```typescript
// RESPONSABILIDAD: Interfaz con Tone.js
class AudioEngineService {
  createInstrument(type)           // Crea instrumento Tone.js
  scheduleNote(note, time)         // Programa nota en timeline
  setTransportBpm(bpm)            // Configura tempo
  startTransport()                // Inicia timeline
}
```

---

## **5. 🖼️ Componentes de UI**

### **5.1 Jerarquía de Componentes**

```
AppComponent (Root)
├── SongManagerComponent
│   ├── SongEditorComponent
│   └── PartsComponent
│       └── PartComponent
│           └── BlockComponent
│               ├── BlockNotesComponent
│               │   └── MelodyEditorComponent
│               │       ├── MelodyNoteComponent
│               │       └── MelodyGroupComponent
│               └── BlockCommandsComponent
└── MetronomeComponent
```

### **5.2 Componentes Principales**

#### **🎼 MelodyEditorComponent**
```typescript
// RESPONSABILIDAD: Editor principal de melodías
@Component({
  selector: 'app-melody-editor',
  // Maneja entrada de texto musical
  // Convierte a elementos visuales
  // Permite edición interactiva
})
```

#### **🎵 MelodyNoteComponent**
```typescript
// RESPONSABILIDAD: Representa una nota individual
@Component({
  selector: 'app-melody-note',
  // Muestra valor de nota
  // Permite edición inline
  // Maneja selección y drag&drop
})
```

#### **📦 BlockComponent**
```typescript
// RESPONSABILIDAD: Contenedor de melodía + comandos
@Component({
  selector: 'app-block',
  // Combina notas y configuración
  // Gestiona variables y comandos
  // Coordina reproducción
})
```

### **5.3 Nueva Arquitectura V2**

#### **🎼 MelodyEditorV2Component**
```typescript
// ARQUITECTURA NUEVA: Separación de responsabilidades
@Component({
  template: `
    <app-melody-selection>          <!-- Gestión de selección -->
      <app-melody-keyboard-handler> <!-- Eventos de teclado -->
        <app-melody-display>        <!-- Visualización -->
        </app-melody-display>
      </app-melody-keyboard-handler>
    </app-melody-selection>
    <app-melody-operations>         <!-- Operaciones CRUD -->
    </app-melody-operations>
  `
})
```

---

## **6. 🔄 Flujos de Datos**

### **6.1 Flujo de Creación Musical**

```
👤 Usuario escribe "1 2 3 4"
     ↓
📝 MelodyEditorComponent.onNotesChange()
     ↓
⚙️ parseBlockNotes("1 2 3 4") → [NoteData, NoteData, NoteData, NoteData]
     ↓
🎵 NoteGenerationService.generateNotesFromBlock()
     ↓
🎭 Player.getSelectedNotes() → Aplica escala, octava, tonalidad
     ↓
🔊 AudioEngineService.scheduleNote() → Programa en Tone.js
     ↓
🎼 Reproducción de audio
```

### **6.2 Flujo de Reproducción**

```
👤 Usuario presiona Play
     ↓
🎵 SongPlayer.playSong()
     ↓
🔄 Para cada Block:
     ├── Ejecuta comandos (octave, scale, etc.)
     ├── Genera notas con configuración actual
     ├── Programa notas en timeline
     └── Avanza al siguiente bloque
     ↓
🎼 Tone.js reproduce audio sincronizado
```

### **6.3 Flujo de Estado Global**

```
🌐 GlobalStateService (Estado Central)
     ├── playbackState$: { isPlaying, currentSong, beatCount }
     ├── repetitionState$: { currentRepetition, songRepetitions }
     └── patternState$: { globalPattern, playMode }
     
🔄 Componentes se suscriben a cambios
🎵 Servicios actualizan estado
📊 UI reacciona automáticamente
```

---

## **7. 👤 Casos de Uso Principales**

### **7.1 Caso de Uso: Crear y Reproducir Melodía**

```
ACTOR: Músico principiante
OBJETIVO: Crear su primera melodía

FLUJO:
1. Abre ModernRanger
2. Escribe "1 2 3 4 5 4 3 2 1" en el editor
3. Presiona Play
4. Escucha la melodía en Do mayor
5. Cambia la escala a "BLUE" en comandos
6. Presiona Play otra vez
7. Escucha la misma melodía en escala blues

COMPONENTES INVOLUCRADOS:
- MelodyEditorComponent (entrada)
- BlockCommandsComponent (configuración)
- SongPlayer (reproducción)
- Player (cálculo de notas)
- AudioEngineService (audio)
```

### **7.2 Caso de Uso: Estudiar Armonía**

```
ACTOR: Estudiante de música
OBJETIVO: Entender inversiones de acordes

FLUJO:
1. Escribe "1 3 5" (acorde básico)
2. Configura density=2 (3 notas simultáneas)
3. Configura inversion=0 y reproduce → Do-Mi-Sol
4. Cambia inversion=1 y reproduce → Mi-Sol-Do'
5. Cambia inversion=2 y reproduce → Sol-Do'-Mi'

COMPONENTES INVOLUCRADOS:
- BlockCommandsComponent (configuración)
- Player.getSelectedNotes() (cálculo de inversiones)
- OctavedGrade (conversión a MIDI)
```

### **7.3 Caso de Uso: Componer con Patrones**

```
ACTOR: Compositor avanzado
OBJETIVO: Crear variaciones melódicas

FLUJO:
1. Define un patrón: globalPattern = [1, -1, 2, -2]
2. Escribe nota base: "3"
3. Configura playMode = PATTERN
4. Al reproducir, escucha: 3, 2, 4, 1 (patrón aplicado)
5. Cambia nota base a "5"
6. Escucha: 5, 4, 6, 3 (mismo patrón, nueva base)

COMPONENTES INVOLUCRADOS:
- NotePatternProcessorService (aplicación de patrones)
- NoteGenerationService (procesamiento)
```

---

## **8. 🎨 Patrones de Diseño**

### **8.1 Observer Pattern**
```typescript
// RxJS Observables para estado reactivo
class GlobalStateService {
  private playbackStateSubject = new BehaviorSubject(initialState)
  playbackState$ = this.playbackStateSubject.asObservable()
  
  // Los componentes se suscriben a cambios
  // Actualizaciones automáticas en toda la app
}
```

### **8.2 Strategy Pattern**
```typescript
// Diferentes modos de reproducción
enum PlayMode {
  CHORD,    // Todas las notas simultáneas
  ARPEGGIO, // Notas secuenciales
  PATTERN   // Aplica patrón melódico
}

// Estrategia seleccionada dinámicamente
playNotes(notes: NoteData[], mode: PlayMode) {
  switch(mode) {
    case CHORD: return playChord(notes)
    case ARPEGGIO: return playArpeggio(notes)
    case PATTERN: return applyPattern(notes)
  }
}
```

### **8.3 Factory Pattern**
```typescript
// Creación unificada de notas
class NoteGenerationUnifiedService {
  createNoteData(options: NoteCreationOptions): NoteCreationResult {
    // Factory method con validación y defaults
    // Elimina duplicación de código
    // Garantiza consistencia
  }
}
```

### **8.4 Command Pattern**
```typescript
// Comandos musicales como objetos
class Command {
  type: CommandType  // OCT, SCALE, DENSITY, etc.
  value: string | number
  
  execute(player: Player) {
    // Aplica el comando al player
    // Permite undo/redo (futuro)
  }
}
```

### **8.5 Delegation Pattern**
```typescript
// Nueva arquitectura: servicios especializados
class MelodyEditorV2Service {
  constructor(
    private musicElementOps: MusicElementOperationsService,  // CRUD
    private noteGenUnified: NoteGenerationUnifiedService,    // Creation
    private globalState: GlobalStateService                  // State
  ) {}
  
  // Delega responsabilidades específicas
  addNote() { return this.musicElementOps.addNote(...) }
  updateState() { return this.globalState.updateState(...) }
}
```

---

## **9. 📊 Diagramas de Arquitectura**

### **9.1 Diagrama de Componentes**

```
┌─────────────────────────────────────────────────────────────┐
│                     ModernRanger App                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  SongManager    │    │   Metronome     │                │
│  │                 │    │                 │                │
│  │ ┌─────────────┐ │    │ ┌─────────────┐ │                │
│  │ │ SongEditor  │ │    │ │ BeatCounter │ │                │
│  │ └─────────────┘ │    │ └─────────────┘ │                │
│  │ ┌─────────────┐ │    └─────────────────┘                │
│  │ │   Parts     │ │                                       │
│  │ │ ┌─────────┐ │ │    ┌─────────────────┐                │
│  │ │ │  Part   │ │ │    │ GlobalServices  │                │
│  │ │ │ ┌─────┐ │ │ │    │                 │                │
│  │ │ │ │Block│ │ │ │    │ ┌─────────────┐ │                │
│  │ │ │ └─────┘ │ │ │    │ │ AudioEngine │ │                │
│  │ │ └─────────┘ │ │    │ │ SongPlayer  │ │                │
│  │ └─────────────┘ │    │ │ GlobalState │ │                │
│  └─────────────────┘    │ └─────────────┘ │                │
└─────────────────────────┴─────────────────┴────────────────┘
```

### **9.2 Flujo de Datos Musical**

```
INPUT                PROCESSING              OUTPUT
┌───────────┐       ┌─────────────┐        ┌─────────────┐
│  "1 2 3"  │  →    │   Parser    │   →    │ NoteData[]  │
│ (Usuario) │       │ (OHM.js)    │        │             │
└───────────┘       └─────────────┘        └─────────────┘
                           │                       │
                           ▼                       ▼
                    ┌─────────────┐        ┌─────────────┐
                    │ Comandos    │   →    │ Player      │
                    │ (scale,oct) │        │ Config      │
                    └─────────────┘        └─────────────┘
                                                  │
                                                  ▼
                                           ┌─────────────┐
                                           │ getSelected │
                                           │ Notes()     │
                                           └─────────────┘
                                                  │
                                                  ▼
                                           ┌─────────────┐
                                           │ AudioEngine │
                                           │ (Tone.js)   │
                                           └─────────────┘
                                                  │
                                                  ▼
                                           ┌─────────────┐
                                           │ 🔊 AUDIO   │
                                           └─────────────┘
```

### **9.3 Arquitectura de Servicios**

```
NUEVA ARQUITECTURA (Post-Refactoring)
┌─────────────────────────────────────────────────────────┐
│                    UI LAYER                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ MelodyEditor│ │ BlockEditor │ │ SongManager │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 BUSINESS LAYER                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │   Music     │ │  Transport  │ │ Instrument  │       │
│  │ Operations  │ │   Service   │ │  Manager    │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │    Note     │ │    Song     │ │   Global    │       │
│  │ Generation  │ │   State     │ │   State     │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  AUDIO LAYER                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │AudioEngine  │ │  Tone.js    │ │ Web Audio   │       │
│  │  Service    │ │ Integration │ │    API      │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## **🎯 Conclusión: Entendiendo ModernRanger**

### **En Resumen, ModernRanger es:**

1. **🎵 Un lenguaje musical simple**: "1 2 3" se convierte en Do-Re-Mi
2. **⚙️ Un motor de transformación**: Aplica escalas, octavas, patrones
3. **🎼 Un reproductor inteligente**: Sincroniza audio con configuración musical
4. **🖼️ Una interfaz intuitiva**: Edición visual y textual combined

### **Los 3 Pilares Fundamentales:**

```
📝 PARSING           🎵 PROCESSING        🔊 PLAYBACK
Texto → NoteData  +  Config → MIDI    +  MIDI → Audio
```

### **El Flujo Mental del Sistema:**

```
Usuario piensa: "Quiero tocar Do-Re-Mi en blues"
     ↓
Escribe: "1 2 3" + configura scale=BLUE
     ↓
Sistema procesa: [1,2,3] + BluuesScale = [MIDI 60, 63, 65]
     ↓
Audio sale: Do, MiB, Sol (blues)
```

**¡Ahora tienes el mapa completo del territorio ModernRanger!** 🗺️

Esta documentación es tu **brújula** para navegar el código. Cada vez que veas un archivo, podrás ubicarlo en esta arquitectura y entender su propósito. 🧭 