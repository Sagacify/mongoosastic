function MappingMerger (mapping, addedMapping) {
	var fields = Object.keys(addedMapping)
	  , len = fields.length
	  , field
	  , i;
	while(len--) {
		i = fields[len];
		field = addedMapping[i];
		if((i in mapping) && (typeof field == 'object')) {
			mapping[i] = MappingMerger(mapping[i], field);
		}
		else {
			mapping[i] = field;
		}
	}
	return mapping;
}

module.exports = MappingMerger;