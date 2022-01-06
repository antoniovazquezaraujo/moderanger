import * as Parser from './parser.js';

export class ParseResult {
    ast: Song | null = null;
    errs: SyntaxError[] =[];
}
export class Command {
    constructor(
        public commandType:string,
        public commandValue:string
    ){}
    public toString = () : string => {
        return `Command (${this.commandType} ${this.commandValue})`;
    }

}
export class Block{
    constructor(
        public commands:Command[], 
        public blockContent:string
    ){} 
}
export class Pepe{
    public dato:number = 42; 
}
export class Song {
    constructor(
        public blocks: Block[]
    ){}
}
export function evaluate(tree : any) : Song | null {
    if(tree.err === null && tree.ast){
        return parseSong(tree.ast);
    }
    console.log('Error en evaluate()' + tree.err);
    return null;
}  

// var result = Parser.parse('W1,P2,S4:87843ABCD PF,VF2,S2:84837473747'); 
// var song: Song = parseSong(result.ast!);
// console.log(JSON.stringify(song, null, 2 ));
 

export function parseSong(at : Parser.SONG) : Song {
    var blocks = [];
    blocks.push(parseBlock(at.head));
    at.tail.forEach(t => {
        blocks.push(parseBlock(t.block));
    });
    return new Song(blocks);
}

export function parseBlock(at : Parser.BLOCK): Block{
    
    var commands = parseCommandGroup(at.commandGroup);
    var blockContent = parseBlockContent(at.blockContent);
    return new Block(commands, blockContent);
}
export function parseCommandGroup(at : Parser.COMMAND_GROUP) : Command[] {
    var commands:Command[] = [];
    commands.push(parseCommand(at.head));
    at.tail.forEach(t => {
        commands.push(parseCommand(t.command));
    });
    return commands;
}

export function parseBlockContent(at : Parser.BLOCK_CONTENT) : string  {
    var values:string  =  "";
    values = at.val;
    return values;
}
export function parseChar( t: string):string{
    return t;
}
export function parseCommand(at: Parser.COMMAND): Command{  
    var commandType = parseCommandType(at.commandType);
    var commandValue = parseCommandValue(at.commandValue);
    return new Command(commandType, commandValue);
}

function parseCommandValue(commandValue: Parser.VALUE_ID): string {
    return commandValue.val;
}

function parseCommandType(commandType: Parser.COMMAND_TYPE): string {
    return commandType.commandType;
}
