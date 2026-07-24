// 购买指定位置卡牌
function buyAt(index) {
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
        return false;
    }

    var shopGoods = m.ShopGoods || [];
    if (shopGoods.length === 0) {
        console.log('❌ 商店为空');
        return false;
    }

    if (index < 0 || index >= shopGoods.length) {
        console.log('❌ 索引超出范围，当前商店:', shopGoods.length, '个位置，有效索引: 0-' + (shopGoods.length - 1));
        return false;
    }

    var card = shopGoods[index];
    if (!card) {
        console.log('❌ 位置 [' + index + '] 没有卡牌');
        return false;
    }

    var goodsID = card.goodsID || card.GoodsID;
    if (!goodsID) {
        console.log('❌ 无法获取卡牌ID');
        return false;
    }

    m.ReqShopBuyChess(goodsID);
    console.log('✅ 已购买卡牌 [位置:' + index + '] goodsID:' + goodsID + ' chessID:' + card.chessID + ' spellID:' + card.spellID);
    return true;
}

window.buyAt = buyAt;