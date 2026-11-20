// 3选1选择工具 - 完整独立版
(function() {
    'use strict';

    // 获取管理器
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

    // 自动选择
    function autoSelect3() {
        var m = getManager();
        if (!m) {
            alert('❌ 未找到管理器');
            return false;
        }

        if (m.currentSelectChessOrSpellIndex !== undefined && m.currentSelectChessOrSpellIndex >= 0) {
            var index = m.currentSelectChessOrSpellIndex;
            if (typeof m.ReqChessSkillSelectSpellOrChess === 'function') {
                m.ReqChessSkillSelectSpellOrChess(index, false, 1, 0, 0);
                alert('✅ 已调用 ReqChessSkillSelectSpellOrChess');
                return true;
            }
        }

        if (m.WaitSelectCards && m.WaitSelectCards.length > 0) {
            var firstCard = m.WaitSelectCards[0];
            if (firstCard && firstCard.ServerInfo) {
                var goodsID = firstCard.ServerInfo.goodsID || firstCard.ServerInfo.GoodsID;
                var chessID = firstCard.ServerInfo.chessID || firstCard.ServerInfo.ChessID || 0;
                var spellID = firstCard.ServerInfo.spellID || firstCard.ServerInfo.SpellID || 0;
                
                if (chessID && typeof m.ReqSelectOtherChess === 'function') {
                    m.ReqSelectOtherChess(goodsID, false);
                    alert('✅ 已调用 ReqSelectOtherChess');
                    return true;
                }
                if (spellID && typeof m.ReqChessSelectSpellID === 'function') {
                    m.ReqChessSelectSpellID(spellID, false);
                    alert('✅ 已调用 ReqChessSelectSpellID');
                    return true;
                }
            }
        }

        alert('❌ 无法自动选择');
        return false;
    }

    // 强制选择
    function forceSelect3() {
        var m = getManager();
        if (!m) {
            alert('❌ 未找到管理器');
            return false;
        }

        if (m.currentSelectChessOrSpellIndex >= 0) {
            var index = m.currentSelectChessOrSpellIndex;
            if (typeof m.ReqChessSkillSelectSpellOrChess === 'function') {
                m.ReqChessSkillSelectSpellOrChess(index, false, 1, 0, 0);
                alert('✅ 已调用 ReqChessSkillSelectSpellOrChess');
                return true;
            }
        }

        try {
            if (WindowManager && WindowManager.GetInstance) {
                var wm = WindowManager.GetInstance();
                var win = wm.GetInstanceWindow('TavernChessSelectCardWindow');
                if (win && win.visible) {
                    if (win.confirmBtn && typeof win.confirmBtn.onClick === 'function') {
                        win.confirmBtn.onClick();
                        alert('✅ 已点击确认按钮');
                        return true;
                    }
                    if (win.itemUIs && win.itemUIs.length > 0) {
                        var firstItem = win.itemUIs[0];
                        if (firstItem && typeof firstItem.onItemClick === 'function') {
                            firstItem.onItemClick(firstItem);
                            setTimeout(function() {
                                if (win.confirmBtn && typeof win.confirmBtn.onClick === 'function') {
                                    win.confirmBtn.onClick();
                                }
                            }, 300);
                            alert('✅ 已选中并确认');
                            return true;
                        }
                    }
                }
            }
        } catch(e) {
            alert('窗口处理异常: ' + e.message);
        }

        if (m.WaitSelectCards && m.WaitSelectCards.length > 0) {
            m.WaitSelectCards = null;
            if (typeof m.SendEvent === 'function') {
                m.SendEvent('UI_UPDATE_SELECT_CARD');
            }
            alert('✅ WaitSelectCards 已清除');
            return true;
        }

        alert('❌ 所有方法都失败了');
        return false;
    }

    // 查看详细状态
    function showDetailState() {
        var m = getManager();
        if (!m) {
            alert('❌ 未找到管理器');
            return;
        }

        var info = {
            phase: m.Phase || m.phase,
            waitCards: m.WaitSelectCards ? m.WaitSelectCards.length : 0,
            waitEquips: m.WaitSelectEquiments ? m.WaitSelectEquiments.length : 0,
            currentSelectIndex: m.currentSelectChessOrSpellIndex,
            handSize: (m.HandChess || m.handChess || []).length,
            shopSize: (m.ShopGoods || []).length
        };

        alert('===== 当前状态 =====\n' +
              'Phase: ' + info.phase + '\n' +
              'WaitSelectCards: ' + info.waitCards + '\n' +
              'WaitSelectEquiments: ' + info.waitEquips + '\n' +
              'currentSelectIndex: ' + info.currentSelectIndex + '\n' +
              '手牌数: ' + info.handSize + '\n' +
              '商店数: ' + info.shopSize);
        
        if (m.WaitSelectCards && m.WaitSelectCards.length > 0) {
            var msg = '\n===== WaitSelectCards 详情 =====\n';
            m.WaitSelectCards.forEach(function(card, i) {
                var name = '未知';
                var id = '';
                var type = '';
                if (card.CardVO) {
                    name = card.CardVO.GetChessName ? card.CardVO.GetChessName(card.ServerInfo) : (card.CardVO.CardName || '卡牌');
                    id = card.CardVO.CardID;
                    type = card.CardVO.IsChess ? '棋子' : '锦囊';
                }
                if (card.ServerInfo) {
                    id = card.ServerInfo.goodsID || card.ServerInfo.GoodsID || id;
                    if (card.ServerInfo.chessID) { type = '棋子'; name = '棋子_' + card.ServerInfo.chessID; }
                    if (card.ServerInfo.spellID) { type = '锦囊'; name = '锦囊_' + card.ServerInfo.spellID; }
                }
                msg += '  [' + i + '] ' + type + ' ' + name + ' (ID:' + id + ')\n';
            });
            alert(msg);
        }
    }

    // 简单查看状态（不弹窗，直接返回对象）
    function getState() {
        var m = getManager();
        if (!m) return { error: '未找到管理器' };
        return {
            phase: m.Phase || m.phase,
            waitCards: m.WaitSelectCards ? m.WaitSelectCards.length : 0,
            waitEquips: m.WaitSelectEquiments ? m.WaitSelectEquiments.length : 0,
            currentSelectIndex: m.currentSelectChessOrSpellIndex,
            handSize: (m.HandChess || m.handChess || []).length,
            shopSize: (m.ShopGoods || []).length,
            WaitSelectCards: m.WaitSelectCards,
            WaitSelectEquiments: m.WaitSelectEquiments
        };
    }

    // 暴露到全局
    window.autoSelect3 = autoSelect3;
    window.forceSelect3 = forceSelect3;
    window.showDetailState = showDetailState;
    window.get3State = getState;

    alert('✅ 3选1工具已加载\n\n命令:\n  get3State() - 查看状态(不弹窗)\n  showDetailState() - 查看详细状态(弹窗)\n  autoSelect3() - 自动选择\n  forceSelect3() - 强制完成选择');

})();