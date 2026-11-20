// 遣散指定位置卡牌
function sellAt(index) {
    var m = null;
    try {
        if (Laya && Laya.stage) {
            function f(o) {
                if (!o) return null;
                if (o.manager && o.manager.ReqShopRecycleChess) return o.manager;
                if (o.ReqShopRecycleChess) return o;
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
                if (o && o.ReqShopRecycleChess) m = o;
                if (o && o.manager && o.manager.ReqShopRecycleChess) m = o.manager;
            } catch(e) {}
        }
    }

    if (!m) {
        console.log('❌ 未找到管理器');
        return false;
    }

    var handChess = m.HandChess || [];
    if (handChess.length === 0) {
        console.log('❌ 手牌为空');
        return false;
    }

    if (index < 0 || index >= handChess.length) {
        console.log('❌ 索引超出范围，当前手牌:', handChess.length, '张');
        return false;
    }

    var card = handChess[index];
    var goodsID = card.goodsID || card.GoodsID;
    
    if (!goodsID) {
        console.log('❌ 无法获取卡牌ID');
        return false;
    }

    m.ReqShopRecycleChess(goodsID);
    console.log('✅ 已遣散 [索引:' + index + '] goodsID:' + goodsID + ' chessID:' + card.chessID + ' spellID:' + card.spellID);
    return true;
}

window.sellAt = sellAt;
