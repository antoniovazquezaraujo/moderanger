import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface AudioConfig {
  enableHighQuality: boolean;
  bufferSize: number;
  defaultVolume: number;
  enableReverb: boolean;
}

export interface UIConfig {
  theme: 'light' | 'dark';
  enableAnimations: boolean;
  showAdvancedControls: boolean;
  language: 'es' | 'en';
}

export interface AppConfig {
  audio: AudioConfig;
  ui: UIConfig;
  debug: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: AppConfig = {
    audio: {
      enableHighQuality: environment.audioSettings?.enableHighQuality || false,
      bufferSize: environment.audioSettings?.bufferSize || 2048,
      defaultVolume: 0.7,
      enableReverb: false
    },
    ui: {
      theme: 'light',
      enableAnimations: true,
      showAdvancedControls: false,
      language: 'es'
    },
    debug: !environment.production
  };

  constructor() {
    this.loadConfigFromStorage();
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  getAudioConfig(): AudioConfig {
    return { ...this.config.audio };
  }

  getUIConfig(): UIConfig {
    return { ...this.config.ui };
  }

  updateAudioConfig(newConfig: Partial<AudioConfig>): void {
    this.config.audio = { ...this.config.audio, ...newConfig };
    this.saveConfigToStorage();
  }

  updateUIConfig(newConfig: Partial<UIConfig>): void {
    this.config.ui = { ...this.config.ui, ...newConfig };
    this.saveConfigToStorage();
  }

  isDebugMode(): boolean {
    return this.config.debug;
  }

  private loadConfigFromStorage(): void {
    try {
      const storedConfig = localStorage.getItem('moderanger-config');
      if (storedConfig) {
        const parsed = JSON.parse(storedConfig);
        this.config = { ...this.config, ...parsed };
      }
    } catch (error) {
      console.warn('[ConfigService] Error loading config from storage:', error);
    }
  }

  private saveConfigToStorage(): void {
    try {
      localStorage.setItem('moderanger-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('[ConfigService] Error saving config to storage:', error);
    }
  }

  resetToDefaults(): void {
    this.config = {
      audio: {
        enableHighQuality: environment.audioSettings?.enableHighQuality || false,
        bufferSize: environment.audioSettings?.bufferSize || 2048,
        defaultVolume: 0.7,
        enableReverb: false
      },
      ui: {
        theme: 'light',
        enableAnimations: true,
        showAdvancedControls: false,
        language: 'es'
      },
      debug: !environment.production
    };
    this.saveConfigToStorage();
  }
} 