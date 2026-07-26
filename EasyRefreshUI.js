// 强制刷新UI（独立命令）
function refreshHandUI() {
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

    console.log('🔄 强制刷新UI...');
    
    // 发送多个刷新事件
    var events = [
        'UI_UPDATE_HAND_CARD_NUM',
        'UI_UPDATE_HAND_CARD',
        'UI_UPDATE_HAND_CARD_LIMIT',
        'GAME_PHASE_CHANGED'
    ];

    events.forEach(function(eventName) {
        if (typeof m.SendEvent === 'function') {
            m.SendEvent(eventName);
        }
        if (typeof m.event === 'function') {
            m.event(eventName);
        }
    });

    // 直接刷新 CardAreaView
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
            if (cardView) {
                if (typeof cardView.updateCardsByServer === 'function') {
                    cardView.updateCardsByServer(false);
                }
                if (typeof cardView.layoutsPos === 'function') {
                    cardView.layoutsPos(true);
                }
                console.log('✅ CardAreaView 已刷新');
            }
        }
    } catch(e) {
        console.log('⚠️ 刷新CardAreaView失败:', e.message);
    }

    console.log('✅ UI刷新完成');
}

window.refreshHandUI = refreshHandUI;