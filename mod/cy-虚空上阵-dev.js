// 尝试上阵不在手牌中的卡牌
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

    // 劫持 findExtraElements 方法
    var originalFindExtra = m.findExtraElements;
    m.findExtraElements = function(e, t) {
        // 总是返回空数组，表示没有额外元素
        console.info('🔥 劫持 findExtraElements，跳过校验');
        return [];
    };

    console.info('✅ 已劫持 findExtraElements，现在可以上阵任意卡牌');
    console.info('💡 使用 lineup.add(任意goodsID, 位置) 测试');

    // 暴露快速上阵函数
    window.forceLineupAny = function(goodsID, position) {
        var lineup = m.SelfInfo ? m.SelfInfo.LineUpGoodsIDs : [];
        while (lineup.length < 7) lineup.push(0);
        if (position === undefined || position < 0 || position >= lineup.length) {
            for (var i = 0; i < lineup.length; i++) {
                if (!lineup[i] || lineup[i] === 0) {
                    position = i;
                    break;
                }
            }
        }
        lineup[position] = goodsID;
        m.ReqChessLineUp(lineup, true, true);
        console.info('✅ 强制上阵 goodsID:', goodsID, '位置:', position);
    };
})();