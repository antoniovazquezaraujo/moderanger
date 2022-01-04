import * as Grammar from './GrammarDriver.js';
import { OrchestraView } from './OrchestraView.js';

export class ProgrammableConductor {
    orchestraView: OrchestraView;
    velocity: number;
    pulse: number;
    constructor(orchestraView: OrchestraView) {
        this.orchestraView = orchestraView;
        this.velocity = 100;
        this.pulse = 1;
    }
    song!: Grammar.Song;
    setSong(song: Grammar.Song) {
        this.song = song;
    }

    start(): void {
        this.parseSong(this.song);
    }
    parseSong(song: Grammar.Song) {
        this.song.blocks.forEach(block => {
            this.parseBlock(block);
        });
    }

    async parseBlock(block: Grammar.Block) {
        this.parseCommands(block.commands);
        await this.parseNotes(block.blockContent);
    }
    parseCommands(commands: Grammar.Command[]) {
        commands.forEach(command => {
            this.parseCommand(command);
        });
    }
    parseCommand(command: Grammar.Command): void {
        switch (command.commandType) {
            case 'V': // Velocity
                this.velocity = parseInt(command.commandValue, 16);
                break;
            case 'P': // Pulse (bits per time)
                this.pulse = parseInt(command.commandValue, 16);
                break;
            case 'W': // Width (chord density)
                this.setNodeDensity(parseInt(command.commandValue, 16));
                break;
            case 'O': // Octave
                this.setOctave(parseInt(command.commandValue, 16));
                break;
            case 'S': // Scale
                this.setScale(parseInt(command.commandValue, 16));
                break;
            case 'I': // Scale
                this.setInversion(parseInt(command.commandValue, 16));
                break;
            case 'K': // Key (Tonality)
                this.setTonality(parseInt(command.commandValue, 16));
                break;
        }
    }
 
    async parseNotes(content: string) {
        for (const c of content) {
            this.selectNoteInInstrument(Number(c) - 1);
            this.orchestraView.orchestra.selectNotesToPlay();
            this.orchestraView.playTimed(10);
            await this.delay(10000/(this.velocity)); 
        }
    }
    // async parseNotes(content: string) {
    //     return new Promise(async resolve => {
    //         var timeOut = this.velocity;
    //         for (const c of content) {
    //             this.selectNoteInInstrument(Number(c) - 1);
    //             this.orchestraView.orchestra.selectNotesToPlay();
    //             this.orchestraView.play();
    //             //await this.delay(this.velocity);
    //             timeOut*= this.velocity;
    //         }
    //         console.log("Timeout: "+ timeOut);
    //         setTimeout(resolve, timeOut);
    //         return resolve;
    //     });
    // }

    async delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    setScale(scale: number) {
        this.orchestraView.getSelectedView().getInstrument().selectScale(scale);
    }
    selectNoteInInstrument(note: number) {
        this.orchestraView.getSelectedView().getInstrument().player.selectedNote = note;
    }
    refresh(): void {
        throw new Error("Method not implemented.");
    }
    setInversion(inversion: number) {
        this.orchestraView.getSelectedView().getInstrument().player.inversion = inversion;
    }
    setTonality(tonality: number): void {
        this.orchestraView.getSelectedView().getInstrument().tonality = tonality;
    }
    setNodeDensity(density: number): void {
        this.orchestraView.getSelectedView().getInstrument().player.density = density;
    }
    setOctave(octave: number): void {
        this.orchestraView.getSelectedView().getInstrument().player.octave = octave;
    }


}