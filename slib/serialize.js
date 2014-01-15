function serialize (model, mapping) {
	var properties;
	if(mapping && (properties = mapping.properties)) {
		var serializedForm = {}
		  , val;

		for(var field in properties) {
			val = serialize(model[field], properties[field]);
			if(val !== undefined) {
				serializedForm[field] = val;
			}
		}

		return serializedForm;
	}
	else if(typeof model === 'object' && model !== null) {
		var name = model.constructor.name;
		if(name === 'ObjectId') {
			return model.toString();
		}
		else if(name == 'Date') {
			return new Date(model).toJSON();
		}
	}
	else {
		return model;
	}
}

module.exports = serialize;