import { Block } from "./block";
import { Part } from "./part";
import { VariableContext, VariableValue } from "./variable.context";
import { Piano } from "./piano";

export class Song {
    static instruments = [new Piano()];
    static getDefultInstrument() {
        return Song.instruments[0];
    }

    parts: Part[] = [];
    variableContext: VariableContext = new VariableContext();

    constructor(song?: any) {
        if (song) {
            this.parts = song.parts?.map((part: any) => {
                const newPart = new Part();
                newPart.block = new Block(part);
                return newPart;
            }) || [];
            
            // Restore variable context
            if (song.variables) {
                Object.entries(song.variables).forEach(([name, value]) => {
                    this.variableContext.setVariable(name, value as VariableValue);
                });
            }

            // Propagar el contexto de variables a todas las partes
            this.parts.forEach(part => part.setVariableContext(this.variableContext));
        }
    }

    addPart(part: Part) {
        this.parts.push(part);
        part.setVariableContext(this.variableContext);
    }

    removePart(part: Part) {
        const index = this.parts.indexOf(part);
        if (index !== -1) {
            this.parts.splice(index, 1);
        }
    }

    toJSON() {
        const variables: { [key: string]: VariableValue } = {};
        this.variableContext.getAllVariables().forEach((value, key) => {
            variables[key] = value;
        });

        return {
            parts: this.parts.map(part => part.block),
            variables
        };
    }
}