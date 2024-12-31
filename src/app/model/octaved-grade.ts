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
    constructor(scale: Scale, grade: number, octave: number, duration: string) {
        this.scale = scale;
        this.addGradeAndOctave(grade, octave);
        this.duration = duration;
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
        this.grade += grade;
        this.octave += octave;
        if (this.grade >= this.scale.getNumNotes()) {
            this.octave += Math.floor(this.grade / this.scale.getNumNotes());
            this.grade = Math.abs(this.grade % this.scale.getNumNotes());
        } else if (this.grade < 0) {
            this.octave -= Math.floor(this.grade / this.scale.getNumNotes());
            this.grade = Math.abs(this.grade % this.scale.getNumNotes());
        }
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
        return this.scale.notes[this.grade] + ((this.octave) * 12);
    }

    /**
     * Convierte esta nota a un objeto NoteData con su duración y valor MIDI
     * @returns Un objeto NoteData con la información de la nota
     */
    tonoteData() {
        return new NoteData({ duration: this.duration, note: this.toNote() });
    }
} 