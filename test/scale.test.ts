import{ getScaleByName, Scale }from '../target/Scale';

test('getNotePosition is working', () => {
   var scale = getScaleByName('white');
   expect(scale.getNotePosition(0)).toBe(0);
   expect(scale.getNotePosition(1)).toBe(2);
   expect(scale.getNotePosition(2)).toBe(3);
   expect(scale.getNotePosition(3)).toBe(5);
   expect(scale.getNotePosition(4)).toBe(7);
   expect(scale.getNotePosition(5)).toBe(9);
   expect(scale.getNotePosition(6)).toBe(10);
   
   expect(scale.getNumNotes()).toBe(7);
});

test('getChordNotes is working', () => {
    var scale = getScaleByName('white');

    // Add one note to the root
    expect(scale.getChordNotes(0,1)).toStrictEqual([0,3]);
    expect(scale.getChordNotes(1,1)).toStrictEqual([2,5]);
    expect(scale.getChordNotes(2,1)).toStrictEqual([3,7]);
    expect(scale.getChordNotes(3,1)).toStrictEqual([5,9]);
    expect(scale.getChordNotes(4,1)).toStrictEqual([7,10]);
    expect(scale.getChordNotes(5,1)).toStrictEqual([9,12]);
    expect(scale.getChordNotes(6,1)).toStrictEqual([10,12]);

    // Add three notes to the root
    expect(scale.getChordNotes(0,3)).toStrictEqual([0,3,7,10])
    expect(scale.getChordNotes(1,3)).toStrictEqual([2,5,9,12])
    expect(scale.getChordNotes(2,3)).toStrictEqual([3,7,10,12])
    expect(scale.getChordNotes(3,3)).toStrictEqual([5,9,12,15])
    expect(scale.getChordNotes(4,3)).toStrictEqual([7,10,12,15])
    expect(scale.getChordNotes(5,3)).toStrictEqual([9,12,15,19])
    expect(scale.getChordNotes(6,3)).toStrictEqual([10,12,15,19])
 });