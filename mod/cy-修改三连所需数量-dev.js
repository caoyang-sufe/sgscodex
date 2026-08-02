// 尝试让任何棋子都能2张合成
(function() {
    var m = null;
    try {
        if (Laya && Laya.stage) {
            function f(o) {
                if (!o) return null;
                if (o.manager && o.manager.ReqShopBuyChess) return o.manager;
                if (o.ReqShopBuyChess) return o;
                var c = o._children || o.children || o.childList;
                if (c) {
                    for (var i = 0; i < c.length; i++) {
                        var r = f(c[i]);
                        if (r) return r;
                    }
                }
                if (typeof o.numChildren === 'number' && typeof o.getChildAt === 'function') {
                    for (var i = 0; i < o.numChildren; i++) {
                        try {
                            var r = f(o.getChildAt(i));
                            if (r) return r;
                        } catch(e) {}
                    }
                }
                return null;
            }
            m = f(Laya.stage);
        }
    } catch(e) {}

    if (!m) {
        for (var k in window) {
            try {
                var o = window[k];
                if (o && o.ReqShopBuyChess) m = o;
                if (o && o.manager && o.manager.ReqShopBuyChess) m = o.manager;
            } catch(e) {}
        }
    }

    if (!m) {
        console.log('❌ 未找到管理器');
        return;
    }

    // 保存原始方法
    var originalGetSanLianCnt = m.getSanLianCnt;
    
    // 覆盖 getSanLianCnt 方法
    m.getSanLianCnt = function(e) {
        // 总是返回2，让所有棋子2张就能合成
        console.log('🔥 劫持 getSanLianCnt，强制返回 2');
        return 2;
    };

    console.log('✅ 已劫持 getSanLianCnt，现在任何棋子2张即可合成');
    console.log('💡 把手牌中2张相同棋子放到场上，或等客户端自动检测');
})();