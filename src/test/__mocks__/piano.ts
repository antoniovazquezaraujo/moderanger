export class Piano {
    instrument = {
        triggerAttackRelease: () => {},
        toDestination: () => ({ triggerAttackRelease: () => {} })
    };
} 