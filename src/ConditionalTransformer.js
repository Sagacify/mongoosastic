var ejs = require('elastic.js');

module.exports = (function () {
	'use strict';

	function FromMongooseQueryToEjs (mongooseQuery) {
		var result = [];

		for (key in mongooseQuery) {
			result.push(TransformKeyValue(key, mongooseQuery[key]));
		}

		if (result.length === 1) {
			return result[0];
		}

		return ejs.AndFilter(result)
	}

	function TransformKeyValue (key, value) {
		if (key === '$or') {
			var content = [];

			for (var i = 0; i < value.length; i++) {
				content.push(exports.FromMongooseQueryToEjs(value[i]));
			}

			if (content.length === 1) {
				return content[0];
			}

			return ejs.OrFilter(content);
		}

		if (key === '$and') {
			var content = [];

			for (var i = 0; i < value.length; i++) {
				content.push(exports.FromMongooseQueryToEjs(value[i]));
			}

			if (content.length === 1) {
				return content[0];
			}

			return ejs.AndFilter(content);
		}

		if (Object.prototype.toString.call(value) === '[object Object]') {
			if ('$in' in value) {
				return ejs.TermsFilter(key, value['$in']);
			}

			if ('$exists' in value) {
				if (value['$exists']) {
					return ejs.ExistsFilter(key);
				}

				return ejs.NotFilter(ejs.ExistsFilter(key));
			}

			if ('$ne' in value) {
				return ejs.NotFilter(ejs.TermFilter(key, value['$ne']));
			}
		}

		return ejs.TermFilter(key, value);
	}

	return FromMongooseQueryToEjs;
})();
