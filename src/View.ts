import {Circle, NOTES} from './Circle.js';

export const CIRCLE_DEPTH = 60;
export const NUM_OF_CIRCLES = 6;
export const NUM_OF_SECTORS = 12;
export const CENTRAL_NOTE = 5 * NUM_OF_SECTORS; // CENTRAL OCTAVE
export const SEGMENT_WIDTH = 360 / NUM_OF_SECTORS;
export const HALF_SECTOR_ANGLE = SEGMENT_WIDTH / 2;

export class View {
    centerX: number;
    centerY: number;

    circle: Circle;
    context: CanvasRenderingContext2D;
    constructor(circle: Circle) {
        this.circle = circle;
        var canvas = <HTMLCanvasElement>document.getElementById('myCanvas');
        this.centerX = canvas.width / 2;
        this.centerY = canvas.height / 2;

        this.context = canvas!.getContext('2d')!;
    }

    drawNotes(numCircle: number): void {
        var scheme = this.circle.noteScheme;
        var labelX = this.centerX;
        var labelY = this.centerY;
        var angle = 360 / NUM_OF_SECTORS;
        for (var sector = 0; sector < NUM_OF_SECTORS; sector++) {
            labelX = this.centerX + (CIRCLE_DEPTH * (numCircle + 1)) * Math.sin(angle * (this.circle.startSector + sector) * Math.PI / 180)
            labelY = this.centerY - (CIRCLE_DEPTH * (numCircle + 1)) * Math.cos(angle * (this.circle.startSector + sector) * Math.PI / 180)
            if (scheme[sector] == 1) {
                this.context.beginPath();
                this.context.arc(labelX, labelY, 12, 0, Math.PI * 2, false);
                this.context.fillStyle = 'White';
                this.context.fill();
                this.context.fillStyle = 'black';
                this.context.font = '15pt Calibri';
                var note = this.circle.startNote + sector;
                if (note > 11) note -= 12;
                if (note < 0) note += 12;
                this.context.fillText(NOTES[Math.abs(note) % NOTES.length], labelX - 5, labelY + 5);
            }
        }
    }

    drawChordNotes(numCircle: number): void {
        
        if (this.circle.chord.numNotes == 0) {
            return
        }
        var notes = this.circle.getChordNotes();
        var scheme = this.circle.noteScheme;
        var labelX = this.centerX;
        var labelY = this.centerY;
        var angle = 360 / NUM_OF_SECTORS;
        for (var note = 0; note < this.circle.chord.numNotes; note++) {
            labelX = this.centerX + (CIRCLE_DEPTH * (numCircle + 1)) * Math.sin(angle * (this.circle.startSector + notes[note]) * Math.PI / 180)
            labelY = this.centerY - (CIRCLE_DEPTH * (numCircle + 1)) * Math.cos(angle * (this.circle.startSector + notes[note]) * Math.PI / 180)
            this.context.beginPath();
            this.context.arc(labelX, labelY, 5, 0, Math.PI * 2, true);
            if (note == 0) {
                this.context.strokeStyle = 'Red';
            } else {
                this.context.strokeStyle = 'Green';
            }
            this.context.stroke();
        }
    }
    drawCircle(numCircle: number): void {
        
        var radius = (1 + numCircle) * CIRCLE_DEPTH;
        this.context.strokeStyle = this.circle.color;
        for (var i = 0; i < NUM_OF_SECTORS; i++) {
            this.context.beginPath();
            this.context.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2, false);
            if (numCircle == 1){// selectedCircle) {
                this.context.lineWidth = CIRCLE_DEPTH;
                this.context.stroke();
            } else {
                this.context.lineWidth = 5;
                this.context.stroke();
            }
        }
    }

    drawBackgroundCircle(): void {
        var radius = 7 * CIRCLE_DEPTH;
        this.context.fillStyle = 'Silver';
        this.context.beginPath();
        this.context.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2, true);
        this.context.lineWidth = CIRCLE_DEPTH;
        this.context.fill();
    }
}