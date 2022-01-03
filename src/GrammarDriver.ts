import * as Parser from './parser.js';

class ParseResult {
    ast: Song | null = null;
    errs: SyntaxError[] =[];
}
interface Song{
    blocks: Block[];
}  
interface Block{ 
    commands: Command[];
    blockContent:string;
}
interface Command{
    commandType:string;
    commandValue: string;
} 

class Command implements Command{

}
class Block implements Block{

}
class Song implements Song{

}
export function evaluate(tree : any) : Song | null {
    if(tree.err === null && tree.ast){
        return parseSong(tree.ast);
    }
    console.log('Error en evaluate()' + tree.err);
    return null;
}  

var result = Parser.parse('W1,P2,S4:87843ABCD PF,S2:84837473747'); 
var song: Song = parseSong(result.ast!);
console.log(song.blocks);
for(var block of song.blocks){
    block.commands.forEach(command =>{
        console.log(command.commandType + " -> "+ command.commandValue);
    });
}

export function parseSong(at : Parser.SONG) : Song {
    var song:Song = new Song();
    song.blocks = [];
    song.blocks.push(parseBlock(at.head));
    at.tail.forEach(t => {
        song.blocks.push(parseBlock(t.block));
    });
    return song;
}

export function parseBlock(at : Parser.BLOCK): Block{
    var block:Block = new Block();
    block.commands = parseCommandGroup(at.commandGroup);
    block.blockContent = parseBlockContent(at.blockContent);
    return block;
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
    var ret:Command =  new Command();
    ret.commandType = parseCommandType(at.commandType);
    ret.commandValue = parseCommandValue(at.commandValue);
    return ret;
}

function parseCommandValue(commandValue: Parser.VALUE_ID): string {
    return commandValue.val;
}

function parseCommandType(commandType: Parser.COMMAND_TYPE): string {
    return commandType.commandType;
}
