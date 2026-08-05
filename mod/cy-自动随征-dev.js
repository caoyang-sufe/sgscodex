// 自动随征 - 基于确定的随征卡ID列表
// 通过ChessID筛选随征卡，因此版本更新需要重置
// 目前没有找到特别好的
(function() {
    'use strict';

    // ============================================================
    // 随征卡ID列表
    // ============================================================
    var FOLLOWUP_CHESS_IDS = [
        '21003071', '21003072', // 黄盖
        '21001061', '21001062', // 薛灵芸
        '21004141', '21004142', // 马元义
        '21007101', '21007102', // 张勋
        '20904231'              // 黄巾兵
    ];

    // 也支持数字类型
    var FOLLOWUP_CHESS_IDS_NUM = [21003071, 21003072, 21001061, 21001062, 21004141, 21004142, 21007101, 21007102, 20904231];

    function getManager() {
        try {
            if (Laya && Laya.stage) {
                function find(o) {
                    if (!o) return null;
                    if (o.manager && o.manager.ReqShopRefreshChess) return o.manager;
                    if (o.ReqShopRefreshChess) return o;
                    var c = o._children || o.children || o.childList;
                    if (c) {
                        for (var i = 0; i < c.length; i++) {
                            var r = find(c[i]);
                            if (r) return r;
                        }
                    }
                    if (typeof o.numChildren === 'number' && typeof o.getChildAt === 'function') {
                        for (var i = 0; i < o.numChildren; i++) {
                            try {
                                var r = find(o.getChildAt(i));
                                if (r) return r;
                            } catch(e) {}
                        }
                    }
                    return null;
                }
                var m = find(Laya.stage);
                if (m) return m;
            }
        } catch(e) {}

        for (var k in window) {
            try {
                var o = window[k];
                if (o && o.ReqShopRefreshChess) return o;
                if (o && o.manager && o.manager.ReqShopRefreshChess) return o.manager;
            } catch(e) {}
        }
        return null;
    }

    // 判断是否是随征卡（基于ID列表）
    function isFollowUpCard(card) {
        if (!card) return false;
        var chessID = card.chessID || card.ChessID || 0;
        // 转为字符串比较
        var idStr = String(chessID);
        return FOLLOWUP_CHESS_IDS.indexOf(idStr) !== -1;
    }

    // 获取手牌中最右侧的随征卡
    function getRightmostFollowUpCard() {
        var m = getManager();
        if (!m) return null;

        var hand = m.HandChess || m.handChess || [];
        for (var i = hand.length - 1; i >= 0; i--) {
            var card = hand[i];
            if (isFollowUpCard(card)) {
                return {
                    index: i,
                    card: card,
                    goodsID: card.goodsID || card.GoodsID || 0,
                    chessID: card.chessID || card.ChessID || 0
                };
            }
        }
        return null;
    }

    // 获取所有手牌中的随征卡
    function getAllFollowUpCards() {
        var m = getManager();
        if (!m) return [];

        var hand = m.HandChess || m.handChess || [];
        var result = [];
        for (var i = 0; i < hand.length; i++) {
            var card = hand[i];
            if (isFollowUpCard(card)) {
                result.push({
                    index: i,
                    card: card,
                    goodsID: card.goodsID || card.GoodsID || 0,
                    chessID: card.chessID || card.ChessID || 0
                });
            }
        }
        return result;
    }

    // 获取上阵区域指定位置的棋子
    function getTargetChess(position) {
        var m = getManager();
        if (!m) return null;

        position = position || 0;
        var lineup = m.BattleChess || m.SelfInfo?.LineUpChess || [];
        
        if (position < 0 || position >= lineup.length) {
            console.warn('[随征] 位置超出范围:', position);
            return null;
        }

        var target = lineup[position];
        if (!target) {
            console.warn('[随征] 位置', position, '没有棋子');
            return null;
        }

        return {
            chess: target,
            goodsID: target.goodsID || target.GoodsID || 0,
            chessID: target.chessID || target.ChessID || 0
        };
    }

    // 获取上阵区域所有有棋子的位置
    function getAllTargetPositions() {
        var m = getManager();
        if (!m) return [];

        var lineup = m.BattleChess || m.SelfInfo?.LineUpChess || [];
        var result = [];
        for (var i = 0; i < lineup.length; i++) {
            if (lineup[i]) {
                result.push({
                    position: i,
                    chess: lineup[i],
                    goodsID: lineup[i].goodsID || lineup[i].GoodsID || 0
                });
            }
        }
        return result;
    }

    // 核心：自动随征
    function autoFollowUp(targetPosition) {
        var m = getManager();
        if (!m) {
            console.warn('[随征] 未找到管理器');
            return false;
        }

        // 检查是否在招募阶段
        var phase = m.Phase || m.phase;
        if (phase !== 6 && phase !== 'InRecruit') {
            console.warn('[随征] 不在招募阶段，phase=' + phase);
            return false;
        }

        // 1. 查找随征卡（最右侧）
        var followUp = getRightmostFollowUpCard();
        if (!followUp) {
            console.warn('[随征] 手牌中没有随征卡');
            return false;
        }
        console.info('[随征] 找到随征卡:', followUp.chessID, 'goodsID:', followUp.goodsID, '位置:', followUp.index);

        // 2. 查找目标棋子
        targetPosition = targetPosition !== undefined ? targetPosition : 0;
        var target = getTargetChess(targetPosition);
        if (!target) {
            console.warn('[随征] 位置', targetPosition, '没有棋子');
            return false;
        }
        console.info('[随征] 目标棋子:', target.chessID, 'goodsID:', target.goodsID, '位置:', targetPosition);

        // 3. 执行随征
        if (typeof m.ReqChessFollowUp === 'function') {
            m.ReqChessFollowUp(target.goodsID, followUp.goodsID);
            console.info('[随征] ✅ 已发送随征请求 目标:', target.goodsID, '随征卡:', followUp.goodsID);
            return true;
        } else {
            console.warn('[随征] ReqChessFollowUp 方法不存在');
            return false;
        }
    }

    // 随征到指定位置
    function followUpToPosition(position) {
        return autoFollowUp(position);
    }

    // 随征到第一个有棋子的位置
    function followUpToFirst() {
        var positions = getAllTargetPositions();
        if (positions.length === 0) {
            console.warn('[随征] 上阵区域没有棋子');
            return false;
        }
        return autoFollowUp(positions[0].position);
    }

    // 批量随征：将所有随征卡都随征到第一个有棋子的位置
    function batchFollowUp() {
        var m = getManager();
        if (!m) {
            console.warn('[随征] 未找到管理器');
            return false;
        }

        var phase = m.Phase || m.phase;
        if (phase !== 6 && phase !== 'InRecruit') {
            console.warn('[随征] 不在招募阶段');
            return false;
        }

        var followUps = getAllFollowUpCards();
        if (followUps.length === 0) {
            console.warn('[随征] 手牌中没有随征卡');
            return false;
        }

        var positions = getAllTargetPositions();
        if (positions.length === 0) {
            console.warn('[随征] 上阵区域没有棋子');
            return false;
        }

        var targetPos = positions[0].position;
        console.info('[随征] 找到', followUps.length, '张随征卡，目标位置:', targetPos);

        var successCount = 0;
        followUps.forEach(function(fu) {
            var target = getTargetChess(targetPos);
            if (target && typeof m.ReqChessFollowUp === 'function') {
                m.ReqChessFollowUp(target.goodsID, fu.goodsID);
                successCount++;
                console.info('[随征] ✅ 已随征:', fu.chessID, '→', target.chessID);
            }
        });

        console.info('[随征] 完成，成功随征', successCount, '张');
        return true;
    }

    // 查看当前手牌中的随征卡
    function listFollowUpCards() {
        var m = getManager();
        if (!m) {
            console.warn('[随征] 未找到管理器');
            return;
        }

        var hand = m.HandChess || m.handChess || [];
        console.info('===== 随征卡列表 =====');
        console.info('随征卡ID列表:', FOLLOWUP_CHESS_IDS.join(', '));
        console.info('---');
        
        var found = 0;
        hand.forEach(function(card, i) {
            if (isFollowUpCard(card)) {
                var name = card.name || card.Name || card.chessID || '未知';
                var chessID = card.chessID || card.ChessID || 0;
                var goodsID = card.goodsID || card.GoodsID || 0;
                console.info('  [' + i + ']', name, 'chessID:', chessID, 'goodsID:', goodsID);
                found++;
            }
        });
        
        if (found === 0) {
            console.info('  没有随征卡');
        } else {
            console.info('---');
            console.info('  共', found, '张随征卡');
        }

        // 显示上阵区域
        var positions = getAllTargetPositions();
        console.info('---');
        console.info('上阵区域棋子:');
        if (positions.length === 0) {
            console.info('  没有棋子');
        } else {
            positions.forEach(function(p) {
                console.info('  位置' + p.position + ':', p.chess.name || p.chess.chessID, 'goodsID:', p.goodsID);
            });
        }
        console.info('');
        console.info('💡 使用 __followUp.auto() 随征到位置0');
        console.info('💡 使用 __followUp.first() 随征到第一个棋子');
        console.info('💡 使用 __followUp.batch() 批量随征所有随征卡');
    }

    // 暴露到全局
    window.__followUp = {
        // 随征卡ID列表
        chessIds: FOLLOWUP_CHESS_IDS,
        // 自动随征到位置0
        auto: function() { return autoFollowUp(0); },
        // 随征到指定位置
        to: followUpToPosition,
        // 随征到第一个有棋子的位置
        first: followUpToFirst,
        // 批量随征所有随征卡
        batch: batchFollowUp,
        // 查看随征卡列表
        list: listFollowUpCards,
        // 判断是否是随征卡
        isFollowUp: isFollowUpCard,
        // 获取最右侧随征卡
        getRightmost: getRightmostFollowUpCard,
        // 获取所有随征卡
        getAll: getAllFollowUpCards
    };

    console.info('===== 自动随征工具已加载 =====');
    console.info('📌 随征卡ID列表:', FOLLOWUP_CHESS_IDS.join(', '));
    console.info('');
    console.info('📌 命令:');
    console.info('  __followUp.auto()   - 随征到位置0');
    console.info('  __followUp.to(位置) - 随征到指定位置');
    console.info('  __followUp.first()  - 随征到第一个有棋子的位置');
    console.info('  __followUp.batch()  - 批量随征所有随征卡');
    console.info('  __followUp.list()   - 查看随征卡列表和上阵区域');
    console.info('');
    console.info('💡 示例:');
    console.info('  __followUp.auto()      // 自动随征');
    console.info('  __followUp.to(2)       // 随征到位置2');
    console.info('  __followUp.batch()     // 批量随征');

})();