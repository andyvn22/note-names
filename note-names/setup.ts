jQuery(function() {
    $("#helpDialog").dialog({
        title: "Note Names Help",
        autoOpen: false,
        modal: true,
        width: Math.min(vw(80), em(40)),
        buttons: { "OK": function() { $(this).dialog("close"); } },
        show: {
            effect: "drop",
            duration: 600
        },
        hide: {
            effect: "drop",
            duration: 600
        }
    })

    $("#helpButton").on("click", () => $("#helpDialog").dialog("open"));

    $("#play").button({
        label: "Play!",
        icons: { primary: "ui-icon-play" }
    }).on("click", function() {
        play();
    });

    $("#rangeBoundaryLeft-stepper-up").button({
        icons: { primary: "ui-icon-arrowthick-1-n" }
    }).on("click", function() {
        step("left", "up");
    });

    $("#rangeBoundaryLeft-stepper-down").button({
        icons: { primary: "ui-icon-arrowthick-1-s" }
    }).on("click", function() {
        step("left", "down");
    });

    $("#rangeBoundaryRight-stepper-up").button({
        icons: { primary: "ui-icon-arrowthick-1-n" }
    }).on("click", function() {
        step("right", "up");
    });

    $("#rangeBoundaryRight-stepper-down").button({
        icons: { primary: "ui-icon-arrowthick-1-s" }
    }).on("click", function() {
        step("right", "down");
    });

    for (let clefName of AllClefNames) {
        $(`#${clefName}, #image-${clefName}, #label-${clefName}, #explanation-${clefName}`).on("click", function() {
            changeClef(clefName);
        });

        $(`#image-${clefName} div.staff`).html(new Piece(Clef.named(clefName), []).notation());
    }

    update();
});

function changeClef(newClefName: ClefName) {
    Settings.shared.clefName = newClefName;
    Settings.shared.oneRangeBoundary = Clef.named(newClefName).bottomLine;
    Settings.shared.otherRangeBoundary = Clef.named(newClefName).topLine;
    update();
}

type Side = "left" | "right";
type Direction = "up" | "down";

function step(side: Side, direction: Direction) {
    const offset = direction == "up" ? 1 : -1;
    switch (side) {
        case "left": 
            Settings.shared.oneRangeBoundary = Settings.shared.oneRangeBoundary.moved(offset);
            break;
        case "right": 
            Settings.shared.otherRangeBoundary = Settings.shared.otherRangeBoundary.moved(offset);
            break;
    }
    update();
}

function update() {
    for (let clefName of AllClefNames) {
        if (clefName === Settings.shared.clefName) {
            $("#" + clefName).prop("checked", true);
            $(`#image-${clefName} div.staff`).addClass("selected");
        } else {
            $("#" + clefName).prop("checked", false);
            $(`#image-${clefName} div.staff`).removeClass("selected");
        }
    }
    const clef = Clef.named(Settings.shared.clefName);
    $("#rangeBoundaryLeft").html(new Piece(clef, [Settings.shared.oneRangeBoundary]).notation());
    $("#rangeBoundaryRight").html(new Piece(clef, [Settings.shared.otherRangeBoundary]).notation());
    $("#rangeBoundaryLeft-stepper-up").button(Settings.shared.oneRangeBoundary.moved(1).isAllowedIn(clef) ? "enable" : "disable");
    $("#rangeBoundaryLeft-stepper-down").button(Settings.shared.oneRangeBoundary.moved(-1).isAllowedIn(clef) ? "enable" : "disable");
    $("#rangeBoundaryRight-stepper-up").button(Settings.shared.otherRangeBoundary.moved(1).isAllowedIn(clef) ? "enable" : "disable");
    $("#rangeBoundaryRight-stepper-down").button(Settings.shared.otherRangeBoundary.moved(-1).isAllowedIn(clef) ? "enable" : "disable");
}

function play() {
    location.href = ".?" + Settings.shared.encode();
}