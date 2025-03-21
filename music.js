"use strict";
function assert(condition, message = "Assertion failed") {
    if (!condition) {
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        else {
            throw message;
        }
    }
}
function assertionFailure(message = "Assertion failed: unreachable code") {
    throw message;
}
let cachedWidth = undefined;
$(window).on("resize", function () {
    cachedWidth = document.documentElement.clientWidth; //reading this width is SLOWWWW.
});
/** Converts from vw (hundredths of viewport width) to pixels */
function vw(vw) {
    if (cachedWidth === undefined) {
        cachedWidth = document.documentElement.clientWidth;
    }
    return Math.round(vw * cachedWidth / 100);
}
/** Converts from em to pixels, relative to the font size of the element `relativeTo`, or `document.body` if no element is given. */
function em(em, relativeTo = document.body) {
    return Math.round(parseFloat(getComputedStyle(relativeTo).fontSize) * em);
}
class Settings {
    constructor(clefName, oneRangeBoundary, otherRangeBoundary) {
        this.clefName = clefName;
        this.oneRangeBoundary = oneRangeBoundary;
        this.otherRangeBoundary = otherRangeBoundary;
    }
    static get shared() {
        if (this._shared) {
            return this._shared;
        }
        this._shared = this.decode(location.search);
        return this._shared;
    }
    static decode(settingsCode) {
        const params = new URLSearchParams(settingsCode);
        const clefName = params.get("clef");
        if (clefName === null || !isClefName(clefName)) {
            return new Settings("Treble", Clef.named("Treble").bottomLine, Clef.named("Treble").topLine);
        }
        const oneBoundaryString = params.get("from");
        const otherBoundaryString = params.get("to");
        if (!oneBoundaryString || !otherBoundaryString) {
            return new Settings(clefName, Clef.named(clefName).bottomLine, Clef.named(clefName).topLine);
        }
        const oneBoundary = Pitch.fromString(oneBoundaryString);
        const otherBoundary = Pitch.fromString(otherBoundaryString);
        if (!oneBoundary || !otherBoundary) {
            return new Settings(clefName, Clef.named(clefName).bottomLine, Clef.named(clefName).topLine);
        }
        return new Settings(clefName, oneBoundary, otherBoundary);
    }
    encode() {
        const params = new URLSearchParams();
        params.append("clef", this.clefName);
        params.append("from", this.oneRangeBoundary.toString());
        params.append("to", this.otherRangeBoundary.toString());
        return params.toString();
    }
    randomNote() {
        let lower = this.oneRangeBoundary;
        let higher = this.otherRangeBoundary;
        if (lower.letterNameNumber > higher.letterNameNumber) {
            higher = this.oneRangeBoundary;
            lower = this.otherRangeBoundary;
        }
        let choices = [];
        let current = lower;
        while (current.letterNameNumber <= higher.letterNameNumber) {
            choices.push(current);
            current = current.moved(1);
        }
        assert(choices.length > 0);
        return choices[Math.floor(Math.random() * choices.length)];
    }
}
/**
 * A sound effect that can be audibly played, such as a click, part of a countoff, or a backing loop.
 *
 * Sounds are preloaded at initialization.
 * I don't have the slightest idea why, but you need to delete all instances of "export" in howler/index.d.ts for this to compile... :(
 */
