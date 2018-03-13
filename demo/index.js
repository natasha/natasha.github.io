
var HOST = 'https://natasha.b-labs.pro'
// HOST = 'http://localhost:4000'
var EXTRACT_URL = HOST + '/api/extract';
var VERSION_URL = HOST + '/api/version';
var BUG_URL = HOST + '/api/issues';

var VERSIONS = $('#versions');
var RUN = $('#run');
var RUNNING = $('#running');
var PROGRESS = false;

var BUG = $('#bug');
var REPORT = BUG.find('#report');
var REPORTING = BUG.find('#reporting');
var REPORTED = BUG.find('#reported');
var ERROR = BUG.find('#error');

var TEXT = $('#text');
var TEXT_NODE = TEXT[0];
var MARKUP = $('#markup');
var FACTSAREA = $('#facts');
var FACTSAREA_NODE = FACTSAREA[0];

var COLORS = {
    'Name': '#1f77b4',
    'Address': '#ff7f0e',
    'Date': '#2ca02c',
    'Money': '#d62728',
    // '#9467bd',
    // '#e377c2',
    // '#bcbd22',
    // '#17becf',
}
var SILVER = 'steelblue';


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
    var color = SILVER;
    if (span.type != undefined) {
	color = COLORS[span.type];
    }
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


function parse(data) {
    var facts = [];
    var spans = [];
    for (var index = 0; index < data.length; index++) {
	var item = data[index];
	facts.push(item.fact);
	var span = makeSpan(
	    item.span[0],
	    item.span[1],
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
//   VERSIONS
//
///////////


function formatVersions(data) {
    var keys = [];
    for (var key in data) {
	keys.push(key);
    }
    keys.sort(function(a, b) {
	return a.localeCompare(b);
    })
    var text = '';
    keys.forEach(function(key) {
	var value = data[key];
	text += (key + '=' + value) + ' ';
    });
    return text;
}


function updateVersions() {
    $.get(VERSION_URL, null, 'json')
	.done(function(data) {
	    var text = formatVersions(data);
	    VERSIONS.text(text);
	})
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


function extract() {
    if (PROGRESS) {
	return;
    }
    var text = TEXT_NODE.innerText;
    freeze();
    $.post(EXTRACT_URL, {text: text}, null, 'json')
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


function shiftEnter(event) {
    if ((event.keyCode == 13) && event.shiftKey) {
	event.preventDefault();
	extract();
    }
}


function report() {
    var text = MARKUP.text();

    REPORTING.show();

    $.post(BUG_URL, {text: text, description: null}, null, 'json')
	.done(function(data) {
	    REPORTING.hide();
	    REPORTED.show();
	    REPORTED.delay(1000).hide(1000);
	}).fail(function(error) {
	    REPORTING.hide();
	    ERROR.show();
	    ERROR.delay(1000).hide(1000);
	});
}


TEXT.keypress(shiftEnter);
TEXT.on('paste', pastePlain);
TEXT.focus();

updateVersions();

REPORT.click(report);

RUN.click(extract);
extract();
