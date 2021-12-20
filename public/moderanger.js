import './JZZ.js';
import './JZZ.synth.Tiny.js';
window.onload = function () {
    // document.getElementById() code here
};
JZZ.synth.Tiny.register('Synth');
var sound = JZZ().openMidiOut().or(function () { alert('Cannot open MIDI port!'); });
var canvas = document.getElementById('myCanvas');
var context = canvas.getContext('2d');
var NOTES = ['D', 'e', 'E', 'F', 'g', 'G', 'a', 'A', 'b', 'B', 'C', 'd'];
var MIDI_NOTES = ['D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'C', 'Db'];
var CENTER_X = canvas.width / 2;
var CENTER_Y = canvas.height / 2;
var CIRCLE_DEPTH = 60;
var NUM_OF_CIRCLES = 6;
var NUM_OF_SECTORS = 12;
var CENTRAL_NOTE = 5 * NUM_OF_SECTORS; // CENTRAL OCTAVE
var SEGMENT_WIDTH = 360 / NUM_OF_SECTORS;
var HALF_SECTOR_ANGLE = SEGMENT_WIDTH / 2;
var Chord = /** @class */ (function () {
    function Chord(rootPosition, numNotes, octave) {
        this.rootPosition = rootPosition;
        this.numNotes = numNotes;
        this.octave = octave;
    }
    return Chord;
}());
var Circle = /** @class */ (function () {
    function Circle(id, name, color, startSector, startNote, noteScheme) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.startSector = startSector;
        this.startNote = startNote;
        this.noteScheme = noteScheme;
        this.chord = new Chord(0, 0, 0);
    }
    Circle.prototype.incChordStartNote = function () {
        this.chord.rootPosition = this.getNextScalePosition();
    };
    Circle.prototype.decChordStartNote = function () {
        this.chord.rootPosition = this.getPrevScalePosition();
    };
    Circle.prototype.getChordNotes = function () {
        var notes = [];
        var position = this.chord.rootPosition;
        if (this.chord.numNotes > 0) {
            notes.push(position);
        }
        for (var i = 1; i < this.chord.numNotes; i++) {
            position = this.getNextChordPosition(position);
            notes.push(position);
        }
        return notes;
    };
    Circle.prototype.getNextChordPosition = function (position) {
        var firstPosition = this.getNextInterleavedScalePosition(position);
        return this.getNextInterleavedScalePosition(firstPosition);
    };
    Circle.prototype.getNextInterleavedScalePosition = function (position) {
        do {
            position++;
            if (position >= this.noteScheme.length) {
                //position = 0;
            }
        } while (this.noteScheme[Math.abs(position) % this.noteScheme.length] == 0);
        return position;
    };
    Circle.prototype.getPrevChordPosition = function (position) {
        var firstPosition = this.getPrevInterleavedScalePosition(position);
        return this.getPrevInterleavedScalePosition(firstPosition);
    };
    Circle.prototype.getPrevInterleavedScalePosition = function (position) {
        do {
            position--;
            if (position < 0) {
                //position = this.noteScheme.length - 1;
            }
        } while (this.noteScheme[Math.abs(position) % this.noteScheme.length] == 0);
        return position;
    };
    Circle.prototype.getNextScalePosition = function () {
        var i = this.chord.rootPosition;
        do {
            i++;
            if (i >= this.noteScheme.length) {
                //i = 0 ;
                //this.getSelectedCircle().chord.octave++;
            }
        } while (this.noteScheme[Math.abs(i) % this.noteScheme.length] == 0);
        return i;
    };
    Circle.prototype.getPrevScalePosition = function () {
        var i = this.chord.rootPosition;
        do {
            i--;
            if (i < 0) {
                //i = this.noteScheme.length - 1;
                //this.getSelectedCircle().chord.octave--;
            }
        } while (this.noteScheme[Math.abs(i) % this.noteScheme.length] == 0);
        return i;
    };
    Circle.prototype.getNumScaleNotes = function () {
        return this.noteScheme.filter(function (t) { return t == 1; }).length;
    };
    Circle.prototype.addChordNote = function () {
        if (this.chord.numNotes < this.getNumScaleNotes()) {
            this.chord.numNotes++;
        }
    };
    Circle.prototype.removeChordNote = function () {
        if (this.chord.numNotes > 0) {
            this.chord.numNotes--;
        }
    };
    return Circle;
}());
var circles = [
    new Circle(0, 'tones', 'Gold', 6, 0, [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]),
    new Circle(1, 'penta', 'YellowGreen', 6, 0, [1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0]),
    new Circle(2, 'black', 'Black', 6, 0, [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1]),
    new Circle(3, 'red', 'FireBrick', 6, 0, [1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1]),
    new Circle(4, 'blue', 'DodgerBlue', 6, 0, [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0]),
    new Circle(5, 'white', 'Linen', 6, 0, [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0]),
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
var PlayMode;
(function (PlayMode) {
    PlayMode[PlayMode["Chord"] = 0] = "Chord";
    PlayMode[PlayMode["Arpeggio"] = 1] = "Arpeggio";
})(PlayMode || (PlayMode = {}));
var Status = /** @class */ (function () {
    /**
     *
     */
    function Status() {
    }
    return Status;
}());
/*
* Mode selector: [chord,arpeggio] - .
* Note selector: F1-F12
* Grade shifting: up-down
* Tonality selector: shift+ F1-F12
* Density selector: 1-7 (qwertyu)
* Octave selector: 1-7 (asdfghj)
* Circle selector: 1-6 (zxcvbn)
*/
function keyboardManager() {
    document.addEventListener('keydown', function (event) {
        var keyName = event.key;
        if (keyName.match('F\d')) {
            if (event.shiftKey) {
                playNote(keyName.charAt(1));
            }
            else {
                setTonality(keyName.charAt(1));
            }
        }
        else {
            if (keyName.match('[qwertyuiop]')) {
                setNodeDensity(keyName);
            }
            else if (keyName.match('[asdfghjklñ]')) {
                setOctave(keyName);
            }
            else if (keyName.match('[zxcvbn]')) {
                setModeSelected(keyName);
            }
            else if (keyName === '.') {
                setArpeggioMode();
            }
            else if (keyName === '-') {
                setChordMode();
            }
        }
    });
}
function init() {
    document.addEventListener('keydown', function (event) {
        var keyName = event.key;
        if (event.ctrlKey) {
            if (keyName == 'ArrowLeft') {
                decCircleStartSector();
            }
            else if (keyName == 'ArrowRight') {
                incCircleStartSector();
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
                playChord();
            }
            if (keyName == 'ArrowDown') {
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
function addChordNote() {
    getSelectedCircle().addChordNote();
}
function removeChordNote() {
    getSelectedCircle().removeChordNote();
}
function resetStartSector() {
    circles.forEach(function (t) { return t.startSector = 6; });
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
function playClic() {
    sound.noteOn(9, 80, 50)
        .wait(100)
        .noteOff(9, 80);
}
function playChord() {
    var notes = getSelectedCircle().getChordNotes();
    var lastNote = notes[0];
    var offset = CENTRAL_NOTE + (getSelectedCircle().chord.octave * NUM_OF_SECTORS) + getSelectedCircle().startNote;
    notes.forEach(function (note) {
        if (note < lastNote) {
            //       getSelectedCircle().chord.octave++;
        }
        lastNote = note;
        note += offset;
        sound.noteOn(0, note, 50)
            .wait(100)
            .noteOff(0, note);
    });
}
init();
function playNote(arg0) {
    throw new Error('Function not implemented.');
}
function setTonality(arg0) {
    throw new Error('Function not implemented.');
}
function setChordMode() {
    throw new Error('Function not implemented.');
}
function setArpeggioMode() {
    throw new Error('Function not implemented.');
}
function setNodeDensity(keyName) {
    throw new Error('Function not implemented.');
}
function setOctave(keyName) {
    throw new Error('Function not implemented.');
}
function setModeSelected(keyName) {
    throw new Error('Function not implemented.');
}
