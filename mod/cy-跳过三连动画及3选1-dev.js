// 强制完成所有待处理操作（包括三连动画和选择）
// 自动选择第1个位置的卡牌
(function() {
    'use strict';

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

    // 强制完成所有待处理操作
    function forceCompleteAll() {
        var m = getManager();
        if (!m) {
            console.info('❌ 未找到管理器');
            return false;
        }

        console.info('🔥 强制完成所有待处理操作...');

        // 方法1: 触发阶段切换（模拟时间耗尽）
        // 这会触发游戏内部的自动完成机制
        try {
            if (typeof m.onEndRecruitJump === 'function') {
                m.onEndRecruitJump();
                console.info('✅ 已触发 onEndRecruitJump');
                return true;
            }
        } catch(e) {
            console.info('⚠️ onEndRecruitJump 失败:', e.message);
        }

        // 方法2: 发送阶段切换事件
        try {
            if (typeof m.SendEvent === 'function') {
                m.SendEvent('END_RECRUIT_JUMP');
                console.info('✅ 已发送 END_RECRUIT_JUMP 事件');
                return true;
            }
            if (typeof m.event === 'function') {
                m.event('END_RECRUIT_JUMP');
                console.info('✅ 已触发 END_RECRUIT_JUMP 事件');
                return true;
            }
        } catch(e) {
            console.info('⚠️ 事件发送失败:', e.message);
        }

        // 方法3: 直接模拟阶段切换
        try {
            // 切换到战斗阶段，触发自动完成
            var currentPhase = m.Phase || m.phase;
            if (currentPhase === 'InRecruit' || currentPhase === 2) {
                // 设置到战斗阶段
                m.Phase = 'InBattle';
                if (typeof m.SendEvent === 'function') {
                    m.SendEvent('GAME_PHASE_CHANGED');
                }
                if (typeof m.event === 'function') {
                    m.event('GAME_PHASE_CHANGED');
                }
                // 再切回招募阶段（如果不想真的进入战斗）
                // 但注意：这可能会触发战斗开始
                console.info('✅ 已触发阶段切换');
            }
        } catch(e) {
            console.info('⚠️ 阶段切换失败:', e.message);
        }

        console.info('⚠️ 所有方法已尝试，请观察游戏是否完成操作');
        return false;
    }

    // 专门用于三连完成
    function completeTriple() {
        var m = getManager();
        if (!m) {
            console.info('❌ 未找到管理器');
            return false;
        }

        console.info('🔄 尝试完成三连...');

        // 检查是否有等待选择的卡牌
        if (m.WaitSelectCards && m.WaitSelectCards.length > 0) {
            console.info('📜 检测到待选择卡牌:', m.WaitSelectCards.length);
            // 直接选择第一个
            var firstCard = m.WaitSelectCards[0];
            if (firstCard && firstCard.ServerInfo) {
                var goodsID = firstCard.ServerInfo.goodsID || firstCard.ServerInfo.GoodsID;
                if (goodsID && typeof m.ReqSelectOtherChess === 'function') {
                    m.ReqSelectOtherChess(goodsID, false);
                    console.info('✅ 已选择奖励 goodsID:', goodsID);
                }
            } else if (firstCard && firstCard.CardVO) {
                var cardID = firstCard.CardVO.CardID;
                if (cardID && typeof m.ReqChessSelectSpellID === 'function') {
                    m.ReqChessSelectSpellID(cardID, false);
                    console.info('✅ 已选择奖励 cardID:', cardID);
                }
            }
        }

        // 检查是否有合成动画在播放
        try {
            if (Laya && Laya.stage) {
                function findAni(o) {
                    if (!o) return null;
                    if (o.constructor && o.constructor.name === 'TavernChessCompositeAni') {
                        return o;
                    }
                    var c = o._children || o.children || o.childList;
                    if (c) {
                        for (var i = 0; i < c.length; i++) {
                            var r = findAni(c[i]);
                            if (r) return r;
                        }
                    }
                    if (typeof o.numChildren === 'number' && typeof o.getChildAt === 'function') {
                        for (var i = 0; i < o.numChildren; i++) {
                            try {
                                var r = findAni(o.getChildAt(i));
                                if (r) return r;
                            } catch(e) {}
                        }
                    }
                    return null;
                }
                var ani = findAni(Laya.stage);
                if (ani) {
                    console.info('🎬 跳过三联合成动画');
                    ani.destroy();
                }
            }
        } catch(e) {}

        // 刷新UI
        try {
            if (typeof m.SendEvent === 'function') {
                m.SendEvent('UI_UPDATE_HAND_CARD_NUM');
                m.SendEvent('UI_UPDATE_HAND_CARD');
                m.SendEvent('UI_UPDATE_LINEUP_TIP');
            }
            if (typeof m.event === 'function') {
                m.event('UI_UPDATE_HAND_CARD_NUM');
                m.event('UI_UPDATE_HAND_CARD');
                m.event('UI_UPDATE_LINEUP_TIP');
            }
        } catch(e) {}

        console.info('✅ 三连完成尝试结束');
        return true;
    }

    // 暴露到全局
    window.__triple = {
        // 强制完成所有操作（模拟时间耗尽）
        force: forceCompleteAll,
        // 专门完成三连
        complete: completeTriple,
        // 查看当前状态
        status: function() {
            var m = getManager();
            if (!m) {
                console.info('❌ 未找到管理器');
                return;
            }
            console.info('===== 当前状态 =====');
            console.info('Phase:', m.Phase || m.phase);
            console.info('WaitSelectCards:', m.WaitSelectCards ? m.WaitSelectCards.length : 0);
            console.info('WaitSelectEquiments:', m.WaitSelectEquiments ? m.WaitSelectEquiments.length : 0);
            if (m.WaitSelectCards && m.WaitSelectCards.length > 0) {
                console.info('待选择卡牌:');
                m.WaitSelectCards.forEach(function(card, i) {
                    var name = '未知';
                    if (card.CardVO) {
                        name = card.CardVO.GetChessName ? card.CardVO.GetChessName(card.ServerInfo) : (card.CardVO.CardName || '卡牌');
                    }
                    console.info('  [' + i + ']', name);
                });
            }
        }
    };

    console.info('===== 三连加速工具已加载 =====');
    console.info('📌 命令:');
    console.info('  __triple.force()    - 强制完成所有操作（模拟时间耗尽）');
    console.info('  __triple.complete() - 专门完成三连（跳过动画+选择）');
    console.info('  __triple.status()   - 查看当前状态');
    console.info('');
    console.info('💡 使用场景:');
    console.info('  1. 触发三连后，立即执行 __triple.complete()');
    console.info('  2. 或者等待招募时间快结束时，系统自动完成');

})();