
function vizPartitions() {
    $('.partition').html(function(index, html) {
	html = html.replace(/\| \|/g, '<span class="fill-split"> </span>')
	html = html.replace(/\|/g, '<span class="split"></span>')
	return html
    });
}

vizPartitions()
