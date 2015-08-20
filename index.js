var $ = require('jquery');

var canCache;
try {
	// IE8 及以下版本浏览器未提供相关接口
	// 另外，个别 IE 浏览器可能存在操作 window.localStorage 报错情况
	canCache = !!(window.localStorage.setItem && window.JSON.parse);
} catch (e) {
	canCache = false;
}

function AjaxCache(options) {
	// 确保以构造函数方式调用当前函数
	if (!(this instanceof AjaxCache)) {
		return new AjaxCache(options);
	}

	this._deferred = new $.Deferred();
	/*
	 * 使得当前实例对象可以直接通过 promise 接口方法来绑定回调
	 * @example
	 * this.done(function (data) { ... })
	 * this.fail(function () { ... })
	 */
	this._deferred.promise(this);
}

/*
 * 实现简单的继承功能
 * @example
 * var NoticeDataAjaxCache = AjaxCache.extend({
 *   expire: 24 * 60 * 60 * 1000, // 缓存失效时间为24小时
 *   key: 'notice_cache', // LocalStorage 中缓存数据对应的关键字
 *   ajaxParam: { url: 'url', dataType: 'JSON' },
 *   validateAjax: function (data) { ... },
 *   validateCache: function (data) { ... },
 * })
 */
AjaxCache.extend = function (options) {

	function Fn() {}
	Fn.prototype = AjaxCache.prototype;

	function constructor() {
		AjaxCache.apply(this, arguments);
		this.initialize.apply(this, arguments);
	}
	constructor.prototype = $.extend(new Fn(), options);

	return constructor;
};

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
	// 每次创建实例对象时调用
	initialize: function () { },
	/*
	 * 获取数据，无论是从缓存还是服务器成功获取到数据都会调用相应回调函数
	 */
	getData: function () {
		var state = this.state();
		// 检查是否已完成数据获取
		if (state !== 'resolved' && state !== 'rejected') {
			var cacheData = this.getCache();
			if (cacheData) {
				this.cacheData = cacheData;
				if (this._validateCache(cacheData)) {
					this._deferred.resolve(this.cache2data(cacheData));
					return this;
				}
			}
			this.ajax();
		}
		return this;
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
				return window.JSON.parse(cache);
			}
		}
		return null;
	},
	setCache: function (cacheData) {
		if (this.canCache) {
			window.localStorage.setItem(this.key, window.JSON.stringify(cacheData));
		}
	},
	_validateAjax: function (ajaxData) {
		return this._validate('Ajax', ajaxData);
	},
	_validateCache: function (cacheData) {
		return this._validate('Cache', cacheData);
	},
	_validate: function (type, data) {
		var validateMethod = 'validate' + type;
		if (this[validateMethod]) {
			var error = this[validateMethod](data);
			if (error) {
				this[validateMethod + 'Error'] = error;
				if (this.debug && window.console) {
					window.console.log('[' + this.key + '] validate ' + type + ' error: ' + error);
				}
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