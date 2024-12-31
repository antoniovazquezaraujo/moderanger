const mockTone = {
    start: () => {},
    Transport: {
        start: () => {},
        stop: () => {},
        position: 0,
        bpm: {
            value: 120
        },
        schedule: () => {},
        scheduleRepeat: () => {},
        cancel: () => {}
    },
    Synth: function() {
        return {
            toDestination: function() { return this; },
            triggerAttackRelease: () => {}
        };
    },
    PolySynth: function() {
        return {
            toDestination: function() { return this; },
            triggerAttackRelease: () => {}
        };
    },
    now: () => 0
};

export = mockTone; 