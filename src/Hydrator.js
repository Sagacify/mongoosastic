module.exports = (function () {
	'use strict';

	function hydrator (res, model, hydrateOptions) {
		var modelName = model ? model.modelName : null
		  , hits;

		if(res.hits && res.hits.hits && res.hits.hits.length && (hits = res.hits.hits)) {
			var hit;
			var model;

			for (var i = 0; i < hits.length; i++) {
				hit = hits[i];
				hits[i]._source = hydrateDocument(hit, modelName, hydrateOptions);
			}
		}

		return res;
	};

	function hydratorLean (res, model, hydrateOptions) {
		var modelName = model ? model.modelName : null
		  , hits;

		var objectList = []

		if (res.hits && res.hits.hits && res.hits.hits.length && (hits = res.hits.hits)) {
			var hit;
			var model;

			for (var i = 0; i < hits.length; i++) {
			 	hit = hits[i];
				objectList.push(hydrateDocument(hit, modelName, hydrateOptions));
			}
		}

		return objectList;
	};

	function hydrateDocument (hit, modelName, hydrateOptions) {
		var models = mongoose.models
		  , data = hit._source
		  , model;

		if (hydrateOptions && (model = hydrateOptions[hit._type]) ) {
			return new model(data);
		}
		
		if ((model = models[hit._type])) {
			return new model(data);
		}
		
		if ((model = models[modelName])) {
			return new model(data);
		}

		return data;
	};

	return {
		hydrateDocument: hydrateDocument,
		hydratorLean: hydratorLean,
		hydrator: hydrator
	};
})();
