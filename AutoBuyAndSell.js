// ==UserScript==
// @name         自走棋自动刷牌助手
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  自动刷新商店 + 自动购买指定卡牌 + 自动遣散手牌
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
    // 配置
    // ============================================================
    const CONFIG = {
        // 要购买的卡牌ID列表（留空则购买所有）
        buyTargets: [],
        // 是否购买所有卡牌（无视目标列表）
        buyAll: false,
        // 购买后是否自动遣散（卖掉）
        autoSell: false,
        // 保留手牌数量（超过此数量自动遣散）
        maxHandSize: 10,
        // 遣散时保留的卡牌ID列表（不遣散）
        keepChessIds: [],
        // 刷新间隔（毫秒）
        refreshInterval: 300,
        // 最大刷新次数（0=无限）
        maxRefreshes: 0,
        // 是否启用自动购买
        autoBuy: true,
        // 是否启用自动遣散
        autoSellEnabled: true,
        // 是否在战斗阶段暂停
        pauseInBattle: true
    };

    // ============================================================
    // 获取管理器（已验证可行的方法）
    // ============================================================
    function getManager() {
        try {
            if (Laya && Laya.stage) {
                function f(o) {
                    if (!o) return null;
                    if (o.manager && o.manager.ReqShopRefreshChess) return o.manager;
                    if (o.ReqShopRefreshChess) return o;
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
                var m = f(Laya.stage);
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
    // 核心功能 - 刷新商店
    // ============================================================
    function refreshShop() {
        var m = getManager();
        if (!m) return false;
        m.ReqShopRefreshChess(false);
        return true;
    }

    // ============================================================
    // 核心功能 - 购买卡牌
    // ============================================================
    function buyChess(goodsID) {
        var m = getManager();
        if (!m) return false;
        if (typeof m.ReqShopBuyChess === 'function') {
            m.ReqShopBuyChess(goodsID);
            return true;
        }
        return false;
    }

    // ============================================================
    // 核心功能 - 遣散手牌
    // ============================================================
    function sellChess(goodsID) {
        var m = getManager();
        if (!m) return false;
        if (typeof m.ReqShopRecycleChess === 'function') {
            m.ReqShopRecycleChess(goodsID);
            return true;
        }
        return false;
    }

    // ============================================================
    // 获取商店卡牌列表
    // ============================================================
    function getShopGoods() {
        var m = getManager();
        if (!m) return [];
        return m.ShopGoods || [];
    }

    // ============================================================
    // 获取手牌列表
    // ============================================================
    function getHandChess() {
        var m = getManager();
        if (!m) return [];
        return m.HandChess || [];
    }

    // ============================================================
    // 获取当前阶段
    // ============================================================
    function getPhase() {
        var m = getManager();
        if (!m) return null;
        return m.Phase || m.phase;
    }

    // ============================================================
    // 获取金币
    // ============================================================
    function getCoin() {
        var m = getManager();
        if (!m) return 0;
        return m.CoinNum || 0;
    }

    // ============================================================
    // 检查是否应该购买某张卡牌
    // ============================================================
    function shouldBuy(goods) {
        if (!goods) return false;
        if (CONFIG.buyAll) return true;
        if (!CONFIG.buyTargets || CONFIG.buyTargets.length === 0) return true;

        var chessId = String(goods.chessID || goods.cardID || '');
        var spellId = String(goods.spellID || '');
        var goodsId = String(goods.goodsID || '');

        return CONFIG.buyTargets.some(function(target) {
            return target === chessId || target === spellId || target === goodsId;
        });
    }

    // ============================================================
    // 检查是否应该保留某张手牌（不遣散）
    // ============================================================
    function shouldKeep(hand) {
        if (!hand) return false;
        if (!CONFIG.keepChessIds || CONFIG.keepChessIds.length === 0) return false;

        var chessId = String(hand.chessID || hand.cardID || '');
        var spellId = String(hand.spellID || '');
        var goodsId = String(hand.goodsID || '');

        return CONFIG.keepChessIds.some(function(target) {
            return target === chessId || target === spellId || target === goodsId;
        });
    }

    // ============================================================
    // 判断是否为锦囊牌
    // ============================================================
    function isSpellCard(card) {
        return card && card.spellID && !card.chessID;
    }

    // ============================================================
    // 自动购买逻辑
    // ============================================================
    function autoBuy() {
        if (!CONFIG.autoBuy) return 0;

        var phase = getPhase();
        if (CONFIG.pauseInBattle && (phase === 'InBattle' || phase === 'StartBattle' || phase === 3)) {
            return 0;
        }

        var shopGoods = getShopGoods();
        var bought = 0;

        for (var i = 0; i < shopGoods.length; i++) {
            var goods = shopGoods[i];
            if (!goods) continue;

            if (shouldBuy(goods)) {
                var goodsID = goods.goodsID || goods.GoodsID;
                if (goodsID) {
                    var result = buyChess(goodsID);
                    if (result) {
                        bought++;
                        console.log('[自动购买] ✅ 已购买:', goodsID, 'chessID:', goods.chessID, 'spellID:', goods.spellID);
                    }
                }
            }
        }

        return bought;
    }

    // ============================================================
    // 自动遣散逻辑
    // ============================================================
    function autoSell() {
        if (!CONFIG.autoSellEnabled) return 0;

        var phase = getPhase();
        if (CONFIG.pauseInBattle && (phase === 'InBattle' || phase === 'StartBattle' || phase === 3)) {
            return 0;
        }

        var handChess = getHandChess();
        var handSize = handChess.length;

        // 如果手牌数量未超过上限，不遣散
        if (handSize <= CONFIG.maxHandSize) return 0;

        var sold = 0;
        // 从后往前遍历，优先遣散新获得的
        for (var i = handChess.length - 1; i >= 0; i--) {
            var hand = handChess[i];
            if (!hand) continue;

            // 检查是否应该保留
            if (shouldKeep(hand)) continue;

            // 如果是锦囊牌，默认不遣散（可以配置）
            if (isSpellCard(hand)) continue;

            var goodsID = hand.goodsID || hand.GoodsID;
            if (goodsID) {
                var result = sellChess(goodsID);
                if (result) {
                    sold++;
                    console.log('[自动遣散] ✅ 已遣散:', goodsID, 'chessID:', hand.chessID);
                    // 手牌数量减少，更新判断
                    if (getHandChess().length <= CONFIG.maxHandSize) break;
                }
            }
        }

        return sold;
    }

    // ============================================================
    // 执行一轮完整操作（刷新 + 购买 + 遣散）
    // ============================================================
    function doCycle() {
        var results = {
            refresh: false,
            bought: 0,
            sold: 0,
            handSize: 0,
            coin: 0
        };

        // 1. 先购买
        results.bought = autoBuy();

        // 2. 再遣散
        results.sold = autoSell();

        // 3. 最后刷新
        results.refresh = refreshShop();

        results.handSize = getHandChess().length;
        results.coin = getCoin();

        return results;
    }

    // ============================================================
    // 批量运行
    // ============================================================
    var isRunning = false;
    var stopFn = null;
    var cycleCount = 0;
    var totalBought = 0;
    var totalSold = 0;

    function startAutoRun(count, interval) {
        if (isRunning) return;

        count = count || 0; // 0=无限
        interval = interval || CONFIG.refreshInterval;

        isRunning = true;
        cycleCount = 0;
        totalBought = 0;
        totalSold = 0;

        console.log('🔄 开始自动刷牌...');
        console.log('  目标次数:', count || '无限');
        console.log('  间隔:', interval, 'ms');
        console.log('  自动购买:', CONFIG.autoBuy ? '✅' : '❌');
        console.log('  自动遣散:', CONFIG.autoSellEnabled ? '✅' : '❌');

        function doCycle() {
            if (!isRunning) return;

            // 检查最大次数
            if (count > 0 && cycleCount >= count) {
                stopAutoRun('达到目标次数');
                return;
            }

            cycleCount++;
            var results = doCycle();

            // 统计
            if (results.bought > 0) totalBought += results.bought;
            if (results.sold > 0) totalSold += results.sold;

            // 更新UI
            updateUIStatus(
                '循环 #' + cycleCount +
                ' | 购买: ' + results.bought +
                ' | 遣散: ' + results.sold +
                ' | 手牌: ' + results.handSize +
                ' | 金币: ' + results.coin
            );

            // 更新统计
            updateUIStats(cycleCount, totalBought, totalSold);

            // 如果还在运行，继续下一轮
            if (isRunning) {
                timer = setTimeout(doCycle, interval);
            }
        }

        var timer = setTimeout(doCycle, 100);

        stopFn = function() {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            isRunning = false;
        };

        return stopFn;
    }

    function stopAutoRun(reason) {
        if (stopFn) {
            stopFn();
            stopFn = null;
        }
        isRunning = false;
        console.log('⏹ 已停止:', reason || '手动停止');
        console.log('  总循环:', cycleCount, '次');
        console.log('  总购买:', totalBought, '张');
        console.log('  总遣散:', totalSold, '张');
        updateUIStatus('已停止: ' + (reason || '手动') + ' (循环:' + cycleCount + ' 购买:' + totalBought + ' 遣散:' + totalSold + ')');
        updateUIStats(cycleCount, totalBought, totalSold);
        resetUIProgress();
    }

    function toggleAutoRun() {
        if (isRunning) {
            stopAutoRun('手动停止');
        } else {
            var count = parseInt(document.getElementById('tavern-auto-run-count')?.value) || 0;
            var interval = parseInt(document.getElementById('tavern-auto-run-interval')?.value) || CONFIG.refreshInterval;
            startAutoRun(count, interval);
        }
    }

    // ============================================================
    // UI 面板
    // ============================================================
    function createUI() {
        if (document.getElementById('tavern-auto-run-panel')) return;

        var panel = document.createElement('div');
        panel.id = 'tavern-auto-run-panel';
        panel.style.cssText = [
            'position:fixed',
            'top:100px',
            'right:20px',
            'z-index:99999',
            'background:rgba(20,24,35,0.95)',
            'color:#f6f7fb',
            'border:1px solid #596275',
            'border-radius:10px',
            'padding:16px 20px',
            'font:12px/1.5 Microsoft YaHei,Arial,sans-serif',
            'min-width:260px',
            'max-width:350px',
            'box-shadow:0 6px 22px rgba(0,0,0,0.5)',
            'user-select:none'
        ].join(';');

        panel.innerHTML = [
            // 标题
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">',
            '<b style="font-size:14px;">🔄 自动刷牌助手</b>',
            '<div>',
            '<button id="tavern-auto-run-close" style="cursor:pointer;border:0;border-radius:4px;padding:0 8px;background:transparent;color:#a5b1c2;font-size:18px;">×</button>',
            '</div>',
            '</div>',

            // 控制区
            '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">',
            '<label style="color:#a5b1c2;font-size:12px;">循环:</label>',
            '<input id="tavern-auto-run-count" type="number" value="0" min="0" max="999" style="width:50px;background:#2d3436;color:#fff;border:1px solid #596275;border-radius:4px;padding:2px 4px;font-size:12px;text-align:center;">',
            '<span style="color:#636e72;font-size:11px;">(0=无限)</span>',
            '<label style="color:#a5b1c2;font-size:12px;margin-left:4px;">间隔:</label>',
            '<input id="tavern-auto-run-interval" type="number" value="300" min="100" max="2000" style="width:50px;background:#2d3436;color:#fff;border:1px solid #596275;border-radius:4px;padding:2px 4px;font-size:12px;text-align:center;">',
            '<span style="color:#636e72;font-size:11px;">ms</span>',
            '</div>',

            // 功能开关
            '<div style="display:flex;gap:12px;margin-bottom:8px;flex-wrap:wrap;">',
            '<label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#a5b1c2;">',
            '<input type="checkbox" id="tavern-auto-buy" checked> 自动购买',
            '</label>',
            '<label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#a5b1c2;">',
            '<input type="checkbox" id="tavern-auto-sell" checked> 自动遣散',
            '</label>',
            '<label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#a5b1c2;">',
            '<input type="checkbox" id="tavern-buy-all" checked> 购买全部',
            '</label>',
            '</div>',

            // 目标ID输入
            '<div style="margin-bottom:8px;">',
            '<details style="cursor:pointer;">',
            '<summary style="color:#a5b1c2;font-size:12px;">🎯 目标ID (逗号分隔，留空=全部)</summary>',
            '<input id="tavern-target-ids" type="text" value="" style="width:100%;margin-top:4px;background:#2d3436;color:#fff;border:1px solid #596275;border-radius:4px;padding:2px 6px;font-size:12px;" placeholder="例如: 201101,201102,302011">',
            '</details>',
            '</div>',

            // 保留ID输入
            '<div style="margin-bottom:8px;">',
            '<details style="cursor:pointer;">',
            '<summary style="color:#a5b1c2;font-size:12px;">🛡️ 保留ID (不遣散)</summary>',
            '<input id="tavern-keep-ids" type="text" value="" style="width:100%;margin-top:4px;background:#2d3436;color:#fff;border:1px solid #596275;border-radius:4px;padding:2px 6px;font-size:12px;" placeholder="例如: 201101,201102">',
            '</details>',
            '</div>',

            // 最大手牌数
            '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">',
            '<label style="color:#a5b1c2;font-size:12px;">最大手牌:</label>',
            '<input id="tavern-max-hand" type="number" value="10" min="1" max="20" style="width:50px;background:#2d3436;color:#fff;border:1px solid #596275;border-radius:4px;padding:2px 4px;font-size:12px;text-align:center;">',
            '</div>',

            // 按钮
            '<div style="display:flex;gap:6px;margin-bottom:10px;">',
            '<button id="tavern-auto-run-btn" style="flex:1;cursor:pointer;border:0;border-radius:4px;padding:6px 0;background:#4b7bec;color:#fff;font-weight:bold;font-size:13px;">▶ 启动</button>',
            '<button id="tavern-auto-run-once-btn" style="flex:0;cursor:pointer;border:0;border-radius:4px;padding:6px 12px;background:#636e72;color:#fff;font-size:12px;">单次</button>',
            '</div>',

            // 状态
            '<div id="tavern-auto-run-status" style="color:#a5b1c2;font-size:12px;min-height:18px;">就绪</div>',

            // 统计
            '<div style="display:flex;gap:12px;margin-top:4px;font-size:11px;color:#636e72;">',
            '<span>循环: <b id="tavern-cycle-count">0</b></span>',
            '<span>购买: <b id="tavern-buy-count">0</b></span>',
            '<span>遣散: <b id="tavern-sell-count">0</b></span>',
            '</div>',

            // 进度条
            '<div id="tavern-auto-run-progress" style="margin-top:6px;height:3px;background:#2d3436;border-radius:2px;overflow:hidden;display:none;">',
            '<div id="tavern-auto-run-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#4b7bec,#00d2d3);border-radius:2px;transition:width 0.3s;"></div>',
            '</div>'
        ].join('');

        document.body.appendChild(panel);

        // 绑定事件
        bindUIEvents(panel);

        // 拖拽
        makeDraggable(panel);

        console.log('✅ 自动刷牌助手UI已加载');
    }

    function bindUIEvents(panel) {
        var btn = document.getElementById('tavern-auto-run-btn');
        var onceBtn = document.getElementById('tavern-auto-run-once-btn');
        var closeBtn = document.getElementById('tavern-auto-run-close');

        // 启动/停止
        btn.addEventListener('click', toggleAutoRun);

        // 单次执行
        onceBtn.addEventListener('click', function() {
            if (isRunning) return;
            console.log('🔄 执行单次循环...');
            var results = doCycle();
            console.log('  购买:', results.bought, '遣散:', results.sold);
            updateUIStatus('单次完成 | 购买:' + results.bought + ' 遣散:' + results.sold);
        });

        // 关闭
        closeBtn.addEventListener('click', function() {
            if (isRunning) stopAutoRun('关闭面板');
            panel.style.display = 'none';
        });

        // 快捷键: Ctrl+Shift+A
        document.addEventListener('keydown', function(e) {
            if (e.key === 'A' && e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                var p = document.getElementById('tavern-auto-run-panel');
                if (p) {
                    p.style.display = p.style.display === 'none' ? 'block' : 'none';
                }
            }
        });

        // 功能开关
        document.getElementById('tavern-auto-buy').addEventListener('change', function() {
            CONFIG.autoBuy = this.checked;
        });
        document.getElementById('tavern-auto-sell').addEventListener('change', function() {
            CONFIG.autoSellEnabled = this.checked;
        });
        document.getElementById('tavern-buy-all').addEventListener('change', function() {
            CONFIG.buyAll = this.checked;
            document.getElementById('tavern-target-ids').disabled = this.checked;
        });

        // 目标ID
        document.getElementById('tavern-target-ids').addEventListener('change', function() {
            CONFIG.buyTargets = this.value.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
        });

        // 保留ID
        document.getElementById('tavern-keep-ids').addEventListener('change', function() {
            CONFIG.keepChessIds = this.value.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
        });

        // 最大手牌
        document.getElementById('tavern-max-hand').addEventListener('change', function() {
            CONFIG.maxHandSize = parseInt(this.value) || 10;
        });

        // Enter键触发启动
        document.querySelectorAll('#tavern-auto-run-panel input[type="number"]').forEach(function(el) {
            el.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') toggleAutoRun();
            });
        });
    }

    function makeDraggable(panel) {
        var isDragging = false;
        var startX, startY, startLeft, startTop;

        panel.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SUMMARY') return;
            isDragging = true;
            var rect = panel.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            panel.style.left = rect.left + 'px';
            panel.style.top = rect.top + 'px';
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            panel.style.left = Math.max(0, e.clientX - startX) + 'px';
            panel.style.top = Math.max(0, e.clientY - startY) + 'px';
        });

        document.addEventListener('mouseup', function() {
            isDragging = false;
        });
    }

    // ============================================================
    // UI 更新
    // ============================================================
    function updateUIStatus(text) {
        var el = document.getElementById('tavern-auto-run-status');
        if (el) {
            el.textContent = text;
            // 根据状态改变颜色
            if (text.includes('✅') || text.includes('完成')) {
                el.style.color = '#00d2d3';
            } else if (text.includes('❌') || text.includes('错误') || text.includes('异常')) {
                el.style.color = '#ff6b6b';
            } else if (text.includes('⏹') || text.includes('停止')) {
                el.style.color = '#ffd93d';
            } else {
                el.style.color = '#a5b1c2';
            }
        }
    }

    function updateUIStats(cycles, bought, sold) {
        var cycleEl = document.getElementById('tavern-cycle-count');
        var buyEl = document.getElementById('tavern-buy-count');
        var sellEl = document.getElementById('tavern-sell-count');
        if (cycleEl) cycleEl.textContent = cycles;
        if (buyEl) buyEl.textContent = bought;
        if (sellEl) sellEl.textContent = sold;

        // 更新按钮状态
        var btn = document.getElementById('tavern-auto-run-btn');
        if (btn) {
            btn.textContent = isRunning ? '■ 停止' : '▶ 启动';
            btn.style.background = isRunning ? '#e17055' : '#4b7bec';
        }
    }

    function resetUIProgress() {
        var progress = document.getElementById('tavern-auto-run-progress');
        var bar = document.getElementById('tavern-auto-run-bar');
        if (progress) progress.style.display = 'none';
        if (bar) bar.style.width = '0%';
    }

    // ============================================================
    // 控制台接口
    // ============================================================
    window.__autoChess = {
        // 运行
        run: function(count, interval) {
            return startAutoRun(count || 0, interval || 300);
        },
        stop: function() {
            stopAutoRun('手动停止');
        },
        // 单次
        once: function() {
            return doCycle();
        },
        // 配置
        config: CONFIG,
        // 获取状态
        status: function() {
            return {
                isRunning: isRunning,
                cycleCount: cycleCount,
                totalBought: totalBought,
                totalSold: totalSold,
                phase: getPhase(),
                coin: getCoin(),
                handSize: getHandChess().length,
                shopSize: getShopGoods().length
            };
        },
        // 查找管理器
        find: function() {
            var m = getManager();
            if (m) {
                console.log('✅ 找到管理器');
                return m;
            }
            console.log('❌ 未找到管理器');
            return null;
        },
        // 显示/隐藏面板
        toggle: function() {
            var panel = document.getElementById('tavern-auto-run-panel');
            if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
        }
    };

    // ============================================================
    // 启动
    // ============================================================
    setTimeout(createUI, 1500);

    console.log('========================================');
    console.log('🔄 自动刷牌助手 v2.0.0');
    console.log('========================================');
    console.log('📌 功能:');
    console.log('  ✅ 自动刷新商店');
    console.log('  ✅ 自动购买卡牌 (可指定目标)');
    console.log('  ✅ 自动遣散手牌 (保留指定卡牌)');
    console.log('  ✅ 手牌数量控制');
    console.log('========================================');
    console.log('⌨️  快捷键: Ctrl+Shift+A 显示/隐藏');
    console.log('💻 控制台命令:');
    console.log('  __autoChess.run(次数, 间隔)  - 启动自动刷牌');
    console.log('  __autoChess.stop()           - 停止');
    console.log('  __autoChess.once()           - 执行单次循环');
    console.log('  __autoChess.status()         - 查看状态');
    console.log('  __autoChess.config           - 查看配置');
    console.log('========================================');

})();