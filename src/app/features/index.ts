// 🎯 New Architecture: Specialized Services for Code Clarity

// 🎵 Music Transport Control
export { MusicTransportService, TransportState } from './player/music-transport.service';

// 🎹 Instrument Management  
export { InstrumentManagerService, InstrumentInstance } from './audio/instrument-manager.service';

// 📊 Song State Management
export { SongStateManagerService, SongState } from './song/song-state-manager.service';

// ⏰ Note Scheduling & Timing
export { 
  NoteSchedulerService, 
  ScheduledNote, 
  PartSoundInfo, 
  ExecutionUnit, 
  PartExecutionState 
} from './player/note-scheduler.service';

// 🎼 New Orchestrator (replaces old SongPlayer)
export { SongPlayerV2Service, PlayerState } from './player/song-player-v2.service';

// 🎵 NEW: Melody Editor Services (replaces MelodyEditorService)

// 📝 Element Management
export { MelodyElementManagerService, ElementOperation } from './melody/melody-element-manager.service';

// 🎯 Selection Management  
export { MelodySelectionService, SelectionState } from './melody/melody-selection.service';

// 🔗 Group Management
export { MelodyGroupManagerService, GroupOperation } from './melody/melody-group-manager.service';

// 🔄 Data Conversion
export { 
  MelodyDataConverterService, 
  ConversionOptions, 
  StructureAnalysis, 
  ValidationResult 
} from './melody/melody-data-converter.service';

// 🎼 New Melody Editor Orchestrator (replaces old MelodyEditorService)
export { MelodyEditorV2Service, MelodyEditorState } from './melody/melody-editor-v2.service'; 