class Sound {
    constructor(name, loop = false, rate = 1) {
        if (Sound.howls[name] === undefined) {
            Sound.howls[name] = new Howl({
                src: [`media/sounds/${name}.mp3`],
                loop: loop,
                preload: true,
                rate: rate
            });
        }
        this.value = Sound.howls[name];
    }
    play() {
        this.value.play();
    }
    stop() {
        this.value.stop();
    }
    static get correct() { return new Sound("correct"); }
    static get wrong() { return new Sound("wrong"); }
    static get fanfare() { return new Sound("fanfare"); }
}
Sound.howls = Object.create(null);
const AllNoteNames = ["C", "D", "E", "F", "G", "A", "B"];
function isNoteName(value) {
    return AllNoteNames.map(x => x).includes(value);
}
class PitchClass {
    constructor(noteName) {
        this.noteName = noteName;
    }
    /** The next letter name up from this one */
    get raisedOneLetter() {
        return new PitchClass(AllNoteNames[(AllNoteNames.indexOf(this.noteName) + 1) % 7]);
    }
    isEqual(other) {
        return other.noteName === this.noteName;
    }
    get letterNameNumber() {
        return AllNoteNames.indexOf(this.noteName);
    }
    get buttonID() {
        return this.noteName.toLowerCase();
    }
    static fromButtonID(buttonID) {
        let letterName = buttonID.toUpperCase();
        if (!isNoteName(letterName)) {
            assertionFailure();
        }
        return new PitchClass(letterName);
    }
    get buttonName() {
        return this.noteName;
    }
    static get all() {
        return AllNoteNames.map(x => new PitchClass(x));
    }
}
const AllOctaves = [0, 1, 2, 3, 4, 5, 6, 7];
function isOctave(value) {
    return AllOctaves.map(x => x).includes(value);
}
class Pitch {
    constructor(noteName, octave) {
        this.pitchClass = new PitchClass(noteName);
        this.octave = octave;
    }
    static fromString(string) {
        const letterName = string[0];
        console.log(letterName);
        if (!isNoteName(letterName)) {
            return undefined;
        }
        const octave = parseInt(string[1]);
        console.log(octave);
        if (!isOctave(octave)) {
            return undefined;
        }
        console.log("Success!");
        return new Pitch(letterName, octave);
    }
    toString() {
        return `${this.pitchClass.noteName}${this.octave}`;
    }
    /** The note `amount` letter names higher or lower than this one, ignoring accidental */
    moved(amount) {
        return Pitch.fromLetterNameNumber(this.letterNameNumber + amount);
    }
    /** The distance above C-1 by letter name, ignoring accidental.
    
    - Note: This is equivalent to counting white keys on a piano keyboard, starting at C-1, five octaves below middle C.**/
    get letterNameNumber() {
        return ((this.octave + 1) * 7) + this.pitchClass.letterNameNumber;
    }
    /** Creates a new pitch using the distance above C-1 by letter name, ignoring accidental. */
    static fromLetterNameNumber(number) {
        const noteName = AllNoteNames[number % 7];
        const octave = Math.floor(number / 7) - 1;
        if (!isOctave(octave)) {
            assertionFailure();
        }
        return new Pitch(noteName, octave);
    }
    notation(id, clef) {
        let ledgerLines = this.ledgerLines(clef);
        const note = `<span id="${id}" class="note" style="top: ${-this.height(clef) * Pitch.verticalNoteSpacing}em">${this.noteCharacter(clef)}</span>`;
        return ledgerLines + note;
    }
    noteCharacter(clef) {
        if (clef.center.letterNameNumber > this.letterNameNumber) {
            return "\ue1d5";
        }
        else {
            return "\ue1d6";
        }
    }
    /** The number of notes above the bottom line of the staff this note sits in `clef` */
    height(clef) {
        return -(clef.center.letterNameNumber - 4 - this.letterNameNumber);
    }
    /** The number of notes above the center line of the staff this note sits in `clef` */
    distanceFromCenter(clef) {
        return -(clef.center.letterNameNumber - this.letterNameNumber);
    }
    /** Whether or not this note is close enough to the staff in the given `clef` to be reasonably drawn */
    isAllowedIn(clef) {
        return Math.abs(this.distanceFromCenter(clef)) <= Pitch.maxDistanceFromCenter;
    }
    ledgerLines(clef) {
        let count;
        let height;
        let offset;
        if (this.height(clef) > 8) {
            count = Math.floor((this.height(clef) - 8) / 2);
            height = 8;
            offset = 2;
        }
        else if (this.height(clef) < 0) {
            count = Math.floor(Math.abs(this.height(clef)) / 2);
            height = 0;
            offset = -2;
        }
        else {
            return "";
        }
        let result = "";
        for (let i = 0; i < count; i++) {
            height += offset;
            result += `<span class="ledgerLine" style="top: ${-height * Pitch.verticalNoteSpacing}em">${Pitch.ledgerLineCharacter}</span>`;
        }
        return result;
    }
}
Pitch.maxDistanceFromCenter = 11;
Pitch.verticalNoteSpacing = 0.125;
Pitch.ledgerLineCharacter = "\ue022";
const AllClefNames = ["Treble", "Bass", "Tenor", "Alto"];
function isClefName(value) {
    return AllClefNames.map(x => x).includes(value);
}
class Clef {
    constructor(name, center, character, characterOffset) {
        this.name = name;
        this.center = center;
        this.character = character;
        this.characterOffset = characterOffset;
    }
    get bottomLine() {
        return this.center.moved(-4);
    }
    get topLine() {
        return this.center.moved(4);
    }
    get emOffset() {
        return this.characterOffset * Pitch.verticalNoteSpacing;
    }
    get notation() {
        return `<span class="clef" style="top: ${this.emOffset}em">${this.character}</span>`;
    }
    static get treble() {
        return new Clef("Treble", new Pitch("B", 4), "\ue050", -2);
    }
    static get bass() {
        return new Clef("Bass", new Pitch("D", 3), "\ue062", -6);
    }
    static get tenor() {
        return new Clef("Tenor", new Pitch("A", 3), "\ue05c", -6);
    }
    static get alto() {
        return new Clef("Alto", new Pitch("C", 4), "\ue05c", -4);
    }
    static named(clefName) {
        switch (clefName) {
            case "Treble": return this.treble;
            case "Bass": return this.bass;
            case "Tenor": return this.tenor;
            case "Alto": return this.alto;
        }
    }
    static get all() {
        return AllClefNames.map(x => Clef.named(x));
    }
}
class Piece {
    constructor(clef, notes, pieceID) {
        this.clef = clef;
        this.notes = notes;
        this.pieceID = pieceID;
    }
    static newRandomMain() {
        const length = 20;
        let notes = [];
        for (let i = 0; i < length; i++) {
            notes.push(Settings.shared.randomNote());
        }
        return new Piece(Clef.named(Settings.shared.clefName), notes, "main");
    }
    idForNoteIndex(noteIndex) {
        assert(noteIndex >= 0);
        return this.pieceID + "-note" + noteIndex;
    }
    notation(finalBarline = false) {
        let notation = Piece.spacer();
        let staffBackground = "";
        staffBackground += Piece.staff(2);
        notation += this.clef.notation;
        notation += Piece.spacer(3);
        for (let i = 0; i < this.notes.length; i++) {
            let note = this.notes[i];
            staffBackground += Piece.staff(2);
            notation += note.notation(this.idForNoteIndex(i), this.clef);
        }
        staffBackground += Piece.staff();
        if (finalBarline) {
            staffBackground += Piece.staff() + `<span class="finalBarline">${Piece.finalBarlineCharacter}</span>`;
        }
        return `<div class="staff-background">${staffBackground}</div>${notation}`;
    }
    static staff(length = 1) {
        let result = "";
        for (let i = 0; i < Math.floor(length); i++) {
            result += `<span class="staffPiece">${this.staffCharacter}</span>`;
        }
        return result;
    }
    static spacer(length = 1) {
        let result = "";
        for (let i = 0; i < Math.floor(length); i++) {
            result += this.spacerCharacter;
        }
        if (Math.floor(length) < length) {
            result += this.spacerCharacterNarrow;
        }
        return result;
    }
}
Piece.staffCharacter = "\ue014";
Piece.spacerCharacter = "&nbsp;";
Piece.spacerCharacterNarrow = "&thinsp;";
Piece.finalBarlineCharacter = "\ue032";
