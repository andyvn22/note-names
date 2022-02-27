class Quiz {
    piece: Piece
    
    private currentQuestion: number;
    private questionTimes: number[];

    constructor(piece: Piece) {
        this.piece = piece;
        this.currentQuestion = 0;
        this.questionTimes = [];
    }

    get isFinished() {
        return this.currentQuestion >= this.piece.notes.length;
    }

    get averageTime() {
        if (this.questionTimes.length < 2) { return null; }
        let sum = 0;
        for (let i = 1; i < this.questionTimes.length; i++) {
            sum += this.questionTimes[i] - this.questionTimes[i-1];
        }
        return sum / (this.questionTimes.length - 1);
    }

    check(guess: PitchClass) {
        if (this.currentQuestion >= this.piece.notes.length) { return false; }

        const element = $("#" + this.piece.idForNoteIndex(this.currentQuestion));
        if (guess.isEqual(this.piece.notes[this.currentQuestion].pitchClass)) {
            if (element.hasClass("incorrect") || element.hasClass("still-incorrect")) {
                element.removeClass("incorrect");
                element.removeClass("still-incorrect");
                element.addClass("eventually-correct");
            } else {
                element.addClass("correct");
            }
            Sound.correct.play();
            this.questionTimes.push(Date.now());
            this.currentQuestion += 1;
            return true;
        } else {
            if (element.hasClass("incorrect")) {
                element.removeClass("incorrect");
                element.addClass("still-incorrect");
            } else if (element.hasClass("still-incorrect")) {
                element.removeClass("still-incorrect");
                element.addClass("incorrect");
            } else {
                element.addClass("incorrect");
            }
            Sound.wrong.play();
            return false;
        }
    }
}

let quiz = new Quiz(Piece.newRandomMain());
let guesses: PitchClass[] = [];

jQuery(function() {
    $("#settings").button({
        label: "Settings",
        icons: { primary: "ui-icon-gear" }
    }).on("click", function() {
        location.href = "setup.html?" + Settings.shared.encode();
    });

    for (let pitchClass of PitchClass.all) {
        $("#" + pitchClass.buttonID).button({
            label: pitchClass.buttonName
        }).on("click", function() {
            check(pitchClass);
        });
    }

    updatePiece();
});

function updatePiece() {
    $("#piece").html(quiz.piece.notation);
}

function updateScore() {
    const time = quiz.averageTime;
    if (time === null) {
        $("#score").html(``);
    } else {
        const formatted = Math.round(time / 100) / 10;
        $("#score").html(`Average time: ${formatted} seconds`);
    }
}

function updateButtons() {
    for (let pitchClass of PitchClass.all) {
        let alreadyGuessed = guesses.filter(x => x.isEqual(pitchClass)).length > 0;
        let shouldEnable = !alreadyGuessed && !quiz.isFinished;
        $("#" + pitchClass.buttonID).button(shouldEnable ? "enable" : "disable");
    }
}

function check(guess: PitchClass) {
    let correct = quiz.check(guess);
    if (correct) {
        guesses = [];
    } else {
        guesses.push(guess);
    }
    updateButtons();
    updateScore();
}

$(document).keydown(function(event) {
    switch (event.key) {
        case "c": check(new PitchClass("C")); break;
        case "d": check(new PitchClass("D")); break;
        case "e": check(new PitchClass("E")); break;
        case "f": check(new PitchClass("F")); break;
        case "g": check(new PitchClass("G")); break;
        case "a": check(new PitchClass("A")); break;
        case "b": check(new PitchClass("B")); break;
        default: break;
    }
});