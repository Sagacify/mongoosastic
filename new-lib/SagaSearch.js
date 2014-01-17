var elasticSearch = require('elasticsearch')
  , events        = require('events');

var SchemaTreeMapper = require('./SchemaTreeMapper')
  , MappingMerger = require('./MappingMerger')
  , Serializer = require('./Serializer')
  , Hydrator = require('./Hydrator');

function SagaSearch (schema, options) {

	var esClient = new elasticSearch.Client({
			host: options.host
		})
	  , schemaExtension = options.schemaExtension
	  , hydrateOptions = options.hydrateOptions
	  , alwaysHydrate = !!options.alwaysHydrate
	  , mapping = SchemaTreeMapper(schema.tree)
	  , indexName = options.index
	  , typeName = options.type;


	function resolveCollectionName (modelname) {
		return mongoose.models[modelname] ? mongoose.models[modelname].collection.name : null;
	}

	function emitEvent (emitter, eventName, args) {
		var argsList = Array.prototype.slice.call(arguments, 0);
		emitter.emit.apply(emitter, [eventName].concat(argsList));
	}

	statics.methods.addMapping = function (addedMapping) {
		return MappingMerger(mapping, addedMapping);
	};

	schema.methods.index = function (index, type) {
		var model = this;
		esClient.index({
			index: index || indexName,
			type: type || typeName,
			id: '' + model._id,
			body: Serializer(mapping, model)
		}, function (error, res) {
			emitEvent(model, 'es-indexed', arguments);
		});
	};

	schema.methods.unindex = function (index, type) {
		var model = this;
		esClient.delete({
			index: index || indexName,
			type: type || typeName,
			id: '' + model._id
		}, function (error, res) {
			emitEvent(model, 'es-removed', arguments);
		});
	};

	schema.statics.synchronize = function (query) {
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
			  		emitEvent(emitter, error ? 'error' : 'data', arguments);
			  		if(counter != null) {
			  			counter--;
			  			close();
			  		}
			  	});
		  }

		model.find(query).stream()
		.on('data', function (doc) {
			counter++;
			forward(doc, counter);
			doc.index();
		})
		.on('error', function (error) {
			emitEvent(emitter, 'error', arguments);
		})
		.on('close', function () {
			readyToClose = true;
			close(arguments);
		});

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
		this.unindex();
	});

	schema.post('save', function (doc) {
		this.index();
	});

}

module.exports = SagaSearch;
