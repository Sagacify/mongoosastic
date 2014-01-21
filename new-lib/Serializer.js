function handleArray (mapField, modField) {
	if(Array.isArray(modField)) {
		mapField = mapField.properties;
		var len = modField.length
		  , arrayMap = []
		  , branch
		  , ele
		while(len--) {
			ele = modField[len];
			// console.log("--> ELE")
			// console.log(mapField)
			// console.log(ele);
			// console.log('--> inspectMap')
			// console.log(handleField(mapField, ele))
			if(ele && mapField && (branch = handleField(mapField, ele))){

				arrayMap.push(branch);
			}
			// if((branch = inspectMap(mapField, ele)) !== undefined) {
			// 	arrayMap.push(branch);
			// }
			
		}
		return arrayMap;
	}
}

function handleField (mapField, modField) {
	if(typeof mapField.properties === 'object') {
		return handleArray(mapField, modField);
	}
	else if(typeof mapField.location === 'object' && mapField.location.type === 'geo_point') {
		return Array.isArray(modField) 
			&& modField.length === 2 
			&& typeof modField[0] === 'number' 
			&& typeof modField[1] === 'number' ?
		modField : undefined; 
	}
	// else if (mapField.constructor === 'ObjectId') {
	// 	return modField.toString() || undefined;
	// }
	else if(typeof mapField.type === 'string') {

		var type = mapField.type === 'double' ? 'number' : mapField.type
		  , constructor = type.charAt(0).toUpperCase() + type.slice(1)
		  , modFieldConstructor = modField.constructor.name;
		if (modFieldConstructor == "ObjectID"){
			modFieldConstructor = "String";
		}
		// console.log("Constructor")
		// console.log(modField.constructor.name);
		// console.log(constructor);
		return modField ? (modFieldConstructor === constructor ? modField : undefined) : undefined;
	}
	else if(typeof mapField === 'object' && typeof modField === 'object'){
		return inspectMap(mapField, modField);
	}
}

function inspectMap (map, model) {
	var fields = Object.keys(map)
	  , len = fields.length
	  , serialized = {}
	  , mapField
	  , modField
	  , branch
	  , i;
	while(len--) {
		i = fields[len];
		if(i === 'id' || i === '_id') {
			continue;
		}
		mapField = map[i];
		modField = model[i];
		if(typeof mapField === 'object' && modField != undefined) { // maybe remove modfield test
			if((branch = handleField(mapField, modField)) != undefined) {
				serialized[i] = branch;
			}
			else {
				serialized[i] = inspectMap(mapField, modField);
			}
		}
	}
	return serialized;
}

module.exports = inspectMap;
