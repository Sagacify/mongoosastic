global.mongoose = require('mongoose')
var SagaSearch = require('./SagaSearch');

global.Schema = mongoose.Schema
global.models = mongoose.models
global.model = mongoose.model.bind(mongoose);

mongoose.connect('mongodb://localhost:27017/testy', function (e) {
	if (e) {
		console.log(e);
	}
	else {
		var EmbededSchema = new mongoose.Schema({
			isTrue : {
				type: Boolean,
				public: 'isTrue'
			}
		});

		var TestSchema = new mongoose.Schema({
			string: {
				type: String,
				public: 'string'
			},
			list: [{
				type: String,
				public: 'list'
			}],
			//misc: {},
			//embed: [EmbededSchema]
		});

		TestSchema.plugin(SagaSearch, {
			host: 'http://ec2-54-228-154-207.eu-west-1.compute.amazonaws.com:9200',
			index: 'saga-search',
			type: 'test'
		});

		var TestModel = model('Test', TestSchema);

		var test = model('Test')({
			string: 'hello world',
			list: [
				'my',
				'awesome',
				'list'
			],
			//misc: {
			//	testing: 'misc'
			//},
			//embed: [{
			//	isTrue: false
			//}]
		});

		test.save(function (error, doc) {
			if(error) {
				console.log('Error!');
				console.log(error);
			}
			else {
				doc.index({
					transforms: {
						content: myfunction
					}
				})
				.on('es-indexed', function () {
					console.log('Indexed :');
					console.log(arguments);
				}).on('es-removed', function () {
					console.log('Removed :');
					console.log(arguments);
				});
			}
		});

		// TestModel.synchronize()
		// .on('data', function () {
		// 	console.log('Data :');
		// 	console.log(arguments);
		// })
		// .on('error', function () {
		// 	console.log('Error :');
		// 	console.log(arguments);
		// })
		// .on('close', function () {
		// 	console.log('Close :');
		// 	console.log(arguments);
		// });

	}
});


