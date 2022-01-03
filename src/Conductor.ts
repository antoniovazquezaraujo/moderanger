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

*/
export class Conductor {
    orchestraView: OrchestraView;

    constructor(orchestraView: OrchestraView){
        this.orchestraView = orchestraView;
    }  
    start(): void {
        document.addEventListener('keydown', (event) => {
            const keyName = event.key;
            event.preventDefault();
            if (keyName.match(/F\d/)) {
                if (event.shiftKey) {
                    this.setTonality(Number(keyName.substring(1))-1);
                } else if (event.ctrlKey) {
                    this.setNodeDensity(Number(keyName.charAt(1))-1);
                } else {
                    this.playNote(Number(keyName.substring(1))-1);
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
            } else if (keyName.match(/[123456789]/)) {
                if (event.ctrlKey) {
                    this.setInversion(Number(keyName.charAt(0)));
                }else{
                    this.setOctave(Number(keyName.charAt(0)));
                }
            }
            this.refresh();
        });
    }
    refresh(){
        this.orchestraView.draw();
        this.orchestraView.orchestra.selectNotesToPlay();
4    }
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

    playNote(note: number) {
        this.orchestraView.getSelectedView().getInstrument().player.selectedNote = note;
    }

    moveInstrumentUp() {
        this.orchestraView.moveView(this.orchestraView.selectedView, this.orchestraView.selectedView+1);
    }

    moveInstrumentDown() {
        this.orchestraView.moveView(this.orchestraView.selectedView, this.orchestraView.selectedView-1);
    }

    selectNextInstrument() {
        this.orchestraView.selectNextView();
    }

    selectPrevInstrument() {
        this.orchestraView.selectPrevView();
    }


}