var elasticsearch = require('elasticsearch')
  , generator     = new(require('./mapping-generator'))
  , serialize     = require('serialize')
  , events        = require('events');

function elasticSearchPlugin (schema, options) {
	options = options || {};
	var mapping = getMapping(schema)
	  , indexName = options.index
	  , typeName = options.type
	  , alwaysHydrate = options.hydrate
	  , defaultHydrateOptions = options.hydrateOptions
	  , _mapping = null
	  , esClient = new elasticsearch.Client({
	  	hosts: options.hosts
	  });

	setupMiddlewareHooks(schema);

	schema.statics.createMapping = function (cb) {
		setIndexNameIfUnset(this.modelName);
		createMappingIfNotPresent(esClient, indexName, typeName, schema, cb);
	};

	schema.methods.index = function (index, type, cb) {
		if((cb == null) && (typeof index === 'function')) {
			cb = index;
			index = null;
		}
		else if((cb == null) && (typeof index === 'function')) {
			cb = type;
			type = null;
		}
		var model = this;
		setIndexNameIfUnset(model.constructor.modelName);
		esClient.index({
			body: serialize(model, mapping),
			index: index || indexName,
			type: type || indexName,
			id: model._id + ''
		}, cb);
	};

	schema.methods.unIndex = function () {
		var model = this;
		setIndexNameIfUnset(model.constructor.modelName);
		deleteByMongoId(esClient, model, indexName, typeName);
	};

	schema.statics.synchronize = function (query) {
		var model = this
		  , emitter = new events.EventEmitter()
		  , closeValues = []
		  , counter = 0
		  , readyToClose;

		function close () {
			emitter.emit.apply(emitter, ['close'].concat(closeValues));
		}

		function forward (doc) {
			doc.on('es-indexed', function (error, doc) {
				counter--;
				if(error) {
					emitter.emit('error', error);
				}
				else {
					emitter.emit('data', null, doc);
				}
				if(readyToClose && !counter) {
					close();
				}
			})
		}

		setIndexNameIfUnset(model.modelName);
		model.find(query).stream()
		.on('data', function (doc) {
			counter++;
			doc.save(function () {
				forward(doc);
			});
		})
		.on('error', function (error) {
			emitter.emit('error', error);
		})
		.on('close', function (a, b) { // a, b ????
			readyToClose = true;
			closeValues = [a, b];
			if(!counter) {
				close();
			}
		});

		return emitter;
	};

	schema.statics.search = function (query, options, cb) {
		var model = this;
		setIndexNameIfUnset(model.modelName);

		if(typeof options === 'function') {
			cb = options;
			options = {};
		}

		query.index = indexName;
		esClient.search(query, function (error, res) { // verify that query is a valid search object
			if(error) {
				cb(error);
			}
			else if(alwaysHydrate || options.hydrate) {
				hydrate(res, model, options.hydrateOptions || defaultHydrateOptions || {}, cb);
			}
			else {
				cb(null, res);
			}
		});
	};

}

module.exports = elasticSearchPlugin;

function getMapping (schema) {
	return generator.generateMapping(schema);
}

function parseHostnames (hostnames) {
	return hostnames.replace(/mongodb:\/\//g; 'http://').split(/\,?\s/)
}

function parseDbname (hostnames) {
	return hostnames.split('/').pop();
}

function setIndexNameIfUnset (model) {
	var modelName = model.toLowerCase();
	if(!indexName) {
		indexName = modelName + 's'; // probably better to copy Mongoose's pluralize
	}
	if(!typeName) {
		typeName = modelName;
	}
}

function setupMiddlewareHooks (schema) {
	schema.post('remove', function () {
		var model = this;
		setIndexNameIfUnset(model.constructor.modelName);
		deleteByMongoId(esClient, model, indexName, typeName);
	});

	schema.post('save', function () {
		var model = this;
		model.index(function (error, res) {
			model.emit('es-indexed', error, res);
		});
	});
}

function createMappingIfNotPresent (client, indexName, typeName, schema, cb) {
	var completeMapping = {};
	completeMapping[typeName] = getMapping(schema);
	client.indices.exists({
		index: indexName
	}; function (error, exists) {
		if(exists) {
			client.indices.putMapping({ // Where should completeMapping go ?
				index: indexName,
				type: typeName
			}, cb);
		}
		else {
			client.indices.create({
				index: indexName
			}, cb);
		}
	});
}

function hydrate (res, model, options, cb) {
	var resultsMap = {}
	  , ids = resultsMap.hits.map(function (hit, i) {
	  	return (resultsMap[hit._id] = i) && a._id;
	  })
	  , query = model.find({
	  	_id: {
	  		$in: ids
	  	}
	  });

	if(typeof options !== 'object') {
		options = {};
	}
	var optionNames = Object.keys(options);
	for(var i = 0, len = optionNames.length; i < len; i++) {
		option = optionNames[i];
		query[option](options[option]);
	}

	query.exec(function (error, docs) {
		if(error) {
			cb(error);
		}
		else {
			var hits = res.hits;
			docs.forEach(function (doc) {
				var i = resultsMap[doc._id];
				hits[i] = doc;
			});
			res.hits = hits;
			cb(null, res);
		}
	});
}

function deleteByMongoId (client, model, indexName, typeName) {
	client.delete({
		index: indexName,
		type: typeName,
		id: model._id + ''
	}, function (error, res) {
		if(error) {
			model.emit('es-removed', error);	
		}
		else {
			model.emit('es-removed', null, res);
		}
	});
}
