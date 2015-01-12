var ConditionalTransformer = require('./src/ConditionalTransformer');
var SagaSearch = require('./src/SagaSearch');
var Hydrator = require('./src/Hydrator');

module.exports = (function () {
	'use strict';

	return {
		ConditionalTransformer: ConditionalTransformer,
		SagaSearch: SagaSearch,
		Hydrator: Hydrator
	};
})();
