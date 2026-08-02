// 尝试通过 changeChess 修改棋子属性

function getManager() {
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
	return m;
}

// 尝试通过 changeChess 修改棋子属性
function fakeChessChange(goodsID, hpValue, attValue) {
    var m = getManager();
    if (!m) return;
    var selfInfo = m.SelfInfo || m.selfInfo;
    if (!selfInfo) return;

    // 查找要修改的棋子
    var chess = selfInfo.Chess ? selfInfo.Chess[goodsID] : null;
    if (!chess) {
        console.info('❌ 未找到棋子 goodsID:', goodsID);
        return;
    }

    // 构造修改数据
    var changeData = {
        goodsID: goodsID,
        hpValue: hpValue,
        attValue: attValue,
        hpDiffValue: hpValue - (chess.hp || 0),
        attDiffValue: attValue - (chess.attack || 0),
        buffParams: {
            addArr: [],
            changeArr: [],
            deleteArr: []
        }
    };

    // 添加到 changeChess 队列
    if (!selfInfo.changeChess) selfInfo.changeChess = [];
    selfInfo.changeChess.push(changeData);

    // 触发更新事件
    if (typeof m.event === 'function') {
        m.event('TEAM_CHESS_INFO_UPDATE', [0, 0, [changeData]]);
    }
    if (typeof m.SendEvent === 'function') {
        m.SendEvent('TEAM_CHESS_INFO_UPDATE', [0, 0, [changeData]]);
    }

    console.info('✅ 已添加修改请求:', changeData);
    console.info('⚠️ 服务器可能忽略此修改');
}

// 测试：修改第一个棋子的属性
fakeChessChange(290, 100, 100);

// 测试：修改第一个棋子的属性
fakeChessChange(290, 100, 100);