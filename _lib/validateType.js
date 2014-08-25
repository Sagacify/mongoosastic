exports.MongooseDocument = function() {
	return exports.isObject(obj) && ('_id' in obj);
};

exports.Object = function (obj) {
	return Object.prototype.toString.call(obj) === '[object Object]';
};

exports.Array = function (obj) {
	return Object.prototype.toString.call(obj) === '[object Array]';
};

exports.String = function (obj) {
	return Object.prototype.toString.call(obj) === '[object String]';
};

exports.DateString = function (str) {
	return exports.String(str) && str.match(/^[0-9]{4}\-[0-9]{2}\-[0-9]{2}T[0-9]{2}\:[0-9]{2}\:[0-9]{2}\.[0-9]{3}Z$/);
};

exports.Function = function (obj) {
	return Object.prototype.toString.call(obj) === '[object Function]';
};

exports.Number = function (obj) {
	return (Object.prototype.toString.call(obj) === '[object Number]') && !isNaN(obj);
};

exports.Date = function (obj) {
	return (Object.prototype.toString.call(obj) === '[object Date]') && !isNaN(obj.getTime());
};

exports.Boolean = function (obj) {
	return Object.prototype.toString.call(obj) === '[object Boolean]';
};

exports.NotNull = function (obj) {
	return obj != null;
};

exports.Null = function (obj) {
	return obj == null;
};

exports.VirtualType = function (obj) {
	return this.constructor.name === 'VirtualType';
};