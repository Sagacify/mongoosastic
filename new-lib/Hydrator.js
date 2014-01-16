function Hydrator (res, model, hydrateOptions) {
	var modelName = model.modelName;
	  , hits
	  , len;
	if(res.hits && (len = res.hits.total) && (hits = res.hits.hits)) {
		var hit;
		var model;
		while(len--) {
			hit = hits[len];
			hits[len]._source = hydrateDocument(hit, modelName, hydrateOptions);
		}
	}
	return res;
}

module.exports = Hydrator;

function hydrateDocument (hit, modelName, hydrateOptions) {
	var models = mongoose.models;
	  , data = hit._source;
	  , model;
	if((model = hydrateOptions[hit._type])) {
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