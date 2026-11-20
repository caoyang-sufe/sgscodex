(function () {
    var m;
    try {
        if (Laya && Laya.stage) {
            function f(o) {
                if (!o)
                    return null;
                if (o.manager && o.manager.ReqShopRefreshChess)
                    return o.manager;
                if (o.ReqShopRefreshChess)
                    return o;
                var c = o._children || o.children || o.childList;
                if (c) {
                    for (var i = 0; i < c.length; i++) {
                        var r = f(c[i]);
                        if (r)
                            return r;
                    }
                }
                if (typeof o.numChildren === 'number' && typeof o.getChildAt === 'function') {
                    for (var i = 0; i < o.numChildren; i++) {
                        try {
                            var r = f(o.getChildAt(i));
                            if (r)
                                return r;
                        } catch (e) {}
                    }
                }
                return null;
            }
            m = f(Laya.stage);
        }
    } catch (e) {}
    if (!m) {
        for (var k in window) {
            try {
                var o = window[k];
                if (o && o.ReqShopRefreshChess)
                    m = o;
                if (o && o.manager && o.manager.ReqShopRefreshChess)
                    m = o.manager;
            } catch (e) {}
        }
    }
    if (m) {
        m.ReqShopRefreshChess(false);
        console.log('✅ 刷新完成');
    } else {
        console.log('❌ 未找到管理器');
    }
})();
