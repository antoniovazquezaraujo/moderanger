import { OrchestraView } from "./OrchestraView";

window.onload = function () {

}

/*
    Teclas:
    F1-F12: tocar notas
    Shift+F1-F12: cambiar tonalidad
    Ctrl+F1-F12: cambiar densidad de notas
    1-9:seleccionar octava
    Ctrl+1-9:seleccionar inversion
    Up,Down:seleccionar instrumento
    Ctrl+Up,Down:mover instrumento
    Right,Left: rotar instrumento
    Ctrl+Right,Left: cambiar escala
*/
export class KeyboardConductor  {
    orchestraView: OrchestraView;

    constructor(orchestraView: OrchestraView) {
        this.orchestraView = orchestraView;
    }
    start(): void {
        document.addEventListener('keydown', (event) => {
            const keyName = event.key;
            event.preventDefault();
            if (keyName.match(/F\d/)) {
                if (event.shiftKey) {
                    this.setTonality(Number(keyName.substring(1)) - 1);
                } else if (event.ctrlKey) {
                    this.setNodeDensity(Number(keyName.charAt(1)) - 1);
                } else {
                    this.selectNoteInInstrument(Number(keyName.substring(1)) - 1);
                    this.orchestraView.orchestra.selectNotesToPlay();
                    this.orchestraView.play();
                }
            } else if (keyName === 'ArrowDown') {
                if (event.ctrlKey) {
                    this.moveInstrumentUp();
                } else {
                    this.selectNextInstrument();
                }
            } else if (keyName === 'ArrowUp') {
                if (event.ctrlKey) {
                    this.moveInstrumentDown();
                } else {
                    this.selectPrevInstrument();
                }
            } else if (keyName === 'ArrowLeft') {
                if (event.ctrlKey) {
                    this.selectPrevScale();
                } else {
                    this.rotateInstrumentLeft();
                }
            } else if (keyName === 'ArrowRight') {
                if (event.ctrlKey) {
                    this.selectNextScale();
                } else {
                    this.rotateInstrumentRight();
                }
            } else if (keyName.match(/[123456789]/)) {
                if (event.ctrlKey) {
                    this.setInversion(Number(keyName.charAt(0)));
                } else {
                    this.setOctave(Number(keyName.charAt(0)));
                }
            }
            this.refresh();
        });
    }
    refresh() {        
        this.orchestraView.draw();
    }
    // delay(ms: number) {
    //     return new Promise(resolve => setTimeout(resolve, ms));
    // }

    setInversion(inversion: number) {
        this.orchestraView.getSelectedView().getInstrument().player.inversion = inversion;
    }

    setTonality(tonality: number) {
        this.orchestraView.getSelectedView().getInstrument().tonality = tonality;
    }

    setNodeDensity(density: number) {
        this.orchestraView.getSelectedView().getInstrument().player.density = density;
    }
    setOctave(octave: number) {
        this.orchestraView.getSelectedView().getInstrument().player.octave = octave;
    }

    selectNoteInInstrument(note: number) {
        this.orchestraView.getSelectedView().getInstrument().player.selectedNote = note;
    }

    moveInstrumentUp() {
        this.orchestraView.moveView(this.orchestraView.selectedView, this.orchestraView.selectedView + 1);
    }

    moveInstrumentDown() {
        this.orchestraView.moveView(this.orchestraView.selectedView, this.orchestraView.selectedView - 1);
    }
    rotateInstrumentLeft() {
        this.orchestraView.getSelectedView().orientation--;
    }
    rotateInstrumentRight() {
        this.orchestraView.getSelectedView().orientation++;
    }
    selectPrevScale() {
        this.orchestraView.getSelectedView().getInstrument().selectPrevScale();
    }
    selectNextScale() {
        this.orchestraView.getSelectedView().getInstrument().selectNextScale();
    }
    selectNextInstrument() {
        this.orchestraView.selectNextView();
    }

    selectPrevInstrument() {
        this.orchestraView.selectPrevView();
    }


}