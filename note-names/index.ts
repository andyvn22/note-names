class Quiz {
    piece: Piece
    
    private currentQuestion: number;
    private questionAttempts: number[];
    private questionTimes: number[];

    constructor(piece: Piece) {
        this.piece = piece;
        this.currentQuestion = 0;
        this.questionAttempts = [];
        this.questionTimes = [];
    }

    get isFinished() {
        return this.currentQuestion >= this.piece.notes.length;
    }

    get currentNoteID() {
        return this.piece.idForNoteIndex(this.currentQuestion);
    }

    get accuracy() {
        if (this.questionAttempts.length == 0) { return null; }
        return this.questionAttempts.filter(x => x == 1).length / this.questionAttempts.length;
    }

    get formattedAccuracy() {
        const accuracy = this.accuracy;
        if (accuracy === null) { return ""; }
        const hue = accuracy * 125; //125°==green, 0°==red

        return `<span class="score-data" style="color: hsl(${hue},80%,40%)">${Math.round(accuracy * 100)}%</span> accurate`;
    }

    get averageTime() {
        if (this.questionTimes.length < 2) { return null; }
        let sum = 0;
        for (let i = 1; i < this.questionTimes.length; i++) {
            sum += this.questionTimes[i] - this.questionTimes[i-1];
        }
        return sum / (this.questionTimes.length - 1);
    }

    get formattedAverageTime() {
        const time = this.averageTime;
        if (time === null) { return ""; }
        return `<span class="score-data">${Math.round(time / 100) / 10}</span> seconds per note`;
    }

    private incrementCurrentQuestionAttempts() {
        while (this.questionAttempts.length <= this.currentQuestion) {
            this.questionAttempts.push(0);
        }
        this.questionAttempts[this.currentQuestion] += 1;
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
            this.incrementCurrentQuestionAttempts();
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
            this.incrementCurrentQuestionAttempts();
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

function restartQuiz() {
    quiz = new Quiz(Piece.newRandomMain());
    updatePiece();
    $("#piece").animate({ scrollLeft: 0 }, 600, "swing");
}

function updatePiece() {
    const end = `<div id="coda">
        <div id="score"></div>
        <button id="play"></button>
    </div>`;
    $("#piece").html(quiz.piece.notation(true) + end);
    $("#play").button({
        label: "Play Again",
        icons: { primary: "ui-icon-refresh" }
    }).on("click", function() {
        restartQuiz();
    });
    updateScore();
    updateButtons();
}

function updateScore() {
    $("#score").html(`${quiz.formattedAccuracy}<br/>${quiz.formattedAverageTime}`);
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

    const scrollMargin = vw(21.5);
    let newScroll = 0;
    if (quiz.isFinished) {
        const coda = $("#coda")[0];
        newScroll = coda.offsetLeft;
    } else {
        const nextNote = $("#" + quiz.currentNoteID)[0];
        newScroll = nextNote.offsetLeft - scrollMargin;
    }
    $("#piece").stop().animate({ scrollLeft: newScroll }, 1000, "swing");

    if (quiz.isFinished && quiz.accuracy == 1) {
        setTimeout(function() {
            //@ts-ignore
            party.confetti(document.body, { count: 100}); //How do we import this module properly?
            Sound.fanfare.play();
        }, 1000);
    }
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
        case "Enter":
            if (quiz.isFinished) { restartQuiz(); }
            break;
        default: break;
    }
});