
var HOST = 'https://natasha.b-labs.pro'
HOST = 'http://localhost:4000'
var ENDPOINT = HOST + '/api/doc/viz';

var BUTTON = $('#control button')
var RUN = $('#run');
var RUNNING = $('#running');
var PROGRESS = false;

var INPUT = $('#input');

var NER = $('#output #ner');
var MORPH = $('#output #morph');
var SYNTAX = $('#output #syntax');
var FACTS = $('#output #facts');
var ERROR = $('#output #error');

var EXAMPLE = $('#examples a')

var print = console.log


//////////
//
//   https://stackoverflow.com/questions/12027137/javascript-trick-for-paste-as-plain-text-in-execcommand
//
///////////


function pastePlain(e) {
    // cancel paste
    e.preventDefault();

    // get text representation of clipboard
    var text = (e.originalEvent || e).clipboardData.getData("text/plain");

    // insert text manually
    document.execCommand("insertHTML", false, text);
}


////////////
//
//  OUTPUT
//
///////////////


function formatJson(data) {
    return JSON.stringify(data, null, '  ');
}

function prepareFacts(items) {
    var facts = {};
    items.forEach(function(item) {
	var fact = item.normal;
	if (item.fact != undefined) {
	    fact = {
		normal: fact,
		slots: {}
	    };
	    item.fact.slots.forEach(function(slot) {
		fact.slots[slot.key] = slot.value;
	    });
	}
	if (item.text != fact) {
	    facts[item.text] = fact;
	}
    });
    return facts;
}

function updateOutput(data) {
    NER.text(data.ner);
    MORPH.text(data.morph);
    SYNTAX.text(data.syntax);
    FACTS.text(formatJson(prepareFacts(data.spans)));
}

function clearOutput() {
    NER.empty();
    MORPH.empty();
    SYNTAX.empty();
    FACTS.empty();
    ERROR.empty();
}


////////////
//
//   UI
//
////////////


function freeze() {
    PROGRESS = true;
    RUN.hide();
    RUNNING.show();
    BUTTON.prop('disabled', true);
    EXAMPLE.addClass('disabled');
    INPUT.prop('contenteditable', false);
}

function unfreeze() {
    PROGRESS = false;
    RUN.show();
    RUNNING.hide();
    BUTTON.prop('disabled', false);
    EXAMPLE.removeClass('disabled');
    INPUT.prop('contenteditable', true);
    INPUT.focus();
}

function formatError(error) {
    return formatJson({
	code: error.statusCode(),
	data: error.responseJSON
    })
}

function process() {
    if (PROGRESS) {
	return;
    }
    var text = INPUT.text();
    clearOutput();
    freeze();
    $.post(ENDPOINT, {text: text}, null, 'json')
	.done(function(data) {
	    unfreeze();
	    updateOutput(data);
	}).fail(function(error) {
	    unfreeze();
	    ERROR.text(formatError(error));
	});
}

function example() {
    // jquery slides to top if href=#
    event.preventDefault();

    var text = $(this).attr('data-text');
    INPUT.text(text);
    process();
}

function shiftEnter(event) {
    if ((event.keyCode == 13) && event.shiftKey) {
	event.preventDefault();
	process();
    }
}


INPUT.keypress(shiftEnter);
INPUT.on('paste', pastePlain);
INPUT.focus();

EXAMPLE.click(example);

RUN.click(process);
process();
