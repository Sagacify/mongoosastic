var elasticSearch = require('elasticsearch'),
	events = require('events'),
	async = require('async');

var SchemaTreeMapper = require('./SchemaTreeMapper'),
	MappingMerger = require('./MappingMerger'),
	Serializer = require('./Serializer'),
	Hydrator = require('./Hydrator');

function SagaSearch(schema, options) {

	var esClient = new elasticSearch.Client({
		host: options.host,
		//log: 'trace'
	}),
		schemaExtension = options.schemaExtension,
		hydrateOptions = options.hydrateOptions,
		alwaysHydrate = !! options.alwaysHydrate
		//, mapping = SchemaTreeMapper(schema.tree)
		,
		indexName = options.index,
		typeName = options.type,
		settings = options.settings,
		mappings = options.mappings;

	function resolveCollectionName(modelname) {
		return mongoose.models[modelname] ? mongoose.models[modelname].collection.name : null;
	}

	function emitEvent(emitter, eventName, args) {
		//var argsList = Array.prototype.slice.call(arguments, 0);
		emitter.emit(eventName, args);
		//emitter.emit.apply(emitter, [eventName].concat(argsList));
	}

	/**
	 * add mapping to a document type.
	 * either take a mapping object or loop over an array of mappings if "mapping" is an Array.
	 */
	function addMapping(callback) {
		if (mappings) {
			// console.log("Mappings")
			// console.log(mappings)
			if (typeof mappings != 'string' && mappings.length && mappings.length) {
				async.each(mappings, function (item, callback) {
					var map = {
						index: indexName,
						body: item,
						type: Object.keys(item)[0]
					};
					console.log("Put Mapping")
					console.log(JSON.stringify(map));
					esClient.indices.putMapping(map, callback);
				}, function (err) {
					callback(err);
				});
			} else {
				var map = {
					index: indexName,
					body: mappings,
					type: typeName || Object.keys(mappings)[0]
				};
				esClient.indices.putMapping(map, callback);
			}
		} else {
			callback(null);
		}
	};

	function addSettings(callback) {
		if (settings) {
			async.series([

				function (callback) {
					//Index close
					esClient.indices.close({
						index: indexName
					}, callback);
				},
				function (callback) {
					esClient.indices.putSettings({
						index: indexName,
						body: settings
					}, callback);
				},
				function (callback) {
					esClient.indices.open({
						index: indexName
					}, callback);
				}
			], callback);
		} else {
			callback(null);
		}
	};

	function checkIndexOrCreate(callback) {
		esClient.indices.exists({
			index: indexName
		}, function (err, res) {
			if (!err && res == false) {
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
			if (!err && res == true) {
				esClient.indices.delete({
					index: indexName
				}, callback);
			} else {
				callback(null);
			}
		});
	};

	schema.methods.index = function (options, callback) {
		var model = this;
		var options = options || {};

		esClient.index({
			index: options.index || indexName,
			type: options.type || typeName || model.get('__t'),
			id: '' + model.get('_id'),
			body: model
		}, callback);
	};

	schema.methods.unindex = function (options, index, type) {
		var model = this;
		var options = options || {};

		esClient.delete({
			index: options.index || indexName,
			type: options.type || typeName || model.get('__t'),
			id: '' + model.get('_id')
		}, function (error, res) {
			model.emit('es-removed', error, res);
			//emitEvent(model, 'es-removed', arguments);
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
					} else {
						emitter.emit('data', null, doc);
					}
					//emitEvent(emitter, error ? 'error' : 'data', arguments);
					if (counter != null) {
						counter--;
						close();
					}
				});
			}

		async.series([

			function (callback) {
				console.log("Delete old index " + indexName);
				deleteIndex(callback);
			},
			function (callback) {
				console.log("CheckOrCreateIndex " + indexName);
				checkIndexOrCreate(callback);
			},
			function (callback) {
				setTimeout(function(){
					console.log("Add settings " + indexName);
					addSettings(callback);	
				}, 1000);
			},
			function (callback) {
				console.log("Add Mapping " + indexName);
				addMapping(callback);
			},
			function (callback) {
				console.log("Sync " + indexName);

				var pageSize = 10;
				var tasks = [];

				tasks.push(function(callback){

					model.find({}).sort({_id : 1}).limit(pageSize).exec(function(err, docToSync){
						if (!err){
							var lastId;
							async.each(docToSync, function(item, callback){
								//console.log("ID to sync : ", item._id);
								item.index({}, callback);
								lastId = item._id;
							}, function(err){
								//console.log("Last ID : ", lastId);
								callback(err, lastId);

							});
						}
						else {
							callback(err, null);
						}
					});	
				});

				tasks.push(function(initlastId, callback){
					//console.log("ENTER PAGINATION : ", initlastId);
					var lastId = initlastId;

					async.whilst(
						function() {return lastId != null;},
						function(callback){
							model.find({'_id':{$gt: lastId}}).sort({_id : 1}).limit(pageSize).exec(function(err, docToSync){
								if (!err && docToSync.length > 0){
									async.each(docToSync, function(item, callback){
										//console.log("ID to sync : ", item._id);
										item.index({}, callback);
										lastId = item._id;
									}, function(err){
										//console.log("Last ID : ", lastId);
										callback(err, lastId);
									});
								}
								else {
									//console.log("Finish while loop : ", err);
									lastId = null;
									callback(err, null);
								}
							});
						},
						function(err){
							//console.log("Finish sync : ", err);
							callback(err);
						});
				});

				async.waterfall(tasks, 
					function(err, results){
						//console.log("Waterfall DONE");
						//console.log(results);
						callback(err);
				});

			}
		], function (err, res) {
			if (!err) {
				console.log("Async finished : " + indexName);
				callback(null);
			} else {
				console.log(err);
				callback(err);
			}
		});
		return emitter;
	};

	schema.statics.search = function (query, index, type, options, cb) {
		var model = this;
		query.index = index || indexName;
		query.type = type || typeName;
		esClient.search(query, function (error, res) {
			if (error) {
				cb(error);
			} else if (alwaysHydrate || options.hydrate) {
				cb(null, Hydrator(res, hydrateOptions));
			} else {
				cb(null, res);
			}
		});
	};

	schema.post('remove', function (doc) {
		doc.unindex({});
	});

	schema.post('save', function (doc) {
		if (doc.esWillIndex) {
			doc.esWillIndex();
		}
		doc.index({});
	});

}

module.exports = SagaSearch;
