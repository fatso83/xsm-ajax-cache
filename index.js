var $ = require('jquery');

var canCache;
try {
	// IE8 及以下版本浏览器未提供相关接口
	// 另外，个别 IE 浏览器可能存在操作 window.localStorage 报错情况
	canCache = !!(window.localStorage.setItem && window.JSON.parse);
} catch (e) {
	canCache = false;
}

/*
 * 创建一个 AjaxCache 实例对象，必须传入
 * @param {Object} options - 必须传入必要的配置，如：key, ajaxParam
 * @param {string} options.key - 缓存标识
 * @param {Object|Function} options.ajaxParam - jQuery Ajax 请求参数对象
 */
function AjaxCache(options) {
	if (this instanceof AjaxCache) {
		var error = validateOptions(options);
		if (error) {
			debug('AjaxCache - can not create a valid instance object: ' + error);
			if (AjaxCache.debug) {
				throw new Error(error);
			}
		}
		$.extend(this, options);
	} else {
		return new AjaxCache(options);
	}
}

function validateOptions(options) {
	if (!options) {
		return 'must pass [options] parameter';
	}
	if (typeof options.key !== 'string') {
		return 'must passs options.key {string}';
	}
	if (typeof options.ajaxParam !== 'function' &&
		typeof options.ajaxParam !== 'object') {
		return 'must passs options.ajaxParam {Object|Function}';
	}
}

/*
 * 只在 debug 模式下输出错误信息
 */
AjaxCache.debug = false;

function debug() {
	if (AjaxCache.debug && typeof console !== 'undefined' && console.error) {
		for (var i = 0, len = arguments.length; i < len; i++) {
			console.error(arguments[i]);
		}
	}
}

/*
 * 暴露内部环境判断结果
 */
AjaxCache.canCache = canCache;

AjaxCache.prototype = {

	// 是否输出数据校验错误信息
	debug: false,
	// 缺省过期时间为 6 小时
	expire: 6 * 60 * 60 * 1000,
	// 数据最后更新时间对应日期值
	lastModify: 0,
	// 提前判断当前环境能否使用本地缓存，IE8+ 支持
	canCache: canCache,
	// ！必须覆盖为实际需要的本地缓存的标识名称，用于区分不同类型数据
	key: 'ajax_cache',
	// ajax 数据验证失败后，是否尝试使用之前验证失败的缓存数据
	// 由于过期导致的缓存失败，建议重用
	// 其他原因，如请求参数类型不同导致的缓存失效，不建议重用
	useDirtyCacheIfAjaxFail: true,

	_reset: function () {
		this._deferred = new $.Deferred();
		this._promise = this._deferred.promise();
		this._initialize()
	},

	_initialize: function () {
		if (!this._inited && this.initialize) {
			this.initialize()
			this._inited = true
		}
	},

	/*
	 * 获取数据 - 主要接口方法
	 * 如果缓存中有满足条件数据，则使用缓存中的数据，否则发起 AJAX 请求
	 * @param {Function} done - 获取数据成功后调用的回调函数, done(data)
	 * @param {Function} fail - 获取数据失败后调用的回调函数, fail()
	 * @returns {jQueryPromiseObject}
	 */
	getData: function (done, fail) {
		// 每次调用 getData() 都重置内部数据
		this._reset();

		if (typeof done === 'function') {
			this._promise.done(done);
		}
		if (typeof fail === 'function') {
			this._promise.fail(fail);
		}

		
		var useCache = false;

		var state = this._deferred.state();
		// 检查是否已完成数据获取
		if (state !== 'resolved' && state !== 'rejected') {
			var cache = this.getCache();
			if (cache) {
				// 校验前保存数据，即便校验失败，也有可能在请求也失败后使用校验失败的缓存数据
				this.cacheData = cache;
				if (this._validateCache(cache)) {
					useCache = true;
				}
			}
		}

		if (useCache) {
			this._deferred.resolve(this.cache2data(cache));
		} else {
			this.ajax();
		}

		return this._promise;
	},
	ajax: function () {
		var self = this;
		$.ajax(self._ajaxParam()).done(function (data) {
			self.ajaxDone(data);
		}).always(function () {
			self.ajaxFail();
		});
	},
	_ajaxParam: function () {
		if (typeof this.ajaxParam === 'function') {
			return this.ajaxParam();
		} else {
			return this.ajaxParam || {};
		}
	},
	ajaxDone: function (data) {
		if (this._validateAjax(data)) {
			this.setCache(this.data2cache(data));
			this._deferred.resolve(data);
		}
	},
	ajaxFail: function () {
		if (this.canCache && this.useDirtyCacheIfAjaxFail && this.cacheData) {
			this._deferred.resolve(this.cache2data(this.cacheData));
		} else {
			this._deferred.reject();
		}
	},
	// 缺省在 cache 数据中加入时间信息，原始数据保存在 data 属性中
	data2cache: function (data) {
		return {
			time: +new Date(),
			data: data
		};
	},
	cache2data: function (cache) {
		return cache ? cache.data : null;
	},
	getCache: function () {
		if (this.canCache) {
			var cache = window.localStorage.getItem(this.key);
			if (cache) {
				try {
					return window.JSON.parse(cache);
				} catch (e) {
					debug('cache data parse as JSON fail', e);
					return null;
				}
			}
		}
		return null;
	},
	setCache: function (cacheData) {
		if (this.canCache) {
			window.localStorage.setItem(this.key, window.JSON.stringify(cacheData));
		}
	},
	_validateAjax: function (data) {
		if (this.validateAjax) {
			var error = this.validateAjax(data);
			if (error) {
				this.validateAjaxError = error;
				debug('[' + this.key + '] validate Ajax error: ' + error);
				return false;
			}
		}
		return true;
	},
	_validateCache: function (data) {
		if (this.validateCache) {
			var error = this.validateCache(data);
			if (error) {
				this.validateCacheError = error;
				debug('[' + this.key + '] validate Cache error: ' + error);
				return false;
			}
		}
		return true;
	},
	// 缺省 Ajax 数据验证方法
	validateAjax: function (data) {
		if (!data) {
			return 'data is empty';
		}
	},
	// 缺省缓存验证方法
	validateCache: function (cacheData) {
		if (!cacheData) {
			return 'no cache data';
		}
		if (cacheData.time < this.lastModify) {
			return 'data has been modified';
		}
		if (+new Date() - cacheData.time > this.expire) {
			return 'cache expire';
		}
	}
};

module.exports = AjaxCache;