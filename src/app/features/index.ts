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