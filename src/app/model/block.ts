import { Command } from "./command";
import { CommandNotes } from "./command.notes";

export class Block {
    static _id: number = 0;
    id = Block._id++;
    label: string = '';
    commands: Command[] = [];
    blockContent: CommandNotes = { notes: '' };
    pulse: number = 0;
    repeatingTimes: number = 1;
    children: Block[] = [];

    constructor(block?: any) {
        if (block) {
            this.label = block.label || '';
            this.commands = block.commands?.map((cmd: any) => new Command(cmd)) || [];
            this.blockContent = new CommandNotes(block.blockContent || { notes: '' });
            this.pulse = block.pulse || 0;
            this.repeatingTimes = block.repeatingTimes || 1;
            this.children = block.children?.map((child: any) => new Block(child)) || [];
        }
    }

    removeBlock(block: Block) {
        if (block?.children != null && block.children?.length > 0) {
            this.children = this.children?.filter(t => t != block);
        }
    }
}