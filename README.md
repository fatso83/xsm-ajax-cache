# xsm-ajax-cache

cache ajax result by localStorage

## usage

```javascript
var AjaxCache = require('xsm-ajax-cache');

var MyAjaxCache = AjaxCache({
    key: 'my-cache',
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
