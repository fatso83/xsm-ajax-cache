var $ = require('jquery')
var AjaxCache = require('../index')

function log(msg, type) {
	$('#results').append(
		'<li class="' + (type || 'normal') + '">' +
			msg +
		'</li>'
	);
}

$(function () {
	var canCache = AjaxCache.canCache;

	AjaxCache.debug = true;

	// 清空已有缓存数据
	if (canCache) {
		localStorage.clear();
		test1();
	} else {
		log('can not cache')
	}
});

function test1() {

	var remove_key = 'must-be-remove-before-test1'
	localStorage.setItem(remove_key, remove_key)

	var TestAjaxCache1 = AjaxCache({
		key: 'ajax-cache-test-1',
		oldKeys: remove_key,
		ajaxParam: { url: 'test.json', dataType: 'JSON' },
		// 修改缓存后版本
		data2cache: function (data) {
			return {
				time: +new Date(),
				data: $.extend({
					isCache: true
				}, data)
			};
		}
	});

	log('TestAjaxCache1 - start')

	TestAjaxCache1.getData().done(function (data) {
		if (data.name === 'luobo' && data.age === 18) {
			log('TestAjaxCache1 - first request - done', 'success')

			setTimeout(function () {
				TestAjaxCache1.getData(function (data) {
					if (data.isCache === true)
						log('TestAjaxCache1 - 100ms - done', 'success')
					else
						log('TestAjaxCache1 - 100ms - fail', 'fail')
				}, function () {
					log('TestAjaxCache1 - 100ms - fail', 'fail')
				}).always(function () {
					log('TestAjaxCache1 - end')
					test2()
				})
			}, 100)
		}
	}).fail(function () {
		log('TestAjaxCache1 - first request - fail', 'fail')
	})
	
	var data = localStorage.getItem(remove_key)
	if (data) {
		log('TestAjaxCache1 - remove oldKeys - fail', 'fail')
	} else {
		log('TestAjaxCache1 - remove oldKeys - done', 'success')
	}
}

function test2() {
	var TestAjaxCache2 = AjaxCache({
		expire: 1000, // 1秒后即失效
		key: 'ajax-cache-test-2',
		ajaxParam: { url: 'test.json', dataType: 'JSON' },
		data2cache: function (data) {
			return {
				time: +new Date(),
				data: $.extend({
					isCache: true
				}, data)
			};
		}
	});

	log('TestAjaxCache2 - start');

	TestAjaxCache2.getData().done(function (data) {

		if (data) {
			log('TestAjaxCache2 - first request - done', 'success')
		}

		// 应从缓存取数据
		setTimeout(function () {
			TestAjaxCache2.getData().done(function (data) {
				if (data.isCache)
					log('TestAjaxCache2 - 500ms - done', 'success')
				else
					log('TestAjaxCache2 - 500ms - fail', 'fail')
			})
		}, 500)

		// 缓存应失效，重新请求数据
		setTimeout(function () {
			TestAjaxCache2.getData().done(function (data) {
				if (data.isCache)
					log('TestAjaxCache2 - 1500ms - fail', 'fail')
				else
					log('TestAjaxCache2 - 1500ms - done', 'success')
			}).always(function () {
				log('TestAjaxCache2 - end')
			})
		}, 1500)
	})
}