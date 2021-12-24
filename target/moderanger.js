import './JZZ.js';
import './JZZ.synth.Tiny.js';
import { Circle } from './Circle.js';
import { playChord, playClic } from './Sound.js';
window.onload = function () {
    // document.getElementById() code here
};
JZZ.synth.Tiny.register('Synth');
var sound = JZZ().openMidiOut().or(function () { alert('Cannot open MIDI port!'); });
var canvas = document.getElementById('myCanvas');
var context = canvas.getContext('2d');
const NOTES = ['D', 'e', 'E', 'F', 'g', 'G', 'a', 'A', 'b', 'B', 'C', 'd'];
const MIDI_NOTES = ['D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'C', 'Db'];
const CENTER_X = canvas.width / 2;
const CENTER_Y = canvas.height / 2;
const CIRCLE_DEPTH = 60;
const NUM_OF_CIRCLES = 6;
const NUM_OF_SECTORS = 12;
const CENTRAL_NOTE = 5 * NUM_OF_SECTORS; // CENTRAL OCTAVE
const SEGMENT_WIDTH = 360 / NUM_OF_SECTORS;
const HALF_SECTOR_ANGLE = SEGMENT_WIDTH / 2;
var circles = [
    new Circle(0, 'tones', 'Gold', 6, 0, [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], 0),
    new Circle(1, 'penta', 'YellowGreen', 6, 0, [1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0], 0),
    new Circle(2, 'black', 'Black', 6, 0, [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1], 0),
    new Circle(3, 'red', 'FireBrick', 6, 0, [1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1], 0),
    new Circle(4, 'blue', 'DodgerBlue', 6, 0, [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0], 0),
    new Circle(5, 'white', 'Linen', 6, 0, [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0], 0),
];
var circleOrder = [0, 1, 2, 3, 4, 5];
var selectedCircle = 5;
var startAngle = 0 + HALF_SECTOR_ANGLE + 180;
var endAngle = (SEGMENT_WIDTH + HALF_SECTOR_ANGLE) + 180;
var startSector = 0;
var startNote = 0;
function refresh() {
    context.clearRect(0, 0, 1000, 1000);
    drawBackgroundCircle();
    for (var i = 0; i < NUM_OF_CIRCLES; i++) {
        drawCircle(i);
        drawNotes(i);
        drawChordNotes(i);
    }
}
function moveCircleIn() {
    moveCircle(selectedCircle, selectedCircle + 1);
}
function moveCircleOut() {
    moveCircle(selectedCircle, selectedCircle - 1);
}
function moveCircle(from, to) {
    if (to < 0)
        to = 5;
    if (to > 5)
        to = 0;
    var oldPosition = circleOrder[from];
    var newPosition = circleOrder[to];
    circleOrder[from] = newPosition;
    circleOrder[to] = oldPosition;
    selectedCircle = to;
}
function setTonality(note) {
    getSelectedCircle().startNote = Number(note) - 1;
}
function setNodeDensity(keyName) {
    getSelectedCircle().getChordNotes;
}
function init() {
    document.addEventListener('keydown', (event) => {
        const keyName = event.key;
        if (keyName.match('F\\d')) {
            if (event.shiftKey) {
                setTonality(keyName.substring(1));
            }
            else if (event.ctrlKey) {
                setChordNotes(keyName.charAt(1));
            }
            else {
                setChordStartNote(keyName.substring(1));
                playNotes();
            }
        }
        else {
            if (event.ctrlKey) {
                if (keyName == 'ArrowLeft') {
                    decCircleStartSector();
                }
                else if (keyName == 'ArrowRight') {
                    incCircleStartSector();
                }
                else if (keyName == 'ArrowDown') {
                    selectPrevOctave();
                }
                else if (keyName == 'ArrowUp') {
                    selectNextOctave();
                }
            }
            else if (event.shiftKey) {
                if (keyName == 'ArrowDown') {
                    moveCircleIn();
                }
                else if (keyName == 'ArrowUp') {
                    moveCircleOut();
                }
                else if (keyName == 'ArrowLeft') {
                    decCircleStartNote();
                }
                else if (keyName == 'ArrowRight') {
                    incCircleStartNote();
                }
            }
            else {
                if (keyName == ' ') {
                    playNotes();
                }
                else if (keyName == 'ArrowDown') {
                    selectNextCircle();
                }
                else if (keyName == 'ArrowUp') {
                    selectPrevCircle();
                }
                else if (keyName == 'ArrowLeft') {
                    decChordStartNote();
                }
                else if (keyName == 'ArrowRight') {
                    incChordStartNote();
                }
                else if (keyName == 'Home') {
                    resetStartSector();
                }
                else if (keyName == 'Insert') {
                    addChordNote();
                }
                else if (keyName == 'Delete') {
                    removeChordNote();
                }
            }
            if (keyName != ' ') {
                playClic();
            }
        }
        event.preventDefault();
        refresh();
    });
    refresh();
}
function incChordStartNote() {
    getSelectedCircle().incChordStartNote();
}
function decChordStartNote() {
    getSelectedCircle().decChordStartNote();
}
function setChordStartNote(note) {
    getSelectedCircle().setChordStartNote(Number(note));
}
function setChordNotes(numNotes) {
    getSelectedCircle().setChordNotes(Number(numNotes));
}
function addChordNote() {
    getSelectedCircle().addChordNote();
}
function removeChordNote() {
    getSelectedCircle().removeChordNote();
}
function selectNextOctave() {
    getSelectedCircle().octave++;
}
function selectPrevOctave() {
    getSelectedCircle().octave--;
}
function resetStartSector() {
    circles.forEach(t => t.startSector = 6);
}
function selectNextCircle() {
    selectedCircle++;
    selectedCircle %= 6;
}
function selectPrevCircle() {
    selectedCircle--;
    if (selectedCircle < 0)
        selectedCircle = 5;
}
function getSelectedCircle() {
    return circles[circleOrder[selectedCircle]];
}
function getCircle(numCircle) {
    return circles[circleOrder[numCircle]];
}
function decCircleStartSector() {
    getSelectedCircle().startSector--;
}
function incCircleStartSector() {
    getSelectedCircle().startSector++;
}
function decCircleStartNote() {
    getSelectedCircle().startNote--;
    if (getSelectedCircle().startNote < 0) {
        //getSelectedCircle().startNote = 11;
    }
}
function incCircleStartNote() {
    getSelectedCircle().startNote++;
    if (getSelectedCircle().startNote > 11) {
        //getSelectedCircle().startNote = 0;
    }
}
function drawNotes(numCircle) {
    var circle = getCircle(numCircle);
    var scheme = circle.noteScheme;
    var labelX = CENTER_X;
    var labelY = CENTER_Y;
    var angle = 360 / NUM_OF_SECTORS;
    for (var sector = 0; sector < NUM_OF_SECTORS; sector++) {
        labelX = CENTER_X + (CIRCLE_DEPTH * (numCircle + 1)) * Math.sin(angle * (circle.startSector + sector) * Math.PI / 180);
        labelY = CENTER_Y - (CIRCLE_DEPTH * (numCircle + 1)) * Math.cos(angle * (circle.startSector + sector) * Math.PI / 180);
        if (scheme[sector] == 1) {
            context.beginPath();
            context.arc(labelX, labelY, 12, 0, Math.PI * 2, false);
            context.fillStyle = 'White';
            context.fill();
            context.fillStyle = 'black';
            context.font = '15pt Calibri';
            var note = circle.startNote + sector;
            if (note > 11)
                note -= 12;
            if (note < 0)
                note += 12;
            context.fillText(NOTES[Math.abs(note) % NOTES.length], labelX - 5, labelY + 5);
        }
    }
}
function drawChordNotes(numCircle) {
    var circle = getCircle(numCircle);
    if (circle.chord.numNotes == 0) {
        return;
    }
    var notes = circle.getChordNotes();
    var scheme = circle.noteScheme;
    var labelX = CENTER_X;
    var labelY = CENTER_Y;
    var angle = 360 / NUM_OF_SECTORS;
    for (var note = 0; note < circle.chord.numNotes; note++) {
        labelX = CENTER_X + (CIRCLE_DEPTH * (numCircle + 1)) * Math.sin(angle * (circle.startSector + notes[note]) * Math.PI / 180);
        labelY = CENTER_Y - (CIRCLE_DEPTH * (numCircle + 1)) * Math.cos(angle * (circle.startSector + notes[note]) * Math.PI / 180);
        context.beginPath();
        context.arc(labelX, labelY, 5, 0, Math.PI * 2, true);
        if (note == 0) {
            context.strokeStyle = 'Red';
        }
        else {
            context.strokeStyle = 'Green';
        }
        context.stroke();
    }
}
function drawCircle(numCircle) {
    var circle = getCircle(numCircle);
    var radius = (1 + numCircle) * CIRCLE_DEPTH;
    context.strokeStyle = circle.color;
    for (var i = 0; i < NUM_OF_SECTORS; i++) {
        context.beginPath();
        context.arc(CENTER_X, CENTER_Y, radius, 0, Math.PI * 2, false);
        if (numCircle == selectedCircle) {
            context.lineWidth = CIRCLE_DEPTH;
            context.stroke();
        }
        else {
            context.lineWidth = 5;
            context.stroke();
        }
    }
}
function drawBackgroundCircle() {
    var radius = 7 * CIRCLE_DEPTH;
    context.fillStyle = 'Silver';
    context.beginPath();
    context.arc(CENTER_X, CENTER_Y, radius, 0, Math.PI * 2, true);
    context.lineWidth = CIRCLE_DEPTH;
    context.fill();
}
function playNotes() {
    var notes = getSelectedCircle().getChordNotes();
    var lastNote = notes[0];
    var offset = CENTRAL_NOTE + (getSelectedCircle().chord.octave * NUM_OF_SECTORS) + getSelectedCircle().startNote + (getSelectedCircle().octave * 12);
    notes.forEach(note => { note += offset; });
    playChord(notes);
}
init();
