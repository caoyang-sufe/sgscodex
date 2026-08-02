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
        console.info('❌ 未找到管理器');
        return false;
    }

    var selfInfo = m.SelfInfo || m.selfInfo;
    if (!selfInfo) {
        console.info('❌ 未找到玩家信息');
        return false;
    }

    // 方法A: 直接设置 CoinNum (有setter)
    if (typeof m.CoinNum !== 'undefined') {
        m.CoinNum = amount;
        console.info('✅ 通过 CoinNum 设置金币:', amount);
    }

    // 方法B: 直接修改 selfInfo.coin
    if (selfInfo) {
        selfInfo.coin = amount;
        console.info('✅ 通过 selfInfo.coin 设置金币:', amount);
    }

    // 触发刷新事件
    if (typeof m.SendEvent === 'function') {
        m.SendEvent('UI_UPDATE_COIN_NUM');
    }
    if (typeof m.event === 'function') {
        m.event('UI_UPDATE_COIN_NUM');
    }

    console.info('✅ 金币已修改为:', amount);
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
        console.info('❌ 未找到管理器');
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
        console.info('❌ 未找到管理器');
        return;
    }

    console.info('💰 当前金币:', m.CoinNum);
    console.info('   selfInfo.coin:', m.SelfInfo ? m.SelfInfo.coin : 'N/A');
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
        console.info('❌ 未找到管理器');
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
        console.info('✅ 已通过 onRespShopRefreshChess 同步金币:', amount);
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

console.info('===== 金币修改工具已加载 =====');
console.info('📌 命令:');
console.info('  setCoin(数量)     - 设置金币数量');
console.info('  addCoin(数量)     - 增加金币 (负数则减少)');
console.info('  showCoin()        - 查看当前金币');
console.info('  fakeCoinSync(数量) - 伪装服务器同步金币');
console.info('');
console.info('💡 示例:');
console.info('  setCoin(100)      - 设置金币为100');
console.info('  addCoin(50)       - 增加50金币');
console.info('  addCoin(-30)      - 减少30金币');