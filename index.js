var ConditionalTransformer = require('./ConditionalTransformer');
var MappingMerger = require('./MappingMerger');
var Serializer = require('./Serializer');
var SagaSearch = require('./SagaSearch');
var Hydrator = require('./Hydrator');

module.exports = (function () {
	'use strict';

	return {
		ConditionalTransformer: ConditionalTransformer,
		MappingMerger: MappingMerger,
		Serializer: Serializer,
		SagaSearch: SagaSearch,
		Hydrator: Hydrator
	};
})();
