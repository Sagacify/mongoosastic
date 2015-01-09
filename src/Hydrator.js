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
	}

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
	}

	function hydrateDocument (hit, modelName, hydrateOptions) {
		var data = hit._source

		var model = getModel(hydrateOptions);

		if (model === undefined) {
			return data;
		}
		
		return new model(data);
	}

	function getModel (hydrateOptions) {
		var models = mongoose.models
		  , model;

		if (hydrateOptions && hit._type in hydrateOptions) {
			model = hydrateOptions[hit._type];
		}
		
		if (hit._type in models) {
			model = models[hit._type];
		}
		
		if (modelName in models) {
			model = models[modelName];
		}

		return model;
	}

	return {
		hydrateDocument: hydrateDocument,
		hydratorLean: hydratorLean,
		hydrator: hydrator,

		getModel: getModel
	};
})();
