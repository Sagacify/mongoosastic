var mongoose = require('mongoose');
global.models = mongoose.models
global.model = mongoose.model.bind(mongoose);

var SchemaTreeMapper = require('./SchemaTreeMapper');

console.log(Object.keys(SchemaTreeMapper));

var RuleSchema = new mongoose.Schema({
	weekday: {
		type: Number,
		public: true,
		validation: ['Number', { 'superiorOrEqualTo': 0 }, { 'inferiorOrEqualTo': 6 }]
	},
	startD: {
		type: Date,
		public: true,
		validation: ['isOptional', 'Date', 'inFuture', { 'maxDate': new Date(8640000000000000) }],
	},
	endD: {
		type: Date,
		public: true,
		validation: ['isOptional', 'Date', 'inFuture', { 'maxDate': new Date(8640000000000000) }],
	},
	from: {
		type: String,
		public: true,
		validation: ['isOptional', 'String', { 'lenEqualTo': 5 }, 'timeString'],
	},
	/*Time in day in hour*/
	end: {
		type: String,
		public: true,
		validation: ['isOptional', 'String', { 'lenEqualTo': 5 }, 'timeString'],
	},
	/*Time in day in hour*/
	duration: {
		type: String,
		public: true,
		validation: ['isOptional', 'String', { 'lenEqualTo': 5 }, 'timeString'],
	},
	/*Duration in hour*/
	buf: {
		type: String,
		public: true,
		validation: ['isOptional', 'String', { 'lenEqualTo': 5 }, 'timeString'],
	},
	/*Duration in hour*/
	brk: {
		from: {
			type: String,
			public: true,
			validation: ['isOptional', 'String', { 'lenEqualTo': 5 }, 'timeString'],
		},
		end: {
			type: String,
			public: true,
			validation: ['isOptional', 'String', { 'lenEqualTo': 5 }, 'timeString'],
		},
	}
	// current	: { type: Boolean, public: true } /* Wheter of not this rule is the current one*/
});

var LocationSchema = new mongoose.Schema({
	latLng: {
		type: {},
		public: true,
		geoindex: true
	},
	/*[Lat:Number, Lng:Number]*/
	professional: {
		_id: {
			type: mongoose.Schema.ObjectId,
			ref: 'User',
			public: true
		},
		firstname: {
			type: String,
			validation: ['String', 'notEmpty', 'notNull', { 'lenInferiorTo': 65 }],
			public: true
		},
		lastname: {
			type: String,
			validation: ['String', 'notEmpty', 'notNull', { 'lenInferiorTo': 65 }],
			public: true
		},
		profilePicture: {
			type: String,
			ref: 'File',
			base64: true,
			public: true
		},
		spec: {
			type: String,
			validation: ['String', 'notEmpty', 'notNull', { 'lenInferiorTo': 100 }],
			public: true
		},
		state: {
			type: Number,
			validation: ['Number', { 'superiorOrEqualTo': 0 }, { 'inferiorOrEqualTo': 2 }]
		}
	},
	address: {
		name: {
			type: String,
			validation: ['String', 'notEmpty', 'notNull', { 'lenInferiorTo': 150 }],
			public: true
		},
		verbose: {
			type: String,
			validation: ['String', 'notEmpty', 'notNull', { 'lenInferiorTo': 65 }],
			public: true
		},
		phone: {
			type: String,
			validation: ['String', 'notEmpty', 'isPhoneNumber', { 'lenInferiorTo': 20 }],
			public: true
		},
		street_number: {
			type: String,
			validation: ['String', 'isNumeric', { 'lenInferiorTo': 6 }],
			public: true
		},
		route: {
			type: String,
			validation: ['isOptional', 'String', 'notEmpty', 'notNull', { 'lenInferiorTo': 100 }],
			public: true
		},
		sublocality: {
			type: String,
			validation: ['isOptional', 'String', 'notEmpty', 'notNull', { 'lenInferiorTo': 100 }],
			public: true
		},
		locality: {
			type: String,
			validation: ['String', 'notEmpty', 'notNull', { 'lenInferiorTo': 100 }],
			public: true
		},
		administrative_area_level_1: {
			type: String,
			validation: ['String', 'notEmpty', 'notNull', { 'lenInferiorTo': 100 }],
			public: true
		},
		administrative_area_level_2: {
			type: String,
			validation: ['isOptional', 'String', 'notEmpty', 'notNull', { 'lenInferiorTo': 100 }],
			public: true
		},
		country: {
			type: String,
			validation: ['String', 'notEmpty', 'notNull', { 'lenInferiorTo': 100 }],
			public: true
		},
		postal_code: {
			type: String,
			validation: ['isOptional', 'String', 'notEmpty', 'notNull', { 'lenInferiorTo': 7 }],
			public: true
		}
	},
	tz: {
		type: Number,
		validation: ['Number'],
		default: 0,
		public: true
	},
	onCall: {
		type: Boolean,
		validation: ['Boolean'],
		public: true
	},
	rules: [RuleSchema],
	// HACK used to bypass aggregate limitations on Mongoose document instances
	distance: {
		type: Number,
		public: true
	},
	_deleted: {
		type: Boolean,
		default: false
	}

});

mongoose.model('Location', LocationSchema);

mongoose.connect('mongodb://localhost:27017/testy', function (e) {
	if (e) {
		console.log(e);
	}
	else {
		// var EmbededSchema = new mongoose.Schema({
		// 	isTrue : {
		// 		type: Boolean,
		// 		public: 'isTrue'
		// 	}
		// });

		// var TestSchema = new mongoose.Schema({
		// 	string: {
		// 		type: String,
		// 		public: 'string'
		// 	},
		// 	list: [{
		// 		type: Boolean,
		// 		public: 'list'
		// 	}],
		// 	misc: {},
		// 	embed: [EmbededSchema]
		// });

		//var skelleton = SchemaTreeMapper(TestSchema.tree);
		var skelleton = SchemaTreeMapper(LocationSchema.tree);
		console.log(skelleton);

		console.log('\n\n\n');

		//console.log(Object.keys(mongoose));
		console.log(mongoose.models);
		//console.log(Object.keys(mongoose.models));
		console.log(mongoose.modelSchemas);
		//console.log(Object.keys(mongoose.modelSchemas));
	}
});


