module.exports = (function () {
	'use strict';

	return {
		hydrator: function (res, model, hydrateOptions) {
			var modelName = model ? model.modelName : null
			  , hits;

			if(res.hits && res.hits.hits && res.hits.hits.length && (hits = res.hits.hits)) {
				var hit;
				var model;

				for (var i = 0; i < hits.length; i++) {
					hit = hits[i];
					hits[i]._source = this.hydrateDocument(hit, modelName, hydrateOptions);
				}
			}

			return res;
		},

		hydratorLean: function (res, model, hydrateOptions) {
			var modelName = model ? model.modelName : null
			  , hits;

			var objectList = []

			if (res.hits && res.hits.hits && res.hits.hits.length && (hits = res.hits.hits)) {
				var hit;
				var model;

				for (var i = 0; i < hits.length; i++) {
				 	hit = hits[i];
					objectList.push(this.hydrateDocument(hit, modelName, hydrateOptions));
				}
			}

			return objectList;
		},

		hydrateDocument: function (hit, modelName, hydrateOptions) {
			var data = hit._source

			var model = this.getModel(hydrateOptions);

			if (model === undefined) {
				return data;
			}
			
			return new model(data);
		},

		getModel: function (hydrateOptions) {
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
	};
})();
