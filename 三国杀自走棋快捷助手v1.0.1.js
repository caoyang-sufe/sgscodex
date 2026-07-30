// ==UserScript==
// @name         三国杀自走棋快捷助手
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  [1-6]购买  [R]刷新  [F]锁定  [Shift+1]遣散手牌中最右侧卡牌  [Shift+2]使用最右侧锦囊(自动尝试商店->上阵)  [Alt+9]遣散上阵区域最右侧卡牌  [Alt+0]上阵手牌中最右侧卡牌 [Space]跳过战斗 [Tab]禁用/启用三连控制 [Shift+R]强制刷新UI | 2x速度（测试不生效，本质UI动画滞后的同步策略） | 事件+轮询刷新
// @description  优化轮询频率，减少重复刷新
// @author       鲁班大王 魏东离
// @email		 caoyang@stu.sufe.edu.cn
// @match        https://game.4399iw2.com/yxxsgs/*
// @match        *://*.sanguosha.com/10/*
// @match        *://*.sanguosha.com/x/*
// @match        *://*.sanguosha.com/10th/*
// @match        https://wan.baidu.com/*gameId=19793616*
// @match        *://h5.7k7k.com/web/H5GAMES.html?gid=960982bec2f555de44ea43ca8a7ef418/*
// @match        *://qqgame.qq.com/webappframe/?appid=10951
// @match        *://s118.app1107877410.qqopenapp.com/pc/qqLobby_index.php*
// @grant        none
// ==/UserScript==

