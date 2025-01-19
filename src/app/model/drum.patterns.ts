import { NoteData } from "./note";

// Patrones básicos de batería
export const DrumPatterns = {
    // Patrón básico de rock
    basicRock: (): NoteData[] => [
        { type: 'note', note: 36, duration: "4n" },     // Kick
        { type: 'note', note: 42, duration: "8n" },     // Closed Hi-hat
        { type: 'note', note: 38, duration: "4n" },     // Snare
        { type: 'note', note: 42, duration: "8n" },     // Closed Hi-hat
    ],

    // Patrón de pop simple
    simplePop: (): NoteData[] => [
        { type: 'note', note: 36, duration: "4n" },     // Kick
        { type: 'note', note: 42, duration: "8n" },     // Closed Hi-hat
        { type: 'note', note: 38, duration: "4n" },     // Snare
        { type: 'note', note: 46, duration: "8n" },     // Open Hi-hat
    ],

    // Patrón de jazz básico
    basicJazz: (): NoteData[] => [
        { type: 'note', note: 51, duration: "4n" },     // Ride
        { type: 'note', note: 38, duration: "4n" },     // Snare
        { type: 'note', note: 51, duration: "4n" },     // Ride
        { type: 'note', note: 38, duration: "4n" },     // Snare
    ],

    // Fill básico
    basicFill: (): NoteData[] => [
        { type: 'note', note: 45, duration: "16n" },    // Low Tom
        { type: 'note', note: 48, duration: "16n" },    // Mid Tom
        { type: 'note', note: 50, duration: "16n" },    // High Tom
        { type: 'note', note: 49, duration: "4n" },     // Crash
    ]
}; 