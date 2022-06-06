function assert(condition: boolean, message = "Assertion failed") {
	if (!condition) {
		if (typeof Error !== "undefined") {
			throw new Error(message);
		} else {
			throw message;
		}
	}
}

function assertionFailure(message = "Assertion failed: unreachable code"): never {
	throw message;
}

let cachedWidth: number | undefined = undefined;
$(window).on("resize", function() {
	cachedWidth = document.documentElement.clientWidth; //reading this width is SLOWWWW.
});

/** Converts from vw (hundredths of viewport width) to pixels */
function vw(vw: number) {
	if (cachedWidth === undefined) {
		cachedWidth = document.documentElement.clientWidth;
	}
	return Math.round(vw * cachedWidth / 100);
}

/** Converts from em to pixels, relative to the font size of the element `relativeTo`, or `document.body` if no element is given. */
function em(em: number, relativeTo = document.body) {
	return Math.round(parseFloat(getComputedStyle(relativeTo).fontSize) * em);
}

class Settings {
    clefName: ClefName
    oneRangeBoundary: Pitch
    otherRangeBoundary: Pitch

    constructor(clefName: ClefName, oneRangeBoundary: Pitch, otherRangeBoundary: Pitch) {
        this.clefName = clefName;
        this.oneRangeBoundary = oneRangeBoundary;
        this.otherRangeBoundary = otherRangeBoundary;
    }

    private static _shared?: Settings;
    static get shared(): Settings {
        if (this._shared) {
            return this._shared;
        }
        this._shared = this.decode(location.search);
        return this._shared;
    }

