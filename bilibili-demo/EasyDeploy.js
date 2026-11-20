// 自动上阵卡牌
function lineupAt(index) {
    var m = null;
    try {
        if (Laya && Laya.stage) {
            function f(o) {
                if (!o) return null;
                if (o.manager && o.manager.ReqChessLineUp) return o.manager;
                if (o.ReqChessLineUp) return o;
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
                if (o && o.ReqChessLineUp) m = o;
                if (o && o.manager && o.manager.ReqChessLineUp) m = o.manager;
            } catch(e) {}
        }
    }

    if (!m) {
        console.log('❌ 未找到管理器');
        return false;
    }

    // 检查阶段 (ChessHelper 用的是 phase !== 6)
    if (m.phase !== 6) {
        console.log('⚠️ 当前不在招募阶段 (phase=' + m.phase + ')，无法上阵');
        return false;
    }

    if (!m.CanOperate) {
        console.log('⚠️ 当前不可操作');
        return false;
    }

    var hand = m.HandChess || [];
    if (hand.length === 0) {
        console.log('❌ 手牌为空');
        return false;
    }

    if (index < 0 || index >= hand.length) {
        console.log('❌ 索引超出范围，手牌:', hand.length, '张');
        return false;
    }

    var card = hand[index];
    var goodsID = card.goodsID || card.GoodsID;
    if (!goodsID) {
        console.log('❌ 无法获取卡牌ID');
        return false;
    }

    // 获取当前上阵阵容并补齐到7个位置
    var lineup = [];
    if (m.SelfInfo && m.SelfInfo.LineUpGoodsIDs) {
        lineup = m.SelfInfo.LineUpGoodsIDs.slice();
    } else if (m.selfInfo && m.selfInfo.LineUpGoodsIDs) {
        lineup = m.selfInfo.LineUpGoodsIDs.slice();
    }

    while (lineup.length < 7) {
        lineup.push(0);
    }

    // 找第一个空位
    var emptyIndex = -1;
    for (var i = 0; i < lineup.length; i++) {
        if (lineup[i] === 0 || lineup[i] === null || lineup[i] === undefined) {
            emptyIndex = i;
            break;
        }
    }

    if (emptyIndex === -1) {
        console.log('❌ 战斗区已满');
        return false;
    }

    // 检查是否已上阵
    if (lineup.indexOf(goodsID) >= 0) {
        console.log('⚠️ 该卡牌已在上阵区');
        return false;
    }

    lineup[emptyIndex] = goodsID;
    console.log('✅ 准备上阵 goodsID:', goodsID, '-> 位置:', emptyIndex);

    // 调用上阵接口
    m.ReqChessLineUp(lineup);

    // 轮询检测手牌变化，确认上阵成功
    var pollCount = 0;
    var maxPoll = 30;
    var pollInterval = setInterval(function() {
        pollCount++;
        var currentHand = m.HandChess || [];
        var found = false;
        for (var i = 0; i < currentHand.length; i++) {
            if (currentHand[i] && (currentHand[i].goodsID === goodsID || currentHand[i].GoodsID === goodsID)) {
                found = true;
                break;
            }
        }
        if (!found) {
            console.log('✅ 上阵成功! goodsID:', goodsID, '已从手牌移除');
            clearInterval(pollInterval);
            // 刷新UI
            try {
                var scene = getScene();
                if (scene && scene.cardView && typeof scene.cardView.Calibration === 'function') {
                    scene.cardView.Calibration(true);
                }
                if (scene && scene.chessView && typeof scene.chessView.Calibration === 'function') {
                    scene.chessView.Calibration(true);
                }
            } catch(e) {}
        } else if (pollCount >= maxPoll) {
            console.log('⚠️ 轮询超时，请检查是否上阵成功');
            clearInterval(pollInterval);
        }
    }, 100);

    return true;
}

// 辅助：获取场景
function getScene() {
    try {
        if (Laya && Laya.stage) {
            function f(o) {
                if (!o) return null;
                if (o.constructor && o.constructor.name === 'TavernChessGameScene') return o;
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
            return f(Laya.stage);
        }
    } catch(e) {}
    return null;
}

window.lineupAt = lineupAt;
window.getScene = getScene;
console.log('✅ lineupAt 已加载，使用方式: lineupAt(索引)');