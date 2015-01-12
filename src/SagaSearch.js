var elasticSearch = require('elasticsearch'),
	events = require('events'),
	async = require('async');

var MappingMerger = require('./MappingMerger'),
	Serializer = require('./Serializer'),
	Hydrator = require('./Hydrator');

module.exports = (function () {
	'use strict';

	function SagaSearch (schema, options) {

		var esClient = new elasticSearch.Client({
			host: options.host
			//log: 'trace'
		}),
		schemaExtension = options.schemaExtension,
		hydrateOptions = options.hydrateOptions,
		alwaysHydrate = !!options.alwaysHydrate,
		indexName = options.index,
		typeName = options.type,
		settings = options.settings,
		mappings = options.mappings;

		function emitEvent(emitter, eventName, args) {
			emitter.emit(eventName, args);
		}

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
					body: item,
					type: typeName || item.keys()[0]
				};

				esClient.indices.putMapping(map, cb);
			}, callback);
		};

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
		};

		function checkIndexOrCreate(callback) {
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
		};

		function createIndex(callback) {
			esClient.indices.create({
				index: indexName
			}, callback);
		};

		function deleteIndex(callback) {
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
		};

		schema.methods.index = function (index, type) {
			var model = this;
			esClient.index({
				index: index || indexName,
				type: type || typeName || model.get('__t'),
				id: '' + model.get('_id'),
				body: model
			}, function (error, res) {
				model.emit('es-indexed', error, res);
			});
		};

		schema.methods.unindex = function (index, type) {
			var model = this;
			esClient.delete({
				index: index || indexName,
				type: type || typeName || model.get('__t'),
				id: '' + model.get('_id')
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
		}

		schema.statics.sync = function (query, callback) {
			var model = this,
				readyToClose = false,
				emitter = new events.EventEmitter();

			if (!query || (typeof query !== 'object')) {
				query = {};
			}

			var counter = 0,
				close = function (args) {
					if (!counter && readyToClose) {
						emitEvent(emitter, 'close', args);
					}
				}, forward = function (doc, counter) {
					doc.on('es-indexed', function (error, res) {
						if (error) {
							emitter.emit('error', error);
						}
						else {
							emitter.emit('data', null, doc);
						}
						//emitEvent(emitter, error ? 'error' : 'data', arguments);
						if (counter != null) {
							counter--;
							close();
						}
					});
				};

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
						// counter++;
						// if(doc.esWillIndex){
						// 	doc.esWillIndex();
						// }
						// forward(doc, counter);
						doc.index();
					})
					.on('error', function (error) {
						// emitEvent(emitter, 'error', arguments);
						cb(error);
					})
					.on('close', function () {
						// readyToClose = true;
						cb(null);
						// close(arguments);
					});
				}
			], callback);

			return emitter;
		};

		schema.statics.search = function (query, index, type, options, cb) {
			var model = this;
		
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
		}

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
