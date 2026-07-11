// ==UserScript==
// @name         自走棋本局商店统计
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  统计酒馆自走棋本局商店卡牌出现、刷新与购买虎符消耗，支持面板查看和导出。
// @author       Codex
// @match        *://*.sanguosha.com/*
// @match        https://game.4399iw2.com/yxxsgs/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const LOG_PREFIX = '[自走棋统计]';
    const STORAGE_KEY = 'tavernChessGameStats';
    const PANEL_ID = 'tavern-chess-stats-panel';
    const HOOK_FLAG = '__tavernChessStatsHooked';
    const SCAN_INTERVAL_MS = 1500;

    let currentScene = null;
    let currentManager = null;
    let currentStats = null;
    let panelBody = null;
    let panelStatus = null;

    function findTavernChessScene(root, visited) {
        if (!root || typeof root !== 'object') return null;
        const seen = visited || new WeakSet();
        if (seen.has(root)) return null;
        seen.add(root);

        if (root.constructor && root.constructor.name === 'TavernChessGameScene') {
            return root;
        }

        const children = root._children || root.children || root.childList;
        if (Array.isArray(children)) {
            for (const child of children) {
                const result = findTavernChessScene(child, seen);
                if (result) return result;
            }
        }

        const childCount = Number(root.numChildren || 0);
        if (childCount > 0 && typeof root.getChildAt === 'function') {
            for (let i = 0; i < childCount; i++) {
                const result = findTavernChessScene(root.getChildAt(i), seen);
                if (result) return result;
            }
        }

        return null;
    }

    function waitAndAttach() {
        createPanel();
        setInterval(function () {
            try {
                if (!window.Laya || !Laya.stage) {
                    updateStatus('等待 Laya.stage ...');
                    return;
                }

                const scene = findTavernChessScene(Laya.stage);
                const manager = scene && scene.manager;
                if (!scene || !manager) {
                    updateStatus('未找到自走棋场景');
                    return;
                }

                if (manager !== currentManager) {
                    currentScene = scene;
                    currentManager = manager;
                    currentStats = createGameStats(manager);
                    attachManagerHooks(manager, currentStats);
                    recordShopGoods(manager.ShopGoods || manager.shopGoods, { source: 'attach', auto: true });
                    saveStats();
                    renderPanel();
                    console.log(LOG_PREFIX, '已连接 manager', currentStats.gameId);
                } else {
                    renderPanel();
                }
            } catch (error) {
                console.error(LOG_PREFIX, error);
                updateStatus('扫描异常：' + error.message);
            }
        }, SCAN_INTERVAL_MS);
    }

    function createGameStats(manager) {
        const now = new Date();
        const self = manager.selfInfo || manager.SelfInfo || {};
        const user = window.UserData && UserData.Self ? UserData.Self : {};
        const userId = self.userID || self.UserID || user.UserID || user.userID || window.userID || '';
        const nickName = self.nickName || self.NickName || user.NickName || user.nickName || '';
        const tableId = manager.TableID || manager.tableID || manager.tableId || '';

        return {
            version: 1,
            gameId: [tableId || 'unknown', userId || 'user', now.getTime()].join('_'),
            tableId,
            userId,
            nickName,
            startedAt: now.toISOString(),
            updatedAt: now.toISOString(),
            rounds: {},
            shopAppearances: {},
            costs: {
                refresh: { count: 0, hufu: 0 },
                buy: { count: 0, hufu: 0 }
            },
            events: []
        };
    }

    function attachManagerHooks(manager, stats) {
        if (manager[HOOK_FLAG]) return;
        Object.defineProperty(manager, HOOK_FLAG, { value: true, configurable: true });

        wrapMethod(manager, 'updateShopGoods', function (original, args) {
            const result = original.apply(this, args);
            recordShopGoods(args[0], { source: 'updateShopGoods', animate: args[1] });
            return result;
        });

        wrapMethod(manager, 'ReqShopRefreshChess', function (original, args) {
            const cost = safeCall(this, 'ShopRefreshCost');
            recordCost('refresh', { cost: Number(cost) || 0, isAuto: !!args[0], phase: this.phase });
            return original.apply(this, args);
        });

        wrapMethod(manager, 'onRespShopRefreshChess', function (original, args) {
            const result = original.apply(this, args);
            const proto = args[0] && args[0].Protocol && args[0].Protocol.ProtoData;
            if (proto && proto.shopGoods) recordShopGoods(proto.shopGoods, { source: 'onRespShopRefreshChess' });
            return result;
        });

        wrapMethod(manager, 'ReqShopBuyChess', function (original, args) {
            const goodsID = args[0];
            const cost = typeof this.GetShopBuyCost === 'function' ? this.GetShopBuyCost(goodsID) : 0;
            const goods = typeof this.getShopGoodsByGoodsID === 'function' ? this.getShopGoodsByGoodsID(goodsID) : null;
            recordCost('buy', { cost: Number(cost) || 0, goodsID, goods: normalizeGoods(goods), phase: this.phase });
            return original.apply(this, args);
        });

        wrapMethod(manager, 'onRespShopBuyChess', function (original, args) {
            return original.apply(this, args);
        });

        updateStatus('统计中：' + (stats.tableId || '未知房间'));
    }

    function wrapMethod(target, name, wrapper) {
        if (typeof target[name] !== 'function' || target[name].__tavernChessStatsWrapped) return;
        const original = target[name];
        const wrapped = function () {
            return wrapper.call(this, original, Array.prototype.slice.call(arguments));
        };
        wrapped.__tavernChessStatsWrapped = true;
        wrapped.__original = original;
        Object.defineProperty(target, name, { value: wrapped, configurable: true, writable: true });
    }

    function safeCall(obj, prop) {
        try { return obj[prop]; } catch (error) { return 0; }
    }

    function recordShopGoods(shopGoods, context) {
        if (!currentStats || !Array.isArray(shopGoods)) return;
        const round = String((currentManager && (currentManager.CurRound || currentManager.curRound)) || 'unknown');
        if (!currentStats.rounds[round]) currentStats.rounds[round] = { refreshes: 0, goods: [] };
        currentStats.rounds[round].refreshes += 1;

        const goodsList = shopGoods.map(normalizeGoods).filter(Boolean);
        currentStats.rounds[round].goods.push({ at: new Date().toISOString(), context: context || {}, goods: goodsList });

        goodsList.forEach(function (goods) {
            const key = goods.chessID || goods.cardID || goods.goodsID || goods.name || 'unknown';
            if (!currentStats.shopAppearances[key]) {
                currentStats.shopAppearances[key] = { count: 0, sample: goods };
            }
            currentStats.shopAppearances[key].count += 1;
        });

        currentStats.events.push({ type: 'shop', at: new Date().toISOString(), context: context || {}, count: goodsList.length });
        trimEvents();
        saveStats();
        renderPanel();
    }

    function normalizeGoods(goods) {
        if (!goods || typeof goods !== 'object') return null;
        const chessID = goods.chessID || goods.cardID || goods.CardID || goods.itemID || goods.ItemID || 0;
        let name = goods.name || goods.Name || goods.cardName || goods.CardName || '';
        try {
            if (!name && chessID && window.TavernChessConfiger) {
                const card = TavernChessConfiger.GetInstance().GetCardByCardID(chessID);
                name = card && (card.CardName || card.Name || card.name) || '';
            }
        } catch (error) {}
        return {
            goodsID: goods.goodsID || goods.GoodsID || goods.id || 0,
            chessID,
            name: name || String(chessID || goods.goodsID || 'unknown'),
            rank: goods.rank || goods.Rank || goods.ChessRank || 0,
            rawPosition: goods.position || goods.Position || 0
        };
    }

    function recordCost(type, payload) {
        if (!currentStats || !currentStats.costs[type]) return;
        const cost = Number(payload && payload.cost) || 0;
        currentStats.costs[type].count += 1;
        currentStats.costs[type].hufu += cost;
        currentStats.events.push({ type, at: new Date().toISOString(), payload: payload || {} });
        trimEvents();
        saveStats();
        renderPanel();
    }

    function trimEvents() {
        if (currentStats.events.length > 300) currentStats.events.splice(0, currentStats.events.length - 300);
        currentStats.updatedAt = new Date().toISOString();
    }

    function saveStats() {
        if (!currentStats) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentStats));
        localStorage.setItem(STORAGE_KEY + ':' + currentStats.gameId, JSON.stringify(currentStats));
    }

    function createPanel() {
        if (document.getElementById(PANEL_ID)) return;
        const panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;width:280px;max-height:420px;overflow:auto;background:rgba(20,24,35,.92);color:#f6f7fb;border:1px solid #596275;border-radius:10px;padding:10px;font:12px/1.45 Microsoft YaHei,Arial,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.35);';
        panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><b>自走棋统计</b><button id="tavern-chess-stats-export" style="cursor:pointer;border:0;border-radius:6px;padding:4px 8px;background:#4b7bec;color:#fff;">导出</button></div><div id="tavern-chess-stats-status" style="color:#a5b1c2;margin-bottom:6px;">初始化中...</div><div id="tavern-chess-stats-body"></div>';
        document.body.appendChild(panel);
        panelBody = document.getElementById('tavern-chess-stats-body');
        panelStatus = document.getElementById('tavern-chess-stats-status');
        document.getElementById('tavern-chess-stats-export').addEventListener('click', exportStats);
    }

    function updateStatus(text) {
        if (panelStatus) panelStatus.textContent = text;
    }

    function renderPanel() {
        if (!panelBody) return;
        if (!currentStats) {
            panelBody.innerHTML = '<div>尚未进入自走棋对局。</div>';
            return;
        }
        const topCards = Object.keys(currentStats.shopAppearances).map(function (key) {
            const item = currentStats.shopAppearances[key];
            return { key, count: item.count, name: item.sample.name };
        }).sort(function (a, b) { return b.count - a.count; }).slice(0, 8);
        panelBody.innerHTML = [
            '<div>房间：' + escapeHtml(currentStats.tableId || '未知') + '</div>',
            '<div>刷新：' + currentStats.costs.refresh.count + ' 次 / ' + currentStats.costs.refresh.hufu + ' 虎符</div>',
            '<div>购买：' + currentStats.costs.buy.count + ' 次 / ' + currentStats.costs.buy.hufu + ' 虎符</div>',
            '<div style="margin-top:6px;color:#d1d8e0;">出现 Top</div>',
            topCards.length ? topCards.map(function (item) {
                return '<div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);"><span>' + escapeHtml(item.name || item.key) + '</span><b>' + item.count + '</b></div>';
            }).join('') : '<div>暂无商店数据</div>'
        ].join('');
    }

    function exportStats() {
        if (!currentStats) return;
        const text = JSON.stringify(currentStats, null, 2);
        navigator.clipboard && navigator.clipboard.writeText(text).then(function () {
            updateStatus('已复制 JSON 到剪贴板');
        }).catch(function () {
            downloadStats(text);
        });
        if (!navigator.clipboard) downloadStats(text);
    }

    function downloadStats(text) {
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'tavern-chess-stats-' + (currentStats.gameId || Date.now()) + '.json';
        link.click();
        URL.revokeObjectURL(url);
        updateStatus('已下载 JSON');
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"]/g, function (char) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char];
        });
    }

    waitAndAttach();
    console.log(LOG_PREFIX, '脚本已启动');
})();
