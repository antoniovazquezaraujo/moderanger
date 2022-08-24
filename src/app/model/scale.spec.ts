import { TestBed } from '@angular/core/testing';
import { OctavedGrade, Scale } from './scale';

describe('BlockComponent', () => {
  let scale: Scale;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Scale]
    })
      .compileComponents();
  });


  it('should create the app', () => {
    scale = new Scale([]);
    expect(scale).toBeTruthy();
  });

  it('octavedGrade is working', () => {
    scale = new Scale([0, 2, 3, 5, 7, 9, 10]);
    expect(true).toBeTruthy();
    console.log("-------------------------------------------------");
    var grade = new OctavedGrade(scale, -10, -10,'');
    for (var i = 0; i < 10; i++) {
      grade.addGrade(-1);
      console.log("Grade: " + grade.grade + " Octave:" + grade.octave + " Note: " + grade.toNote());
    }
  })
  it('scale methods are working', () => {
    scale = new Scale([0, 2, 3, 5, 7, 9, 10]);
    console.log("-------------------------------------------------");
    // for (var grade = -10; grade < 10; grade++) {
    //   console.log("Grade: " + grade );
    //   for (var density = 3; density < 6; density++) {
    //     console.log("Density: " + density);
    //     for (var gap = 1; gap < 3; gap++) {
    //       console.log("Gap: " + gap);
    //       scale.getSelectedGrades(grade, density, gap).forEach(g => {
    //         console.log("Grade: " + g.grade + " Octave:" + g.octave + " Note: " + g.toNote());
    //       });
    //     }
    //   }
    // }
    var arpegioGrades: OctavedGrade[] = [
      new OctavedGrade(scale, 0, 0 ,''),
      new OctavedGrade(scale, 3, 0,'' )

    ];
    var baseGap:number = 1;
    var decorationPattern:string =  "1 -1 0 3";
    var decorationGap: number = 1;
 
    console.log("ArpegioGrades:"+ arpegioGrades.map(g => g.toNote()).join(" "));
    scale.getDecoratedGrades(arpegioGrades, baseGap, decorationPattern, decorationGap).forEach(g => {
      console.log("Grade: " + g.grade + " Octave:" + g.octave + " Note: " + g.toNote());
    }); 
 
  })
 
});