(function() {
    "use strict";

    // ── 配置参数 ──
    const CONFIG = {
        POLL_INTERVAL_MS: 200,      // 轮询间隔从50ms提升到200ms（减少80%的轮询次数）
        MAX_POLL_COUNT: 25,         // 最大轮询次数（200*25=5秒超时）
        DEBOUNCE_DELAY_MS: 100,     // 刷新防抖延迟
        MAX_REFRESH_CALLS: 3,       // 单次操作最多刷新次数
    };

    window.blockTripleCombine = true;

    // ── 速度 ──
    if (typeof TavernChessGameContext !== "undefined" && TavernChessGameContext.Speed !== undefined) {
        TavernChessGameContext.Speed = 2;
    }

    // ── 工具函数 ──
    function search(obj) {
        if (!obj) return null;
        if (obj.constructor && obj.constructor.name === "TavernChessGameScene") return obj;
        if (obj._children) {
            for (let child of obj._children) {
                const r = search(child);
                if (r) return r;
            }
        }
        return null;
    }

    function getScene() {
        try { return search(Laya.stage); } catch(e) { return null; }
    }

    function getManager() {
        const s = getScene();
        return s ? s.manager : null;
    }

    // ── 防抖刷新（合并多个刷新请求） ──
    let refreshDebounceTimer = null;
    let pendingRefreshFlags = { hand: false, battle: false };

    function scheduleRefresh(type, source) {
        pendingRefreshFlags[type] = true;
        if (refreshDebounceTimer) return;

        refreshDebounceTimer = setTimeout(function() {
            const scene = getScene();
            if (!scene) {
                refreshDebounceTimer = null;
                pendingRefreshFlags = { hand: false, battle: false };
                return;
            }

            // 批量执行所有待刷新操作
            if (pendingRefreshFlags.hand && scene.cardView) {
                try {
                    if (typeof scene.cardView.Calibration === 'function') {
                        scene.cardView.Calibration(true);
                    }
                } catch(e) {}
            }

            if (pendingRefreshFlags.battle && scene.chessView) {
                try {
                    if (typeof scene.chessView.Calibration === 'function') {
                        scene.chessView.Calibration(true);
                    }
                } catch(e) {}
            }

            // 触发事件（只触发一次）
            const mgr = getManager();
            if (mgr && typeof mgr.event === 'function') {
                mgr.event('UI_UPDATE_HAND_CARD');
                mgr.event('ANI_LINE_UP');
            }

            refreshDebounceTimer = null;
            pendingRefreshFlags = { hand: false, battle: false };
        }, CONFIG.DEBOUNCE_DELAY_MS);
    }

    // ── 三连补丁 ──
    let triplePatched = false;

    function patchTriple() {
        if (triplePatched) return;
        try {
            const mgr = getManager();
            if (!mgr || !mgr.constructor || !mgr.constructor.prototype) {
                setTimeout(patchTriple, 200);
                return;
            }
            const proto = mgr.constructor.prototype;
            const origCheck = proto.checkSanLianReq;
            const origComposite = proto.ReqChessComposite;
            if (!origCheck || !origComposite) {
                setTimeout(patchTriple, 200);
                return;
            }
            proto.checkSanLianReq = function() {
                if (window.blockTripleCombine !== false) {
                    return;
                }
                return origCheck.call(this);
            };
            proto.ReqChessComposite = function(goodsIDs) {
                if (window.blockTripleCombine !== false) {
                    return;
                }
                return origComposite.call(this, goodsIDs);
            };
            triplePatched = true;
        } catch(e) {
            setTimeout(patchTriple, 200);
        }
    }
    patchTriple();

    // ── 事件绑定（只绑定一次） ──
    let eventBound = false;

    function bindEvents() {
        if (eventBound) return;
        const mgr = getManager();
        if (!mgr || typeof mgr.on !== "function") {
            setTimeout(bindEvents, 500);
            return;
        }
        // 使用防抖刷新替代直接刷新
        mgr.on('ANI_SHOP_BUY', this, function(goodsID) {
            scheduleRefresh('hand', 'event');
            scheduleRefresh('battle', 'event');
        });
        mgr.on('ANI_CHESS_RECYCLE', this, function(goodsID) {
            scheduleRefresh('hand', 'event');
            scheduleRefresh('battle', 'event');
        });
        mgr.on('ANI_LINE_UP', this, function(result) {
            scheduleRefresh('hand', 'event');
            scheduleRefresh('battle', 'event');
        });
        eventBound = true;
    }

    // ── 上阵最右侧卡牌（优化版） ──
    function deployRightmostCard() {
        const mgr = getManager();
        if (!mgr) {
            showToast("管理器未就绪");
            return false;
        }
        if (mgr.phase !== 6) {
            showToast("非招募阶段");
            return false;
        }
        if (!mgr.CanOperate) {
            showToast("不可操作");
            return false;
        }

        const hand = mgr.HandChess;
        if (!hand || hand.length === 0) {
            showToast("手牌为空");
            return false;
        }

        // 从右向左找第一个可上阵的棋子（非锦囊）
        let cardIndex = -1;
        let card = null;
        for (let i = hand.length - 1; i >= 0; i--) {
            const c = hand[i];
            if (c && (c.chessID || c.ChessID) && (c.goodsID || c.GoodsID)) {
                cardIndex = i;
                card = c;
                break;
            }
        }

        if (!card) {
            showToast("手牌无棋子");
            return false;
        }

        const goodsID = card.goodsID || card.GoodsID;
        console.info("[上阵] goodsID=" + goodsID);

        let lineup = mgr.SelfInfo.LineUpGoodsIDs.slice();
        while (lineup.length < 7) lineup.push(0);

        // 检查是否已上阵
        if (lineup.indexOf(goodsID) >= 0) {
            showToast("已在阵上");
            return false;
        }

        const emptyIndex = lineup.indexOf(0);
        if (emptyIndex === -1) {
            showToast("战斗区已满");
            return false;
        }

        lineup[emptyIndex] = goodsID;

        if (typeof mgr.ReqChessLineUp !== "function") {
            showToast("方法缺失");
            return false;
        }

        // 使用防抖刷新替代高频轮询
        mgr.ReqChessLineUp(lineup);
        console.info("[上阵] 请求已发送");

        // 单次延迟刷新（代替轮询）
        setTimeout(function() {
            scheduleRefresh('hand', 'post-lineup');
            scheduleRefresh('battle', 'post-lineup');
        }, 300);

        showToast("上阵成功");
        return true;
    }

    // ── 使用最右侧锦囊（优化版） ──
    function useRightmostSpell() {
        const mgr = getManager();
        if (!mgr) {
            showToast("管理器未就绪");
            return false;
        }
        if (mgr.phase !== 6) {
            showToast("非招募阶段");
            return false;
        }

        const hand = mgr.HandChess;
        if (!hand || hand.length === 0) {
            showToast("手牌为空");
            return false;
        }

        // 从右向左找第一个锦囊
        let spellCard = null;
        let spellGoodsID = 0;
        for (let i = hand.length - 1; i >= 0; i--) {
            const card = hand[i];
            if (card && (card.spellID || card.SpellID)) {
                spellCard = card;
                spellGoodsID = card.goodsID || card.GoodsID || 0;
                break;
            }
        }

        if (!spellCard || !spellGoodsID) {
            showToast("手牌无锦囊");
            return false;
        }

        // 构建目标列表
        const targetList = [];
        const shopGoods = mgr.ShopGoods || [];
        if (shopGoods.length > 0 && shopGoods[0]) {
            const tid = shopGoods[0].goodsID || shopGoods[0].GoodsID || 0;
            if (tid) targetList.push({ id: tid, label: '商店' });
        }

        const lineup = mgr.BattleChess || mgr.selfInfo?.LineUpChess || [];
        for (let i = 0; i < lineup.length; i++) {
            const target = lineup[i];
            if (target) {
                const tid = target.goodsID || target.GoodsID || target.UniqueId || 0;
                if (tid) targetList.push({ id: tid, label: '上阵' + i });
            }
        }

        if (targetList.length === 0) {
            showToast("无可用目标");
            return false;
        }

        let currentIdx = 0;
        let completed = false;
        let timeoutId = null;

        function tryNext() {
            if (completed || currentIdx >= targetList.length) {
                if (!completed) {
                    showToast("锦囊无可用目标");
                }
                return;
            }

            const target = targetList[currentIdx];
            console.info("[锦囊] 尝试目标:", target.label, "id=" + target.id);
            mgr.ReqChessUseSpell(spellGoodsID, [target.id]);
        }

        function onResponse(e) {
            if (completed) return;
            const proto = e.Protocol;
            if (proto && proto.errCode) {
                // 失败，尝试下一个
                currentIdx++;
                tryNext();
            } else {
                // 成功
                completed = true;
                clearTimeout(timeoutId);
                mgr.off('RESP_CHESS_SPELL_USE', onResponse);
                showToast("锦囊使用成功");
                setTimeout(function() {
                    scheduleRefresh('hand', 'spell');
                    scheduleRefresh('battle', 'spell');
                }, 200);
            }
        }

        mgr.on('RESP_CHESS_SPELL_USE', onResponse);

        timeoutId = setTimeout(function() {
            if (!completed) {
                console.warn("[锦囊] 超时，尝试下一个");
                mgr.off('RESP_CHESS_SPELL_USE', onResponse);
                currentIdx++;
                mgr.on('RESP_CHESS_SPELL_USE', onResponse);
                tryNext();
            }
        }, 300);

        tryNext();
        return true;
    }

    // ── 其他功能保持不变 ──
    function skipBattle() {
        try {
            const scene = getScene();
            if (!scene || typeof scene.onJumpBtnClick !== "function") return false;
            const p = scene.manager?.phase;
            if (p === 9) { scene.onJumpBtnClick(); return true; }
            if (p === 7) { scene.onEndRecruitJump(); return true; }
            return false;
        } catch(e) { return false; }
    }

    function refreshShop() {
        const mgr = getManager();
        if (mgr && typeof mgr.ReqShopRefreshChess === "function") {
            mgr.ReqShopRefreshChess();
            showToast("刷新营帐");
            return true;
        }
        return false;
    }

    function lockShop() {
        const mgr = getManager();
        if (mgr && typeof mgr.ReqShopLock === "function") {
            mgr.ReqShopLock();
            showToast("锁定/解锁");
            return true;
        }
        return false;
    }

    function buyChess(index) {
        const mgr = getManager();
        if (!mgr || typeof mgr.ReqShopBuyChess !== "function") return false;
        const goods = mgr.ShopGoods;
        if (!goods || !goods[index]) return false;
        const goodsID = goods[index].goodsID;
        if (!goodsID) return false;

        mgr.ReqShopBuyChess(goodsID);

        // 立即隐藏商店卡片
        try {
            const scene = getScene();
            if (scene && scene.shopView && scene.shopView.cellUIs) {
                const cell = scene.shopView.cellUIs[index];
                if (cell && cell.cardUI) {
                    cell.cardUI.visible = false;
                    cell.cardUI.mouseEnabled = false;
                }
            }
        } catch(e) {}

        // 延迟刷新（防抖）
        setTimeout(function() {
            scheduleRefresh('hand', 'buy');
            scheduleRefresh('battle', 'buy');
        }, 100);

        showToast("买入第" + (index+1) + "格");
        return true;
    }

    function discardRightmostHand() {
        const mgr = getManager();
        if (!mgr) return false;
        const hand = mgr.HandChess;
        if (!hand || hand.length === 0) {
            showToast("手牌为空");
            return false;
        }
        const last = hand[hand.length - 1];
        if (!last || !last.goodsID) return false;

        mgr.ReqShopRecycleChess(last.goodsID);
        showToast("遣散手牌");
        setTimeout(function() {
            scheduleRefresh('hand', 'discard');
            scheduleRefresh('battle', 'discard');
        }, 100);
        return true;
    }

    function discardRightmostBattle() {
        const mgr = getManager();
        if (!mgr) return false;
        const lineup = mgr.SelfInfo.LineUpGoodsIDs;
        if (!lineup || lineup.length === 0) {
            showToast("战斗区为空");
            return false;
        }
        let goodsID = null;
        for (let i = lineup.length - 1; i >= 0; i--) {
            if (lineup[i] !== 0) {
                goodsID = lineup[i];
                break;
            }
        }
        if (!goodsID) {
            showToast("战斗区无棋子");
            return false;
        }
        mgr.ReqShopRecycleChess(goodsID);
        showToast("遣散战斗区");
        setTimeout(function() {
            scheduleRefresh('hand', 'discard-battle');
            scheduleRefresh('battle', 'discard-battle');
        }, 100);
        return true;
    }

    // ── Toast ──
    let toastTimer = null;

    function showToast(text) {
        const old = document.getElementById("sq-toast");
        if (old) old.remove();
        clearTimeout(toastTimer);
        const d = document.createElement("div");
        d.id = "sq-toast";
        d.textContent = text;
        d.style.cssText = "position:fixed;top:35%;left:50%;transform:translate(-50%,-50%);z-index:100000;background:rgba(0,0,0,.75);color:#fff;padding:14px 30px;border-radius:10px;font-size:20px;font-weight:bold;pointer-events:none;user-select:none;transition:opacity .3s";
        document.body.appendChild(d);
        toastTimer = setTimeout(() => { d.style.opacity = "0"; setTimeout(() => d.remove(), 300); }, 600);
    }

    // ── 键盘监听 ──
    function onKeyDown(e) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;

        if (e.code === 'KeyR' && e.shiftKey) {
            e.preventDefault();
            scheduleRefresh('hand', 'manual');
            scheduleRefresh('battle', 'manual');
            showToast("强制刷新UI");
            return;
        }

        if (e.code === 'Digit2' && e.shiftKey) {
            e.preventDefault();
            useRightmostSpell();
            return;
        }

        if (e.key === 'Tab') {
            e.preventDefault();
            window.blockTripleCombine = !window.blockTripleCombine;
            showToast("三连" + (window.blockTripleCombine ? "阻止" : "允许"));
            if (!window.blockTripleCombine) {
                const mgr = getManager();
                if (mgr) {
                    setTimeout(() => {
                        if (typeof mgr.checkSanLianReq === 'function') mgr.checkSanLianReq();
                        if (typeof mgr.checkSanLianAni === 'function') mgr.checkSanLianAni();
                    }, 50);
                }
            }
            return;
        }

        if (e.code === 'Digit1' && e.shiftKey) {
            e.preventDefault();
            discardRightmostHand();
            return;
        }

        if (e.altKey && e.key === "9") {
            e.preventDefault();
            discardRightmostBattle();
            return;
        }

        if (e.altKey && e.key === "0") {
            e.preventDefault();
            deployRightmostCard();
            return;
        }

        if (e.key >= "1" && e.key <= "6") {
            e.preventDefault();
            buyChess(parseInt(e.key) - 1);
            return;
        }

        if (e.key.toLowerCase() === "r") {
            e.preventDefault();
            refreshShop();
            return;
        }

        if (e.key.toLowerCase() === "f") {
            e.preventDefault();
            lockShop();
            return;
        }

        if (e.key === " " || e.key === "Space" || e.code === "Space") {
            e.preventDefault();
            skipBattle();
        }
    }

    // ── 启动 ──
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function() {
            document.addEventListener("keydown", onKeyDown);
            setTimeout(bindEvents, 1000);
        });
    } else {
        document.addEventListener("keydown", onKeyDown);
        setTimeout(bindEvents, 1000);
    }

    console.info("[AutoChess] 优化版已启动 | 轮询间隔200ms | 防抖刷新100ms");
})();