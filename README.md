# xsm-ajax-cache

cache ajax result by localStorage

## install

NPM:
```hash
npm install xsm-ajax-cache
```

## usage

With Broswerify:
```javascript
var AjaxCache = require('xsm-ajax-cache');

var MyAjaxCache = AjaxCache({
    key: 'my-cache',
    initialize: function () {
        // some thing to do before getData()
        // only do it once and called just before getData()
    },
    ajaxParam: {
        url: '/my-data-path',
        dataType: 'JSON'
    }
});

MyAjaxCache
    .getData()
    .done(function (data) {
        // if current browser support localStorage &&
        //     last request success &&
        //     cache data not expired
        //   data is from localStorage
        // else
        //   data is from ajax
        // use data ...
    })
    .fail(function () {
        // fail ...
    });
```
