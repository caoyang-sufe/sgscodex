// ==UserScript==
// @name         自走棋本局商店统计
// @namespace    http://tampermonkey.net/
// @version      0.2.0
// @description  统计酒馆自走棋本局商店卡牌出现、刷新与购买虎符消耗，支持分回合、锦囊统计、拖拽缩放面板和结束下载。
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
    const SELF_INFO_HOOK_FLAG = '__tavernChessStatsSelfInfoHooked';
    const SCAN_INTERVAL_MS = 1500;
    const PANEL_STATE_KEY = STORAGE_KEY + ':panelState';

    let currentScene = null;
    let currentManager = null;
    let currentStats = null;
    let panelBody = null;
    let panelStatus = null;
    let lastShopSignature = '';
    let pendingRefreshes = [];
    let pendingBuys = [];
    let downloadedGameIds = new Set();
    let recordedSpellInstanceKeys = new Set();

    function findTavernChessScene(root, visited) {
        if (!root || typeof root !== 'object') return null;
        const seen = visited || new WeakSet();
        if (seen.has(root)) return null;
        seen.add(root);

        if (root.constructor && root.constructor.name === 'TavernChessGameScene') return root;

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
                    updateStatus(currentStats ? '未找到自走棋场景，保留上一局数据' : '未找到自走棋场景');
                    return;
                }

                if (manager !== currentManager) {
                    currentScene = scene;
                    currentManager = manager;
                    currentStats = createGameStats(manager);
                    lastShopSignature = '';
                    pendingRefreshes = [];
                    pendingBuys = [];
                    recordedSpellInstanceKeys = new Set();
                    attachManagerHooks(manager);
                    attachSelfInfoHooks(manager);
                    recordShopGoods(manager.ShopGoods || manager.shopGoods, { source: 'attach', auto: true, countAsRefresh: false });
                    saveStats();
                    renderPanel();
                    console.log(LOG_PREFIX, '已连接 manager', currentStats.gameId);
                } else {
                    attachSelfInfoHooks(manager);
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
        const nickName = self.nickName || self.nickname || self.NickName || user.NickName || user.nickName || '';
        const tableId = manager.TableID || manager.tableID || manager.tableId || '';

        return {
            version: 2,
            gameId: [tableId || 'unknown', userId || 'user', now.getTime()].join('_'),
            tableId,
            userId,
            nickName,
            startedAt: now.toISOString(),
            updatedAt: now.toISOString(),
            endedAt: '',
            totals: createRoundStats('整局'),
            rounds: {},
            shopAppearances: {},
            spells: {},
            events: []
        };
    }

    function createRoundStats(label) {
        return {
            label,
            refresh: { count: 0, hufu: 0, freeCount: 0, autoCount: 0, details: [] },
            buy: { count: 0, hufu: 0, details: [] },
            shop: { snapshots: 0, appearances: {}, details: [] }
        };
    }

    function getRoundKey() {
        if (!currentManager) return 'unknown';
        const round = currentManager.CurRound || currentManager.curRound || currentManager.round || currentManager.Turn || currentManager.turn;
        return round || round === 0 ? String(round) : 'unknown';
    }

    function getRoundStats(roundKey) {
        const key = String(roundKey || getRoundKey());
        if (!currentStats.rounds[key]) currentStats.rounds[key] = createRoundStats('第 ' + key + ' 回合');
        return currentStats.rounds[key];
    }

    function attachManagerHooks(manager) {
        if (manager[HOOK_FLAG]) return;
        Object.defineProperty(manager, HOOK_FLAG, { value: true, configurable: true });

        wrapMethod(manager, 'updateShopGoods', function (original, args) {
            const result = original.apply(this, args);
            recordShopGoods(args[0], { source: 'updateShopGoods', animate: args[1], countAsRefresh: true });
            return result;
        });

        wrapMethod(manager, 'ReqShopRefreshChess', function (original, args) {
            const isAuto = !!args[0];
            const cost = Number(safeRead(this, 'ShopRefreshCost')) || 0;
            pendingRefreshes.push(makeCostEvent('refresh', { cost, isAuto, beforeCoin: safeRead(this, 'CoinNum') }));
            return original.apply(this, args);
        });

        wrapMethod(manager, 'onRespShopRefreshChess', function (original, args) {
            const response = args[0];
            const protocol = response && response.Protocol;
            const pending = pendingRefreshes.shift();
            const result = original.apply(this, args);
            if (protocol && !protocol.errCode) {
                confirmRefreshCost(pending, protocol.ProtoData || {}, this);
                if (protocol.ProtoData && protocol.ProtoData.shopGoods) {
                    recordShopGoods(protocol.ProtoData.shopGoods, { source: 'onRespShopRefreshChess', countAsRefresh: false });
                }
            }
            return result;
        });

        wrapMethod(manager, 'ReqShopBuyChess', function (original, args) {
            const goodsID = args[0];
            const cost = goodsID && typeof this.GetShopBuyCost === 'function' ? Number(this.GetShopBuyCost(goodsID)) || 0 : 0;
            const goods = goodsID && typeof this.getShopGoodsByGoodsID === 'function' ? this.getShopGoodsByGoodsID(goodsID) : null;
            pendingBuys.push(makeCostEvent('buy', { cost, goodsID, goods: normalizeGoods(goods), beforeCoin: safeRead(this, 'CoinNum') }));
            return original.apply(this, args);
        });

        wrapMethod(manager, 'onRespShopBuyChess', function (original, args) {
            const response = args[0];
            const protocol = response && response.Protocol;
            const pending = pendingBuys.shift();
            const result = original.apply(this, args);
            if (protocol && !protocol.errCode) {
                confirmBuyCost(pending, protocol.ProtoData || {}, this);
                recordSpell(protocol.ProtoData && protocol.ProtoData.buyChess, { source: 'onRespShopBuyChess' });
            }
            return result;
        });

        wrapMethod(manager, 'CRespChessSelectSpellID', function (original, args) {
            const result = original.apply(this, args);
            const proto = args[0] && args[0].Protocol && args[0].Protocol.ProtoData;
            recordSpell(proto && proto.spell, { source: 'CRespChessSelectSpellID' });
            return result;
        });

        wrapMethod(manager, 'onRespChessSkillSelectSpellOrChess', function (original, args) {
            const result = original.apply(this, args);
            const proto = args[0] && args[0].Protocol && args[0].Protocol.ProtoData;
            recordSpell(proto && proto.spell, { source: 'onRespChessSkillSelectSpellOrChess' });
            return result;
        });

        ['onNotifyChessGameOver', 'onNotifyChessGameResult', 'onNtfChessGameOverMsg'].forEach(function (name) {
            wrapMethod(manager, name, function (original, args) {
                const result = original.apply(this, args);
                finalizeAndDownload(name);
                return result;
            });
        });

        updateStatus('统计中：' + ((currentStats && currentStats.tableId) || '未知房间'));
    }

    function attachSelfInfoHooks(manager) {
        const selfInfo = manager && (manager.selfInfo || manager.SelfInfo);
        if (!selfInfo || selfInfo[SELF_INFO_HOOK_FLAG]) return;
        Object.defineProperty(selfInfo, SELF_INFO_HOOK_FLAG, { value: true, configurable: true });
        wrapMethod(selfInfo, 'AddHandChess', function (original, args) {
            const result = original.apply(this, args);
            recordSpell(args[0], { source: 'SelfInfo.AddHandChess' });
            return result;
        });
    }

    function wrapMethod(target, name, wrapper) {
        if (!target || typeof target[name] !== 'function' || target[name].__tavernChessStatsWrapped) return;
        const original = target[name];
        const wrapped = function () {
            return wrapper.call(this, original, Array.prototype.slice.call(arguments));
        };
        wrapped.__tavernChessStatsWrapped = true;
        wrapped.__original = original;
        Object.defineProperty(target, name, { value: wrapped, configurable: true, writable: true });
    }

    function safeRead(obj, prop) {
        try { return obj[prop]; } catch (error) { return 0; }
    }

    function makeCostEvent(type, payload) {
        return Object.assign({ type, at: new Date().toISOString(), round: getRoundKey(), phase: currentManager && (currentManager.Phase || currentManager.phase) }, payload || {});
    }

    function confirmRefreshCost(pending, protoData, manager) {
        if (!currentStats || !pending) return;
        pending.afterCoin = protoData.restCoin || safeRead(manager, 'CoinNum');
        pending.freeRefreshEndTime = protoData.freeRefreshEndTime || 0;
        addCostToStats('refresh', pending);
    }

    function confirmBuyCost(pending, protoData, manager) {
        if (!currentStats || !pending) return;
        pending.afterCoin = protoData.restCoin || safeRead(manager, 'CoinNum');
        pending.goodsID = protoData.goodsID || pending.goodsID;
        pending.goods = normalizeGoods(protoData.buyChess) || pending.goods;
        addCostToStats('buy', pending);
    }

    function addCostToStats(type, entry) {
        const cost = Number(entry.cost) || 0;
        const roundStats = getRoundStats(entry.round);
        const target = roundStats[type];
        const total = currentStats.totals[type];
        target.count += 1;
        total.count += 1;
        target.hufu += cost;
        total.hufu += cost;
        if (type === 'refresh') {
            if (entry.isAuto) {
                target.autoCount += 1;
                total.autoCount += 1;
            }
            if (cost <= 0) {
                target.freeCount += 1;
                total.freeCount += 1;
            }
        }
        target.details.push(entry);
        total.details.push(entry);
        pushEvent({ type, at: entry.at, round: entry.round, payload: entry });
    }

    function recordShopGoods(shopGoods, context) {
        if (!currentStats || !Array.isArray(shopGoods)) return;
        const goodsList = shopGoods.map(function (goods, index) {
            const normalized = normalizeGoods(goods);
            if (normalized) normalized.slotIndex = index;
            return normalized;
        }).filter(Boolean);
        const roundKey = getRoundKey();
        const signature = roundKey + ':' + goodsList.map(function (goods) { return goods.goodsID || goods.chessID || goods.spellID || 'empty'; }).join('|');
        if (!signature || signature === lastShopSignature) return;
        lastShopSignature = signature;

        const now = new Date().toISOString();
        const roundStats = getRoundStats(roundKey);
        const snapshot = { at: now, round: roundKey, context: context || {}, goods: goodsList };
        roundStats.shop.snapshots += 1;
        currentStats.totals.shop.snapshots += 1;
        roundStats.shop.details.push(snapshot);
        currentStats.totals.shop.details.push(snapshot);

        goodsList.forEach(function (goods) {
            addAppearance(roundStats.shop.appearances, goods);
            addAppearance(currentStats.totals.shop.appearances, goods);
            addAppearance(currentStats.shopAppearances, goods);
        });

        pushEvent({ type: 'shop', at: now, round: roundKey, context: context || {}, count: goodsList.length });
    }

    function addAppearance(bucket, goods) {
        const key = String(goods.spellID ? 'spell:' + goods.spellID : goods.chessID || goods.cardID || goods.goodsID || goods.name || 'unknown');
        if (!bucket[key]) bucket[key] = { count: 0, sample: goods, times: [] };
        bucket[key].count += 1;
        bucket[key].times.push(new Date().toISOString());
    }

    function normalizeGoods(goods) {
        if (!goods || typeof goods !== 'object') return null;
        const chessID = goods.chessID || goods.cardID || goods.CardID || 0;
        const spellID = goods.spellID || goods.SpellID || 0;
        const cardID = chessID || spellID || goods.itemID || goods.ItemID || 0;
        const card = getCardVO(cardID);
        const defaultSkin = getDefaultSkin(card);
        const name = getCardName(goods, card, cardID);
        return {
            goodsID: goods.goodsID || goods.GoodsID || goods.id || 0,
            chessID,
            spellID,
            cardID,
            name,
            skin: defaultSkin,
            imageUrl: getCardImageUrl(card, defaultSkin, !!spellID),
            rank: goods.rank || goods.Rank || goods.ChessRank || safeRead(card || {}, 'ChessRank') || 0,
            rawPosition: goods.position || goods.Position || 0
        };
    }

    function getCardVO(cardID) {
        try {
            if (cardID && window.TavernChessConfiger) return TavernChessConfiger.GetInstance().GetCardByCardID(cardID);
        } catch (error) {}
        return null;
    }

    function getDefaultSkin(card) {
        if (!card) return '';
        try { return card.DefaultSkin || card.defaultSkin || ''; } catch (error) { return ''; }
    }

    function getCardName(goods, card, cardID) {
        const directName = goods.name || goods.Name || goods.cardName || goods.CardName || '';
        if (directName) return String(directName);
        try {
            if (card) return String(card.CardName || card.Name || card.name || card.SpellName || card.GetChessName && card.GetChessName(goods) || cardID || 'unknown');
        } catch (error) {}
        return String(cardID || goods.goodsID || 'unknown');
    }

    function getCardImageUrl(card, defaultSkin, isSpell) {
        try {
            if (card && typeof card.GetDefaultCardSkinUrl === 'function') {
                const url = card.GetDefaultCardSkinUrl();
                if (url) return toAbsoluteAssetUrl(url);
            }
        } catch (error) {}
        if (!defaultSkin) return '';
        return toAbsoluteAssetUrl('res/assets/runtime/tavernChess/' + (isSpell ? 'spell' : 'card') + '/' + defaultSkin + '.png');
    }

    function toAbsoluteAssetUrl(url) {
        if (!url) return '';
        if (/^https?:\/\//i.test(url)) return url;
        const base = location.origin + '/10/pc/';
        return base + String(url).replace(/^\/+/, '');
    }

    function recordSpell(spellLike, context) {
        if (!currentStats || !spellLike || typeof spellLike !== 'object') return;
        const normalized = normalizeGoods(spellLike);
        if (!normalized || !normalized.spellID) return;
        const instanceKey = normalized.goodsID ? 'goods:' + normalized.goodsID : 'spell:' + normalized.spellID + ':' + ((context && context.source) || 'unknown') + ':' + Date.now();
        if (recordedSpellInstanceKeys.has(instanceKey)) return;
        recordedSpellInstanceKeys.add(instanceKey);
        const key = String(normalized.spellID);
        if (!currentStats.spells[key]) currentStats.spells[key] = { count: 0, sample: normalized, times: [] };
        currentStats.spells[key].count += 1;
        currentStats.spells[key].times.push(new Date().toISOString());
        pushEvent({ type: 'spell', at: new Date().toISOString(), payload: { context: context || {}, spell: normalized } });
    }

    function pushEvent(event) {
        if (!currentStats) return;
        currentStats.events.push(event);
        if (currentStats.events.length > 600) currentStats.events.splice(0, currentStats.events.length - 600);
        currentStats.updatedAt = new Date().toISOString();
        saveStats();
        renderPanel();
    }

    function saveStats() {
        if (!currentStats) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentStats));
        localStorage.setItem(STORAGE_KEY + ':' + currentStats.gameId, JSON.stringify(currentStats));
    }

    function createPanel() {
        if (document.getElementById(PANEL_ID)) return;
        const state = loadPanelState();
        const panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.style.cssText = [
            'position:fixed',
            'left:' + state.left + 'px',
            'top:' + state.top + 'px',
            'z-index:99999',
            'width:' + state.width + 'px',
            'height:' + state.height + 'px',
            'min-width:220px',
            'min-height:150px',
            'max-width:80vw',
            'max-height:80vh',
            'overflow:hidden',
            'resize:both',
            'background:rgba(20,24,35,.92)',
            'color:#f6f7fb',
            'border:1px solid #596275',
            'border-radius:10px',
            'font:12px/1.45 Microsoft YaHei,Arial,sans-serif',
            'box-shadow:0 6px 22px rgba(0,0,0,.35)'
        ].join(';');
        panel.innerHTML = '<div id="tavern-chess-stats-header" style="display:flex;justify-content:space-between;align-items:center;gap:6px;padding:8px 10px;cursor:move;background:rgba(75,123,236,.18);user-select:none;"><b>自走棋统计</b><div style="display:flex;gap:4px;"><button id="tavern-chess-stats-export" style="cursor:pointer;border:0;border-radius:6px;padding:4px 8px;background:#4b7bec;color:#fff;">导出</button><button id="tavern-chess-stats-hide" style="cursor:pointer;border:0;border-radius:6px;padding:4px 8px;background:#596275;color:#fff;">收起</button></div></div><div id="tavern-chess-stats-content" style="height:calc(100% - 42px);overflow:auto;padding:8px 10px;"><div id="tavern-chess-stats-status" style="color:#a5b1c2;margin-bottom:6px;">初始化中...</div><div id="tavern-chess-stats-body"></div></div>';
        document.body.appendChild(panel);
        panelBody = document.getElementById('tavern-chess-stats-body');
        panelStatus = document.getElementById('tavern-chess-stats-status');
        document.getElementById('tavern-chess-stats-export').addEventListener('click', function () { exportStats(false); });
        document.getElementById('tavern-chess-stats-hide').addEventListener('click', togglePanelContent);
        makePanelDraggable(panel, document.getElementById('tavern-chess-stats-header'));
        observePanelResize(panel);
    }

    function loadPanelState() {
        const fallback = { left: Math.max(12, window.innerWidth - 320), top: Math.max(12, window.innerHeight - 470), width: 300, height: 420 };
        try {
            return Object.assign(fallback, JSON.parse(localStorage.getItem(PANEL_STATE_KEY) || '{}'));
        } catch (error) {
            return fallback;
        }
    }

    function savePanelState(panel) {
        const rect = panel.getBoundingClientRect();
        localStorage.setItem(PANEL_STATE_KEY, JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) }));
    }

    function makePanelDraggable(panel, header) {
        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;
        header.addEventListener('mousedown', function (event) {
            if (event.target && event.target.tagName === 'BUTTON') return;
            dragging = true;
            startX = event.clientX;
            startY = event.clientY;
            const rect = panel.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            event.preventDefault();
        });
        document.addEventListener('mousemove', function (event) {
            if (!dragging) return;
            const nextLeft = Math.min(window.innerWidth - 60, Math.max(0, startLeft + event.clientX - startX));
            const nextTop = Math.min(window.innerHeight - 40, Math.max(0, startTop + event.clientY - startY));
            panel.style.left = nextLeft + 'px';
            panel.style.top = nextTop + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });
        document.addEventListener('mouseup', function () {
            if (!dragging) return;
            dragging = false;
            savePanelState(panel);
        });
    }

    function observePanelResize(panel) {
        if (window.ResizeObserver) {
            const observer = new ResizeObserver(function () { savePanelState(panel); });
            observer.observe(panel);
        }
    }

    function togglePanelContent() {
        const content = document.getElementById('tavern-chess-stats-content');
        const button = document.getElementById('tavern-chess-stats-hide');
        if (!content || !button) return;
        const hide = content.style.display !== 'none';
        content.style.display = hide ? 'none' : 'block';
        button.textContent = hide ? '展开' : '收起';
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
        const total = currentStats.totals;
        const roundKey = getRoundKey();
        const roundStats = currentStats.rounds[roundKey] || createRoundStats('当前回合');
        const topCards = getTopEntries(currentStats.shopAppearances, 8);
        const topSpells = getTopEntries(currentStats.spells, 6);
        panelBody.innerHTML = [
            '<div>房间：' + escapeHtml(currentStats.tableId || '未知') + '</div>',
            '<div>当前：第 ' + escapeHtml(roundKey) + ' 回合</div>',
            '<hr style="border:0;border-top:1px solid rgba(255,255,255,.12);margin:6px 0;">',
            '<b>整局</b>',
            '<div>刷新：' + total.refresh.count + ' 次 / ' + total.refresh.hufu + ' 虎符（免费 ' + total.refresh.freeCount + '，自动 ' + total.refresh.autoCount + '）</div>',
            '<div>购买：' + total.buy.count + ' 次 / ' + total.buy.hufu + ' 虎符</div>',
            '<div>商店快照：' + total.shop.snapshots + ' 次</div>',
            '<b style="display:block;margin-top:6px;">本回合</b>',
            '<div>刷新：' + roundStats.refresh.count + ' 次 / ' + roundStats.refresh.hufu + ' 虎符</div>',
            '<div>购买：' + roundStats.buy.count + ' 次 / ' + roundStats.buy.hufu + ' 虎符</div>',
            '<div>商店快照：' + roundStats.shop.snapshots + ' 次</div>',
            '<b style="display:block;margin-top:6px;">卡牌出现 Top</b>',
            renderEntryList(topCards),
            '<b style="display:block;margin-top:6px;">本局锦囊</b>',
            renderEntryList(topSpells)
        ].join('');
    }

    function getTopEntries(bucket, limit) {
        return Object.keys(bucket || {}).map(function (key) {
            const item = bucket[key];
            return { key, count: item.count, name: item.sample && item.sample.name };
        }).sort(function (a, b) { return b.count - a.count; }).slice(0, limit);
    }

    function renderEntryList(entries) {
        if (!entries.length) return '<div style="color:#a5b1c2;">暂无数据</div>';
        return entries.map(function (item) {
            return '<div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);"><span>' + escapeHtml(item.name || item.key) + '</span><b>' + item.count + '</b></div>';
        }).join('');
    }

    function finalizeAndDownload(reason) {
        if (!currentStats || downloadedGameIds.has(currentStats.gameId)) return;
        downloadedGameIds.add(currentStats.gameId);
        currentStats.endedAt = new Date().toISOString();
        currentStats.endReason = reason;
        saveStats();
        exportStats(true);
        updateStatus('本局结束，已打包下载统计结果');
    }

    function exportStats(forceDownload) {
        if (!currentStats) return;
        const text = JSON.stringify(currentStats, null, 2);
        if (forceDownload) {
            downloadStats(text);
            return;
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function () {
                updateStatus('已复制 JSON 到剪贴板');
            }).catch(function () {
                downloadStats(text);
            });
        } else {
            downloadStats(text);
        }
    }

    function downloadStats(text) {
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'tavern-chess-stats-' + ((currentStats && currentStats.gameId) || Date.now()) + '.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
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
