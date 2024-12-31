export const Tone = {
    start: jest.fn(),
    Transport: {
        start: jest.fn(),
        stop: jest.fn(),
        position: 0,
        bpm: {
            value: 120
        },
        schedule: jest.fn(),
        scheduleRepeat: jest.fn(),
        cancel: jest.fn()
    },
    Synth: jest.fn().mockImplementation(() => ({
        toDestination: jest.fn().mockReturnThis(),
        triggerAttackRelease: jest.fn()
    })),
    PolySynth: jest.fn().mockImplementation(() => ({
        toDestination: jest.fn().mockReturnThis(),
        triggerAttackRelease: jest.fn()
    })),
    now: jest.fn().mockReturnValue(0)
}; 