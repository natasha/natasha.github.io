
var HOST = 'https://natasha.b-labs.pro'
HOST = 'http://localhost:4000'
var ENDPOINT = HOST + '/api/doc/spans';

var BUTTON = $('#controls button')
var RUN = $('#run');
var RUNNING = $('#running');
var PROGRESS = false;

var TEXT = $('#text');
var TEXT_NODE = TEXT[0];
var MARKUP = $('#markup');
var FACTSAREA = $('#facts');
var FACTSAREA_NODE = FACTSAREA[0];

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
//  SPANS
//
///////////////


function sortSpans(spans) {
    spans.sort(function(a, b) {
	return ((a.start - b.start)
		|| (a.stop - b.stop)
		|| a.type.localeCompare(b.type));
    })
    return spans;
}

function formatTag(span) {
    return {
	open: '<span class="box ' + span.type + '">',
	close: '</span>'
    }
}

function formatSpans(text, spans, types) {
    var html = '';
    var previous = 0;
    spans.forEach(function(span) {
	html += text.slice(previous, span.start);
	tag = formatTag(span);
	print(tag);
	html += tag.open;
	html += text.slice(span.start, span.stop);
	html += tag.close;
	previous = span.stop;
    });
    html += text.slice(previous, text.length);
    return html;
}


function updateSpans(text, spans) {
    spans = sortSpans(spans);
    html = formatSpans(text, spans);
    MARKUP.html(html);
}


///////////
//
//  FACTS  
//
////////////


function parseFact(item) {
    var fact = {
	text: item.text,
	normal: item.normal,
    };

    if (item.fact == undefined) {
	return fact;
    }

    fact.slots = {};
    var slots = item.fact.slots;
    for (var index = 0; index < slots.length; index++) {
	var slot = slots[index];
	fact.slots[slot.key] = slot.value;
    }

    return fact;
}

function parse(data) {
    var facts = [];
    var spans = [];
    for (var index = 0; index < data.length; index++) {
	var item = data[index];
	facts.push(parseFact(item));
	var span = {
	    start: item.start,
	    stop: item.stop,
	    type: item.type
	};
	spans.push(span);
    }
    return {
	facts: facts,
	spans: spans
    };
}


function formatJson(data) {
    return JSON.stringify(data, null, '  ');
}


function updateFacts(facts) {
    var text = formatJson(facts);
    FACTSAREA.text(text);
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
    TEXT.prop('contenteditable', false);
}


function unfreeze() {
    PROGRESS = false;
    RUN.show();
    RUNNING.hide();
    BUTTON.prop('disabled', false);
    EXAMPLE.removeClass('disabled');
    TEXT.prop('contenteditable', true);
    TEXT.focus();
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
    var text = TEXT_NODE.innerHTML;
    freeze();
    $.post(ENDPOINT, {text: text}, null, 'json')
	.done(function(data) {
	    unfreeze();
	    var data = parse(data);
	    updateFacts(data.facts);
	    updateSpans(text, data.spans);
	}).fail(function(error) {
	    unfreeze();
	    FACTSAREA.text(formatError(error));
	});
}

function example() {
    // jquery slides to top if href=#
    event.preventDefault();

    var text = $(this).attr('data-text');
    TEXT_NODE.innerHTML = text;
    process();
}

function shiftEnter(event) {
    if ((event.keyCode == 13) && event.shiftKey) {
	event.preventDefault();
	process();
    }
}


TEXT.keypress(shiftEnter);
TEXT.on('paste', pastePlain);
TEXT.focus();

EXAMPLE.click(example);

RUN.click(process);
process();
