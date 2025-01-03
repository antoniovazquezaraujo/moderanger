export class Sampler {
  private urls: any;
  private baseUrl: string;

  constructor(config: { urls: any, baseUrl?: string }) {
    this.urls = config.urls;
    this.baseUrl = config.baseUrl || '';
  }

  triggerAttackRelease(note: string | number, duration: string | number, time?: string | number) {}
  
  toDestination() {
    return this;
  }

  dispose() {}
}

export class Time {
  constructor(value: string) {}
  toSeconds() { return 0; }
}

export class Frequency {
  constructor(value: number, unit: string) {}
  toFrequency() { return 440; }
}

export const Transport = {
  start: () => {},
  stop: () => {},
  cancel: () => {},
  bpm: { value: 120 }
}; 