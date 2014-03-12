var ejs = require("./../../search/elastic");
var is = require("./../../strict_typing/validateType");

 exports.FromMongooseQueryToEjs= function(mongooseQuery){
 	console.log('Processing query');

	var result = [];
	for(key in mongooseQuery){
		result.push(TransformKeyValue(key, mongooseQuery[key]));
	}
	if (result.length == 1) {
		return result[0];
	};
	return ejs.AndFilter(result)
}

TransformKeyValue= function(key, value){
	console.log('Processing Key '+ key);
	console.log(value);
	console.log("--------------------");

	if (key == "$or") {
		var content = [];
		for (var i = 0; i < value.length; i++) {
			content.push(exports.FromMongooseQueryToEjs(value[i]));
		};
		if (content.length == 1) {
			return content[0];
		};
		return ejs.OrFilter(content);
	};
	
	if (key == "$and") {
		var content = [];
		for (var i = 0; i < value.length; i++) {
			content.push(exports.FromMongooseQueryToEjs(value[i]));
		};
		if (content.length == 1) {
			return content[0];
		};
		return ejs.AndFilter(content);
	};

	if (is.Object(value)) {
		if ('$in' in value) {
			return ejs.TermsFilter(key, value['$in']);
		};

		if ('$exists' in value) {
			if (value['$exists']) {
				return ejs.ExistsFilter(key);
			} else {
				return ejs.NotFilter(ejs.ExistsFilter(key))
			}
		};

		if ('$ne' in value) {
			return ejs.NotFilter(ejs.TermFilter(key, value['$ne']));
		};
	};
	console.log("PUT SIMPLE TERM "+ value);
	return ejs.TermFilter(key, value);
}
