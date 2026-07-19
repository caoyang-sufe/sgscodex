// ==UserScript==
// @name         自走棋本局商店统计
// @namespace    http://tampermonkey.net/
// @version      0.4.2
// @description  统计酒馆自走棋本局商店卡牌出现、刷新与购买虎符消耗，支持分回合、拖拽缩放面板和结束下载。
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

(function () {
    'use strict';

    const LOG_PREFIX = '[自走棋统计]';
    const STORAGE_KEY = 'tavernChessGameStats';
    const PANEL_ID = 'tavern-chess-stats-panel';
    const HOOK_FLAG = '__tavernChessStatsHooked';
    const SELF_INFO_HOOK_FLAG = '__tavernChessStatsSelfInfoHooked';
    const PROXY_SEND_HOOK_FLAG = '__tavernChessStatsProxySendHooked';
    const SCAN_INTERVAL_MS = 1500;
    const PANEL_STATE_KEY = STORAGE_KEY + ':panelState';
    // const SPELL_DUPE_WINDOW_MS = 1200;

    // ============ 棋子和锦囊名称映射 ============
    let chessNameMap = {};
    let spellNameMap = {};

    function loadMaps() {
        // chessNameMap = ...	
		// spellNameMap = ...	
	}

    function getChessName(chessId) {
        if (!chessId) return '未知棋子';
        const idStr = String(chessId);
        if (chessNameMap[idStr]) return chessNameMap[idStr];
        const last3 = idStr.slice(-3);
        if (chessNameMap[last3]) return chessNameMap[last3];
        const last4 = idStr.slice(-4);
        if (chessNameMap[last4]) return chessNameMap[last4];
        return idStr;
    }

    function getSpellName(spellId) {
        if (!spellId) return '未知锦囊';
        const idStr = String(spellId);
        return spellNameMap[idStr] || idStr;
    }

    let currentScene = null;
    let currentManager = null;
    let currentStats = null;
    let panelBody = null;
    let panelStatus = null;
    let lastShopSignature = '';
    let downloadedGameIds = new Set();
    let recordedSpellInstanceKeys = new Map();
    let isMinimized = false;
    let panelContent = null;
    let pendingSpellUses = [];
    let latestBuyCard = null;
    let latestLineupCard = null;
    let latestSpellUseCard = null;

    // ===== 新增：渲染防抖和批量更新 =====
    let renderPending = false;
    let savePending = false;
    let renderTimer = null;
    let saveTimer = null;
    let scanCount = 0;

    // ===== 优化：缓存场景查找结果 =====
    let cachedScene = null;
    let sceneCacheTime = 0;
    const SCENE_CACHE_TTL = 5000; // 5秒缓存

    function findTavernChessScene(root, visited) {
        // 使用缓存
        const now = Date.now();
        if (cachedScene && now - sceneCacheTime < SCENE_CACHE_TTL) {
            return cachedScene;
        }

        if (!root || typeof root !== 'object') return null;
        const seen = visited || new WeakSet();
        if (seen.has(root)) return null;
        seen.add(root);

        if (root.constructor && root.constructor.name === 'TavernChessGameScene') {
            cachedScene = root;
            sceneCacheTime = now;
            return root;
        }

        const children = root._children || root.children || root.childList;
        if (Array.isArray(children)) {
            for (const child of children) {
                const result = findTavernChessScene(child, seen);
                if (result) {
                    cachedScene = result;
                    sceneCacheTime = now;
                    return result;
                }
            }
        }

        const childCount = Number(root.numChildren || 0);
        if (childCount > 0 && typeof root.getChildAt === 'function') {
            for (let i = 0; i < childCount; i++) {
                const result = findTavernChessScene(root.getChildAt(i), seen);
                if (result) {
                    cachedScene = result;
                    sceneCacheTime = now;
                    return result;
                }
            }
        }
        return null;
    }

    function waitAndAttach() {
        loadMaps();
        createPanel();
        setInterval(function () {
            try {
                scanCount++;
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
                    recordedSpellInstanceKeys = new Map();
                    attachManagerHooks(manager);
                    attachSelfInfoHooks(manager);
                    recordShopGoods(manager.ShopGoods || manager.shopGoods, { source: 'attach', animate: false });
                    saveStats();
                    renderPanel();
                    console.log(LOG_PREFIX, '已连接 manager', currentStats.gameId);
                } else {
                    attachSelfInfoHooks(manager);
                    // 降低渲染频率：每3次扫描渲染一次
                    if (scanCount % 3 === 0) {
                        renderPanel();
                    }
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
            version: 3,
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
            cardStates: {
                hand: [],
                lineup: [],
                shop: []
            },
            snapshots: [],
            events: []
        };
    }

    function createRoundStats(label) {
        return {
            label,
            refresh: { count: 0, hufu: 0, freeCount: 0, autoCount: 0, details: [] },
            buy: { count: 0, hufu: 0, details: [] },
            shop: { snapshots: 0, appearances: {}, details: [] },
            cardStates: {
                hand: [],
                lineup: [],
                shop: []
            }
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

    function buildSpellPayloadFromEvent(manager, spellID, chessID) {
        const normalizedSpellID = Number(spellID) || 0;
        const normalizedChessID = Number(chessID) || 0;
        const name = normalizedSpellID ? getSpellName(normalizedSpellID) : (normalizedChessID ? getChessName(normalizedChessID) : '未知锦囊');
        const payload = {
            goodsID: 0,
            spellID: normalizedSpellID,
            chessID: normalizedChessID,
            name: name,
            raw: { spellID: normalizedSpellID, chessID: normalizedChessID }
        };

        const handCards = Array.isArray(manager && (manager.HandChess || manager.handChess))
            ? (manager.HandChess || manager.handChess)
            : [];
        if (Array.isArray(handCards)) {
            const matched = handCards.find(function (item) {
                if (!item || typeof item !== 'object') return false;
                return (Number(item.spellID || item.SpellID || 0) === normalizedSpellID)
                    || (Number(item.chessID || item.ChessID || item.cardID || item.CardID || 0) === normalizedChessID);
            });
            if (matched) {
                payload.goodsID = matched.goodsID || matched.GoodsID || payload.goodsID;
                payload.raw = matched;
            }
        }
        return payload;
    }

    function attachManagerHooks(manager) {
        if (manager[HOOK_FLAG]) return;
        Object.defineProperty(manager, HOOK_FLAG, { value: true, configurable: true });

        wrapMethod(manager, 'ReqShopRefreshChess', function (original, args) {
            const isAuto = !!args[0];
            const cost = Number(safeCall(this, 'ShopRefreshCost')) || 0;
            const roundKey = getRoundKey();
            recordCost('refresh', {
                cost: cost,
                isAuto: isAuto,
                phase: this.phase || this.Phase,
                round: roundKey
            });
            return original.apply(this, args);
        });

        wrapMethod(manager, 'ReqShopBuyChess', function (original, args) {
            const goodsID = args[0];
            const cost = typeof this.GetShopBuyCost === 'function' ? this.GetShopBuyCost(goodsID) : 0;
            const goods = typeof this.getShopGoodsByGoodsID === 'function' ? this.getShopGoodsByGoodsID(goodsID) : null;
            const roundKey = getRoundKey();
            const normalizedGoods = normalizeGoods(goods);
            latestBuyCard = normalizedGoods || latestBuyCard;
            recordCost('buy', {
                cost: Number(cost) || 0,
                goodsID: goodsID,
                goods: normalizedGoods,
                phase: this.phase || this.Phase,
                round: roundKey
            });
            return original.apply(this, args);
        });

        wrapMethod(manager, 'updateShopGoods', function (original, args) {
            const result = original.apply(this, args);
            const roundKey = getRoundKey();
            if (roundKey === '1') {
                recordShopGoods(args[0], { source: 'updateShopGoods', animate: args[1] });
            } else if (args[1] === true) {
                recordShopGoods(args[0], { source: 'updateShopGoods', animate: args[1] });
            }
            captureCardStates();
            return result;
        });

        wrapMethod(manager, 'onRespShopRefreshChess', function (original, args) {
            const result = original.apply(this, args);
            const proto = args[0] && args[0].Protocol && args[0].Protocol.ProtoData;
            if (proto && proto.shopGoods) {
                recordShopGoods(proto.shopGoods, { source: 'onRespShopRefreshChess', animate: true });
            }
            return result;
        });

        const managerCtor = (typeof window !== 'undefined' && window.TavernChessGameManager) || null;
        const spellHookTarget = managerCtor && managerCtor.prototype ? managerCtor.prototype : manager;

        wrapMethod(spellHookTarget, 'ReqChessUseSpell', function (original, args) {
            const spellGoodsID = args && (args[0] || 0);
            if (spellGoodsID) {
                const payload = resolveSpellUsePayload(this, spellGoodsID);
                if (payload) {
                    pendingSpellUses.push({
                        goodsID: spellGoodsID,
                        payload: payload,
                        round: getRoundKey()
                    });
                }
            }
            return original.apply(this, args);
        });

        wrapMethod(spellHookTarget, 'onRespChessUseSpell', function (original, args) {
            const proto = args[0] && args[0].Protocol && args[0].Protocol.ProtoData;
            const spellGoodsID = proto && (proto.spellGoodsID || proto.goodsID || proto.spellID || 0);
            const pending = spellGoodsID ? pendingSpellUses.filter(function (entry) {
                return entry.goodsID === spellGoodsID;
            }).pop() : null;
            const payload = pending && pending.payload ? pending.payload : resolveSpellUsePayload(this, spellGoodsID);

            const result = original.apply(this, args);
            if (!proto || proto.errCode) {
                pendingSpellUses = pendingSpellUses.filter(function (entry) {
                    return entry.goodsID !== spellGoodsID;
                });
                return result;
            }

            if (payload) {
                // ===== 修复：直接使用 payload 更新 spells =====
                recordSpellDirect(payload, { source: 'onRespChessUseSpell', spellGoodsID: spellGoodsID, round: getRoundKey() });
                latestSpellUseCard = payload;
            }
            pendingSpellUses = pendingSpellUses.filter(function (entry) {
                return entry.goodsID !== spellGoodsID;
            });
            captureCardStates();
            return result;
        });

        const spellEventName = (typeof window !== 'undefined' && window.TavernChessGameManager && window.TavernChessGameManager.CHESS_USE_SPELL)
            || 'CHESS_USE_SPELL';
        const respSpellEventName = (typeof window !== 'undefined' && window.TavernChessGameManager && window.TavernChessGameManager.RESP_CHESS_SPELL_USE)
            || 'RESP_CHESS_SPELL_USE';
        const teamSpellEventName = (typeof window !== 'undefined' && window.TavernChessGameManager && window.TavernChessGameManager.TEAM_SPELL_USE)
            || 'TEAM_SPELL_USE';

        if (typeof manager.on === 'function') {
            manager.on(spellEventName, manager, function (chessID, uniqueID, spellID) {
                const payload = buildSpellPayloadFromEvent(manager, spellID, chessID);
                if (payload) {
                    recordSpellDirect(payload, {
                        source: 'managerEvent:' + spellEventName,
                        spellID: spellID,
                        chessID: chessID,
                        round: getRoundKey()
                    });
                    latestSpellUseCard = payload;
                }
            });

            manager.on(respSpellEventName, manager, function (spellGoodsID) {
                if (!spellGoodsID) return;
                const payload = resolveSpellUsePayload(manager, spellGoodsID);
                if (payload) {
                    recordSpellDirect(payload, {
                        source: 'managerEvent:' + respSpellEventName,
                        spellGoodsID: spellGoodsID,
                        round: getRoundKey()
                    });
                    latestSpellUseCard = payload;
                }
            });

            manager.on(teamSpellEventName, manager, function (skillID, goodsID) {
                if (!skillID && !goodsID) return;
                const payload = buildSpellPayloadFromEvent(manager, skillID, goodsID);
                if (payload) {
                    latestSpellUseCard = payload;
                }
            });
        }

        const proxy = manager && manager.proxy;
        if (proxy && typeof proxy.SendProto === 'function' && !proxy[PROXY_SEND_HOOK_FLAG]) {
            const originalSendProto = proxy.SendProto;
            proxy.SendProto = function () {
                const argsList = Array.prototype.slice.call(arguments);
                const protoId = argsList[0];
                const protoData = argsList[1] || {};
                const spellGoodsID = protoId && protoData.spellGoodsID ? protoData.spellGoodsID : 0;
                if (spellGoodsID) {
                    const payload = resolveSpellUsePayload(manager, spellGoodsID);
                    pendingSpellUses.push({
                        goodsID: spellGoodsID,
                        payload: payload,
                        round: getRoundKey()
                    });
                }
                return originalSendProto.apply(this, argsList);
            };
            Object.defineProperty(proxy, PROXY_SEND_HOOK_FLAG, { value: true, configurable: true });
        }

        ['onNotifyChessGameOver', 'onNotifyChessGameResult', 'onNtfChessGameOverMsg'].forEach(function (name) {
            wrapMethod(manager, name, function (original, args) {
                const result = original.apply(this, args);
                finalizeAndDownload(name);
                return result;
            });
        });

        updateStatus('统计中：' + ((currentStats && currentStats.tableId) || '未知房间'));
    }


	// ===== 修改后的 recordSpellDirect =====
	function recordSpellDirect(payload, context) {
		if (!currentStats || !payload || typeof payload !== 'object') return;

		const normalized = normalizeGoods(payload);
		if (!normalized) return;

		// 获取 spellKey
		const spellKey = String(normalized.spellID || normalized.chessID || normalized.cardID || normalized.goodsID || 'unknown');
		if (spellKey === 'unknown' || spellKey === '0') return;

		// ===== 只记录在 spellNameMap 中有名称的锦囊 =====
		if (!spellNameMap[spellKey]) {
			return;  // 未知锦囊跳过
		}

		const spellName = spellNameMap[spellKey];

		// ===== 每次都记录，不去重 =====
		if (!currentStats.spells[spellKey]) {
			currentStats.spells[spellKey] = {
				count: 0,
				name: spellName,
				sample: normalized,
				times: []
			};
		}
		currentStats.spells[spellKey].count += 1;
		currentStats.spells[spellKey].times.push(new Date().toISOString());

		// 限制 times 数组大小（防止无限增长）
		if (currentStats.spells[spellKey].times.length > 200) {
			currentStats.spells[spellKey].times = currentStats.spells[spellKey].times.slice(-200);
		}

		// 更新最近使用
		latestSpellUseCard = normalized;

		// 记录事件
		currentStats.events.push({
			type: 'spell',
			at: new Date().toISOString(),
			payload: { context: context || {}, spell: normalized }
		});
		trimEvents();
		saveStats();
		renderPanel();
	}

    function attachSelfInfoHooks(manager) {
        const selfInfo = manager && (manager.selfInfo || manager.SelfInfo);
        if (!selfInfo || selfInfo[SELF_INFO_HOOK_FLAG]) return;
        Object.defineProperty(selfInfo, SELF_INFO_HOOK_FLAG, { value: true, configurable: true });
    }

    function resolveSpellUsePayload(manager, spellGoodsID) {
        if (!manager) return null;
        const candidates = [];
        const normalizedId = Number(spellGoodsID) || spellGoodsID || 0;

        if (typeof spellGoodsID === 'object' && spellGoodsID) {
            candidates.push(spellGoodsID);
        }

        if (typeof manager.GetHandChessByGoodID === 'function') {
            const fromManager = manager.GetHandChessByGoodID(normalizedId);
            if (fromManager) candidates.push(fromManager);
        }

        const selfInfo = manager.selfInfo || manager.SelfInfo || null;
        if (selfInfo && typeof selfInfo.GetChessByGoodID === 'function') {
            const fromSelfInfo = selfInfo.GetChessByGoodID(normalizedId);
            if (fromSelfInfo) candidates.push(fromSelfInfo);
        }

        const handChess = manager.HandChess || manager.handChess || (selfInfo && (selfInfo.HandChess || selfInfo.handChess)) || null;
        if (Array.isArray(handChess)) {
            const matched = handChess.filter(function (item) {
                return item && (item.goodsID === normalizedId || item.GoodsID === normalizedId || item.goodsID === String(normalizedId) || item.GoodsID === String(normalizedId));
            })[0];
            if (matched) candidates.push(matched);
        }

        const handSpellIDs = selfInfo && (selfInfo.handSpellIDs || selfInfo.handSpellIDs || selfInfo.chessSpellInfo || null);
        if (handSpellIDs && typeof handSpellIDs === 'object') {
            Object.keys(handSpellIDs).forEach(function (key) {
                const item = handSpellIDs[key];
                if (item && (item.goodsID === normalizedId || item.GoodsID === normalizedId || item.goodsID === String(normalizedId) || item.GoodsID === String(normalizedId))) {
                    candidates.push(item);
                }
            });
        }

        for (let i = 0; i < candidates.length; i++) {
            const handCard = candidates[i];
            if (!handCard || typeof handCard !== 'object') continue;
            const spellID = handCard.spellID || handCard.SpellID || 0;
            const chessID = handCard.chessID || handCard.ChessID || handCard.cardID || handCard.CardID || 0;
            const goodsID = handCard.goodsID || handCard.GoodsID || normalizedId || 0;
            const name = handCard.name || handCard.Name || handCard.cardName || handCard.CardName || '';
            if (spellID || chessID || goodsID) {
                return {
                    goodsID: goodsID,
                    spellID: spellID,
                    chessID: chessID,
                    name: name,
                    raw: handCard
                };
            }
        }

        return null;
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

    function safeCall(obj, prop) {
        try { return obj[prop]; } catch (error) { return 0; }
    }

    function safeRead(obj, prop) {
        try { return obj[prop]; } catch (error) { return 0; }
    }

    function recordCost(type, payload) {
        if (!currentStats) return;
        const cost = Number(payload && payload.cost) || 0;
        const roundKey = payload.round || getRoundKey();
        const roundStats = getRoundStats(roundKey);
        const target = roundStats[type];
        const total = currentStats.totals[type];

        target.count += 1;
        total.count += 1;
        target.hufu += cost;
        total.hufu += cost;

        if (type === 'refresh') {
            if (payload.isAuto) {
                target.autoCount += 1;
                total.autoCount += 1;
            }
            if (cost <= 0) {
                target.freeCount += 1;
                total.freeCount += 1;
            }
        }

        const entry = Object.assign({
            type: type,
            at: new Date().toISOString(),
            round: roundKey,
            phase: payload.phase || 0,
            cost: cost
        }, payload);

        target.details.push(entry);
        total.details.push(entry);

        // 限制细节数组大小
        if (target.details.length > 50) target.details = target.details.slice(-50);
        if (total.details.length > 50) total.details = total.details.slice(-50);

        currentStats.events.push({ type, at: new Date().toISOString(), round: roundKey, payload: entry });
        trimEvents();
        saveStats();
        renderPanel();
    }

    function recordShopGoods(shopGoods, context) {
        if (!currentStats || !Array.isArray(shopGoods)) return;

        const roundKey = getRoundKey();

        if (roundKey !== '1' && context.animate !== true) {
            return;
        }

        const goodsList = shopGoods.map(function (goods, index) {
            const normalized = normalizeGoods(goods);
            if (normalized) normalized.slotIndex = index;
            return normalized;
        }).filter(Boolean);
        recordCardStateSnapshot('shop', goodsList, { source: context.source || 'shop', round: roundKey });
        if (goodsList.length === 0) return;

        const signature = roundKey + ':' + goodsList.map(function (goods) {
            return (goods.goodsID || 0) + ':' + (goods.chessID || 0) + ':' + (goods.spellID || 0);
        }).join('|');
        if (signature === lastShopSignature) return;
        lastShopSignature = signature;

        const now = new Date().toISOString();
        const roundStats = getRoundStats(roundKey);
        const snapshot = { at: now, round: roundKey, context: context || {}, goods: goodsList };

        roundStats.shop.snapshots += 1;
        currentStats.totals.shop.snapshots += 1;
        roundStats.shop.details.push(snapshot);
        currentStats.totals.shop.details.push(snapshot);

        if (roundStats.shop.details.length > 30) roundStats.shop.details = roundStats.shop.details.slice(-30);
        if (currentStats.totals.shop.details.length > 30) currentStats.totals.shop.details = currentStats.totals.shop.details.slice(-30);

        goodsList.forEach(function (goods) {
            addAppearance(roundStats.shop.appearances, goods);
            addAppearance(currentStats.totals.shop.appearances, goods);
            addAppearance(currentStats.shopAppearances, goods);
        });

        currentStats.events.push({ type: 'shop', at: now, round: roundKey, context: context || {}, count: goodsList.length });
        trimEvents();
        saveStats();
        renderPanel();
    }

    function addAppearance(bucket, goods) {
        const key = String(goods.spellID ? 'spell:' + goods.spellID : goods.chessID || goods.cardID || goods.goodsID || goods.name || 'unknown');
        if (!bucket[key]) bucket[key] = { count: 0, sample: goods, times: [] };
        bucket[key].count += 1;
        // 限制 times 数组大小
        if (bucket[key].times.length < 10) {
            bucket[key].times.push(new Date().toISOString());
        }
    }

    function recordCardStateSnapshot(area, cards, context) {
        if (!currentStats || !Array.isArray(cards)) return;
        const normalized = cards.map(function (card) {
            const item = normalizeGoods(card);
            if (!item) return null;
            return Object.assign({}, item, {
                area: area,
                at: new Date().toISOString(),
                round: getRoundKey()
            });
        }).filter(Boolean);
        if (!normalized.length) return;

        currentStats.cardStates[area] = normalized;
        const roundStats = getRoundStats(getRoundKey());
        roundStats.cardStates[area] = normalized;

        // 减少快照数量：只保留最近50条
        currentStats.snapshots.push(Object.assign({
            at: new Date().toISOString(),
            round: getRoundKey(),
            area: area,
            cards: normalized
        }, context || {}));
        if (currentStats.snapshots.length > 50) currentStats.snapshots = currentStats.snapshots.slice(-50);
        saveStats();
        renderPanel();
    }

    function captureCardStates() {
        if (!currentManager) return;
        const manager = currentManager;
        const handCards = Array.isArray(manager.HandChess || manager.handChess)
            ? (manager.HandChess || manager.handChess)
            : [];
        const lineupCards = Array.isArray(manager.selfInfo && (manager.selfInfo.LineUpChess || manager.selfInfo.lineUpChess))
            ? (manager.selfInfo.LineUpChess || manager.selfInfo.lineUpChess)
            : [];

        if (lineupCards && lineupCards.length) {
            latestLineupCard = normalizeGoods(lineupCards[lineupCards.length - 1]) || latestLineupCard;
        }

        recordCardStateSnapshot('hand', handCards, { source: 'captureCardStates', round: getRoundKey() });
        recordCardStateSnapshot('lineup', lineupCards, { source: 'captureCardStates', round: getRoundKey() });
    }

    function normalizeGoods(goods) {
        if (!goods || typeof goods !== 'object') return null;
        const chessID = goods.chessID || goods.cardID || goods.CardID || 0;
        const spellID = goods.spellID || goods.SpellID || 0;
        const cardID = chessID || spellID || goods.itemID || goods.ItemID || 0;

        let name = '';
        if (spellID > 0) {
            name = getSpellName(spellID);
        } else if (chessID > 0) {
            name = getChessName(chessID);
        }
        if (!name || name === String(chessID) || name === String(spellID)) {
            name = goods.name || goods.Name || goods.cardName || goods.CardName || '';
        }
        if (!name || name === 'unknown' || name === '') {
            try {
                if (cardID && window.TavernChessConfiger) {
                    const card = TavernChessConfiger.GetInstance().GetCardByCardID(cardID);
                    name = card && (card.CardName || card.Name || card.name || card.SpellName || '') || '';
                }
            } catch (error) {}
        }
        if (!name || name === 'unknown' || name === '') {
            name = String(cardID || goods.goodsID || 'unknown');
        }

        return {
            goodsID: goods.goodsID || goods.GoodsID || goods.id || 0,
            chessID: chessID,
            spellID: spellID,
            cardID: cardID,
            name: name,
            rank: goods.rank || goods.Rank || goods.ChessRank || 0,
            rawPosition: goods.position || goods.Position || 0
        };
    }

    // ===== 移除旧的 recordSpell 函数，使用 recordSpellDirect 替代 =====

    function trimEvents() {
        // 减少事件保留数量到300
        if (currentStats.events.length > 300) currentStats.events.splice(0, currentStats.events.length - 300);
        currentStats.updatedAt = new Date().toISOString();
    }

    // ===== 优化：防抖保存 =====
    function saveStats() {
        if (!currentStats) return;
        if (savePending) return;
        savePending = true;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(currentStats));
                localStorage.setItem(STORAGE_KEY + ':' + currentStats.gameId, JSON.stringify(currentStats));
            } catch (e) {
                // 如果存储失败（可能数据太大），只保存当前对局数据
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentStats));
                } catch (e2) {
                    console.warn(LOG_PREFIX, '保存失败，数据可能过大');
                }
            }
            savePending = false;
        }, 500);
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
        panel.innerHTML = '<div id="tavern-chess-stats-header" style="display:flex;justify-content:space-between;align-items:center;gap:6px;padding:8px 10px;cursor:move;background:rgba(75,123,236,.18);user-select:none;"><b>自走棋统计</b><div style="display:flex;gap:4px;"><button id="tavern-chess-stats-minimize" style="cursor:pointer;border:0;border-radius:6px;padding:4px 8px;background:#596275;color:#fff;">最小化</button><button id="tavern-chess-stats-export" style="cursor:pointer;border:0;border-radius:6px;padding:4px 8px;background:#4b7bec;color:#fff;">导出</button><button id="tavern-chess-stats-hide" style="cursor:pointer;border:0;border-radius:6px;padding:4px 8px;background:#596275;color:#fff;">收起</button></div></div><div id="tavern-chess-stats-content" style="height:calc(100% - 42px);overflow:auto;padding:8px 10px;"><div id="tavern-chess-stats-status" style="color:#a5b1c2;margin-bottom:6px;">初始化中...</div><div id="tavern-chess-stats-body"></div></div>';
        document.body.appendChild(panel);
        panelContent = document.getElementById('tavern-chess-stats-content');
        panelBody = document.getElementById('tavern-chess-stats-body');
        panelStatus = document.getElementById('tavern-chess-stats-status');

        document.getElementById('tavern-chess-stats-export').addEventListener('click', function () { exportStats(false); });
        document.getElementById('tavern-chess-stats-hide').addEventListener('click', togglePanelContent);
        document.getElementById('tavern-chess-stats-minimize').addEventListener('click', toggleMinimize);

        makePanelDraggable(panel, document.getElementById('tavern-chess-stats-header'));
        observePanelResize(panel);
    }

    function toggleMinimize() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        const content = document.getElementById('tavern-chess-stats-content');
        const header = document.getElementById('tavern-chess-stats-header');
        const button = document.getElementById('tavern-chess-stats-minimize');

        if (isMinimized) {
            content.style.display = 'block';
            header.querySelector('b').textContent = '自走棋统计';
            panel.style.width = '300px';
            panel.style.height = '420px';
            panel.style.minWidth = '220px';
            panel.style.minHeight = '150px';
            button.textContent = '最小化';
            isMinimized = false;
            setTimeout(function() { savePanelState(panel); }, 100);
        } else {
            content.style.display = 'none';
            header.querySelector('b').textContent = '📊 统计';
            panel.style.width = 'auto';
            panel.style.height = 'auto';
            panel.style.minWidth = 'auto';
            panel.style.minHeight = 'auto';
            button.textContent = '恢复';
            isMinimized = true;
        }
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
        if (isMinimized) return;
        const rect = panel.getBoundingClientRect();
        localStorage.setItem(PANEL_STATE_KEY, JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) }));
    }

    function makePanelDraggable(panel, header) {
        let dragging = false;
        let startX = 0, startY = 0, startLeft = 0, startTop = 0;
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
        if (isMinimized) return;
        const hide = content.style.display !== 'none';
        content.style.display = hide ? 'none' : 'block';
        button.textContent = hide ? '展开' : '收起';
    }

    function updateStatus(text) {
        if (panelStatus) panelStatus.textContent = text;
    }

    // ===== 优化：缓存渲染用的数据，避免重复计算 =====
    let cachedRenderData = null;
    let renderDataVersion = 0;

    function renderPanel() {
        if (!panelBody) return;
        if (!currentStats) {
            panelBody.innerHTML = '<div>尚未进入自走棋对局。</div>';
            return;
        }

        // 检查数据是否变化
        const currentVersion = currentStats.updatedAt;
        if (renderDataVersion === currentVersion && renderDataVersion !== 0) {
            return; // 数据未变化，跳过渲染
        }

        // 防抖：延迟渲染
        if (renderPending) return;
        renderPending = true;
        clearTimeout(renderTimer);
        renderTimer = setTimeout(function() {
            doRenderPanel();
            renderPending = false;
        }, 100);
    }

    function doRenderPanel() {
        if (!panelBody || !currentStats) return;

        const total = currentStats.totals;
        const roundKey = getRoundKey();
        const roundStats = currentStats.rounds[roundKey] || createRoundStats('当前回合');
        const topCards = getTopEntries(currentStats.shopAppearances, 6);
        const topSpells = getTopEntries(currentStats.spells, 6);
        const handCards = (currentStats.cardStates && currentStats.cardStates.hand || []).slice(0, 8);
        const lineupCards = (currentStats.cardStates && currentStats.cardStates.lineup || []).slice(0, 8);
        const shopCards = (currentStats.cardStates && currentStats.cardStates.shop || []).slice(0, 8);

        panelBody.innerHTML = [
            '<b style="display:block;margin-top:6px;">最近操作</b>',
            '<div><b>购买</b></div>' + renderCardItem(latestBuyCard),
            '<div><b>上阵</b></div>' + renderCardItem(latestLineupCard),
            '<div><b>使用锦囊</b></div>' + renderCardItem(latestSpellUseCard),
            '<div>房间：' + escapeHtml(currentStats.tableId || '未知') + '</div>',
            '<div>当前：第 ' + escapeHtml(roundKey) + ' 回合</div>',
            '<hr style="border:0;border-top:1px solid rgba(255,255,255,.12);margin:6px 0;">',
            '<b>整局</b>',
            '<div>刷新：' + total.refresh.count + ' 次 / ' + total.refresh.hufu + ' 虎符</div>',
            '<div>购买：' + total.buy.count + ' 次 / ' + total.buy.hufu + ' 虎符</div>',
            '<div>商店快照：' + total.shop.snapshots + ' 次</div>',
            '<b style="display:block;margin-top:6px;">本回合</b>',
            '<div>刷新：' + roundStats.refresh.count + ' 次 / ' + roundStats.refresh.hufu + ' 虎符</div>',
            '<div>购买：' + roundStats.buy.count + ' 次 / ' + roundStats.buy.hufu + ' 虎符</div>',
            '<div>商店快照：' + roundStats.shop.snapshots + ' 次</div>',
            '<b style="display:block;margin-top:6px;">区域卡牌</b>',
            '<div><b>手牌区</b></div>' + renderCardList(handCards),
            '<div><b>上阵区</b></div>' + renderCardList(lineupCards),
            '<div><b>商店区</b></div>' + renderCardList(shopCards),
            // '<b style="display:block;margin-top:6px;">本局锦囊</b>',
            // renderEntryList(topSpells),
            // '<b style="display:block;margin-top:6px;">卡牌出现 Top</b>',
            // renderEntryList(topCards)
        ].join('');

        renderDataVersion = currentStats.updatedAt;
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

    function renderCardList(cards) {
        if (!cards || !cards.length) return '<div style="color:#a5b1c2;">暂无数据</div>';
        return cards.map(function (item) {
            return '<div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);"><span>' + escapeHtml(item.name || item.key || (item.spellID ? ('锦囊:' + item.spellID) : (item.chessID || item.cardID || item.goodsID || '未知'))) + '</span><b>' + escapeHtml(item.goodsID || item.cardID || '') + '</b></div>';
        }).join('');
    }

    function renderCardItem(card) {
        if (!card) return '<div style="color:#a5b1c2;">暂无数据</div>';
        const label = card.name || (card.spellID ? ('锦囊:' + card.spellID) : (card.chessID || card.cardID || card.goodsID || '未知'));
        const goodsId = card.goodsID || card.cardID || '';
        return '<div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);"><span>' + escapeHtml(label) + '</span><b>' + escapeHtml(goodsId) + '</b></div>';
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
    console.log(LOG_PREFIX, '脚本 v0.5.0 已启动 - 性能优化版');
})();