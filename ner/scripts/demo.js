
var HOST = 'https://natasha.b-labs.pro'
HOST = 'http://localhost:4000'
var ENDPOINT = HOST + '/api/doc/spans';

var RUN = $('#run');
var RUNNING = $('#running');
var PROGRESS = false;

var TEXT = $('#text');
var TEXT_NODE = TEXT[0];
var MARKUP = $('#markup');
var FACTSAREA = $('#facts');
var FACTSAREA_NODE = FACTSAREA[0];

var EXAMPLE = $('#examples a')

var COLORS = {
    'PER': '#1f77b4',
    'LOC': '#ff7f0e',
    'ORG': '#2ca02c',
    // '#d62728',
    // '#9467bd',
    // '#e377c2',
    // '#bcbd22',
    // '#17becf',
}


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


function makeSpan(start, stop, type, level) {
    return {
	start: start,
	stop: stop,
	type: type,
	level: level
    }
}


function querySpans(spans, value) {
    var results = [];
    spans.forEach(function(span) {
	if ((span.start <= value) && (value < span.stop)) {
	    results.push(span)
	}
    });
    return results;
}


function getMaxLevel(spans) {
    var level = -1;
    spans.forEach(function(span) {
	if (level < span.level) {
	    level = span.level;
	}
    });
    return level;
}


function levelSpans(spans) {
    var results = [];
    spans.forEach(function(span) {
	var found = querySpans(results, span.start);
	var level = getMaxLevel(found);
	span.level = level + 1;
	results.push(span);
    });
    return results;
}


function sortSpans(spans) {
    spans.sort(function(a, b) {
	return ((a.start - b.start)
		|| (a.stop - b.stop)
		|| a.type.localeCompare(b.type));
    })
    return spans;
}


function getBoundValues(spans) {
    var values = [];
    spans.forEach(function(span) {
	values.push(span.start);
	values.push(span.stop);
    });
    return values;
}


function uniqueValues(values) {
    var set = {};
    values.forEach(function(value) {
	set[value] = value;
    });
    var values = [];
    for (var key in set) {
	values.push(set[key]);
    }
    values.sort(function(a, b) {
	return a - b;
    });
    return values;
}


function chunkSpan(span, bounds) {
    var results = [];
    var previous = span.start;
    bounds.forEach(function(bound) {
	if ((span.start < bound) && (bound < span.stop)) {
	    results.push(makeSpan(
		previous, bound,
		span.type, span.level
	    ));
	    previous = bound
	}
    });
    results.push(makeSpan(
	previous, span.stop,
	span.type, span.level
    ));
    return results;
}


function chunkSpans(spans) {
    var bounds = getBoundValues(spans);
    bounds = uniqueValues(bounds);

    var results = [];
    spans.forEach(function(span) {
	var chunks = chunkSpan(span, bounds);
	chunks.forEach(function(chunk) {
	    results.push(chunk);
	});
    });
    return results;
}


function makeGroup(start, stop) {
    return {
	start: start,
	stop: stop,
	items: []
    }
}


function groupSpans(spans) {
    var previous = undefined;
    var results = [];
    spans.forEach(function(span) {
	if (previous == undefined) {
	    previous = makeGroup(span.start, span.stop);
	}
	if (previous.start == span.start) {
	    previous.items.push(span);
	} else {
	    results.push(previous)
	    previous = makeGroup(span.start, span.stop);
	    previous.items.push(span);
	}
    });
    if (previous != undefined) {
	results.push(previous)
    }
    return results;
}


function formatTag(span, types) {
    var size = 2;
    var padding = 1 + span.level * (size + 1);
    var color = COLORS[span.type];
    return {
	open: ('<span style="'
	       + 'border-bottom: ' + size + 'px solid; '
	       + 'padding-bottom: ' + padding + 'px; '
	       + 'border-color: ' + color + '">'),
	close: '</span>'
    }
}

function formatSpans(text, groups, types) {
    var html = '';
    var previous = 0;
    groups.forEach(function(group) {
	html += text.slice(previous, group.start);
	var tags = [];
	group.items.forEach(function(span) {
	    tags.push(formatTag(span, types));
	});
	tags.forEach(function(tag) {
	    html += tag.open;
	});
	html += text.slice(group.start, group.stop);
	tags.forEach(function(tag) {
	    html += tag.close;
	});
	previous = group.stop;
    });
    html += text.slice(previous, text.length);
    return html;
}


function getSpanTypes(spans) {
    var results = [];
    spans.forEach(function(span) {
	if (span.type != undefined) {
	    results.push(span.type)
	}
    });
    return results;
}


function updateSpans(text, spans) {
    types = getSpanTypes(spans);
    types = uniqueValues(types);

    spans = sortSpans(spans);
    spans = levelSpans(spans);
    spans = chunkSpans(spans);
    spans = sortSpans(spans);
    groups = groupSpans(spans);

    html = formatSpans(text, groups, types);
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
	var span = makeSpan(
	    item.start,
	    item.stop,
	    item.type
	);
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

    highlightFacts();
}


function highlightFacts() {
    hljs.highlightBlock(FACTSAREA_NODE);
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
    TEXT.prop('contenteditable', false)
}


function unfreeze() {
    PROGRESS = false;
    RUN.show();
    RUNNING.hide();
    TEXT.prop('contenteditable', true)
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
