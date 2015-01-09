var ConditionalTransformer = require('./src/ConditionalTransformer');
var MappingMerger = require('./src/MappingMerger');
var Serializer = require('./src/Serializer');
var SagaSearch = require('./src/SagaSearch');
var Hydrator = require('./src/Hydrator');

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
