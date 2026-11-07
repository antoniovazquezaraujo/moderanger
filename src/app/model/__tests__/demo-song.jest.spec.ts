import { createDemoSong, DEMO_SONG_MR } from '../demo-song';

describe('demo song', () => {
    it('es un .mr válido con tres parts, bibliotecas y contenido musical', () => {
        const song = createDemoSong();

        expect(DEMO_SONG_MR).toContain('song "Vodka"');
        expect(song.name).toBe('Vodka');
        expect(song.parts).toHaveLength(3);
        expect(song.parts.map(part => part.name)).toEqual(['Piano', 'Bajo', 'Contrabajo']);
        expect(song.parts[0].items.length).toBeGreaterThan(0);
        expect(song.melodies.map(melody => melody.label)).toEqual(['A', 'B', 'C', 'D']);
        expect(song.presets.map(preset => preset.label)).toEqual([
            'AH', 'BH', 'CH', 'DH', 'AM', 'BM', 'CM', 'AL', 'BL', 'CL', 'DL'
        ]);
        expect(song.parts[1].items[0].melody?.label).toBe('A');
        expect(song.parts[0].items[0].melody?.label).toBe('A');
    });

    it('se puede cargar más de una vez sin compartir estado mutable', () => {
        const first = createDemoSong();
        const second = createDemoSong();

        expect(first).not.toBe(second);
        expect(first.parts[0]).not.toBe(second.parts[0]);
        expect(first.melodies[0]).not.toBe(second.melodies[0]);
    });
});
