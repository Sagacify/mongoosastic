exports.hydrator = function (res, model, hydrateOptions) {
	var modelName = model ? model.modelName : null
	  , hits
	  , len;
	if(res.hits && (len = res.hits.hits.length) && (hits = res.hits.hits)) {
		var hit;
		var model;
		for (var i = 0; i < hits.length; i++) {
			hit = hits[i];
			hits[i]._source = exports.hydrateDocument(hit, modelName, hydrateOptions);
		}
	}
	return res;
}

exports.hydratorLean = function (res, model, hydrateOptions) {
	var modelName = model ? model.modelName : null
	  , hits
	  , len;

	var objectList = []
	if(res.hits && (len = res.hits.hits.length) && (hits = res.hits.hits)) {
		var hit;
		var model;
		for (var i = 0; i < hits.length; i++) {
		 	hit = hits[i];
			objectList.push(exports.hydrateDocument(hit, modelName, hydrateOptions));
		};
	}
	return objectList;
}

exports.hydrateDocument = function(hit, modelName, hydrateOptions) {
	var models = mongoose.models
	  , data = hit._source
	  , model;
	 
	if( hydrateOptions && (model = hydrateOptions[hit._type]) ) {
		return new model(data);
	}
	else if((model = models[hit._type])) {
		return new model(data);
	}
	else if((model = models[modelName])) {
		return new model(data);
	}
	else {
		return data;
	}
}