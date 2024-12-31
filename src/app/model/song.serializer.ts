import { Song } from './song';
import { Part } from './part';
import { Block } from './block';
import { Command, CommandType } from './command';

export class SongSerializer {
    /**
     * Convierte una Song a formato texto simplificado.
     * Formato:
     * PART
     *   BLOCK repeats=n
     *     notes: C D E
     *     commands:
     *       PLAYMODE CHORD
     *       WIDTH 3
     *     BLOCK repeats=m
     *       notes: F G A
     * PART
     *   BLOCK repeats=k
     *     notes: B C D
     */
    static toString(song: Song): string {
        let result = '';
        
        for (const part of song.parts) {
            result += 'PART\n';
            result += this.serializeBlock(part.block, 1);
        }
        
        return result;
    }

    private static serializeBlock(block: Block, indent: number): string {
        let result = ' '.repeat(indent * 2);
        result += `BLOCK repeats=${block.repeatingTimes}\n`;
        
        // Serializar notas
        if (block.blockContent?.notes) {
            result += ' '.repeat((indent + 1) * 2);
            result += `notes: ${block.blockContent.notes}\n`;
        }
        
        // Serializar comandos
        if (block.commands && block.commands.length > 0) {
            result += ' '.repeat((indent + 1) * 2);
            result += 'commands:\n';
            for (const command of block.commands) {
                result += ' '.repeat((indent + 2) * 2);
                result += `${command.commandType} ${command.commandValue}\n`;
            }
        }
        
        // Serializar bloques hijos
        for (const child of block.children) {
            result += this.serializeBlock(child, indent + 1);
        }
        
        return result;
    }

    /**
     * Convierte el formato texto simplificado a una Song.
     */
    static fromString(text: string): Song {
        const song = new Song();
        const lines = text.split('\n');
        let currentPart: Part | null = null;
        let blockStack: { block: Block, indent: number }[] = [];
        
        for (let line of lines) {
            const originalLine = line;
            line = line.trim();
            if (!line) continue;
            
            const indent = this.getIndentLevel(originalLine);

            if (line === 'PART') {
                currentPart = new Part();
                song.parts.push(currentPart);
                blockStack = [];
            }
            else if (line.startsWith('BLOCK')) {
                const match = line.match(/repeats=(\d+)/);
                const repeats = parseInt(match?.[1] || '1');
                const block = new Block();
                block.repeatingTimes = repeats;
                
                // Ajustar el stack basado en la indentación
                while (blockStack.length > 0 && blockStack[blockStack.length - 1].indent >= indent) {
                    blockStack.pop();
                }
                
                // Asignar el bloque al lugar correcto
                if (blockStack.length === 0) {
                    if (currentPart) {
                        currentPart.block = block;
                    }
                } else {
                    const parentBlock = blockStack[blockStack.length - 1].block;
                    parentBlock.children.push(block);
                }
                
                blockStack.push({ block, indent });
            }
            else if (line.startsWith('notes:') && blockStack.length > 0) {
                const notes = line.substring(6).trim();
                const currentBlock = blockStack[blockStack.length - 1].block;
                if (!currentBlock.blockContent) {
                    currentBlock.blockContent = { notes: '' };
                }
                currentBlock.blockContent.notes = notes;
            }
            else if (line.startsWith('commands:')) {
                continue; // Skip the commands: header
            }
            else if (blockStack.length > 0) {
                // Asumimos que es un comando
                const [type, value] = line.split(' ');
                if (Object.values(CommandType).includes(type as CommandType)) {
                    const command = new Command({
                        commandType: type as CommandType,
                        commandValue: value
                    });
                    const currentBlock = blockStack[blockStack.length - 1].block;
                    if (!currentBlock.commands) {
                        currentBlock.commands = [];
                    }
                    currentBlock.commands.push(command);
                }
            }
        }
        
        return song;
    }

    private static getIndentLevel(line: string): number {
        let spaces = 0;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === ' ') {
                spaces++;
            } else {
                break;
            }
        }
        return Math.floor(spaces / 2);
    }
} 