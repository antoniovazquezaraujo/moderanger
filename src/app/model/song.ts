import { MusicalInstrument } from './instrument';
import { Part } from './part';
import { Piano } from './piano';
import { VariableContext, VariableValue } from './variable.context';

export class Song {
    public parts: Part[] = [];
    public static instruments: MusicalInstrument[] = [new Piano()];
    public variableContext: VariableContext = new VariableContext();

    constructor(song?: any) {
        if (song) {
            this.parts = song.parts || [];
            // Restaurar el contexto de variables
            this.variableContext = new VariableContext();
            if (song.variables) {
                for (const [name, value] of Object.entries(song.variables)) {
                    this.variableContext.setValue(name, value as VariableValue);
                }
            }
        }
    }

    static getDefultInstrument(): MusicalInstrument {
        return Song.instruments[0];
    }

    // Método para serializar el song incluyendo las variables
    toJSON() {
        return {
            parts: this.parts,
            variables: Object.fromEntries(this.variableContext.getAllVariables())
        };
    }
}