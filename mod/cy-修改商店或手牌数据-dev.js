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


// 修改金币数量
function setCoin(amount) {
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

    // 方法A: 直接设置 CoinNum (有setter)
    if (typeof m.CoinNum !== 'undefined') {
        m.CoinNum = amount;
        console.log('✅ 通过 CoinNum 设置金币:', amount);
    }

    // 方法B: 直接修改 selfInfo.coin
    if (selfInfo) {
        selfInfo.coin = amount;
        console.log('✅ 通过 selfInfo.coin 设置金币:', amount);
    }

    // 触发刷新事件
    if (typeof m.SendEvent === 'function') {
        m.SendEvent('UI_UPDATE_COIN_NUM');
    }
    if (typeof m.event === 'function') {
        m.event('UI_UPDATE_COIN_NUM');
    }

    console.log('✅ 金币已修改为:', amount);
    return true;
}

// 增加金币
function addCoin(amount) {
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

    var currentCoin = m.CoinNum || 0;
    var newCoin = currentCoin + amount;
    return setCoin(newCoin);
}

// 查看当前金币
function showCoin() {
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

    console.log('💰 当前金币:', m.CoinNum);
    console.log('   selfInfo.coin:', m.SelfInfo ? m.SelfInfo.coin : 'N/A');
    return m.CoinNum;
}

// 伪装服务器金币同步（类似 fakeShopRefresh）
function fakeCoinSync(amount) {
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

    // 伪造协议数据 - 模拟 onRespShopRefreshChess 中的金币更新
    var fakeProto = {
        Protocol: {
            ProtoData: {
                restCoin: amount,
                shopGoods: m.ShopGoods || []
            },
            errCode: 0
        }
    };

    // 调用 onRespShopRefreshChess
    if (typeof m.onRespShopRefreshChess === 'function') {
        m.onRespShopRefreshChess(fakeProto);
        console.log('✅ 已通过 onRespShopRefreshChess 同步金币:', amount);
        return true;
    }

    // 备用: 直接设置并触发事件
    setCoin(amount);
    return true;
}

// 暴露到全局
window.setCoin = setCoin;
window.addCoin = addCoin;
window.showCoin = showCoin;
window.fakeCoinSync = fakeCoinSync;

console.log('===== 金币修改工具已加载 =====');
console.log('📌 命令:');
console.log('  setCoin(数量)     - 设置金币数量');
console.log('  addCoin(数量)     - 增加金币 (负数则减少)');
console.log('  showCoin()        - 查看当前金币');
console.log('  fakeCoinSync(数量) - 伪装服务器同步金币');
console.log('');
console.log('💡 示例:');
console.log('  setCoin(100)      - 设置金币为100');
console.log('  addCoin(50)       - 增加50金币');
console.log('  addCoin(-30)      - 减少30金币');