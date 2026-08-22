// 修改商店数据
function setShopGoods(newShopGoods) {
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

    // 调用游戏内部更新方法
    if (typeof m.updateShopGoods === 'function') {
        m.updateShopGoods(newShopGoods, true);
        console.log('✅ 已更新商店数据');
        return true;
    }

    // 备用：直接修改并触发事件
    m.shopGoods = newShopGoods;
    if (typeof m.SendEvent === 'function') {
        m.SendEvent('ANI_SHOP_REFRESH', true);
    }
    console.log('✅ 已直接修改 shopGoods');
    return true;
}

// 清空商店某个位置
function clearShopSlot(index) {
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
    if (index < 0 || index >= shopGoods.length) {
        console.log('❌ 索引超出范围');
        return false;
    }

    // 直接删除该位置的卡牌
    if (Array.isArray(shopGoods)) {
        shopGoods[index] = null;
        // 或者设置为空对象
        // shopGoods[index] = { goodsID: 0 };
    }

    // 触发刷新事件
    if (typeof m.event === 'function') {
        m.event('ANI_SHOP_REFRESH', true);
    }

    console.log('✅ 已清空位置', index);
    return true;
}

window.setShopGoods = setShopGoods;
window.clearShopSlot = clearShopSlot;


// 1. 清空商店第0个位置
clearShopSlot(0)

// 2. 设置商店为自定义数据
setShopGoods([
    { goodsID: 1001, chessID: 20400011 },
    { goodsID: 1002, chessID: 20400012 },
    null, null, null, null
])

// 3. 伪造服务器响应（最完整）
fakeShopRefresh([
    { goodsID: 1001, chessID: 20400011 },
    { goodsID: 1002, chessID: 20400012 },
    null, null, null, null
])

// 4. 修改第1个位置
modifyShopGoods(0, { goodsID: 9999, chessID: 20400131 })


// -------------------------------------------------------


// 添加手牌（通过 AddHandChess）
function addHandChess(cardData) {
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

    var selfInfo = m.SelfInfo || m.selfInfo;
    if (!selfInfo) {
        console.log('❌ 未找到玩家信息');
        return false;
    }

    // 确保 cardData 有必要的字段
    if (!cardData.goodsID && !cardData.GoodsID) {
        console.log('❌ 卡牌数据缺少 goodsID');
        return false;
    }

    // 确保有 goodsID
    if (!cardData.goodsID) {
        cardData.goodsID = cardData.GoodsID;
    }

    // 方法A: 通过 AddHandChess 方法
    if (typeof selfInfo.AddHandChess === 'function') {
        selfInfo.AddHandChess(cardData);
        console.log('✅ 已通过 AddHandChess 添加手牌');
        return true;
    }

    // 方法B: 直接添加到 HandChess 数组
    var hand = m.HandChess || m.handChess || [];
    if (!m.HandChess) m.HandChess = hand;
    hand.push(cardData);
    
    // 同步到 selfInfo
    if (!selfInfo.HandChess) selfInfo.HandChess = hand;
    selfInfo.handChess = hand;

    console.log('✅ 已直接添加手牌');
    return true;
}

// 清空手牌
function clearHandChess() {
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

    var selfInfo = m.SelfInfo || m.selfInfo;
    
    // 清空手牌数组
    if (m.HandChess) m.HandChess = [];
    if (m.handChess) m.handChess = [];
    if (selfInfo) {
        if (selfInfo.HandChess) selfInfo.HandChess = [];
        if (selfInfo.handChess) selfInfo.handChess = [];
    }

    console.log('✅ 已清空手牌');
    return true;
}

// 设置手牌（完整替换）
function setHandChess(newHand) {
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

    var selfInfo = m.SelfInfo || m.selfInfo;
    
    // 确保每个卡牌都有 goodsID
    var validHand = newHand.filter(function(card) {
        return card && (card.goodsID || card.GoodsID);
    });

    // 设置手牌
    m.HandChess = validHand;
    m.handChess = validHand;
    if (selfInfo) {
        selfInfo.HandChess = validHand;
        selfInfo.handChess = validHand;
    }

    // 触发刷新事件
    if (typeof m.SendEvent === 'function') {
        m.SendEvent('UI_UPDATE_HAND_CARD_NUM');
        m.SendEvent('UI_UPDATE_HAND_CARD');
    }
    if (typeof m.event === 'function') {
        m.event('UI_UPDATE_HAND_CARD_NUM');
        m.event('UI_UPDATE_HAND_CARD');
    }

    console.log('✅ 已设置手牌，共', validHand.length, '张');
    return true;
}

// 刷新手牌UI
function refreshHandUI2() {
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

    // 触发多个刷新事件
    var events = [
        'UI_UPDATE_HAND_CARD_NUM',
        'UI_UPDATE_HAND_CARD',
        'UI_UPDATE_HAND_CARD_LIMIT',
        'UI_UPDATE_SELECT_CARD'
    ];

    events.forEach(function(eventName) {
        if (typeof m.SendEvent === 'function') {
            m.SendEvent(eventName);
        }
        if (typeof m.event === 'function') {
            m.event(eventName);
        }
    });

    // 触发 CardAreaView 刷新
    try {
        if (Laya && Laya.stage) {
            function findCardView(o) {
                if (!o) return null;
                if (o.constructor && o.constructor.name === 'TavernChessCardAreaView') {
                    return o;
                }
                var c = o._children || o.children || o.childList;
                if (c) {
                    for (var i = 0; i < c.length; i++) {
                        var r = findCardView(c[i]);
                        if (r) return r;
                    }
                }
                if (typeof o.numChildren === 'number' && typeof o.getChildAt === 'function') {
                    for (var i = 0; i < o.numChildren; i++) {
                        try {
                            var r = findCardView(o.getChildAt(i));
                            if (r) return r;
                        } catch(e) {}
                    }
                }
                return null;
            }
            var cardView = findCardView(Laya.stage);
            if (cardView && typeof cardView.updateCardsByServer === 'function') {
                cardView.updateCardsByServer(false);
            }
        }
    } catch(e) {}

    console.log('✅ 手牌UI已刷新');
}

window.addHandChess = addHandChess;
window.clearHandChess = clearHandChess;
window.setHandChess = setHandChess;
window.refreshHandUI2 = refreshHandUI2;

// 1. 查看当前手牌
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
if (m) {
    console.log('当前手牌:', m.HandChess || m.handChess);
}

// 2. 添加一张手牌
addHandChess({ goodsID: 9999, chessID: 20400131, name: '测试卡牌' })

// 3. 清空手牌
clearHandChess()

// 4. 设置完整手牌
setHandChess([
    { goodsID: 1001, chessID: 20400011, name: '关羽' },
    { goodsID: 1002, chessID: 20400031, name: '张飞' },
    { goodsID: 1003, spellID: 2024210036, name: '洞烛先机' }
])

// 5. 刷新UI
refreshHandUI2()