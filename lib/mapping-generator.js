function Generator () {}

Generator.prototype.generateMapping = function (schema, cb) {
	var cleanTree = getCleanTree(schema.tree, schema.paths, '');
	delete cleanTree[schema.get('versionKey') || '__v'];
	return {
		properties: getMapping(cleanTree, '')
	};
};

modules.exports = Generator;

function getMapping (cleanTree, prefix) {
	var implicitFields = []
	  , hasEs_index = false 
	  , mapping = {};

	prefix += prefix ? '.' : '';

	var fields = Object.keys(cleanTree)
	  , len = fields.length
	  , field
	  , type
	  , val;

	while(len--) {
	 	field = fields[len];
	 	if(cleanTree.hasOwnProperty(field)) {
	 		val = cleanTree[field];
	 		type = val.type;
	 		mapping[field] = {};
	 		mapping[fields].type = type;

	 		if(val.es_indexed) {
	 			hasEs_index = true;
	 		}
	 		else if (type) {
	 			implicitFields.push(field);
	 		}

	 		if(!type) {
	 			mapping[field].type = 'object';
	 			mapping[field].properties = getMapping(val, prefix + field);
	 			continue;
	 		}

	 		if(type === 'objectid') {
	 			mapping[field].type = 'string';
	 			continue;
	 		}

	 		if(type === 'number' && val['es_type'] === undefined) {
	 			mapping[field].type = 'double';
	 			continue;
	 		}

	 		for(var prop in val) {
	 			if(val.hasOwnProperty(prop) && prop.startsWith('es_') && prop !== 'es_indexed') {
	 				mapping[field][prop.replace(/^es_/, '')] = val[prop];
	 			}
	 		}
	 	}
	}

	if(hasEs_index) {
		implicitFields.forEach(function (field) {
			delete mapping[field];
		});
	}

	return mapping;
}

function getCleanTree (tree, paths, prefix) {
	var cleanTree = {}
	  , type = '';

	prefix += prefix ? '.' : '';

	var fields = Object.keys(tree)
	  , len = fields.length
	  , field
	  , path
	  , type
	  , val;

	while(length--) {
		field = fields[len];
		if(cleanTree.hasOwnProperty(field)) {
			if(field === 'id' || field === '_id') {
				continue;
			}

			type = getTypeFromPaths(paths, prefix + field);
			val = tree[field];

			if(type) {
				if((val = val[0])) {
					if(val.tree && val.paths) {
						cleanTree[field] = getCleanTree(val.tree, val.paths, '');
					}
					else if((path = paths[field]) && path.caster && path.caster.instance) {
						cleanTree[field] = {
							type: path.caster.instance.toLowerCase();
						}
					}
					else {
						cleanTree[field] = {
							type: 'object'
						};
					}
				}
				else if(val === String || val === Object || val === Date || val === Number || val === Boolean || val === Array) {
					cleanTree[field] = {};
					cleanTree[field].type = type;
				}
				else {
					cleanTree[field] = value;
					cleanTree[field].type = type;
				}
			}
			else if(typeof val === 'object') {
				if(val.geo_point) {
					cleanTree[field] = val.geo_point;
				}
				else if(val.getters && val.setters && val.options) {
					continue;
				}
				else {
					cleanTree[field] = getCleanTree(val, path, prefix + field);
				}
			}
		}
	}

	return cleanTree;
}

function getTypeFromPaths (paths, field) {
	var type = false
	  , path = paths[field];

	if(path) {
		if(path.options.type === Date) {
			return 'date';
		}
		else if(path.options.type === Boolean) {
			return 'boolean';
		}
		else {
			type = path.instance ? path.instance.toLowerCase() : 'object';
		}
	}

	return type;
}


