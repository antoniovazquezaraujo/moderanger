import * as Parser from './parser';
import {Command, CommandType } from './command';
import { Song } from './song';
import   {Block } from './block';
import { Part } from './part';
import { CommandNotes } from './command.notes';
  

export function evaluate(tree : any) : Song | null {
    if(tree.err === null && tree.ast){
        return parseSong(tree.ast);
    }
    console.log('Error en evaluate()' + tree.err);
    return null;
}  

export function parseSong(at : Parser.SONG) : Song {
    var parts = [];
    parts.push(parsePart(at.head));
    at.tail.forEach(t => {
        parts.push(parsePart(t.part));
    });
    return new Song(parts);
}
export function parsePart(at : Parser.PART): Part{   
    var blocks:Block[] = [];
    blocks.push(parseBlock(at.head));
    at.tail.forEach(t => {
        blocks.push(parseBlock(t.block));
    });
    let part = new Part(blocks);
    return part;
}

export function parseBlock(at : Parser.BLOCK): Block{
    
    var commands = parseCommandGroup(at.commandGroup);
    var blockContent = parseBlockContent(at.blockContent);
    return new Block(commands, new CommandNotes(blockContent));
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
    var commandType:CommandType = parseCommandType(at.commandType);
    var commandValue:string = parseCommandValue(at.commandValue);
    return new Command(commandType, commandValue);
}

function parseCommandValue(commandValue: Parser.VALUE_ID): string {
    return commandValue.val;
}

function parseCommandType(commandType: Parser.COMMAND_TYPE): CommandType {
    return CommandType.PULSE; //TODO: PROVISIONAL, CAMBIAR ESTO
}
