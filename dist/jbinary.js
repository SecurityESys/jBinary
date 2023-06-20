(function (factory) {
	var global = this || window.global || window;

	if (NODE || typeof exports === 'object') {
		module.exports = factory(global, require('jdataview'));
	} else
	if (BROWSER) {
		if (typeof define === 'function' && define.amd) {
			define(['jdataview'], function (jDataView) {
				return factory(global, jDataView);
			});
		}
		else {
			global.jBinary = factory(global, global.jDataView);
		}
	}
}(function (global, jDataView) {

'use strict';


/* jshint ignore:start */

if (BROWSER) {
	var document = global.document;
}

// https://github.com/davidchambers/Base64.js (modified)
if (!('atob' in global) || !('btoa' in global)) {
	(function(){var a="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";var d=[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,62,-1,-1,-1,63,52,53,54,55,56,57,58,59,60,61,-1,-1,-1,-1,-1,-1,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,-1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,-1,-1,-1,-1,-1];function b(l){var g,j,e;var k,h,f;e=l.length;j=0;g="";while(j<e){k=l.charCodeAt(j++)&255;if(j==e){g+=a.charAt(k>>2);g+=a.charAt((k&3)<<4);g+="==";break}h=l.charCodeAt(j++);if(j==e){g+=a.charAt(k>>2);g+=a.charAt(((k&3)<<4)|((h&240)>>4));g+=a.charAt((h&15)<<2);g+="=";break}f=l.charCodeAt(j++);g+=a.charAt(k>>2);g+=a.charAt(((k&3)<<4)|((h&240)>>4));g+=a.charAt(((h&15)<<2)|((f&192)>>6));g+=a.charAt(f&63)}return g}function c(m){var l,k,h,f;var j,e,g;e=m.length;j=0;g="";while(j<e){do{l=d[m.charCodeAt(j++)&255]}while(j<e&&l==-1);if(l==-1){break}do{k=d[m.charCodeAt(j++)&255]}while(j<e&&k==-1);if(k==-1){break}g+=String.fromCharCode((l<<2)|((k&48)>>4));do{h=m.charCodeAt(j++)&255;if(h==61){return g}h=d[h]}while(j<e&&h==-1);if(h==-1){break}g+=String.fromCharCode(((k&15)<<4)|((h&60)>>2));do{f=m.charCodeAt(j++)&255;if(f==61){return g}f=d[f]}while(j<e&&f==-1);if(f==-1){break}g+=String.fromCharCode(((h&3)<<6)|f)}return g}if(!global.btoa){global.btoa=b}if(!global.atob){global.atob=c}})();
}

/* jshint ignore:end */

var Promise = global.Promise || (NODE ? require('es6-promise').Promise : function (executor) {
	this.then = executor;
});

function is(obj, Ctor) {
	return Ctor && (obj instanceof Ctor);
}

function extend(obj) {
	for (var i = 1, length = arguments.length; i < length; ++i) {
		var source = arguments[i];
		for (var prop in source) {
			if (source[prop] !== undefined) {
				obj[prop] = source[prop];
			}
		}
	}
	return obj;
}

var _inherit = Object.create;

if (BROWSER && !_inherit) {
	_inherit = function (obj) {
		var ClonedObject = function () {};
		ClonedObject.prototype = obj;
		return new ClonedObject();
	};
}

function inherit(obj) {
	'use strict';
	arguments[0] = _inherit(obj);
	return extend.apply(null, arguments);
}

function toValue(obj, binary, value) {
	return is(value, Function) ? value.call(obj, binary.contexts[0]) : value;
}

function promising(func) {
	return function () {
		var args = arguments,
			lastArgsIndex = args.length - 1,
			lastFuncIndex = func.length - 1,
			callback = args[lastArgsIndex];

		args.length = lastFuncIndex + 1;

		if (is(callback, Function)) {
			args[lastArgsIndex] = undefined;
			args[lastFuncIndex] = callback;
			func.apply(this, args);
		} else {
			var self = this;

			return new Promise(function (resolveFn, rejectFn) {
				args[lastFuncIndex] = function (err, res) {
					return err ? rejectFn(err) : resolveFn(res);
				};

				func.apply(self, args);
			});
		}
	};
}

function jBinary(view, typeSet) {
	if (is(view, jBinary)) {
		return view.as(typeSet);
	}

	/* jshint validthis:true */
	if (!is(view, jDataView)) {
		view = new jDataView(view, undefined, undefined, typeSet ? typeSet['jBinary.littleEndian'] : undefined);
	}

	if (!is(this, jBinary)) {
		return new jBinary(view, typeSet);
	}

	this.view = view;
	this.view.seek(0);
	this.contexts = [];

	return this.as(typeSet, true);
}

var proto = jBinary.prototype;

var defaultTypeSet = proto.typeSet = {};

proto.toValue = function (value) {
	return toValue(this, this, value);
};

proto._named = function (func, name, offset) {
	func.displayName = name + ' @ ' + (offset !== undefined ? offset : this.view.tell());
	return func;
};

var defineProperty = Object.defineProperty;

if (BROWSER) {
	if (defineProperty) {
		// this is needed to detect DOM-only version of Object.defineProperty in IE8:
		try {
			defineProperty({}, 'x', {});
		} catch (e) {
			defineProperty = undefined;
		}
	} else  {
		defineProperty = function (obj, key, descriptor, allowVisible) {
			if (allowVisible) {
				obj[key] = descriptor.value;
			}
		};
	}
}

var cacheKey = 'jBinary.Cache';
var cacheId = 0;

proto._getCached = function (obj, valueAccessor, allowVisible) {
	if (!obj.hasOwnProperty(this.cacheKey)) {
		var value = valueAccessor.call(this, obj);
		defineProperty(obj, this.cacheKey, {value: value}, allowVisible);
		return value;
	} else {
		return obj[this.cacheKey];
	}
};

proto.getContext = function (filter) {
	switch (typeof filter) {
		case 'undefined':
			filter = 0;
		/* falls through */
		case 'number':
			return this.contexts[filter];

		case 'string':
			return this.getContext(function (context) { return filter in context });

		case 'function':
			for (var i = 0, length = this.contexts.length; i < length; i++) {
				var context = this.contexts[i];
				if (filter.call(this, context)) {
					return context;
				}
			}
	}
};

proto.inContext = function (newContext, callback) {
	this.contexts.unshift(newContext);
	var result = callback.call(this);
	this.contexts.shift();
	return result;
};

function Type(config) {
	return inherit(Type.prototype, config);
}

Type.prototype = {
	inherit: function (args, getType) {
		var _type = this, type;

		function withProp(name, callback) {
			var value = _type[name];
			if (value) {
				if (!type) {
					type = inherit(_type);
				}
				callback.call(type, value);
				type[name] = null;
			}
		}

		withProp('params', function (params) {
			for (var i = 0, length = params.length; i < length; i++) {
				this[params[i]] = args[i];
			}
		});

		withProp('setParams', function (setParams) {
			setParams.apply(this, args);
		});

		withProp('typeParams', function (typeParams) {
			for (var i = 0, length = typeParams.length; i < length; i++) {
				var param = typeParams[i], descriptor = this[param];
				if (descriptor) {
					this[param] = getType(descriptor);
				}
			}
		});

		withProp('resolve', function (resolve) {
			resolve.call(this, getType);
		});

		return type || _type;
	},
	createProperty: function (binary) {
		return inherit(this, {
			binary: binary,
			view: binary.view
		});
	},
	toValue: function (val, allowResolve) {
		if (allowResolve !== false && typeof val === 'string') {
			return this.binary.getContext(val)[val];
		}
		return toValue(this, this.binary, val);
	}
};

jBinary.Type = Type;

function Template(config) {
	return inherit(Template.prototype, config, {
		createProperty: function (binary) {
			var property = (config.createProperty || Template.prototype.createProperty).apply(this, arguments);
			if (property.getBaseType) {
				property.baseType = property.binary.getType(property.getBaseType(property.binary.contexts[0]));
			}
			return property;
		}
	});
}

Template.prototype = inherit(Type.prototype, {
	setParams: function () {
		if (this.baseType) {
			this.typeParams = ['baseType'].concat(this.typeParams || []);
		}
	},
	baseRead: function () {
		return this.binary.read(this.baseType);
	},
	baseWrite: function (value) {
		return this.binary.write(this.baseType, value);
	}
});

extend(Template.prototype, {
	read: Template.prototype.baseRead,
	write: Template.prototype.baseWrite
});

jBinary.Template = Template;

proto.as = function (typeSet, modifyOriginal) {
	var binary = modifyOriginal ? this : inherit(this);
	typeSet = typeSet || defaultTypeSet;
	binary.typeSet = (typeSet === defaultTypeSet || defaultTypeSet.isPrototypeOf(typeSet)) ? typeSet : inherit(defaultTypeSet, typeSet);
	binary.cacheKey = cacheKey;
	binary.cacheKey = binary._getCached(typeSet, function () { return cacheKey + '.' + (++cacheId) }, true);
	return binary;
};

proto.seek = function (position, callback) {
	position = this.toValue(position);
	if (callback !== undefined) {
		var oldPos = this.view.tell();
		this.view.seek(position);
		var result = callback.call(this);
		this.view.seek(oldPos);
		return result;
	} else {
		return this.view.seek(position);
	}
};

proto.tell = function () {
	return this.view.tell();
};

proto.skip = function (offset, callback) {
	return this.seek(this.tell() + this.toValue(offset), callback);
};

proto.slice = function (start, end, forceCopy) {
	return new jBinary(this.view.slice(start, end, forceCopy), this.typeSet);
};

proto._getType = function (type, args) {
	switch (typeof type) {
		case 'string':
			if (!(type in this.typeSet)) {
				throw new ReferenceError('Unknown type: ' + type);
			}
			return this._getType(this.typeSet[type], args);

		case 'number':
			return this._getType(defaultTypeSet.bitfield, [type]);

		case 'object':
			if (is(type, Type)) {
				var binary = this;
				return type.inherit(args || [], function (type) { return binary.getType(type) });
			} else {
				return (
					is(type, Array)
					? this._getCached(type, function (type) { return this.getType(type[0], type.slice(1)) }, true)
					: this._getCached(type, function (structure) { return this.getType(defaultTypeSet.object, [structure]) }, false)
				);
			}
	}
};

proto.getType = function (type, args) {
	var resolvedType = this._getType(type, args);

	if (resolvedType && !is(type, Type)) {
		resolvedType.name =
			typeof type === 'object'
			? (
				is(type, Array)
				? type[0] + '(' + type.slice(1).join(', ') + ')'
				: 'object'
			)
			: String(type);
	}

	return resolvedType;
};

proto._action = function (type, offset, _callback) {
	if (type === undefined) {
		return;
	}

	type = this.getType(type);

	var callback = this._named(function () {
		return _callback.call(this, type.createProperty(this), this.contexts[0]);
	}, '[' + type.name + ']', offset);

	return offset !== undefined ? this.seek(offset, callback) : callback.call(this);
};

proto.read = function (type, offset) {
	return this._action(type, offset, function (prop, context) { return prop.read(context) });
};

proto.readAll = function () {
	return this.read('jBinary.all', 0);
};

proto.write = function (type, data, offset) {
	return this._action(type, offset, function (prop, context) {
		var start = this.tell();
		prop.write(data, context);
		return this.tell() - start;
	});
};

proto.writeAll = function (data) {
	return this.write('jBinary.all', data, 0);
};



(function (simpleType, dataTypes) {
	for (var i = 0, length = dataTypes.length; i < length; i++) {
		var dataType = dataTypes[i];
		defaultTypeSet[dataType.toLowerCase()] = inherit(simpleType, {dataType: dataType});
	}
})(
	Type({
		params: ['littleEndian'],
		read: function () {
			return this.view['get' + this.dataType](undefined, this.littleEndian);
		},
		write: function (value) {
			this.view['write' + this.dataType](value, this.littleEndian);
		}
	}),
	[
		'Uint8',
		'Uint16',
		'Uint32',
		'Uint64',
		'Int8',
		'Int16',
		'Int32',
		'Int64',
		'Float32',
		'Float64',
		'Char'
	]
);

extend(defaultTypeSet, {
	'byte': defaultTypeSet.uint8,
	'float': defaultTypeSet.float32,
	'double': defaultTypeSet.float64
});

defaultTypeSet.array = Template({
	params: ['baseType', 'length'],
	read: function () {
		var length = this.toValue(this.length);
		if (this.baseType === defaultTypeSet.uint8) {
			return this.view.getBytes(length, undefined, true, true);
		}
		var results;
		if (length !== undefined) {
			results = new Array(length);
			for (var i = 0; i < length; i++) {
				results[i] = this.baseRead();
			}
		} else {
			var end = this.view.byteLength;
			results = [];
			while (this.binary.tell() < end) {
				results.push(this.baseRead());
			}
		}
		return results;
	},
	write: function (values) {
		if (this.baseType === defaultTypeSet.uint8) {
			return this.view.writeBytes(values);
		}
		for (var i = 0, length = values.length; i < length; i++) {
			this.baseWrite(values[i]);
		}
	}
});

defaultTypeSet.binary = Template({
	params: ['length', 'typeSet'],
	read: function () {
		var startPos = this.binary.tell();
		var endPos = this.binary.skip(this.toValue(this.length));
		var view = this.view.slice(startPos, endPos);
		return new jBinary(view, this.typeSet);
	},
	write: function (binary) {
		this.binary.write('blob', binary.read('blob', 0));
	}
});

defaultTypeSet.bitfield = Type({
	params: ['bitSize'],
	read: function () {
		return this.view.getUnsigned(this.bitSize);
	},
	write: function (value) {
		this.view.writeUnsigned(value, this.bitSize);
	}
});

defaultTypeSet.blob = Type({
	params: ['length'],
	read: function () {
		return this.view.getBytes(this.toValue(this.length));
	},
	write: function (bytes) {
		this.view.writeBytes(bytes, true);
	}
});

defaultTypeSet['const'] = Template({
	params: ['baseType', 'value', 'strict'],
	read: function () {
		var value = this.baseRead();
		if (this.strict && value !== this.value) {
			if (is(this.strict, Function)) {
				return this.strict(value);
			} else {
				throw new TypeError('Unexpected value (' + value + ' !== ' + this.value + ').');
			}
		}
		return value;
	},
	write: function (value) {
		this.baseWrite(this.strict || value === undefined ? this.value : value);
	}
});

defaultTypeSet['enum'] = Template({
	params: ['baseType', 'matches'],
	setParams: function (baseType, matches) {
		this.backMatches = {};
		for (var key in matches) {
			this.backMatches[matches[key]] = key;
		}
	},
	read: function () {
		var value = this.baseRead();
		return value in this.matches ? this.matches[value] : value;
	},
	write: function (value) {
		this.baseWrite(value in this.backMatches ? this.backMatches[value] : value);
	}
});

defaultTypeSet.extend = Type({
	setParams: function () {
		this.parts = arguments;
	},
	resolve: function (getType) {
		var parts = this.parts, length = parts.length, partTypes = new Array(length);
		for (var i = 0; i < length; i++) {
			partTypes[i] = getType(parts[i]);
		}
		this.parts = partTypes;
	},
	read: function () {
		var parts = this.parts, obj = this.binary.read(parts[0]);
		this.binary.inContext(obj, function () {
			for (var i = 1, length = parts.length; i < length; i++) {
				extend(obj, this.read(parts[i]));
			}
		});
		return obj;
	},
	write: function (obj) {
		var parts = this.parts;
		this.binary.inContext(obj, function () {
			for (var i = 0, length = parts.length; i < length; i++) {
				this.write(parts[i], obj);
			}
		});
	}
});

defaultTypeSet['if'] = Template({
	params: ['condition', 'trueType', 'falseType'],
	typeParams: [
		'trueType',
		'falseType'
	],
	getBaseType: function (context) {
		return this.toValue(this.condition) ? this.trueType : this.falseType;
	}
});

// Backward compatibility:
/* jshint camelcase:false */
defaultTypeSet.if_not =
/* jshint camelcase:true */

defaultTypeSet.ifNot = Template({
	setParams: function (condition, falseType, trueType) {
		this.baseType = [
			'if',
			condition,
			trueType,
			falseType
		];
	}
});

defaultTypeSet.lazy = Template({
	marker: 'jBinary.Lazy',
	params: ['innerType', 'length'],
	getBaseType: function () {
		return [
			'binary',
			this.length,
			this.binary.typeSet
		];
	},
	read: function () {
		var accessor = function (newValue) {
			if (arguments.length === 0) {
				return 'value' in accessor ? accessor.value : accessor.value = accessor.binary.read(accessor.innerType);
			} else {
				return extend(accessor, {
					wasChanged: true,
					value: newValue
				}).value;
			}
		};
		accessor[this.marker] = true;
		return extend(accessor, {
			binary: extend(this.baseRead(), { contexts: this.binary.contexts.slice() }),
			innerType: this.innerType
		});
	},
	write: function (accessor) {
		if (accessor.wasChanged || !accessor[this.marker]) {
			this.binary.write(this.innerType, accessor());
		} else {
			this.baseWrite(accessor.binary);
		}
	}
});

defaultTypeSet.object = Type({
	params: ['structure', 'proto'],
	resolve: function (getType) {
		var structure = {};
		for (var key in this.structure) {
			structure[key] = !is(this.structure[key], Function) ? getType(this.structure[key]) : this.structure[key];
		}
		this.structure = structure;
	},
	read: function () {
		var self = this, structure = this.structure, output = this.proto ? inherit(this.proto) : {};

		this.binary.inContext(output, function () {
			/* jshint loopfunc: true */
			for (var key in structure) {
				this._named(function () {
					var value = !is(structure[key], Function) ? this.read(structure[key]) : structure[key].call(self, output);
					if (value !== undefined) {
						output[key] = value;
					}
				}, key).call(this);
			}
		});

		return output;
	},
	write: function (data) {
		var self = this, structure = this.structure;

		this.binary.inContext(data, function () {
			/* jshint loopfunc: true */
			for (var key in structure) {
				this._named(function () {
					if (!is(structure[key], Function)) {
						this.write(structure[key], data[key]);
					} else {
						data[key] = structure[key].call(self, data);
					}
				}, key).call(this);
			}
		});
	}
});

defaultTypeSet.skip = Type({
	params: ['length'],
	read: function () {
		this.view.skip(this.toValue(this.length));
	},
	write: function () {
		this.read();
	}
});

defaultTypeSet.string = Template({
	params: ['length', 'encoding'],
	read: function () {
		return this.view.getString(this.toValue(this.length), undefined, this.encoding);
	},
	write: function (value) {
		this.view.writeString(value, this.encoding);
	}
});

defaultTypeSet.string0 = Type({
	params: ['length', 'encoding'],
	read: function () {
		var view = this.view, maxLength = this.length;
		if (maxLength === undefined) {
			var startPos = view.tell(), length = 0, code;
			maxLength = view.byteLength - startPos;
			while (length < maxLength && (code = view.getUint8())) {
				length++;
			}
			var string = view.getString(length, startPos, this.encoding);
			if (length < maxLength) {
				view.skip(1);
			}
			return string;
		} else {
			return view.getString(maxLength, undefined, this.encoding).replace(/\0.*$/, '');
		}
	},
	write: function (value) {
		var view = this.view, zeroLength = this.length === undefined ? 1 : this.length - value.length;
		view.writeString(value, undefined, this.encoding);
		if (zeroLength > 0) {
			view.writeUint8(0);
			view.skip(zeroLength - 1);
		}
	}
});

var ReadableStream = NODE && require('stream').Readable;

jBinary.loadData = promising(function (source, callback) {
	var dataParts;

	if (BROWSER && is(source, global.Blob)) {
		var reader;

		if ('FileReader' in global) {
			reader = new FileReader();
			reader.onload = reader.onerror = function () { callback(this.error, this.result) };
			reader.readAsArrayBuffer(source);
		} else {
			// Web Worker has only sync version of FileReader
			reader = new FileReaderSync();

			var error, result;

			try {
				result = reader.readAsArrayBuffer(source);
			} catch (e) {
				error = e;
			} finally {
				callback(error, result);
			}
		}
	} else
	if (NODE && is(source, ReadableStream)) {
		var buffers = [];
		source
			.on('readable', function () {
				var buf = this.read();
				if(buf) {
					buffers.push(buf);
				}
			})
			.on('end', function () {
				callback(null, Buffer.concat(buffers));
			})
			.on('error', callback)
		;
	} else
	if (typeof source !== 'string') {
		callback(new TypeError('Unsupported source type.'));
	} else
	if (!!(dataParts = source.match(/^data:(.+?)(;base64)?,(.*)$/))) {
		try {
			var isBase64 = dataParts[2],
				content = dataParts[3];

			callback(
				null,
				(
					(isBase64 && NODE && jDataView.prototype.compatibility.NodeBuffer)
					? new Buffer(content, 'base64')
					: (isBase64 ? atob : decodeURIComponent)(content)
				)
			);
		} catch (e) {
			callback(e);
		}
	} else
	if (BROWSER && 'XMLHttpRequest' in global) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', source, true);

		// new browsers (XMLHttpRequest2-compliant)
		if ('responseType' in xhr) {
			xhr.responseType = 'arraybuffer';
		}
		// old browsers (XMLHttpRequest-compliant)
		else if ('overrideMimeType' in xhr) {
			xhr.overrideMimeType('text/plain; charset=x-user-defined');
		}
		// IE9 (Microsoft.XMLHTTP-compliant)
		else {
			xhr.setRequestHeader('Accept-Charset', 'x-user-defined');
		}

		// shim for onload for old IE
		if (!('onload' in xhr)) {
			xhr.onreadystatechange = function () {
				if (this.readyState === 4) {
					this.onload();
				}
			};
		}

		var cbError = function (string) {
			callback(new Error(string));
		};

		xhr.onload = function () {
			if (this.status !== 0 && this.status !== 200) {
				return cbError('HTTP Error #' + this.status + ': ' + this.statusText);
			}

			// emulating response field for IE9
			if (!('response' in this)) {
				this.response = new VBArray(this.responseBody).toArray();
			}

			callback(null, this.response);
		};

		xhr.onerror = function () {
			cbError('Network error.');
		};

		xhr.send(null);
	} else
	if (BROWSER) {
		callback(new TypeError('Unsupported source type.'));
	} else
	if (NODE && /^(https?):\/\//.test(source)) {
		require('request').get({
			uri: source,
			encoding: null
		}, function (error, response, body) {
			if (!error && response.statusCode !== 200) {
				var statusText = require('http').STATUS_CODES[response.statusCode];
				error = new Error('HTTP Error #' + response.statusCode + ': ' + statusText);
			}
			callback(error, body);
		});
	} else
	if (NODE) {
		require('fs').readFile(source, callback);
	}
});

jBinary.load = promising(function (source, typeSet, callback) {
	var whenData = jBinary.loadData(source);

	jBinary.load.getTypeSet(source, typeSet, function (typeSet) {
		whenData.then(function (data) {
			callback(null, new jBinary(data, typeSet));
		}, callback);
	});
});

jBinary.load.getTypeSet = function (source, typeSet, callback) {
	callback(typeSet);
};

proto._toURI =
	(BROWSER && 'URL' in global && 'createObjectURL' in URL)
	? function (type) {
		var data = this.seek(0, function () { return this.view.getBytes() });
		return URL.createObjectURL(new Blob([data], {type: type}));
	}
	: function (type) {
		var string = this.seek(0, function () { return this.view.getString(undefined, undefined, NODE && this.view._isNodeBuffer ? 'base64' : 'binary') });
		return 'data:' + type + ';base64,' + (NODE && this.view._isNodeBuffer ? string : btoa(string));
	};

proto._mimeType = function (mimeType) {
	return mimeType || this.typeSet['jBinary.mimeType'] || 'application/octet-stream';
};

proto.toURI = function (mimeType) {
	return this._toURI(this._mimeType(mimeType));
};

var WritableStream = NODE && require('stream').Writable;

if (BROWSER && document) {
	var downloader = jBinary.downloader = document.createElement('a');
	downloader.style.display = 'none';
}

proto.saveAs = promising(function (dest, mimeType, callback) {
	if (typeof dest === 'string') {
		if (NODE) {
			var buffer = this.read('blob', 0);

			if (!is(buffer, Buffer)) {
				buffer = new Buffer(buffer);
			}

			require('fs').writeFile(dest, buffer, callback);
		} else
		if (BROWSER) {
			if ('msSaveBlob' in navigator) {
				navigator.msSaveBlob(new Blob([this.read('blob', 0)], {type: this._mimeType(mimeType)}), dest);
			} else {
				if (document) {
					if (!downloader.parentNode) {
						document.body.appendChild(downloader);
					}

					downloader.href = this.toURI(mimeType);
					downloader.download = dest;
					downloader.click();
					downloader.href = downloader.download = '';
				} else {
					callback(new TypeError('Saving from Web Worker is not supported.'));
				}
			}
			callback();
		}
	} else
	if (NODE && is(dest, WritableStream)) {
		dest.write(this.read('blob', 0), callback);
	} else {
		callback(new TypeError('Unsupported storage type.'));
	}
});

return jBinary;

}));

//# sourceMappingURL=jbinary.js.map