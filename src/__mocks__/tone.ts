import * as jest from 'jest';

const mockTone = {
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

module.exports = mockTone;
module.exports.default = mockTone;
module.exports.__esModule = true; 