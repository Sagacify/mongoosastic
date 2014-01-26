var elasticSearch = require('elasticsearch')
  , events        = require('events')
  , async		  = require('async');

var SchemaTreeMapper = require('./SchemaTreeMapper')
  , MappingMerger = require('./MappingMerger')
  , Serializer = require('./Serializer')
  , Hydrator = require('./Hydrator');

function SagaSearch (schema, options) {

	var esClient = new elasticSearch.Client({
			host: options.host,
			log: 'trace'
		})
	  , schemaExtension = options.schemaExtension
	  , hydrateOptions = options.hydrateOptions
	  , alwaysHydrate = !!options.alwaysHydrate
	  //, mapping = SchemaTreeMapper(schema.tree)
	  , indexName = options.index
	  , typeName = options.type
	  , settings = options.settings
	  , mappings = options.mappings;


	function resolveCollectionName (modelname) {
		return mongoose.models[modelname] ? mongoose.models[modelname].collection.name : null;
	}

	function emitEvent (emitter, eventName, args) {
		//var argsList = Array.prototype.slice.call(arguments, 0);
		emitter.emit(eventName, args);
		//emitter.emit.apply(emitter, [eventName].concat(argsList));
	}

	function addMapping (callback) {
		if(mappings) {
			console.log("Mapping")
			console.log(mappings)
			esClient.indices.putMapping({
				index: indexName,
				type: typeName,
				body: mappings
			}, callback);
		}
		else {
			callback(null);
		}
		//return MappingMerger(mapping, addedMapping);
	};

	function addSettings (callback){
		if(settings) {
			async.series([
				function (callback){
					//Index close
					esClient.indices.close({
						index:indexName
					}, callback);
				},
				function (callback){
				esClient.indices.putSettings({
					index: indexName,
					body: settings
					}, callback);	
				},
				function (callback){
					esClient.indices.open({
						index:indexName
					}, callback);
				}], callback);
		}
		else {
			callback(null);
		}
	};

	function checkIndexOrCreate (callback){
		esClient.indices.exists({
			index: indexName
		}, function(err, res){
			if(!err && res == false){
				createIndex(callback);
			}
			else {
				callback(null);	
			}
		});
	};

	function createIndex(callback){
		esClient.indices.create({
			index:indexName
		}, callback);
	};

	schema.methods.index = function (index, type) {
		var model = this;
		esClient.index({
			index: index || indexName,
			type: type || typeName || model.get('__t'),
			id: '' + model._id,
			body: /*Serializer(mapping, model)*/model
		}, function (error, res) {
			model.emit('es-indexed', error, res);
			//emitEvent(model, 'es-indexed', arguments);
		});
	};

	schema.methods.unindex = function (index, type) {
		var model = this;
		esClient.delete({
			index: index || indexName,
			type: type || typeName || model.get('__t'),
			id: '' + model._id
		}, function (error, res) {
			model.emit('es-removed', error, res);
			//emitEvent(model, 'es-removed', arguments);
		});
	};

	schema.statics.sync = function (query) {
		var model   = this
		  , readyToClose = false
		  , emitter = new events.EventEmitter();

		if(!query || (typeof query !== 'object')) {
			query = {};
		}

		var counter = 0
		  , close = function (args) {
		  		if(!counter && readyToClose) {
		  			emitEvent(emitter, 'close', args);
		  		}
		  }
		  , forward = function (doc, counter) {
			  	doc.on('es-indexed', function (error, res) {
			  		// QUESTION FOR MICKAEL : I don't understand why the argument of this listener are different that the ones of the emmiter?? Also, I dont
			  		// understand what the next emmiter does.  Thanks
			  		// console.log("INDEXED ?");
			  		// console.log("ERROR :"+ error)
			  		// console.log("RES:" +res);
			  		if(error) {
						emitter.emit('error', error);
					}
					else {
						emitter.emit('data', null, doc);
					}
			  		//emitEvent(emitter, error ? 'error' : 'data', arguments);
			  		if(counter != null) {
			  			counter--;
			  			close();
			  		}
			  	});
		  }

		async.series([
			function (callback){
				console.log("CheckOrCreateIndex");
				checkIndexOrCreate(callback);
			},
			function (callback){
				console.log("Add settings")
				addSettings(callback);
			},
			function (callback){
				console.log("Add Mapping");
				addMapping(callback);
			},
			function (callback){
				model.find(query).stream()
					.on('data', function (doc) {
						counter++;
						if(doc.esWillIndex){
							doc.esWillIndex();
						}
						forward(doc, counter);
						doc.index();
					})
					.on('error', function (error) {
						emitEvent(emitter, 'error', arguments);
					})
					.on('close', function () {
						readyToClose = true;
						callback(null);
						close(arguments);
					});
			}], function(err, res){
				console.log("Async finished");
				console.log(err);
			});
		//Add data


		return emitter;
	};

	schema.statics.search = function (query, index, type, options, cb) {
		var model = this;
		query.index = index || indexName;
		query.type = type || typeName;
		esClient.search(query, function (error, res) {
			if(error) {
				cb(error);
			}
			else if(alwaysHydrate || options.hydrate) {
				cb(null, Hydrator(res, hydrateOptions));
			}
			else {
				cb(null, res);
			}
		});
	}

	schema.post('remove', function (doc) {
		doc.unindex();
	});

	schema.post('save', function (doc) {
		if(doc.esWillIndex){
			doc.esWillIndex();
		}
		doc.index();
	});

}

module.exports = SagaSearch;
