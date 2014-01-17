function inspectField (field) {
	var type = field.instance;
	if(field.type && (typeof field.type  === 'function') && field.type.name) {
		type = field.type.name;
	}
	var parent = {};
	if(field['es-ignore']) {
		type = false;
	}
	else if(field['es-type']) {
		type = field['es-type'];
	}
	else if(field.geoindex) {
		type = 'geo_point';
		parent.location = {};
	}
	else if(type === 'Number') {
		type = 'Double';
	}
	else if(type === 'ObjectId') {
		type = 'String';
	}

	var host = parent.location || parent;
	if(type && (typeof type === 'string')) {
		return (host.type = type.toLowerCase()) && parent;
	}
	else {
		return false;
	}
}

function inspectObject (object) {
	if(object.type) {
		return inspectField(object);
	}
	else if (object.paths) {
		return inspectTree(object.tree);
	}
	else {
		return inspectTree(object);
	}
}

function handleField (field) {
	if(field == null) {
		return false;
	}
	else if(Array.isArray(field)) {
		return {
			properties: handleField(field[0])
		};
	}
	else if(typeof field === 'object') {
		return inspectObject(field);
	}
	else {
		return false;
	}
}

function inspectTree (tree) {
	var fields = Object.keys(tree);
	var len = fields.length;
	var skelleton = {};
	var branch;
	var field;
	var i;
	while(len--) {
		i = fields[len];
		if(i === 'id' || i === '_id') {
			continue;
		}
		field = tree[i];
		if(i === '_deleted') {
			console.log('\nDeleted ->');
			console.log(i)
			console.log(field);
			console.log(fields);
		}
		if((branch = handleField(field))) {
			skelleton[i] = branch;
		}
	}
	return skelleton; // TODO : add { properties: skelleton } ???
}

module.exports = inspectTree;