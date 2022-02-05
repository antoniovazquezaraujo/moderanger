export class Command {
    public commandType:string;
    public commandValue:string;
    constructor(
         commandType:string,
         commandValue:string
    ){
        this.commandType=commandType;
        this.commandValue=commandValue;
    }
    public toString = () : string => {
        return `Command (${this.commandType} ${this.commandValue})`;
    }

}