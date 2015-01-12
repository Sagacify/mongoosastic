var elasticSearch = require('elasticsearch'),
	events = require('events'),
	async = require('async');

var Hydrator = require('./Hydrator');

module.exports = (function () {
	'use strict';

	function SagaSearch (schema, options) {

		var esClient = new elasticSearch.Client({
			host: options.host
			//log: 'trace'
		}),
		hydrateOptions = options.hydrateOptions,
		alwaysHydrate = !!options.alwaysHydrate,
		indexName = options.index,
		typeName = options.type,
		settings = options.settings,
		mappings = options.mappings;

		/**
		 * Add mapping to a document type.
		 * either take a mapping object or loop over an array of mappings if "mapping" is an Array.
		 */
		function addMapping (callback) {
			mappings = mappings || [];
			mappings = Array.isArray(mappings) ? mappings : [mappings];

			async.each(mappings, function (item, cb) {
				var map = {
					index: indexName,
					type: typeName || item.keys()[0],
					body: item
				};

				esClient.indices.putMapping(map, cb);
			}, callback);
		}

		function addSettings(callback) {
			if (!settings) {
				return callback(null);
			}

			async.series([
				function (cb) {
					//Index close
					esClient.indices.close({
						index: indexName
					}, cb);
				},
				function (cb) {
					esClient.indices.putSettings({
						index: indexName,
						body: settings
					}, cb);
				},
				function (cb) {
					esClient.indices.open({
						index: indexName
						}, cb);
				}
			], callback);
		}

		function checkIndexOrCreate (callback) {
			esClient.indices.exists({
				index: indexName
			}, function (err, res) {
				if (!err && res === false) {
					createIndex(callback);
				}
				else {
					callback(err);	
				}
			});
		}

		function createIndex (callback) {
			esClient.indices.create({
				index: indexName
			}, callback);
		}

		function deleteIndex (callback) {
			esClient.indices.exists({
				index: indexName
			}, function (err, res) {
				if (!err && res === true) {
					esClient.indices.delete({
						index: indexName
					}, callback);
				} else {
					callback(null);
				}
			});
		}

		schema.methods.esGetIndexName = function (index) {
			return index || indexName;
		};

		schema.methods.esGetTypeName = function (type, model) {
			return type || typeName || model.get('__t');
		};

		schema.methods.index = function (index, type) {
			var model = this;
			esClient.index({
				index: this.esGetIndexName(index),
				type: this.esGetTypeName(type, model),
				id: model.get('_id').toString(),
				body: model
			}, function (error, res) {
				model.emit('es-indexed', error, res);
			});
		};

		schema.methods.unindex = function (index, type) {
			var model = this;
			esClient.delete({
				index: this.esGetIndexName(index),
				type: this.esGetTypeName(type, model),
				id: model.get('_id').toString()
			}, function (error, res) {
				model.emit('es-removed', error, res);
			});
		};

		/*
		This method has to be called on the server connection. This ensures that the corresponding
		indexes has been created on the Elasticsearch server
		*/
		schema.statics.connect = function(callback) {
			checkIndexOrCreate(callback);
		};

		schema.statics.sync = function (query, callback) {
			var model = this,
				emitter = new events.EventEmitter();

			if (!query || (typeof query !== 'object')) {
				query = {};
			}

			async.series([
				function (cb) {
					deleteIndex(cb);
				},
				function (cb) {
					checkIndexOrCreate(cb);
				},
				function (cb) {
					// setTimeout(function(){
						addSettings(cb);	
					// }, 1000);
				},
				function (cb) {
					addMapping(cb);
				},
				function (cb) {
					model
					.find(query)
					.stream()
					.on('data', function (doc) {
						// if(doc.esWillIndex){
						// 	doc.esWillIndex();
						// }
						doc.index();
					})
					.on('error', function (error) {
						cb(error);
					})
					.on('close', function () {
						cb(null);
					});
				}
			], callback);

			return emitter;
		};

		schema.statics.search = function (query, index, type, options, cb) {		
			query.index = index || indexName;
			query.type = type || typeName;
		
			esClient.search(query, function (error, res) {
				if (error) {
					return cb(error);
				}

				if (alwaysHydrate || options.hydrate) {
					return cb(null, Hydrator(res, hydrateOptions));
				}

				cb(null, res);
			});
		};

		schema.post('remove', function (doc) {
			doc.unindex();
		});

		schema.post('save', function (doc) {
			if (doc.esWillIndex) {
				doc.esWillIndex();
			}

			doc.index();
		});

	}

	return SagaSearch;
})();
