// ==UserScript==
// @name         自走棋自动寻牌助手
// @namespace    http://tampermonkey.net/
// @version      3.1.0
// @description  自动刷新商店寻找指定卡牌，支持自动购买和自动售卖
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
    // 获取游戏管理器
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
    // 刷新商店
    // ============================================================
    function refreshShop() {
        var m = getManager();
        if (!m) return false;
        m.ReqShopRefreshChess(false);
        return true;
    }

    // ============================================================
    // 购买卡牌
    // ============================================================
    function buyChess(goodsID) {
        var m = getManager();
        if (!m) return false;
        m.ReqShopBuyChess(goodsID);
        return true;
    }

    // ============================================================
    // 遣散卡牌
    // ============================================================
    function sellChess(goodsID) {
        var m = getManager();
        if (!m) return false;
        m.ReqShopRecycleChess(goodsID);
        return true;
    }

    // ============================================================
    // 获取商店列表
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
    // 查找商店中是否存在目标卡牌（返回所有匹配的卡牌）
    // ============================================================
    function findTargetsInShop(targetId) {
        var shop = getShopGoods();
        targetId = String(targetId);
        var results = [];
        for (var i = 0; i < shop.length; i++) {
            var card = shop[i];
            if (!card) continue;
            var chessId = String(card.chessID || card.cardID || '');
            var spellId = String(card.spellID || '');
            var goodsId = String(card.goodsID || '');
            if (chessId === targetId || spellId === targetId || goodsId === targetId) {
                results.push({
                    index: i,
                    card: card,
                    goodsID: card.goodsID || card.GoodsID
                });
            }
        }
        return results;
    }

    // ============================================================
    // 核心功能1: 自动寻牌（刷新N次，记录找到并购买的次数）
    // ============================================================
    function autoFindAndBuy(targetId, maxRefreshes, onProgress, onComplete) {
        targetId = String(targetId);
        maxRefreshes = maxRefreshes || 50;
        var refreshCount = 0;
        var foundCount = 0;
        var totalBought = 0;
        var isStopped = false;
        var timer = null;

        function doNext() {
            if (isStopped) {
                if (timer) clearTimeout(timer);
                if (onComplete) {
                    onComplete({
                        success: true,
                        reason: '已停止',
                        refreshCount: refreshCount,
                        foundCount: foundCount,
                        totalBought: totalBought,
                        targetId: targetId
                    });
                }
                return;
            }

            if (refreshCount >= maxRefreshes) {
                if (onComplete) {
                    onComplete({
                        success: true,
                        reason: '达到目标刷新次数',
                        refreshCount: refreshCount,
                        foundCount: foundCount,
                        totalBought: totalBought,
                        targetId: targetId
                    });
                }
                return;
            }

            refreshCount++;

            // 检查商店中是否有目标
            var targets = findTargetsInShop(targetId);
            var foundInThisRound = 0;

            // 购买所有匹配的卡牌
            for (var i = 0; i < targets.length; i++) {
                var result = buyChess(targets[i].goodsID);
                if (result) {
                    foundInThisRound++;
                    totalBought++;
                }
            }

            if (foundInThisRound > 0) {
                foundCount += foundInThisRound;
                console.log('🎯 第' + refreshCount + '次刷新找到 ' + foundInThisRound + ' 张目标卡牌 (累计:' + foundCount + ')');
            }

            // 刷新商店（继续寻找）
            refreshShop();

            if (onProgress) {
                onProgress({
                    current: refreshCount,
                    total: maxRefreshes,
                    foundInRound: foundInThisRound,
                    foundCount: foundCount,
                    totalBought: totalBought
                });
            }

            // 继续下一轮
            timer = setTimeout(doNext, 200);
        }

        // 开始执行
        doNext();

        // 返回停止函数
        return function() {
            isStopped = true;
            if (timer) clearTimeout(timer);
        };
    }

    // ============================================================
    // 核心功能2: 自动寻牌并售卖（刷新N次，找到目标卡牌后购买并立即售卖）
    // ============================================================
    function autoFindBuyAndSell(targetId, maxRefreshes, onProgress, onComplete) {
        targetId = String(targetId);
        maxRefreshes = maxRefreshes || 50;
        var refreshCount = 0;
        var foundCount = 0;
        var totalBought = 0;
        var totalSold = 0;
        var isStopped = false;
        var timer = null;

        function doNext() {
            if (isStopped) {
                if (timer) clearTimeout(timer);
                if (onComplete) {
                    onComplete({
                        success: true,
                        reason: '已停止',
                        refreshCount: refreshCount,
                        foundCount: foundCount,
                        totalBought: totalBought,
                        totalSold: totalSold,
                        targetId: targetId
                    });
                }
                return;
            }

            if (refreshCount >= maxRefreshes) {
                if (onComplete) {
                    onComplete({
                        success: true,
                        reason: '达到目标刷新次数',
                        refreshCount: refreshCount,
                        foundCount: foundCount,
                        totalBought: totalBought,
                        totalSold: totalSold,
                        targetId: targetId
                    });
                }
                return;
            }

            refreshCount++;

            // 检查商店中是否有目标
            var targets = findTargetsInShop(targetId);
            var foundInThisRound = 0;

            // 购买并售卖所有匹配的卡牌
            for (var i = 0; i < targets.length; i++) {
                var goodsID = targets[i].goodsID;
                var buyResult = buyChess(goodsID);
                if (buyResult) {
                    foundInThisRound++;
                    totalBought++;

                    // 购买后延迟一下再售卖
                    setTimeout(function(gid) {
                        var hand = getHandChess();
                        // 从手牌中找刚购买的卡牌并售卖
                        for (var j = hand.length - 1; j >= 0; j--) {
                            var card = hand[j];
                            if (!card) continue;
                            var cardGoodsID = card.goodsID || card.GoodsID;
                            if (cardGoodsID === gid) {
                                sellChess(gid);
                                totalSold++;
                                break;
                            }
                        }
                    }, 100, goodsID);
                }
            }

            if (foundInThisRound > 0) {
                foundCount += foundInThisRound;
                console.log('🎯 第' + refreshCount + '次刷新找到 ' + foundInThisRound + ' 张目标卡牌 (累计:' + foundCount + ')');
            }

            // 刷新商店（继续寻找）
            refreshShop();

            if (onProgress) {
                onProgress({
                    current: refreshCount,
                    total: maxRefreshes,
                    foundInRound: foundInThisRound,
                    foundCount: foundCount,
                    totalBought: totalBought,
                    totalSold: totalSold
                });
            }

            // 继续下一轮
            timer = setTimeout(doNext, 400);
        }

        // 开始执行
        doNext();

        // 返回停止函数
        return function() {
            isStopped = true;
            if (timer) clearTimeout(timer);
        };
    }

    // ============================================================
    // 创建UI面板
    // ============================================================
    function createUI() {
        if (document.getElementById('tavern-auto-find-panel')) return;

        var panel = document.createElement('div');
        panel.id = 'tavern-auto-find-panel';
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
            'min-width:280px',
            'max-width:400px',
            'box-shadow:0 6px 22px rgba(0,0,0,0.5)',
            'user-select:none'
        ].join(';');

        panel.innerHTML = [
            // 标题
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">',
            '<b style="font-size:14px;">🔍 自动寻牌助手</b>',
            '<button id="tavern-auto-find-close" style="cursor:pointer;border:0;border-radius:4px;padding:0 8px;background:transparent;color:#a5b1c2;font-size:18px;">×</button>',
            '</div>',

            // 输入区
            '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">',
            '<label style="color:#a5b1c2;">目标ID:</label>',
            '<input id="tavern-target-id" type="text" value="" style="width:100px;background:#2d3436;color:#fff;border:1px solid #596275;border-radius:4px;padding:4px 6px;font-size:12px;" placeholder="如: 201101">',
            '</div>',
            '<div style="display:flex;gap:6px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">',
            '<label style="color:#a5b1c2;">刷新次数:</label>',
            '<input id="tavern-max-refreshes" type="number" value="50" min="1" max="999" style="width:70px;background:#2d3436;color:#fff;border:1px solid #596275;border-radius:4px;padding:4px 6px;text-align:center;">',
            '</div>',

            // 模式选择
            '<div style="display:flex;gap:16px;margin-bottom:12px;">',
            '<label style="display:flex;align-items:center;gap:4px;color:#a5b1c2;cursor:pointer;">',
            '<input type="radio" name="mode" value="buy" checked> 仅购买',
            '</label>',
            '<label style="display:flex;align-items:center;gap:4px;color:#a5b1c2;cursor:pointer;">',
            '<input type="radio" name="mode" value="sell"> 购买并售卖',
            '</label>',
            '</div>',

            // 按钮
            '<div style="display:flex;gap:6px;margin-bottom:10px;">',
            '<button id="tavern-auto-find-btn" style="flex:1;cursor:pointer;border:0;border-radius:4px;padding:6px 0;background:#4b7bec;color:#fff;font-weight:bold;font-size:13px;">▶ 开始寻牌</button>',
            '</div>',

            // 状态
            '<div id="tavern-auto-find-status" style="color:#a5b1c2;font-size:12px;min-height:18px;">就绪</div>',

            // 统计
            '<div style="display:flex;gap:12px;margin-top:4px;font-size:11px;color:#636e72;flex-wrap:wrap;">',
            '<span>已刷新: <b id="tavern-find-refresh">0</b> 次</span>',
            '<span>已找到: <b id="tavern-find-count">0</b> 张</span>',
            '<span>已购买: <b id="tavern-buy-count">0</b> 张</span>',
            '<span>已售卖: <b id="tavern-sell-count">0</b> 张</span>',
            '</div>',

            // 进度条
            '<div id="tavern-auto-find-progress" style="margin-top:6px;height:3px;background:#2d3436;border-radius:2px;overflow:hidden;display:none;">',
            '<div id="tavern-auto-find-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#4b7bec,#00d2d3);border-radius:2px;transition:width 0.3s;"></div>',
            '</div>'
        ].join('');

        document.body.appendChild(panel);

        bindUIEvents();
        makeDraggable(panel);

        console.log('✅ 自动寻牌助手UI已加载');
    }

    function bindUIEvents() {
        var btn = document.getElementById('tavern-auto-find-btn');
        var closeBtn = document.getElementById('tavern-auto-find-close');
        var targetInput = document.getElementById('tavern-target-id');
        var countInput = document.getElementById('tavern-max-refreshes');
        var statusEl = document.getElementById('tavern-auto-find-status');
        var refreshEl = document.getElementById('tavern-find-refresh');
        var foundEl = document.getElementById('tavern-find-count');
        var buyEl = document.getElementById('tavern-buy-count');
        var sellEl = document.getElementById('tavern-sell-count');
        var progressEl = document.getElementById('tavern-auto-find-progress');
        var barEl = document.getElementById('tavern-auto-find-bar');

        var stopFn = null;
        var isRunning = false;

        function updateStatus(text, isError) {
            statusEl.textContent = text;
            statusEl.style.color = isError ? '#ff6b6b' : '#a5b1c2';
        }

        function updateStats(refresh, found, bought, sold) {
            refreshEl.textContent = refresh || 0;
            foundEl.textContent = found || 0;
            buyEl.textContent = bought || 0;
            if (sold !== undefined) sellEl.textContent = sold || 0;
        }

        function updateProgress(current, total) {
            if (total > 0) {
                var pct = Math.min(100, (current / total) * 100);
                barEl.style.width = pct + '%';
                progressEl.style.display = 'block';
            }
        }

        function resetProgress() {
            progressEl.style.display = 'none';
            barEl.style.width = '0%';
        }

        function onProgress(data) {
            updateStats(data.current, data.foundCount, data.totalBought, data.totalSold);
            updateProgress(data.current, data.total);
            var msg = '搜索中... ' + data.current + '/' + data.total + ' 找到:' + data.foundCount + ' 张';
            if (data.foundInRound > 0) {
                msg += ' (+' + data.foundInRound + ')';
            }
            updateStatus(msg);
        }

        function onComplete(data) {
            isRunning = false;
            btn.textContent = '▶ 开始寻牌';
            btn.style.background = '#4b7bec';
            stopFn = null;

            if (data.success) {
                updateStats(data.refreshCount, data.foundCount, data.totalBought, data.totalSold);
                updateStatus('✅ ' + data.reason + ' (找到' + data.foundCount + '张)');

                if (data.foundCount > 0) {
                    console.log('🎯 寻牌完成! 刷新:', data.refreshCount, '次, 找到:', data.foundCount, '张');
                } else {
                    console.log('❌ 未找到目标卡牌 (刷新:', data.refreshCount, '次)');
                }
            } else {
                updateStatus('❌ ' + data.reason, true);
            }

            setTimeout(function() {
                if (!isRunning) {
                    resetProgress();
                    updateStatus('就绪');
                }
            }, 3000);
        }

        function startFind() {
            if (isRunning) {
                // 停止
                if (stopFn) {
                    stopFn();
                    stopFn = null;
                }
                isRunning = false;
                btn.textContent = '▶ 开始寻牌';
                btn.style.background = '#4b7bec';
                updateStatus('已停止', false);
                return;
            }

            var targetId = targetInput.value.trim();
            if (!targetId) {
                updateStatus('请输入目标卡牌ID', true);
                return;
            }

            var maxRefreshes = parseInt(countInput.value) || 50;
            if (maxRefreshes < 1) {
                updateStatus('请输入有效的刷新次数', true);
                return;
            }

            // 检查管理器
            var m = getManager();
            if (!m) {
                updateStatus('❌ 未找到游戏管理器', true);
                return;
            }

            isRunning = true;
            btn.textContent = '■ 停止';
            btn.style.background = '#e17055';
            resetProgress();
            updateStats(0, 0, 0, 0);

            // 获取模式
            var mode = document.querySelector('input[name="mode"]:checked');
            var isSellMode = mode && mode.value === 'sell';

            if (isSellMode) {
                updateStatus('🔄 寻牌并售卖模式，目标ID:' + targetId);
                stopFn = autoFindBuyAndSell(targetId, maxRefreshes, onProgress, onComplete);
            } else {
                updateStatus('🔄 寻牌购买模式，目标ID:' + targetId);
                stopFn = autoFindAndBuy(targetId, maxRefreshes, onProgress, onComplete);
            }
        }

        btn.addEventListener('click', startFind);

        targetInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') startFind();
        });
        countInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') startFind();
        });

        closeBtn.addEventListener('click', function() {
            if (isRunning && stopFn) {
                stopFn();
                stopFn = null;
                isRunning = false;
            }
            panel.style.display = 'none';
        });

        // 快捷键 Ctrl+Shift+F
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F' && e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                var p = document.getElementById('tavern-auto-find-panel');
                if (p) {
                    p.style.display = p.style.display === 'none' ? 'block' : 'none';
                }
            }
        });
    }

    function makeDraggable(panel) {
        var isDragging = false;
        var startX, startY, startLeft, startTop;

        panel.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'LABEL') return;
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
    // 控制台接口
    // ============================================================
    window.__autoFind = {
        // 寻牌并购买（刷新N次，统计找到的数量）
        find: function(targetId, maxRefreshes) {
            return new Promise(function(resolve) {
                var stop = autoFindAndBuy(targetId, maxRefreshes || 50,
                    function(progress) {
                        console.log('🔄 ' + progress.current + '/' + progress.total + ' 已找到:' + progress.foundCount + '张');
                    },
                    function(result) {
                        console.log('✅ 完成! 刷新:', result.refreshCount, '次, 找到:', result.foundCount, '张');
                        resolve(result);
                    }
                );
                window.__autoFind._stop = stop;
            });
        },
        // 寻牌并售卖（刷新N次，统计找到的数量）
        findAndSell: function(targetId, maxRefreshes) {
            return new Promise(function(resolve) {
                var stop = autoFindBuyAndSell(targetId, maxRefreshes || 50,
                    function(progress) {
                        console.log('🔄 ' + progress.current + '/' + progress.total + ' 已找到:' + progress.foundCount + '张');
                    },
                    function(result) {
                        console.log('✅ 完成! 刷新:', result.refreshCount, '次, 找到:', result.foundCount, '张');
                        resolve(result);
                    }
                );
                window.__autoFind._stop = stop;
            });
        },
        stop: function() {
            if (window.__autoFind._stop) {
                window.__autoFind._stop();
                window.__autoFind._stop = null;
                console.log('⏹ 已停止');
            }
        },
        findManager: function() {
            var m = getManager();
            if (m) {
                console.log('✅ 找到管理器');
                return m;
            }
            console.log('❌ 未找到管理器');
            return null;
        },
        toggle: function() {
            var panel = document.getElementById('tavern-auto-find-panel');
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
    console.log('🔍 自动寻牌助手 v3.1.0');
    console.log('========================================');
    console.log('📌 功能:');
    console.log('  1. 自动寻牌并购买: 刷新N次，找到所有目标卡牌并购买');
    console.log('  2. 自动寻牌并售卖: 刷新N次，找到目标卡牌后购买并立即售卖');
    console.log('  💡 找到目标后继续刷新，直到达到目标次数');
    console.log('========================================');
    console.log('⌨️  快捷键: Ctrl+Shift+F 显示/隐藏面板');
    console.log('💻 控制台命令:');
    console.log('  __autoFind.find("目标ID", 刷新次数)      - 寻牌购买');
    console.log('  __autoFind.findAndSell("目标ID", 刷新次数) - 寻牌售卖');
    console.log('  __autoFind.stop()                        - 停止');
    console.log('========================================');
    console.log('示例:');
    console.log('  __autoFind.find("201101", 30)   // 刷新30次，购买所有找到的201101');
    console.log('========================================');

})();