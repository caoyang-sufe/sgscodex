// ==UserScript==
// @name         自走棋锦囊小抄
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  陆逊BUG无限触发 + 一键使用全部锦囊
// @author       Codex
// @match        https://game.4399iw2.com/yxxsgs/*
// @match        *://*.sanguosha.com/10/*
// @match        *://*.sanguosha.com/x/*
// @match        *://*.sanguosha.com/10th/*
// @match        https://wan.baidu.com/*gameId=19793616*
// @match        *://h5.7k7k.com/web/H5GAMES.html?gid=960982bec2f555de44ea43ca8a7ef418/*
// @match        *://qqgame.qq.com/webappframe/?appid=10951
// @match        *://s118.app1107877410.qqopenapp.com/pc/qqLobby_index.php*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================
    // 状态控制
    // ============================================================
    var isLuXunRunning = false;
    var luXunTimer = null;
    var isExecuting = false;

    // ============================================================
    // 获取管理器
    // ============================================================
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

    // ============================================================
    // 核心功能函数
    // ============================================================

    // 使用手牌指定位置的锦囊（无需目标）
    function useSpellByIndex(index) {
        var m = getManager();
        if (!m) {
            console.log('❌ 未找到管理器');
            return false;
        }

        var hand = m.HandChess || m.handChess || [];
        if (index < 0 || index >= hand.length) {
            return false;
        }

        var card = hand[index];
        var goodsID = card.goodsID || card.GoodsID || 0;
        var spellID = card.spellID || card.SpellID || 0;
        var chessID = card.chessID || card.ChessID || 0;

        if (!spellID || chessID) {
            return false;
        }
        
        if (typeof m.ReqChessUseSpell === 'function') {
            m.ReqChessUseSpell(goodsID, []);
            return true;
        }
        return false;
    }

    // 使用需要目标的锦囊
    function useSpellWithTarget(index, targetType, targetValue) {
        var m = getManager();
        if (!m) return false;

        var hand = m.HandChess || m.handChess || [];
        if (index < 0 || index >= hand.length) return false;

        var card = hand[index];
        var goodsID = card.goodsID || card.GoodsID || 0;
        var spellID = card.spellID || card.SpellID || 0;
        var chessID = card.chessID || card.ChessID || 0;

        if (!spellID || chessID) return false;

        var targets = [];

        switch(targetType) {
            case 'enemy': {
                var enemyChess = m.EnemyChess || m.battlePlayerInfo?.Chess || m.enemyPlayerInfo?.Chess || [];
                if (targetValue !== undefined && targetValue < enemyChess.length) {
                    var target = enemyChess[targetValue];
                    targets = [target.goodsID || target.GoodsID || target.UniqueId || 0];
                } else {
                    return false;
                }
                break;
            }
            case 'self': {
                var selfChess = m.BattleChess || m.selfInfo?.LineUpChess || [];
                if (targetValue !== undefined && targetValue < selfChess.length) {
                    var target = selfChess[targetValue];
                    targets = [target.goodsID || target.GoodsID || target.UniqueId || 0];
                } else {
                    return false;
                }
                break;
            }
            case 'all_enemy': {
                var allEnemy = m.EnemyChess || m.battlePlayerInfo?.Chess || m.enemyPlayerInfo?.Chess || [];
                targets = allEnemy.map(function(c) { 
                    return c.goodsID || c.GoodsID || c.UniqueId || 0; 
                }).filter(function(id) { return id > 0; });
                break;
            }
            case 'all_self': {
                var allSelf = m.BattleChess || m.selfInfo?.LineUpChess || [];
                targets = allSelf.map(function(c) { 
                    return c.goodsID || c.GoodsID || c.UniqueId || 0; 
                }).filter(function(id) { return id > 0; });
                break;
            }
            case 'specific': {
                if (targetValue) {
                    targets = [targetValue];
                } else {
                    return false;
                }
                break;
            }
            case 'position': {
                var allChess = m.BattleChess || [];
                var posTarget = allChess.filter(function(c) { 
                    return (c.pos || c.Pos || 0) === targetValue; 
                });
                if (posTarget.length > 0) {
                    targets = posTarget.map(function(c) { 
                        return c.goodsID || c.GoodsID || c.UniqueId || 0; 
                    });
                } else {
                    return false;
                }
                break;
            }
            case 'shop': {
                var shopGoods = m.ShopGoods || [];
                if (targetValue !== undefined && targetValue < shopGoods.length) {
                    var target = shopGoods[targetValue];
                    targets = [target.goodsID || target.GoodsID || 0];
                } else {
                    return false;
                }
                break;
            }
            default:
                return false;
        }

        if (targets.length === 0) return false;
        
        if (typeof m.ReqChessUseSpell === 'function') {
            m.ReqChessUseSpell(goodsID, targets);
            return true;
        }
        return false;
    }

    // 从服务器同步手牌
    function syncHandFromServer() {
        var m = getManager();
        if (!m) return false;

        if (typeof m.ReqChessFlushInfo === 'function') {
            m.ReqChessFlushInfo();
            return true;
        }
        
        if (typeof m.ReqShopRefreshChess === 'function') {
            m.ReqShopRefreshChess(false);
            return true;
        }
        
        if (typeof m.SendEvent === 'function') {
            m.SendEvent('GAME_PHASE_CHANGED');
            return true;
        }
        return false;
    }

    // 刷新UI
    function refreshHandUI() {
        var m = getManager();
        if (!m) return;

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
                }
            }
        } catch(e) {}
    }

    // 遣散手牌
    function sellHandCard(index) {
        var m = getManager();
        if (!m) return false;

        var hand = m.HandChess || m.handChess || [];
        if (index < 0 || index >= hand.length) return false;

        var card = hand[index];
        var goodsID = card.goodsID || card.GoodsID || 0;
        if (!goodsID) return false;

        if (typeof m.ReqShopRecycleChess === 'function') {
            m.ReqShopRecycleChess(goodsID);
            return true;
        }
        return false;
    }

    // ============================================================
    // 功能1: 陆逊小抄 - 无限循环
    // ============================================================
    function luXunLoop() {
        if (!isLuXunRunning || isExecuting) {
            // 如果停止或正在执行，安排下一次检查
            if (isLuXunRunning) {
                luXunTimer = setTimeout(luXunLoop, 0);
            }
            return;
        }

        isExecuting = true;

        try {
            // 1. 使用第1张手牌
            var result = useSpellByIndex(0);
            
            // 2. 同步服务器（无论是否成功都执行）
            syncHandFromServer();
            
            // 3. 刷新UI
            refreshHandUI();

            // 如果使用成功，记录一下
            if (result) {
                // console.log('✅ 陆逊循环一次');
            }
        } catch(e) {
            // 忽略错误，继续循环
        }

        isExecuting = false;

        // 如果还在运行，继续下一次循环（0延迟）
        if (isLuXunRunning) {
            luXunTimer = setTimeout(luXunLoop, 0);
        }
    }

    function startLuXun() {
        if (isLuXunRunning) {
            console.log('⚠️ 陆逊小抄已在运行中');
            return;
        }

        console.log('🦊 陆逊小抄 启动无限循环...');
        isLuXunRunning = true;
        isExecuting = false;
        
        // 清除之前的定时器
        if (luXunTimer) {
            clearTimeout(luXunTimer);
            luXunTimer = null;
        }
        
        // 立即开始
        luXunLoop();
        updateButtonState();
    }

    function stopLuXun() {
        if (!isLuXunRunning) {
            console.log('⚠️ 陆逊小抄未在运行');
            return;
        }

        console.log('🛑 陆逊小抄 停止');
        isLuXunRunning = false;
        
        if (luXunTimer) {
            clearTimeout(luXunTimer);
            luXunTimer = null;
        }
        
        isExecuting = false;
        updateButtonState();
    }

    function toggleLuXun() {
        if (isLuXunRunning) {
            stopLuXun();
        } else {
            startLuXun();
        }
    }

    // ============================================================
    // 功能2: 锦囊小抄 - 使用所有锦囊
    // ============================================================
    function spellCheat() {
        var m = getManager();
        if (!m) {
            console.log('❌ 未找到管理器');
            return;
        }

        console.log('===== 锦囊小抄 =====');
        
        var hand = m.HandChess || m.handChess || [];
        var spellIndices = [];
        
        hand.forEach(function(card, index) {
            var spellID = card.spellID || card.SpellID || 0;
            var chessID = card.chessID || card.ChessID || 0;
            if (spellID && !chessID) {
                spellIndices.push(index);
            }
        });

        if (spellIndices.length === 0) {
            console.log('❌ 没有锦囊可使用');
            return;
        }

        console.log('📜 找到', spellIndices.length, '个锦囊');

        spellIndices.reverse().forEach(function(index) {
            var success = useSpellWithTarget(index, 'shop', 0);
            if (!success) {
                success = useSpellWithTarget(index, 'position', 0);
            }
            if (!success) {
                console.log('⚠️ 锦囊使用失败，遣散 索引[' + index + ']');
                sellHandCard(index);
            }
        });

        setTimeout(function() {
            syncHandFromServer();
            setTimeout(function() {
                refreshHandUI();
                console.log('✅ 锦囊小抄执行完成');
            }, 300);
        }, 800);
    }

    // ============================================================
    // UI按钮状态
    // ============================================================
    var btnLuXun = null;
    var btnStop = null;
    var btnSpell = null;

    function updateButtonState() {
        if (btnLuXun) {
            if (isLuXunRunning) {
                btnLuXun.textContent = '🔄 运行中...';
                btnLuXun.style.background = 'linear-gradient(135deg,#f093fb,#f5576c)';
                btnLuXun.style.opacity = '0.7';
            } else {
                btnLuXun.textContent = '🦊 陆逊小抄';
                btnLuXun.style.background = 'linear-gradient(135deg,#667eea,#764ba2)';
                btnLuXun.style.opacity = '1';
            }
        }
        if (btnStop) {
            btnStop.style.display = isLuXunRunning ? 'block' : 'none';
        }
    }

    // ============================================================
    // 创建UI按钮
    // ============================================================
    function createUI() {
        if (document.getElementById('tavern-cheat-buttons')) return;

        var container = document.createElement('div');
        container.id = 'tavern-cheat-buttons';
        container.style.cssText = [
            'position:fixed',
            'bottom:80px',
            'right:20px',
            'z-index:99997',
            'display:flex',
            'flex-direction:column',
            'gap:6px'
        ].join(';');

        // 陆逊小抄按钮（开始/运行）
        btnLuXun = document.createElement('button');
        btnLuXun.textContent = '🦊 陆逊小抄';
        btnLuXun.style.cssText = [
            'padding:6px 14px',
            'background:linear-gradient(135deg,#667eea,#764ba2)',
            'color:#fff',
            'border:1px solid #5a4f8a',
            'border-radius:6px',
            'cursor:pointer',
            'font:bold 13px Microsoft YaHei,Arial,sans-serif',
            'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
            'transition:all 0.2s',
            'user-select:none',
            'min-width:100px'
        ].join(';');
        btnLuXun.onmouseover = function() { this.style.transform = 'scale(1.05)'; };
        btnLuXun.onmouseout = function() { this.style.transform = 'scale(1)'; };
        btnLuXun.onmousedown = function() { this.style.transform = 'scale(0.95)'; };
        btnLuXun.onmouseup = function() { this.style.transform = 'scale(1)'; };
        btnLuXun.addEventListener('click', toggleLuXun);

        // 停止按钮（默认隐藏）
        btnStop = document.createElement('button');
        btnStop.textContent = '🛑 停止';
        btnStop.style.cssText = [
            'padding:6px 14px',
            'background:linear-gradient(135deg,#eb3349,#f45c43)',
            'color:#fff',
            'border:1px solid #c0392b',
            'border-radius:6px',
            'cursor:pointer',
            'font:bold 13px Microsoft YaHei,Arial,sans-serif',
            'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
            'transition:all 0.2s',
            'user-select:none',
            'min-width:100px',
            'display:none'
        ].join(';');
        btnStop.onmouseover = function() { this.style.transform = 'scale(1.05)'; };
        btnStop.onmouseout = function() { this.style.transform = 'scale(1)'; };
        btnStop.onmousedown = function() { this.style.transform = 'scale(0.95)'; };
        btnStop.onmouseup = function() { this.style.transform = 'scale(1)'; };
        btnStop.addEventListener('click', toggleLuXun);

        // 锦囊小抄按钮
        btnSpell = document.createElement('button');
        btnSpell.textContent = '📜 锦囊小抄';
        btnSpell.style.cssText = [
            'padding:6px 14px',
            'background:linear-gradient(135deg,#f093fb,#f5576c)',
            'color:#fff',
            'border:1px solid #c94a7a',
            'border-radius:6px',
            'cursor:pointer',
            'font:bold 13px Microsoft YaHei,Arial,sans-serif',
            'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
            'transition:all 0.2s',
            'user-select:none',
            'min-width:100px'
        ].join(';');
        btnSpell.onmouseover = function() { this.style.transform = 'scale(1.05)'; };
        btnSpell.onmouseout = function() { this.style.transform = 'scale(1)'; };
        btnSpell.onmousedown = function() { this.style.transform = 'scale(0.95)'; };
        btnSpell.onmouseup = function() { this.style.transform = 'scale(1)'; };
        btnSpell.addEventListener('click', function() {
            this.textContent = '⏳ 执行中...';
            this.disabled = true;
            try {
                spellCheat();
            } catch(e) {
                console.error('锦囊小抄异常:', e);
            }
            setTimeout(function() {
                btnSpell.textContent = '📜 锦囊小抄';
                btnSpell.disabled = false;
            }, 2500);
        });

        container.appendChild(btnLuXun);
        container.appendChild(btnStop);
        container.appendChild(btnSpell);
        document.body.appendChild(container);

        updateButtonState();

        // 快捷键
        document.addEventListener('keydown', function(e) {
            if (e.key === 'L' && e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                toggleLuXun();
            }
            if (e.key === 'S' && e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                btnSpell.click();
            }
            if (e.key === 'Escape' && isLuXunRunning) {
                // ESC键也可以停止
                stopLuXun();
            }
        });

        console.log('✅ 锦囊小抄按钮已加载');
        console.log('⌨️ 快捷键: Ctrl+Shift+L = 启动/停止陆逊小抄');
        console.log('⌨️ 快捷键: Ctrl+Shift+S = 锦囊小抄');
        console.log('⌨️ 快捷键: ESC = 停止陆逊小抄');
    }

    // ============================================================
    // 控制台暴露
    // ============================================================
    window.__tavernCheats = {
        luXun: {
            start: startLuXun,
            stop: stopLuXun,
            toggle: toggleLuXun,
            isRunning: function() { return isLuXunRunning; }
        },
        spell: spellCheat,
        useSpellByIndex: useSpellByIndex,
        useSpellWithTarget: useSpellWithTarget,
        syncHand: syncHandFromServer,
        refreshUI: refreshHandUI,
        sellCard: sellHandCard
    };

    // ============================================================
    // 启动
    // ============================================================
    setTimeout(createUI, 2000);

    console.log('========================================');
    console.log('📜 锦囊小抄 v1.1.0');
    console.log('========================================');
    console.log('🦊 陆逊小抄: 无限循环 useSpellByIndex(0) → sync → refresh');
    console.log('   点击按钮启动/停止，或按 Ctrl+Shift+L');
    console.log('   按 ESC 键也可停止');
    console.log('📜 锦囊小抄: 使用所有锦囊 (position→shop→遣散)');
    console.log('💻 控制台: __tavernCheats');
    console.log('   __tavernCheats.luXun.start()  - 启动');
    console.log('   __tavernCheats.luXun.stop()   - 停止');
    console.log('   __tavernCheats.luXun.toggle() - 切换');
    console.log('========================================');

})();