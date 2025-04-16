import { NoteData } from "./note";
import { Scale } from "./scale";

/**
 * Representa una nota musical dentro de una escala con su grado y octava.
 * Esta clase maneja las operaciones matemáticas necesarias para calcular
 * el desplazamiento de notas dentro de una escala musical.
 */
export class OctavedGrade {
    /** El grado dentro de la escala (0-based) */
    grade: number = 0;
    /** La octava en la que se encuentra la nota */
    octave: number = 0;
    /** La escala musical a la que pertenece esta nota */
    scale: Scale;
    /** La duración de la nota (ej: "1/4", "1/8", etc.) */
    duration: string;

    /**
     * Crea una nueva instancia de OctavedGrade
     * @param scale La escala musical a utilizar
     * @param grade El grado dentro de la escala (0-based)
     * @param octave La octava de la nota
     * @param duration La duración de la nota
     */
    constructor(scale: Scale, grade: number, octave: number, duration?: string) {
        this.scale = scale;
        this.duration = duration ?? '';
        this.setGradeAndOctave(grade, octave);
    }

    /**
     * Establece el grado y octava, asegurando que sean números válidos
     */
    private setGradeAndOctave(grade: number, octave: number) {
        // Asegurar que los valores sean números válidos
        const numericGrade = isNaN(Number(grade)) ? 0 : Number(grade);
        const numericOctave = isNaN(Number(octave)) ? 0 : Number(octave);
        
        this.grade = numericGrade;
        this.octave = numericOctave;
        
        // Normalizar el grado dentro del rango de la escala
        if (this.grade >= this.scale.getNumNotes()) {
            this.octave += Math.floor(this.grade / this.scale.getNumNotes());
            this.grade = this.grade % this.scale.getNumNotes();
        } else if (this.grade < 0) {
            this.octave -= Math.ceil(Math.abs(this.grade) / this.scale.getNumNotes());
            this.grade = (this.scale.getNumNotes() + (this.grade % this.scale.getNumNotes())) % this.scale.getNumNotes();
        }
    }

    /**
     * Añade otro OctavedGrade a esta instancia
     * @param grade El OctavedGrade a añadir
     */
    addOctavedGrade(grade: OctavedGrade) {
        this.addGradeAndOctave(grade.grade, grade.octave);
    }

    /**
     * Añade un grado y octava específicos a esta instancia
     * Ajusta automáticamente la octava si el grado resultante está fuera del rango de la escala
     * @param grade El grado a añadir
     * @param octave La octava a añadir
     */
    addGradeAndOctave(grade: number, octave: number) {
        const currentGrade = this.grade;
        const currentOctave = this.octave;
        this.setGradeAndOctave(currentGrade + Number(grade), currentOctave + Number(octave));
    }

    /**
     * Añade un grado a esta instancia
     * Ajusta automáticamente la octava si el grado resultante está fuera del rango de la escala
     * @param grade El grado a añadir
     */
    addGrade(grade: number) {
        this.grade += grade;
        if (this.grade >= this.scale.getNumNotes()) {
            this.octave += Math.floor(this.grade / this.scale.getNumNotes());
            this.grade = Math.abs(this.grade % this.scale.getNumNotes());
        } else if (this.grade < 0) {
            this.octave += Math.floor(this.grade / this.scale.getNumNotes());
            this.grade = Math.abs((this.scale.getNumNotes() + this.grade) % this.scale.getNumNotes());
        }
    }

    /**
     * Convierte esta nota a su valor MIDI correspondiente
     * @returns El número MIDI de la nota
     */
    toNote() {
        // Asegurar que el grado sea un número válido
        const numericGrade = Number(this.grade);
        const safeGrade = isNaN(numericGrade) ? 0 : numericGrade % this.scale.getNumNotes();
        
        console.log('Original grade:', this.grade);
        console.log('Numeric grade:', numericGrade);
        console.log('Safe grade:', safeGrade);
        console.log('Scale notes:', this.scale.notes);
        
        // Obtener la nota base de la escala
        const baseNote = this.scale.notes[safeGrade];
        // Ajustar la octava para un rango más bajo
        const octaveOffset = ((this.octave - 1) * 12);
        // Usar un MIDI base más bajo
        const midiBase = 48; // C3
        const finalNote = baseNote + octaveOffset + midiBase;
        
        console.log('Base note from scale:', baseNote);
        console.log('Octave offset:', octaveOffset);
        console.log('Final MIDI note:', finalNote);
        
        return finalNote;
    }

    /**
     * Convierte esta nota a un objeto NoteData con su duración y valor MIDI
     * @returns Un objeto NoteData con la información de la nota
     */
    tonoteData() {
        return new NoteData({ duration: this.duration, note: this.toNote() });
    }
} 