import { Block } from "./block";
import { Part } from "./part";
import { VariableContext, VariableValue } from "./variable.context";

export class Song {
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