    private static decode(settingsCode: string) {
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
        
        let choices: Pitch[] = [];
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
	private value: Howl;
	private static howls = Object.create(null);

	private constructor(name: string, loop = false, rate = 1) {
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

const AllNoteNames = ["C", "D", "E", "F", "G", "A", "B"] as const;
type NoteName = typeof AllNoteNames[number];
function isNoteName(value: string): value is NoteName {
    return AllNoteNames.map(x => x as string).includes(value);
}

class PitchClass {
    readonly noteName: NoteName;
    
    constructor(noteName: NoteName) {
        this.noteName = noteName;
    }

    /** The next letter name up from this one */
    get raisedOneLetter() {
        return new PitchClass(AllNoteNames[(AllNoteNames.indexOf(this.noteName) + 1) % 7]);
    }

    isEqual(other: PitchClass) {
        return other.noteName === this.noteName;
    }

    get letterNameNumber() {
        return AllNoteNames.indexOf(this.noteName);
    }

    get buttonID() {
        return this.noteName.toLowerCase();
    }

    static fromButtonID(buttonID: String) {
        let letterName = buttonID.toUpperCase();
        if (!isNoteName(letterName)) { assertionFailure(); }

        return new PitchClass(letterName);
    }

    get buttonName() {
        return this.noteName;
    }

    static get all() {
        return AllNoteNames.map(x => new PitchClass(x));
    }
}

const AllOctaves = [0, 1, 2, 3, 4, 5, 6, 7] as const;
type Octave = typeof AllOctaves[number];
function isOctave(value: number): value is Octave {
    return AllOctaves.map(x => x as number).includes(value);
}

class Pitch {
    readonly pitchClass: PitchClass;
    readonly octave: Octave;

    constructor(noteName: NoteName, octave: Octave) {
        this.pitchClass = new PitchClass(noteName);
        this.octave = octave;
    }

    static fromString(string: string) {
        const letterName = string[0];
        console.log(letterName);
        if (!isNoteName(letterName)) { return undefined; }
        const octave = parseInt(string[1]);
        console.log(octave);
        if (!isOctave(octave)) { return undefined; }
        console.log("Success!");
        return new Pitch(letterName, octave);
    }

    toString() {
        return `${this.pitchClass.noteName}${this.octave}`;
    }

    /** The note `amount` letter names higher or lower than this one, ignoring accidental */
    moved(amount: number) {
        return Pitch.fromLetterNameNumber(this.letterNameNumber + amount);
    }

    /** The distance above C-1 by letter name, ignoring accidental.
    
    - Note: This is equivalent to counting white keys on a piano keyboard, starting at C-1, five octaves below middle C.**/
    get letterNameNumber() {
        return ((this.octave + 1) * 7) + this.pitchClass.letterNameNumber;
    }

    /** Creates a new pitch using the distance above C-1 by letter name, ignoring accidental. */
    static fromLetterNameNumber(number: number) {
        const noteName = AllNoteNames[number % 7];
        const octave = Math.floor(number / 7) - 1;
        if (!isOctave(octave)) { assertionFailure(); }
        return new Pitch(noteName, octave);
    }

    notation(id: string, clef: Clef) {
        let ledgerLines = this.ledgerLines(clef);
        const note = `<span id="${id}" class="note" style="top: ${-this.height(clef) * Pitch.verticalNoteSpacing}em">${this.noteCharacter(clef)}</span>`;
        return ledgerLines + note;
    }

    noteCharacter(clef: Clef) {
        if (clef.center.letterNameNumber > this.letterNameNumber) {
            return "\ue1d5";
        } else {
            return "\ue1d6";
        }
    }

    /** The number of notes above the bottom line of the staff this note sits in `clef` */
    height(clef: Clef) {
        return -(clef.center.letterNameNumber - 4 - this.letterNameNumber);
    }

    /** The number of notes above the center line of the staff this note sits in `clef` */
    private distanceFromCenter(clef: Clef) {
        return -(clef.center.letterNameNumber - this.letterNameNumber);
    }

    private static readonly maxDistanceFromCenter = 11;

    /** Whether or not this note is close enough to the staff in the given `clef` to be reasonably drawn */
    isAllowedIn(clef: Clef) {
        return Math.abs(this.distanceFromCenter(clef)) <= Pitch.maxDistanceFromCenter;
    }

    ledgerLines(clef: Clef) {
        let count: number;
        let height: number;
        let offset: number;

        if (this.height(clef) > 8) {
            count = Math.floor((this.height(clef) - 8) / 2);
            height = 8;
            offset = 2;
        } else if (this.height(clef) < 0) {
            count = Math.floor(Math.abs(this.height(clef)) / 2);
            height = 0;
            offset = -2;
        } else {
            return "";
        }

        let result = "";

        for (let i = 0; i < count; i++) {
            height += offset;
            result += `<span class="ledgerLine" style="top: ${-height * Pitch.verticalNoteSpacing}em">${Pitch.ledgerLineCharacter}</span>`;
        }

        return result;
    }

    static readonly verticalNoteSpacing = 0.125;
    static readonly ledgerLineCharacter = "\ue022";
}

const AllClefNames = ["Treble", "Bass", "Tenor"] as const;
type ClefName = typeof AllClefNames[number];
function isClefName(value: string): value is ClefName {
    return AllClefNames.map(x => x as string).includes(value);
}

class Clef {
    readonly name: string;
    /** The `Pitch` that should be placed on the middle line of the staff */
    readonly center: Pitch;
    /** The SMuFL character to be displayed in notation for this clef */
    private readonly character: string;
    /** The number of notes to offset the SMuFL character by to align properly with the staff */
    readonly characterOffset: number;

    constructor(name: string, center: Pitch, character: string, characterOffset: number) {
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

    private get emOffset() {
        return this.characterOffset * Pitch.verticalNoteSpacing;
    }

    get notation() {
        return `<span class="clef" style="top: ${this.emOffset}em">${this.character}</span>`;
    }

    static get treble() {
        return new Clef("Treble", new Pitch("B",4), "\ue050", -2);
    }

    static get bass() {
        return new Clef("Bass", new Pitch("D",3), "\ue062", -6);
    }

    static get tenor() {
        return new Clef("Tenor", new Pitch("A",3), "\ue05c", -6);
    }

    static named(clefName: ClefName): Clef {
        switch (clefName) {
            case "Treble": return this.treble;
            case "Bass": return this.bass;
            case "Tenor": return this.tenor;
        }
    }

    static get all() {
        return AllClefNames.map(x => Clef.named(x));
    }
}

class Piece {
    readonly clef: Clef;
    readonly notes: Pitch[];

    /** A unique ID for this piece, usable to look up generated notation as HTML elements. */
	pieceID?: string;

    constructor(clef: Clef, notes: Pitch[], pieceID?: string) {
        this.clef = clef;
        this.notes = notes;
        this.pieceID = pieceID;
    }

    static newRandomMain() {
        const length = 20;
        let notes: Pitch[] = [];
        for (let i = 0; i < length; i++) {
            notes.push(Settings.shared.randomNote());
        }
        return new Piece(Clef.named(Settings.shared.clefName), notes, "main");
    }

    idForNoteIndex(noteIndex: number) {
		assert(noteIndex >= 0);
		return this.pieceID + "-note" + noteIndex;
	}
    
    notation(finalBarline: boolean = false) {
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
            staffBackground += Piece.staff() + `<span class="finalBarline">${Piece.finalBarlineCharacter}</span>`
        }
        return `<div class="staff-background">${staffBackground}</div>${notation}`;
    }

    static staff(length: number = 1) {
        let result = "";
        for (let i = 0; i < Math.floor(length); i++) {
            result += `<span class="staffPiece">${this.staffCharacter}</span>`;
        }
        return result;
    }

    static spacer(length: number = 1) {
        let result = "";
        for (let i = 0; i < Math.floor(length); i++) {
            result += this.spacerCharacter;
        }
        if (Math.floor(length) < length) {
            result += this.spacerCharacterNarrow;
        }
        return result;
    }

    static readonly staffCharacter = "\ue014";
    static readonly spacerCharacter = "&nbsp;";
    static readonly spacerCharacterNarrow = "&thinsp;";
	static readonly finalBarlineCharacter = "\ue032";
}