exports.hydrator = function (res, model, hydrateOptions) {
	var modelName = model ? model.modelName : null
	  , hits
	  , len;
	if(res.hits && (len = res.hits.length) && (hits = res.hits.hits)) {
		var hit;
		var model;
		while(len--) {
			hit = hits[len];
			hits[len]._source = exports.hydrateDocument(hit, modelName, hydrateOptions);

		}
	}
	return res;
}

exports.hydrateDocument = function(hit, modelName, hydrateOptions) {
	console.log(modelName);
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
		console.log("hydrate ");

		return new model(data);
	}
	else {
		return data;
	}
}