export class Sampler {
    toDestination() {
        return {
            triggerAttackRelease: () => {}
        };
    }
}

const transport = {
    stop: () => {},
    start: () => {},
    cancel: () => {},
    bpm: { value: 100 }
};

export const getTransport = () => transport; 