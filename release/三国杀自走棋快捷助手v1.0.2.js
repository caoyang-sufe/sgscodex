// ==UserScript==
// @name         三国杀自走棋全能助手
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  [1-6]购买  [R]刷新  [F]锁定  [Shift+1]遣散手牌最右  [Shift+2]使用最右侧锦囊(自动尝试商店->上阵)  [Alt+9]遣散上阵最右  [Alt+0]上阵手牌最右  [Space]跳过战斗  [Tab]三连开关  [Shift+R]强制刷新  [A]强制完成三连  [E]一键清理非白名单手牌  [Q]打开/关闭辅助面板（白名单配置+自动购买）
// @author       鲁班大王 魏东离 江海常流
// @email        caoyang@stu.sufe.edu.cn
// @match        https://game.4399iw2.com/yxxsgs/*
// @match        *://*.sanguosha.com/10/*
// @match        *://*.sanguosha.com/x/*
// @match        *://*.sanguosha.com/10th/*
// @match        https://wan.baidu.com/*gameId=19793616*
// @match        *://h5.7k7k.com/web/H5GAMES.html?gid=960982bec2f555de44ea43ca8a7ef418/*
// @match        *://qqgame.qq.com/webappframe/?appid=10951
// @match        *://s118.app1107877410.qqopenapp.com/pc/qqLobby_index.php*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    "use strict";

    // ──────────────────────────────────────────────
    // 模块 1：原有基础功能（保持原样，部分增强）
    // ──────────────────────────────────────────────

    window.blockTripleCombine = true;

    if (typeof TavernChessGameContext !== "undefined" && TavernChessGameContext.Speed !== undefined) {
        TavernChessGameContext.Speed = 2;
        console.info("[Speed] 2x");
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

    // ── Toast 提示（复用） ──
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

    // ── 刷新视图 ──
    function refreshBattleView(source) {
        source = source || "unknown";
        try {
            const scene = getScene();
            if (!scene || !scene.chessView) return false;
            if (typeof scene.chessView.Calibration === "function") {
                scene.chessView.Calibration(true);
                console.info("[战斗区刷新] Calibration(true) 调用，来源: " + source);
                return true;
            }
            return false;
        } catch(e) {
            console.warn("[战斗区刷新] 异常", e);
            return false;
        }
    }

    function refreshHandView(targetGoodsID, source) {
        source = source || "unknown";
        try {
            const scene = getScene();
            if (!scene || !scene.cardView) return false;
            let refreshed = false;

            if (targetGoodsID !== undefined) {
                const cardView = scene.cardView;
                for (let i = 0; i < cardView.numChildren; i++) {
                    const child = cardView.getChildAt(i);
                    if (child && child.goodsID === targetGoodsID) {
                        child.visible = false;
                        child.mouseEnabled = false;
                        console.info("[手牌刷新] 直接隐藏卡片 goodsID=" + targetGoodsID + "，来源: " + source);
                        refreshed = true;
                    }
                }
            }

            if (typeof scene.cardView.Calibration === "function") {
                scene.cardView.Calibration(true);
                console.info("[手牌刷新] Calibration(true) 调用，来源: " + source);
                refreshed = true;
            }
            if (typeof scene.cardView.UpdateHandCards === "function") {
                scene.cardView.UpdateHandCards();
                console.info("[手牌刷新] UpdateHandCards 调用，来源: " + source);
                refreshed = true;
            }
            if (typeof scene.cardView.Refresh === "function") {
                scene.cardView.Refresh();
                console.info("[手牌刷新] Refresh 调用，来源: " + source);
                refreshed = true;
            }
            if (typeof scene.cardView.Reload === "function") {
                scene.cardView.Reload();
                console.info("[手牌刷新] Reload 调用，来源: " + source);
                refreshed = true;
            }

            const mgr = getManager();
            if (mgr && typeof mgr.event === "function") {
                mgr.event('UI_UPDATE_HAND_CARD');
                mgr.event('ANI_LINE_UP');
                console.info("[手牌刷新] 手动触发事件，来源: " + source);
            }

            setTimeout(() => {
                if (scene.cardView && typeof scene.cardView.Calibration === "function") {
                    scene.cardView.Calibration(true);
                    console.info("[手牌刷新] 延迟 Calibration(true) 调用，来源: " + source);
                }
            }, 50);

            return refreshed;
        } catch(e) {
            console.warn("[手牌刷新] 异常", e);
            return false;
        }
    }

    // ── 三连补丁（与原来一致） ──
    let triplePatched = false;
    let patchRetryCount = 0;
    const MAX_PATCH_RETRIES = 300;
    function patchTriple() {
        if (triplePatched) return;
        if (patchRetryCount > MAX_PATCH_RETRIES) return;
        try {
            const mgr = getManager();
            if (!mgr || !mgr.constructor || !mgr.constructor.prototype) {
                patchRetryCount++;
                setTimeout(patchTriple, 1000);
                return;
            }
            const proto = mgr.constructor.prototype;
            const origCheck = proto.checkSanLianReq;
            const origComposite = proto.ReqChessComposite;
            if (!origCheck || !origComposite) {
                patchRetryCount++;
                setTimeout(patchTriple, 500);
                return;
            }
            proto.checkSanLianReq = function() {
                if (window.blockTripleCombine !== false) return;
                return origCheck.call(this);
            };
            proto.ReqChessComposite = function(goodsIDs) {
                if (window.blockTripleCombine !== false) return;
                return origComposite.call(this, goodsIDs);
            };
            triplePatched = true;
            console.info("[三连] 补丁应用成功，当前状态:", window.blockTripleCombine ? "阻止" : "允许");
        } catch(e) {
            patchRetryCount++;
            setTimeout(patchTriple, 500);
        }
    }
    patchTriple();

    // ── 原有功能函数 ──
    function forceCompleteTriple() {
        const mgr = getManager();
        if (!mgr) {
            showToast("管理器未就绪");
            console.warn("[三连完成] 管理器不存在");
            return false;
        }
        console.info("[三连完成] 开始强制完成...");
        let selected = false;
        if (mgr.WaitSelectCards && mgr.WaitSelectCards.length > 0) {
            console.info("[三连完成] 检测到待选择卡牌:", mgr.WaitSelectCards.length);
            const firstCard = mgr.WaitSelectCards[0];
            if (firstCard && firstCard.ServerInfo) {
                const goodsID = firstCard.ServerInfo.goodsID || firstCard.ServerInfo.GoodsID;
                if (goodsID && typeof mgr.ReqSelectOtherChess === 'function') {
                    mgr.ReqSelectOtherChess(goodsID, false);
                    console.info("[三连完成] 已选择奖励 goodsID:", goodsID);
                    selected = true;
                    showToast("三连奖励已选择");
                }
            } else if (firstCard && firstCard.CardVO) {
                const cardID = firstCard.CardVO.CardID;
                if (cardID && typeof mgr.ReqChessSelectSpellID === 'function') {
                    mgr.ReqChessSelectSpellID(cardID, false);
                    console.info("[三连完成] 已选择奖励 cardID:", cardID);
                    selected = true;
                    showToast("三连奖励已选择");
                }
            }
            if (selected) {
                try {
                    if (WindowManager && WindowManager.GetInstance) {
                        const win = WindowManager.GetInstance().GetInstanceWindow('TavernChessSelectCardWindow');
                        if (win && win.visible) {
                            win.Close();
                            console.info("[三连完成] 已关闭选择窗口");
                        }
                    }
                } catch(e) {}
            }
        } else {
            console.info("[三连完成] 无待选择卡牌");
        }

        try {
            if (Laya && Laya.stage) {
                function findAni(o) {
                    if (!o) return null;
                    if (o.constructor && o.constructor.name === 'TavernChessCompositeAni') {
                        return o;
                    }
                    const c = o._children || o.children || o.childList;
                    if (c) {
                        for (let i = 0; i < c.length; i++) {
                            const r = findAni(c[i]);
                            if (r) return r;
                        }
                    }
                    if (typeof o.numChildren === 'number' && typeof o.getChildAt === 'function') {
                        for (let i = 0; i < o.numChildren; i++) {
                            try {
                                const r = findAni(o.getChildAt(i));
                                if (r) return r;
                            } catch(e) {}
                        }
                    }
                    return null;
                }
                const ani = findAni(Laya.stage);
                if (ani) {
                    console.info("[三连完成] 跳过三联合成动画");
                    ani.destroy();
                }
            }
        } catch(e) {
            console.warn("[三连完成] 跳过动画失败:", e.message);
        }

        setTimeout(() => {
            refreshHandView(undefined, "tripleComplete");
            refreshBattleView("tripleComplete");
            if (typeof mgr.SendEvent === 'function') {
                mgr.SendEvent('UI_UPDATE_HAND_CARD_NUM');
                mgr.SendEvent('UI_UPDATE_HAND_CARD');
                mgr.SendEvent('UI_UPDATE_LINEUP_TIP');
            }
            if (typeof mgr.event === 'function') {
                mgr.event('UI_UPDATE_HAND_CARD_NUM');
                mgr.event('UI_UPDATE_HAND_CARD');
                mgr.event('UI_UPDATE_LINEUP_TIP');
            }
            console.info("[三连完成] UI刷新完成");
        }, 50);
        console.info("[三连完成] 执行完成");
        return true;
    }

    function skipBattle() {
        try {
            const scene = getScene();
            if (!scene || typeof scene.onJumpBtnClick !== "function") {
                console.info("[跳过] 场景未就绪"); return false;
            }
            const p = scene.manager?.phase;
            if (p === 9) { scene.onJumpBtnClick(); return true; }
            if (p === 7) { scene.onEndRecruitJump(); return true; }
            console.info("[跳过] 当前阶段:", p); return false;
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
        if (!goods || !goods[index]) {
            console.info("[买入] 格子", index+1, "无商品");
            return false;
        }
        const goodsID = goods[index].goodsID;
        if (!goodsID) return false;

        const scene = getScene();
        mgr.ReqShopBuyChess(goodsID);

        try {
            if (scene && scene.shopView && scene.shopView.cellUIs) {
                const cell = scene.shopView.cellUIs[index];
                if (cell && cell.cardUI) {
                    cell.cardUI.visible = false;
                    cell.cardUI.mouseEnabled = false;
                }
            }
        } catch(e) {}

        console.info("[买入] 格子", index+1, "goodsID=", goodsID);
        showToast("买入第" + (index+1) + "格");
        return true;
    }

    function discardRightmostHand() {
        const mgr = getManager();
        if (!mgr) {
            console.warn("[遣散手牌] 管理器不存在");
            return false;
        }
        const hand = mgr.HandChess;
        if (!hand || hand.length === 0) {
            showToast("手牌为空");
            return false;
        }
        const last = hand[hand.length - 1];
        if (!last || !last.goodsID) {
            console.warn("[遣散手牌] 最右侧棋子无效");
            return false;
        }
        const goodsID = last.goodsID;
        if (typeof mgr.ReqShopRecycleChess !== "function") {
            console.warn("[遣散手牌] ReqShopRecycleChess 方法不存在");
            return false;
        }
        mgr.ReqShopRecycleChess(goodsID);
        console.info("[遣散手牌] 请求已发送，goodsID=", goodsID);
        showToast("遣散手牌最右侧");
        return true;
    }

    function discardRightmostBattle() {
        const mgr = getManager();
        if (!mgr) {
            console.warn("[遣散战斗区] 管理器不存在");
            return false;
        }
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
        if (typeof mgr.ReqShopRecycleChess !== "function") {
            console.warn("[遣散战斗区] ReqShopRecycleChess 方法不存在");
            return false;
        }
        mgr.ReqShopRecycleChess(goodsID);
        console.info("[遣散战斗区] 请求已发送，goodsID=", goodsID);
        showToast("遣散战斗区最右侧");
        refreshBattleView("manual");
        return true;
    }

    function deployRightmostCard() {
        const mgr = getManager();
        if (!mgr) {
            showToast("管理器未就绪");
            console.error("[上阵] 管理器未就绪");
            return false;
        }
        if (mgr.phase !== 6) {
            showToast("非招募阶段");
            console.warn("[上阵] 当前阶段非招募，phase=" + mgr.phase);
            return false;
        }
        if (!mgr.CanOperate) {
            showToast("不可操作");
            console.warn("[上阵] CanOperate 为 false");
            return false;
        }
        const hand = mgr.HandChess;
        if (!hand || hand.length === 0) {
            showToast("手牌为空");
            console.warn("[上阵] 手牌为空");
            return false;
        }
        const last = hand[hand.length - 1];
        if (!last || !last.goodsID) {
            showToast("无效卡牌");
            console.warn("[上阵] 最右侧卡牌无效", last);
            return false;
        }
        const goodsID = last.goodsID;
        console.info("[上阵调试] 待上阵 goodsID=", goodsID);

        let lineup = mgr.SelfInfo.LineUpGoodsIDs.slice();
        console.info("[上阵调试] 原始阵容 (长度=" + lineup.length + "):", lineup);

        while (lineup.length < 7) {
            lineup.push(0);
        }
        console.info("[上阵调试] 补齐后阵容 (长度=7):", lineup);

        const emptyIndex = lineup.indexOf(0);
        if (emptyIndex === -1) {
            showToast("战斗区已满");
            console.warn("[上阵调试] 无空位，上阵失败");
            return false;
        }
        lineup[emptyIndex] = goodsID;
        console.info("[上阵调试] 放入后阵容:", lineup);

        if (typeof mgr.ReqChessLineUp !== "function") {
            showToast("ReqChessLineUp 方法不存在");
            console.error("[上阵] 方法缺失");
            return false;
        }

        let pollInterval = null;
        let pollCount = 0;
        const MAX_POLL = 10;
        const POLL_INTERVAL_MS = 100;

        const stopPolling = () => {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
                console.info("[上阵] 轮询停止");
            }
        };

        const checkHand = () => {
            pollCount++;
            const currentHand = mgr.HandChess;
            let found = false;
            if (currentHand) {
                for (let i = 0; i < currentHand.length; i++) {
                    if (currentHand[i] && currentHand[i].goodsID === goodsID) {
                        found = true;
                        break;
                    }
                }
            }
            if (!found) {
                console.info("[上阵] 检测到手牌已移除 goodsID=" + goodsID + "，刷新UI (来源: polling)");
                setTimeout(() => {
                    refreshHandView(goodsID, "polling");
                    refreshBattleView("polling");
                }, 50);
                stopPolling();
            } else if (pollCount >= MAX_POLL) {
                console.warn("[上阵] 轮询超时，手牌未变化，强制刷新一次");
                refreshHandView(goodsID, "polling");
                refreshBattleView("polling");
                stopPolling();
            }
        };

        pollInterval = setInterval(checkHand, POLL_INTERVAL_MS);
        setTimeout(checkHand, 0);

        const onHandUpdate = function() {
            console.info("[上阵事件] UI_UPDATE_HAND_CARD 触发，刷新UI");
            setTimeout(() => {
                refreshHandView(goodsID, "event");
                refreshBattleView("event");
            }, 50);
            mgr.off('UI_UPDATE_HAND_CARD', onHandUpdate);
        };
        const onLineUp = function(result) {
            console.info("[上阵事件] ANI_LINE_UP 触发，result:", result);
            setTimeout(() => {
                refreshHandView(goodsID, "event");
                refreshBattleView("event");
            }, 50);
            mgr.off('ANI_LINE_UP', onLineUp);
        };
        const onHandNumUpdate = function() {
            console.info("[上阵事件] UI_UPDATE_HAND_CARD_NUM 触发，刷新UI");
            setTimeout(() => {
                refreshHandView(goodsID, "event");
                refreshBattleView("event");
            }, 50);
            mgr.off('UI_UPDATE_HAND_CARD_NUM', onHandNumUpdate);
        };
        mgr.on('UI_UPDATE_HAND_CARD', onHandUpdate);
        mgr.on('ANI_LINE_UP', onLineUp);
        mgr.on('UI_UPDATE_HAND_CARD_NUM', onHandNumUpdate);

        mgr.ReqChessLineUp(lineup);
        console.info("[上阵] 请求已发送，开始轮询检测（50ms间隔）...");

        setTimeout(() => {
            if (pollInterval) {
                console.warn("[上阵] 1秒超时，强制停止轮询并刷新");
                stopPolling();
                refreshHandView(goodsID, "polling");
                refreshBattleView("polling");
            }
        }, 1000);

        return true;
    }

    function useRightmostSpell() {
        const mgr = getManager();
        if (!mgr) {
            showToast("管理器未就绪");
            console.warn("[使用锦囊] 管理器不存在");
            return false;
        }
        if (mgr.phase !== 6) {
            showToast("非招募阶段");
            console.warn("[使用锦囊] 当前阶段非招募，phase=" + mgr.phase);
            return false;
        }
        const hand = mgr.HandChess;
        if (!hand || hand.length === 0) {
            showToast("手牌为空");
            console.warn("[使用锦囊] 手牌为空");
            return false;
        }

        let spellIndex = -1;
        let spellCard = null;
        let spellGoodsID = 0;
        for (let i = hand.length - 1; i >= 0; i--) {
            const card = hand[i];
            if (card && (card.spellID || card.SpellID)) {
                spellIndex = i;
                spellCard = card;
                spellGoodsID = card.goodsID || card.GoodsID || 0;
                break;
            }
        }

        if (spellIndex === -1 || !spellCard || !spellGoodsID) {
            showToast("手牌最右侧无锦囊");
            console.warn("[使用锦囊] 手牌中无锦囊牌");
            return false;
        }

        console.info("[使用锦囊] 找到锦囊 index=" + spellIndex + ", goodsID=" + spellGoodsID);

        const targetList = [];
        const shopGoods = mgr.ShopGoods || [];
        if (shopGoods.length > 0 && shopGoods[0]) {
            const tid = shopGoods[0].goodsID || shopGoods[0].GoodsID || 0;
            if (tid) {
                targetList.push({
                    id: tid,
                    label: '商店',
                    type: 'shop'
                });
            }
        }

        const lineup = mgr.BattleChess || mgr.selfInfo?.LineUpChess || [];
        for (let i = 0; i < lineup.length; i++) {
            const target = lineup[i];
            if (target) {
                const tid = target.goodsID || target.GoodsID || target.UniqueId || 0;
                if (tid) {
                    targetList.push({
                        id: tid,
                        label: '上阵位置' + i,
                        type: 'lineup',
                        index: i
                    });
                }
            }
        }

        if (targetList.length === 0) {
            showToast("无可用目标");
            console.warn("[使用锦囊] 无可用目标");
            return false;
        }

        console.info("[使用锦囊] 目标列表:", targetList.map(t => t.label).join(' -> '));

        let currentTargetIdx = 0;
        let isCompleted = false;
        let timeoutId = null;

        function onSpellResponse(e) {
            if (isCompleted) return;
            const proto = e.Protocol;
            if (proto.errCode) {
                console.warn("[使用锦囊] 目标失败, errCode=" + proto.errCode);
                currentTargetIdx++;
                tryNextTarget();
            } else {
                isCompleted = true;
                clearTimeout(timeoutId);
                mgr.off('RESP_CHESS_SPELL_USE', onSpellResponse);
                console.info("[使用锦囊] 使用成功！");
                showToast("使用锦囊成功");
            }
        }

        function tryNextTarget() {
            if (isCompleted) return;
            if (currentTargetIdx >= targetList.length) {
                isCompleted = true;
                mgr.off('RESP_CHESS_SPELL_USE', onSpellResponse);
                showToast("锦囊无可用目标");
                console.warn("[使用锦囊] 所有目标均失败");
                return;
            }
            const target = targetList[currentTargetIdx];
            console.info("[使用锦囊] 尝试目标 " + currentTargetIdx + ": " + target.label + " (id=" + target.id + ")");
            if (typeof mgr.ReqChessUseSpell !== 'function') {
                showToast("ReqChessUseSpell 方法不存在");
                isCompleted = true;
                mgr.off('RESP_CHESS_SPELL_USE', onSpellResponse);
                return;
            }
            mgr.ReqChessUseSpell(spellGoodsID, [target.id]);
        }

        mgr.on('RESP_CHESS_SPELL_USE', onSpellResponse);
        timeoutId = setTimeout(function() {
            if (isCompleted) return;
            console.warn("[使用锦囊] 超时，尝试下一个目标");
            mgr.off('RESP_CHESS_SPELL_USE', onSpellResponse);
            currentTargetIdx++;
            mgr.on('RESP_CHESS_SPELL_USE', onSpellResponse);
            tryNextTarget();
        }, 100);

        tryNextTarget();
        return true;
    }

    // ── 事件绑定（增强：购买/遣散后刷新UI） ──
    let eventBound = false;
    function bindEvents() {
        if (eventBound) return;
        const mgr = getManager();
        if (!mgr || typeof mgr.on !== "function") {
            setTimeout(bindEvents, 500);
            return;
        }
        mgr.on('ANI_SHOP_BUY', this, function(goodsID) {
            console.info("[事件] 购买成功", goodsID);
            setTimeout(() => {
                refreshHandView(undefined, "event");
                refreshBattleView("event");
            }, 50);
        });
        mgr.on('ANI_CHESS_RECYCLE', this, function(goodsID) {
            console.info("[事件] 遣散成功", goodsID);
            setTimeout(() => {
                refreshHandView(undefined, "event");
                refreshBattleView("event");
            }, 50);
        });
        eventBound = true;
        console.info("[事件] 绑定完成 (ANI_SHOP_BUY, ANI_CHESS_RECYCLE)");
    }

    // ──────────────────────────────────────────────
    // 模块 2：新增功能（来自第二个脚本）
    // ──────────────────────────────────────────────

    // ── 棋子数据（完整） ──
    const CHESS_DATA = [
        {id: 21001011, name: "曹休", rank: 1, faction: "魏"}, {id: 21001012, name: "曹休", rank: 1, faction: "魏"},
        {id: 21001021, name: "夏侯惇", rank: 1, faction: "魏"}, {id: 21001022, name: "夏侯惇", rank: 1, faction: "魏"},
        {id: 21001031, name: "邓艾", rank: 2, faction: "魏"}, {id: 21001032, name: "邓艾", rank: 2, faction: "魏"},
        {id: 21001041, name: "夏侯渊", rank: 2, faction: "魏"}, {id: 21001042, name: "夏侯渊", rank: 2, faction: "魏"},
        {id: 21001051, name: "曹轶", rank: 2, faction: "魏"}, {id: 21001052, name: "曹轶", rank: 2, faction: "魏"},
        {id: 21001061, name: "薛灵芸", rank: 3, faction: "魏"}, {id: 21001062, name: "薛灵芸", rank: 3, faction: "魏"},
        {id: 21001071, name: "典韦", rank: 3, faction: "魏"}, {id: 21001072, name: "典韦", rank: 3, faction: "魏"},
        {id: 21001081, name: "郭嘉", rank: 3, faction: "魏"}, {id: 21001082, name: "郭嘉", rank: 3, faction: "魏"},
        {id: 21001091, name: "许褚", rank: 3, faction: "魏"}, {id: 21001092, name: "许褚", rank: 3, faction: "魏"},
        {id: 21001101, name: "荀彧", rank: 4, faction: "魏"}, {id: 21001102, name: "荀彧", rank: 4, faction: "魏"},
        {id: 21001111, name: "甄姬", rank: 4, faction: "魏"}, {id: 21001112, name: "甄姬", rank: 4, faction: "魏"},
        {id: 21001121, name: "曹仁", rank: 4, faction: "魏"}, {id: 21001122, name: "曹仁", rank: 4, faction: "魏"},
        {id: 21001131, name: "曹昂", rank: 4, faction: "魏"}, {id: 21001132, name: "曹昂", rank: 4, faction: "魏"},
        {id: 21001141, name: "戏志才", rank: 4, faction: "魏"}, {id: 21001142, name: "戏志才", rank: 4, faction: "魏"},
        {id: 21001151, name: "曹金玉", rank: 5, faction: "魏"}, {id: 21001152, name: "曹金玉", rank: 5, faction: "魏"},
        {id: 21001161, name: "司马懿", rank: 5, faction: "魏"}, {id: 21001162, name: "司马懿", rank: 5, faction: "魏"},
        {id: 21001171, name: "张郃", rank: 5, faction: "魏"}, {id: 21001172, name: "张郃", rank: 5, faction: "魏"},
        {id: 21001181, name: "张辽", rank: 5, faction: "魏"}, {id: 21001182, name: "张辽", rank: 5, faction: "魏"},
        {id: 21001191, name: "田尚衣", rank: 6, faction: "魏"}, {id: 21001192, name: "田尚衣", rank: 6, faction: "魏"},
        {id: 21001201, name: "钟会", rank: 6, faction: "魏"}, {id: 21001202, name: "钟会", rank: 6, faction: "魏"},
        {id: 21001211, name: "程昱", rank: 6, faction: "魏"}, {id: 21001212, name: "程昱", rank: 6, faction: "魏"},
        {id: 21001221, name: "曹丕", rank: 6, faction: "魏"}, {id: 21001222, name: "曹丕", rank: 6, faction: "魏"},
        {id: 21002021, name: "张星彩", rank: 1, faction: "蜀"}, {id: 21002022, name: "张星彩", rank: 1, faction: "蜀"},
        {id: 21002031, name: "关银屏", rank: 1, faction: "蜀"}, {id: 21002032, name: "关银屏", rank: 1, faction: "蜀"},
        {id: 21002041, name: "关羽", rank: 2, faction: "蜀"}, {id: 21002042, name: "关羽", rank: 2, faction: "蜀"},
        {id: 21002051, name: "糜竺", rank: 2, faction: "蜀"}, {id: 21002052, name: "糜竺", rank: 2, faction: "蜀"},
        {id: 21002061, name: "魏延", rank: 2, faction: "蜀"}, {id: 21002062, name: "魏延", rank: 2, faction: "蜀"},
        {id: 21002071, name: "刘禅", rank: 3, faction: "蜀"}, {id: 21002072, name: "刘禅", rank: 3, faction: "蜀"},
        {id: 21002081, name: "廖化", rank: 3, faction: "蜀"}, {id: 21002082, name: "廖化", rank: 3, faction: "蜀"},
        {id: 21002091, name: "周仓", rank: 3, faction: "蜀"}, {id: 21002092, name: "周仓", rank: 3, faction: "蜀"},
        {id: 21002101, name: "赵云", rank: 3, faction: "蜀"}, {id: 21002102, name: "赵云", rank: 3, faction: "蜀"},
        {id: 21002111, name: "关兴", rank: 4, faction: "蜀"}, {id: 21002112, name: "关兴", rank: 4, faction: "蜀"},
        {id: 21002121, name: "徐庶", rank: 4, faction: "蜀"}, {id: 21002122, name: "徐庶", rank: 4, faction: "蜀"},
        {id: 21002131, name: "诸葛亮", rank: 4, faction: "蜀"}, {id: 21002132, name: "诸葛亮", rank: 4, faction: "蜀"},
        {id: 21002141, name: "黄忠", rank: 4, faction: "蜀"}, {id: 21002142, name: "黄忠", rank: 4, faction: "蜀"},
        {id: 21002151, name: "赵襄", rank: 4, faction: "蜀"}, {id: 21002152, name: "赵襄", rank: 4, faction: "蜀"},
        {id: 21002161, name: "张飞", rank: 5, faction: "蜀"}, {id: 21002162, name: "张飞", rank: 5, faction: "蜀"},
        {id: 21002171, name: "庞统", rank: 5, faction: "蜀"}, {id: 21002172, name: "庞统", rank: 5, faction: "蜀"},
        {id: 21002181, name: "黄月英", rank: 5, faction: "蜀"}, {id: 21002182, name: "黄月英", rank: 5, faction: "蜀"},
        {id: 21002191, name: "张苞", rank: 5, faction: "蜀"}, {id: 21002192, name: "张苞", rank: 5, faction: "蜀"},
        {id: 21002201, name: "刘永", rank: 6, faction: "蜀"}, {id: 21002202, name: "刘永", rank: 6, faction: "蜀"},
        {id: 21002211, name: "法正", rank: 6, faction: "蜀"}, {id: 21002212, name: "法正", rank: 6, faction: "蜀"},
        {id: 21002221, name: "姜维", rank: 6, faction: "蜀"}, {id: 21002222, name: "姜维", rank: 6, faction: "蜀"},
        {id: 21002231, name: "秦宓", rank: 6, faction: "蜀"}, {id: 21002232, name: "秦宓", rank: 6, faction: "蜀"},
        {id: 21003011, name: "吕蒙", rank: 1, faction: "吴"}, {id: 21003012, name: "吕蒙", rank: 1, faction: "吴"},
        {id: 21003021, name: "陈武", rank: 1, faction: "吴"}, {id: 21003022, name: "陈武", rank: 1, faction: "吴"},
        {id: 21003031, name: "陆逊", rank: 2, faction: "吴"}, {id: 21003032, name: "陆逊", rank: 2, faction: "吴"},
        {id: 21003041, name: "程普", rank: 2, faction: "吴"}, {id: 21003042, name: "程普", rank: 2, faction: "吴"},
        {id: 21003051, name: "丁奉", rank: 2, faction: "吴"}, {id: 21003052, name: "丁奉", rank: 2, faction: "吴"},
        {id: 21003061, name: "凌统", rank: 3, faction: "吴"}, {id: 21003062, name: "凌统", rank: 3, faction: "吴"},
        {id: 21003071, name: "黄盖", rank: 3, faction: "吴"}, {id: 21003072, name: "黄盖", rank: 3, faction: "吴"},
        {id: 21003081, name: "葛玄", rank: 3, faction: "吴"}, {id: 21003082, name: "葛玄", rank: 3, faction: "吴"},
        {id: 21003091, name: "周善", rank: 3, faction: "吴"}, {id: 21003092, name: "周善", rank: 3, faction: "吴"},
        {id: 21003101, name: "徐盛", rank: 4, faction: "吴"}, {id: 21003102, name: "徐盛", rank: 4, faction: "吴"},
        {id: 21003111, name: "甘宁", rank: 4, faction: "吴"}, {id: 21003112, name: "甘宁", rank: 4, faction: "吴"},
        {id: 21003121, name: "太史慈", rank: 4, faction: "吴"}, {id: 21003122, name: "太史慈", rank: 4, faction: "吴"},
        {id: 21003131, name: "张昭", rank: 4, faction: "吴"}, {id: 21003132, name: "张昭", rank: 4, faction: "吴"},
        {id: 21003141, name: "大乔", rank: 4, faction: "吴"}, {id: 21003142, name: "大乔", rank: 4, faction: "吴"},
        {id: 21003151, name: "孙坚", rank: 5, faction: "吴"}, {id: 21003152, name: "孙坚", rank: 5, faction: "吴"},
        {id: 21003161, name: "鲁肃", rank: 5, faction: "吴"}, {id: 21003162, name: "鲁肃", rank: 5, faction: "吴"},
        {id: 21003171, name: "孙尚香", rank: 5, faction: "吴"}, {id: 21003172, name: "孙尚香", rank: 5, faction: "吴"},
        {id: 21003191, name: "孙翎鸾", rank: 5, faction: "吴"}, {id: 21003192, name: "孙翎鸾", rank: 5, faction: "吴"},
        {id: 21003201, name: "周瑜", rank: 6, faction: "吴"}, {id: 21003202, name: "周瑜", rank: 6, faction: "吴"},
        {id: 21003211, name: "孙策", rank: 6, faction: "吴"}, {id: 21003212, name: "孙策", rank: 6, faction: "吴"},
        {id: 21003221, name: "小乔", rank: 6, faction: "吴"}, {id: 21003222, name: "小乔", rank: 6, faction: "吴"},
        {id: 21003231, name: "韩当", rank: 6, faction: "吴"}, {id: 21003232, name: "韩当", rank: 6, faction: "吴"},
        {id: 21003241, name: "董袭", rank: 1, faction: "吴"}, {id: 21003242, name: "董袭", rank: 1, faction: "吴"},
        {id: 21004011, name: "邓茂", rank: 2, faction: "黄巾"}, {id: 21004012, name: "邓茂", rank: 2, faction: "黄巾"},
        {id: 21004021, name: "眭固", rank: 1, faction: "黄巾"}, {id: 21004022, name: "眭固", rank: 1, faction: "黄巾"},
        {id: 21004031, name: "陶升", rank: 1, faction: "黄巾"}, {id: 21004032, name: "陶升", rank: 1, faction: "黄巾"},
        {id: 21004041, name: "程远志", rank: 2, faction: "黄巾"}, {id: 21004042, name: "程远志", rank: 2, faction: "黄巾"},
        {id: 21004051, name: "波才", rank: 2, faction: "黄巾"}, {id: 21004052, name: "波才", rank: 2, faction: "黄巾"},
        {id: 21004061, name: "严政", rank: 3, faction: "黄巾"}, {id: 21004062, name: "严政", rank: 3, faction: "黄巾"},
        {id: 21004071, name: "何曼", rank: 3, faction: "黄巾"}, {id: 21004072, name: "何曼", rank: 3, faction: "黄巾"},
        {id: 21004081, name: "裴元绍", rank: 3, faction: "黄巾"}, {id: 21004082, name: "裴元绍", rank: 3, faction: "黄巾"},
        {id: 21004091, name: "刘辟", rank: 3, faction: "黄巾"}, {id: 21004092, name: "刘辟", rank: 3, faction: "黄巾"},
        {id: 21004101, name: "卜巳", rank: 4, faction: "黄巾"}, {id: 21004102, name: "卜巳", rank: 4, faction: "黄巾"},
        {id: 21004111, name: "张曼成", rank: 4, faction: "黄巾"}, {id: 21004112, name: "张曼成", rank: 4, faction: "黄巾"},
        {id: 21004121, name: "张闿", rank: 4, faction: "黄巾"}, {id: 21004122, name: "张闿", rank: 4, faction: "黄巾"},
        {id: 21004131, name: "张燕", rank: 4, faction: "黄巾"}, {id: 21004132, name: "张燕", rank: 4, faction: "黄巾"},
        {id: 21004141, name: "马元义", rank: 4, faction: "黄巾"}, {id: 21004142, name: "马元义", rank: 4, faction: "黄巾"},
        {id: 21004151, name: "白绕", rank: 5, faction: "黄巾"}, {id: 21004152, name: "白绕", rank: 5, faction: "黄巾"},
        {id: 21004161, name: "于毒", rank: 5, faction: "黄巾"}, {id: 21004162, name: "于毒", rank: 5, faction: "黄巾"},
        {id: 21004171, name: "管亥", rank: 5, faction: "黄巾"}, {id: 21004172, name: "管亥", rank: 5, faction: "黄巾"},
        {id: 21004181, name: "高升", rank: 5, faction: "黄巾"}, {id: 21004182, name: "高升", rank: 5, faction: "黄巾"},
        {id: 21004191, name: "张宝", rank: 6, faction: "黄巾"}, {id: 21004192, name: "张宝", rank: 6, faction: "黄巾"},
        {id: 21004201, name: "张楚", rank: 6, faction: "黄巾"}, {id: 21004202, name: "张楚", rank: 6, faction: "黄巾"},
        {id: 21004211, name: "张宁", rank: 6, faction: "黄巾"}, {id: 21004212, name: "张宁", rank: 6, faction: "黄巾"},
        {id: 21004221, name: "张梁", rank: 6, faction: "黄巾"}, {id: 21004222, name: "张梁", rank: 6, faction: "黄巾"},
        {id: 21005011, name: "卢植", rank: 1, faction: "汉"}, {id: 21005012, name: "卢植", rank: 1, faction: "汉"},
        {id: 21005021, name: "冯方", rank: 1, faction: "汉"}, {id: 21005022, name: "冯方", rank: 1, faction: "汉"},
        {id: 21005031, name: "伏完", rank: 2, faction: "汉"}, {id: 21005032, name: "伏完", rank: 2, faction: "汉"},
        {id: 21005041, name: "董贵人", rank: 2, faction: "汉"}, {id: 21005042, name: "董贵人", rank: 2, faction: "汉"},
        {id: 21005051, name: "朱儁", rank: 2, faction: "汉"}, {id: 21005052, name: "朱儁", rank: 2, faction: "汉"},
        {id: 21005061, name: "刘繇", rank: 3, faction: "汉"}, {id: 21005062, name: "刘繇", rank: 3, faction: "汉"},
        {id: 21005071, name: "王荣", rank: 3, faction: "汉"}, {id: 21005072, name: "王荣", rank: 3, faction: "汉"},
        {id: 21005081, name: "郭胜", rank: 3, faction: "汉"}, {id: 21005082, name: "郭胜", rank: 3, faction: "汉"},
        {id: 21005091, name: "皇甫嵩", rank: 3, faction: "汉"}, {id: 21005092, name: "皇甫嵩", rank: 3, faction: "汉"},
        {id: 21005101, name: "王允", rank: 4, faction: "汉"}, {id: 21005102, name: "王允", rank: 4, faction: "汉"},
        {id: 21005111, name: "陈登", rank: 4, faction: "汉"}, {id: 21005112, name: "陈登", rank: 4, faction: "汉"},
        {id: 21005121, name: "杨彪", rank: 4, faction: "汉"}, {id: 21005122, name: "杨彪", rank: 4, faction: "汉"},
        {id: 21005131, name: "万年公主", rank: 4, faction: "汉"}, {id: 21005132, name: "万年公主", rank: 4, faction: "汉"},
        {id: 21005141, name: "曹节", rank: 6, faction: "汉"}, {id: 21005142, name: "曹节", rank: 6, faction: "汉"},
        {id: 21005151, name: "何进", rank: 5, faction: "汉"}, {id: 21005152, name: "何进", rank: 5, faction: "汉"},
        {id: 21005161, name: "唐姬", rank: 5, faction: "汉"}, {id: 21005162, name: "唐姬", rank: 5, faction: "汉"},
        {id: 21005171, name: "张让", rank: 5, faction: "汉"}, {id: 21005172, name: "张让", rank: 5, faction: "汉"},
        {id: 21005181, name: "赵忠", rank: 4, faction: "汉"}, {id: 21005182, name: "赵忠", rank: 4, faction: "汉"},
        {id: 21005191, name: "刘辩", rank: 6, faction: "汉"}, {id: 21005192, name: "刘辩", rank: 6, faction: "汉"},
        {id: 21005201, name: "何太后", rank: 6, faction: "汉"}, {id: 21005202, name: "何太后", rank: 6, faction: "汉"},
        {id: 21005211, name: "刘宏", rank: 5, faction: "汉"}, {id: 21005212, name: "刘宏", rank: 5, faction: "汉"},
        {id: 21005221, name: "董承", rank: 6, faction: "汉"}, {id: 21005222, name: "董承", rank: 6, faction: "汉"},
        {id: 21006011, name: "马云騄", rank: 1, faction: "西凉"}, {id: 21006012, name: "马云騄", rank: 1, faction: "西凉"},
        {id: 21006021, name: "段煨", rank: 1, faction: "西凉"}, {id: 21006022, name: "段煨", rank: 1, faction: "西凉"},
        {id: 21006031, name: "马休", rank: 2, faction: "西凉"}, {id: 21006032, name: "马休", rank: 2, faction: "西凉"},
        {id: 21006041, name: "张横", rank: 2, faction: "西凉"}, {id: 21006042, name: "张横", rank: 2, faction: "西凉"},
        {id: 21006051, name: "董白", rank: 2, faction: "西凉"}, {id: 21006052, name: "董白", rank: 2, faction: "西凉"},
        {id: 21006061, name: "韩遂", rank: 3, faction: "西凉"}, {id: 21006062, name: "韩遂", rank: 3, faction: "西凉"},
        {id: 21006071, name: "马伶俐", rank: 3, faction: "西凉"}, {id: 21006072, name: "马伶俐", rank: 3, faction: "西凉"},
        {id: 21006081, name: "董翓", rank: 3, faction: "西凉"}, {id: 21006082, name: "董翓", rank: 3, faction: "西凉"},
        {id: 21006091, name: "华雄", rank: 3, faction: "西凉"}, {id: 21006092, name: "华雄", rank: 3, faction: "西凉"},
        {id: 21006101, name: "董絮", rank: 4, faction: "西凉"}, {id: 21006102, name: "董絮", rank: 4, faction: "西凉"},
        {id: 21006111, name: "张济", rank: 4, faction: "西凉"}, {id: 21006112, name: "张济", rank: 4, faction: "西凉"},
        {id: 21006121, name: "马超", rank: 4, faction: "西凉"}, {id: 21006122, name: "马超", rank: 4, faction: "西凉"},
        {id: 21006131, name: "徐荣", rank: 4, faction: "西凉"}, {id: 21006132, name: "徐荣", rank: 4, faction: "西凉"},
        {id: 21006141, name: "杨婉", rank: 4, faction: "西凉"}, {id: 21006142, name: "杨婉", rank: 4, faction: "西凉"},
        {id: 21006151, name: "庞德", rank: 5, faction: "西凉"}, {id: 21006152, name: "庞德", rank: 5, faction: "西凉"},
        {id: 21006161, name: "李傕", rank: 5, faction: "西凉"}, {id: 21006162, name: "李傕", rank: 5, faction: "西凉"},
        {id: 21006171, name: "马岱", rank: 5, faction: "西凉"}, {id: 21006172, name: "马岱", rank: 5, faction: "西凉"},
        {id: 21006181, name: "李肃", rank: 5, faction: "西凉"}, {id: 21006182, name: "李肃", rank: 5, faction: "西凉"},
        {id: 21006191, name: "马铁", rank: 6, faction: "西凉"}, {id: 21006192, name: "马铁", rank: 6, faction: "西凉"},
        {id: 21006201, name: "樊稠", rank: 6, faction: "西凉"}, {id: 21006202, name: "樊稠", rank: 6, faction: "西凉"},
        {id: 21006211, name: "马腾", rank: 6, faction: "西凉"}, {id: 21006212, name: "马腾", rank: 6, faction: "西凉"},
        {id: 21006221, name: "郭汜", rank: 6, faction: "西凉"}, {id: 21006222, name: "郭汜", rank: 6, faction: "西凉"},
        {id: 21007011, name: "颜良", rank: 1, faction: "袁"}, {id: 21007012, name: "颜良", rank: 1, faction: "袁"},
        {id: 21007021, name: "桥蕤", rank: 1, faction: "袁"}, {id: 21007022, name: "桥蕤", rank: 1, faction: "袁"},
        {id: 21007031, name: "审配", rank: 2, faction: "袁"}, {id: 21007032, name: "审配", rank: 2, faction: "袁"},
        {id: 21007041, name: "雷薄", rank: 2, faction: "袁"}, {id: 21007042, name: "雷薄", rank: 2, faction: "袁"},
        {id: 21007051, name: "高览", rank: 2, faction: "袁"}, {id: 21007052, name: "高览", rank: 2, faction: "袁"},
        {id: 21007061, name: "冯妤", rank: 3, faction: "袁"}, {id: 21007062, name: "冯妤", rank: 3, faction: "袁"},
        {id: 21007071, name: "许攸", rank: 3, faction: "袁"}, {id: 21007072, name: "许攸", rank: 3, faction: "袁"},
        {id: 21007081, name: "纪灵", rank: 3, faction: "袁"}, {id: 21007082, name: "纪灵", rank: 3, faction: "袁"},
        {id: 21007091, name: "逢纪", rank: 3, faction: "袁"}, {id: 21007092, name: "逢纪", rank: 3, faction: "袁"},
        {id: 21007101, name: "张勋", rank: 4, faction: "袁"}, {id: 21007102, name: "张勋", rank: 4, faction: "袁"},
        {id: 21007111, name: "文丑", rank: 4, faction: "袁"}, {id: 21007112, name: "文丑", rank: 4, faction: "袁"},
        {id: 21007121, name: "杨弘", rank: 4, faction: "袁"}, {id: 21007122, name: "杨弘", rank: 4, faction: "袁"},
        {id: 21007131, name: "乐就", rank: 4, faction: "袁"}, {id: 21007132, name: "乐就", rank: 4, faction: "袁"},
        {id: 21007141, name: "袁胤", rank: 4, faction: "袁"}, {id: 21007142, name: "袁胤", rank: 4, faction: "袁"},
        {id: 21007151, name: "淳于琼", rank: 4, faction: "袁"}, {id: 21007152, name: "淳于琼", rank: 4, faction: "袁"},
        {id: 21007161, name: "郭图", rank: 5, faction: "袁"}, {id: 21007162, name: "郭图", rank: 5, faction: "袁"},
        {id: 21007171, name: "韩猛", rank: 5, faction: "袁"}, {id: 21007172, name: "韩猛", rank: 5, faction: "袁"},
        {id: 21007181, name: "麹义", rank: 5, faction: "袁"}, {id: 21007182, name: "麹义", rank: 5, faction: "袁"},
        {id: 21007191, name: "董绾", rank: 5, faction: "袁"}, {id: 21007192, name: "董绾", rank: 5, faction: "袁"},
        {id: 21007201, name: "袁绍", rank: 6, faction: "袁"}, {id: 21007202, name: "袁绍", rank: 6, faction: "袁"},
        {id: 21007211, name: "袁术", rank: 6, faction: "袁"}, {id: 21007212, name: "袁术", rank: 6, faction: "袁"},
        {id: 21007221, name: "田丰", rank: 6, faction: "袁"}, {id: 21007222, name: "田丰", rank: 6, faction: "袁"},
        {id: 21007231, name: "沮授", rank: 6, faction: "袁"}, {id: 21007232, name: "沮授", rank: 6, faction: "袁"},
        {id: 21008011, name: "陶谦", rank: 2, faction: "群"}, {id: 21008012, name: "陶谦", rank: 2, faction: "群"},
        {id: 21008021, name: "邹氏", rank: 2, faction: "群"}, {id: 21008022, name: "邹氏", rank: 2, faction: "群"},
        {id: 21008031, name: "蔡夫人", rank: 2, faction: "群"}, {id: 21008032, name: "蔡夫人", rank: 2, faction: "群"},
        {id: 21008041, name: "蔡邕", rank: 3, faction: "群"}, {id: 21008042, name: "蔡邕", rank: 3, faction: "群"},
        {id: 21008051, name: "严夫人", rank: 3, faction: "群"}, {id: 21008052, name: "严夫人", rank: 3, faction: "群"},
        {id: 21008061, name: "士燮", rank: 3, faction: "群"}, {id: 21008062, name: "士燮", rank: 3, faction: "群"},
        {id: 21008071, name: "吉平", rank: 3, faction: "群"}, {id: 21008072, name: "吉平", rank: 3, faction: "群"},
        {id: 21008081, name: "陈珪", rank: 3, faction: "群"}, {id: 21008082, name: "陈珪", rank: 3, faction: "群"},
        {id: 21008091, name: "貂蝉", rank: 3, faction: "群"}, {id: 21008092, name: "貂蝉", rank: 3, faction: "群"},
        {id: 21008101, name: "潘凤", rank: 4, faction: "群"}, {id: 21008102, name: "潘凤", rank: 4, faction: "群"},
        {id: 21008111, name: "司马徽", rank: 4, faction: "群"}, {id: 21008112, name: "司马徽", rank: 4, faction: "群"},
        {id: 21008121, name: "童渊", rank: 4, faction: "群"}, {id: 21008122, name: "童渊", rank: 4, faction: "群"},
        {id: 21008131, name: "邢道荣", rank: 4, faction: "群"}, {id: 21008132, name: "邢道荣", rank: 4, faction: "群"},
        {id: 21008141, name: "张鲁", rank: 4, faction: "群"}, {id: 21008142, name: "张鲁", rank: 4, faction: "群"},
        {id: 21008151, name: "胡车儿", rank: 4, faction: "群"}, {id: 21008152, name: "胡车儿", rank: 4, faction: "群"},
        {id: 21008161, name: "管宁", rank: 4, faction: "群"}, {id: 21008162, name: "管宁", rank: 4, faction: "群"},
        {id: 21008171, name: "韩馥", rank: 5, faction: "群"}, {id: 21008172, name: "韩馥", rank: 5, faction: "群"},
        {id: 21008181, name: "华佗", rank: 5, faction: "群"}, {id: 21008182, name: "华佗", rank: 5, faction: "群"},
        {id: 21008191, name: "祢衡", rank: 5, faction: "群"}, {id: 21008192, name: "祢衡", rank: 5, faction: "群"},
        {id: 21008201, name: "刘表", rank: 5, faction: "群"}, {id: 21008202, name: "刘表", rank: 5, faction: "群"},
        {id: 21008211, name: "于吉", rank: 5, faction: "群"}, {id: 21008212, name: "于吉", rank: 5, faction: "群"},
        {id: 21008221, name: "庞德公", rank: 5, faction: "群"}, {id: 21008222, name: "庞德公", rank: 5, faction: "群"},
        {id: 21008231, name: "黄承彦", rank: 5, faction: "群"}, {id: 21008232, name: "黄承彦", rank: 5, faction: "群"},
        {id: 21008241, name: "来莺儿", rank: 5, faction: "群"}, {id: 21008242, name: "来莺儿", rank: 5, faction: "群"},
        {id: 21008251, name: "贾诩", rank: 6, faction: "群"}, {id: 21008252, name: "贾诩", rank: 6, faction: "群"},
        {id: 21008261, name: "吕布", rank: 6, faction: "群"}, {id: 21008262, name: "吕布", rank: 6, faction: "群"},
        {id: 21008271, name: "南华老仙", rank: 6, faction: "群"}, {id: 21008272, name: "南华老仙", rank: 6, faction: "群"},
        {id: 21008281, name: "许劭", rank: 6, faction: "群"}, {id: 21008282, name: "许劭", rank: 6, faction: "群"},
        {id: 21008291, name: "左慈", rank: 6, faction: "群"}, {id: 21008292, name: "左慈", rank: 6, faction: "群"},
        {id: 21008301, name: "蔡文姬", rank: 6, faction: "群"}, {id: 21008302, name: "蔡文姬", rank: 6, faction: "群"}
    ];

    const PERMANENT_KEEP_IDS = new Set([
        21008191, 21008192, // 祢衡
        21008231, 21008232, // 黄承彦
        21008291, 21008292, // 左慈
        21008081, 21008082  // 陈珪
    ]);

    const STORE_KEY_WHITELIST = 'sgs_whitelist_presets';
    const STORE_KEY_BUY = 'sgs_buy_presets';

    function loadPresets(storeKey) {
        try {
            const data = GM_getValue(storeKey, null);
            if (data && typeof data === 'object') return data;
            GM_setValue(storeKey, {});
            return {};
        } catch (e) {
            console.error('加载预设失败:', e);
            return {};
        }
    }

    function savePresets(storeKey, presets) {
        GM_setValue(storeKey, presets);
    }

    let whitelistPresets = loadPresets(STORE_KEY_WHITELIST);
    let buyPresets = loadPresets(STORE_KEY_BUY);

    const whitelistState = {
        factions: new Set(),
        specificIds: new Set()
    };

    // ── 白名单核心函数 ──
    function getActiveWhitelist() {
        const activeIds = new Set(PERMANENT_KEEP_IDS);
        whitelistState.factions.forEach(faction => {
            CHESS_DATA.forEach(chess => {
                if (chess.faction === faction) activeIds.add(chess.id);
            });
        });
        whitelistState.specificIds.forEach(id => {
            activeIds.add(id);
            const prefix = String(id).substring(0, 7);
            CHESS_DATA.forEach(chess => {
                if (String(chess.id).startsWith(prefix)) activeIds.add(chess.id);
            });
        });
        return activeIds;
    }

    let isCleaning = false;
    function smartClearHand() {
        if (isCleaning) return;
        isCleaning = true;
        const mgr = getManager();
        if (!mgr) { showToast("错误: 无法获取游戏管理器"); isCleaning = false; return; }
        const hand = mgr.HandChess;
        if (!hand || hand.length === 0) { showToast("手牌为空"); isCleaning = false; return; }
        const activeWhitelist = getActiveWhitelist();
        const goodsIDsToDiscard = [];
        for (let i = 0; i < hand.length; i++) {
            const card = hand[i];
            if (!card) continue;
            const chessID = card.chessID || card.ChessID;
            const goodsID = card.goodsID || card.GoodsID;
            if (!chessID) continue;
            if (!activeWhitelist.has(chessID) && goodsID) {
                goodsIDsToDiscard.push(goodsID);
            }
        }
        if (goodsIDsToDiscard.length === 0) { showToast("手牌均为目标武将"); isCleaning = false; return; }
        goodsIDsToDiscard.forEach((gid, index) => {
            setTimeout(() => {
                if (typeof mgr.ReqShopRecycleChess === "function") mgr.ReqShopRecycleChess(gid);
            }, index * 50);
        });
        showToast(`正在清理 ${goodsIDsToDiscard.length} 张杂牌...`);
        setTimeout(() => {
            const scene = getScene();
            if (scene && scene.cardView) {
                if (typeof scene.cardView.Calibration === "function") scene.cardView.Calibration(true);
                if (typeof scene.cardView.UpdateHandCards === "function") scene.cardView.UpdateHandCards();
            }
            showToast(`清理完成`);
            isCleaning = false;
        }, goodsIDsToDiscard.length * 50 + 200);
    }

    // ── 白名单配置面板 UI ──
    function updateWhitelistPresetSelect() {
        const select = document.getElementById("sq-faction-preset");
        if (!select) return;
        select.innerHTML = '<option value="">-- 请选择流派 --</option>';
        const presets = loadPresets(STORE_KEY_WHITELIST);
        Object.keys(presets).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });
        select.value = "";
        const deleteBtn = document.getElementById("sq-delete-preset-btn");
        if (deleteBtn) deleteBtn.disabled = true;
    }

    function initConfigPanel() {
        if (document.getElementById('sq-config-panel')) return;

        const btn = document.createElement("div");
        btn.id = "sq-config-btn";
        btn.innerHTML = "⚙️";
        btn.style.cssText = "position:fixed;top:100px;right:20px;z-index:100001;width:40px;height:40px;background:#333;color:#fff;border-radius:50%;text-align:center;line-height:40px;cursor:pointer;font-size:20px;box-shadow:0 2px 5px rgba(0,0,0,0.3);";
        btn.onclick = toggleConfigPanel;
        document.body.appendChild(btn);

        const panel = document.createElement("div");
        panel.id = "sq-config-panel";
        panel.style.cssText = "display:none;position:fixed;top:150px;right:20px;z-index:99999;width:300px;max-height:500px;background:#fff;border:1px solid #ccc;border-radius:8px;box-shadow:0 4px 10px rgba(0,0,0,0.2);overflow:hidden;font-family:sans-serif;font-size:14px;";
        panel.innerHTML = `
            <div style="padding:10px;background:#f5f5f5;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
                <strong style="display:flex;align-items:center;gap:5px;">
                    <span id="sq-whitelist-help" style="cursor:help;font-size:16px;line-height:1;">❓</span>
                    选择棋子加入白名单
                </strong>
                <span style="cursor:pointer;color:#999;margin-left:auto;" onclick="document.getElementById('sq-config-panel').style.display='none'">✕</span>
            </div>
            <div style="padding:10px;">
                <div style="margin-bottom:10px; border-bottom:1px dashed #ddd; padding-bottom:10px;">
                    <strong>⚔️ 流派快速配置:</strong>
                    <select id="sq-faction-preset" style="width:100%; padding:5px; margin-top:5px; box-sizing:border-box;">
                        <option value="">-- 请选择流派 --</option>
                    </select>
                    <div style="display:flex; gap:4px; margin-top:4px;">
                        <button id="sq-delete-preset-btn" style="flex:1; padding:3px; background:#f44336; color:#fff; border:none; border-radius:3px; cursor:pointer; font-size:12px;" disabled>删除流派</button>
                        <button id="sq-create-preset-btn" style="flex:1; padding:3px; background:#4CAF50; color:#fff; border:none; border-radius:3px; cursor:pointer; font-size:12px;">+ 创建流派</button>
                    </div>
                </div>
                <input type="text" id="sq-search-input" placeholder="搜索棋子名称..." style="width:100%;padding:5px;margin-bottom:10px;box-sizing:border-box;">
                <div style="margin-bottom:10px;">
                    <strong>势力选择:</strong>
                    <div id="sq-faction-list" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;"></div>
                </div>
                <div style="border-top:1px solid #eee;padding-top:10px;">
                    <strong>已选棋子 (<span id="sq-selected-count">0</span>):</strong>
                    <div id="sq-selected-list" style="max-height:150px;overflow-y:auto;margin-top:5px;display:flex;flex-wrap:wrap;gap:5px;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        updateWhitelistPresetSelect();

        const factionSelect = document.getElementById("sq-faction-preset");
        const deletePresetBtn = document.getElementById("sq-delete-preset-btn");

        factionSelect.onchange = (e) => {
            const selectedPreset = e.target.value;
            deletePresetBtn.disabled = !selectedPreset;
            if (!selectedPreset) return;
            const presets = loadPresets(STORE_KEY_WHITELIST);
            const names = presets[selectedPreset];
            if (!names) return;
            names.forEach(name => {
                const chess = CHESS_DATA.find(c => c.name === name);
                if (chess && !whitelistState.specificIds.has(chess.id)) {
                    whitelistState.specificIds.add(chess.id);
                }
            });
            showToast(`已添加流派 "${selectedPreset}" 到白名单`);
            updateSelectedList();
        };

        deletePresetBtn.onclick = () => {
            const presetName = factionSelect.value;
            if (!presetName) return;
            if (!confirm(`确定删除流派「${presetName}」吗？`)) return;
            const presets = loadPresets(STORE_KEY_WHITELIST);
            delete presets[presetName];
            savePresets(STORE_KEY_WHITELIST, presets);
            updateWhitelistPresetSelect();
            showToast(`已删除流派 "${presetName}"`);
        };

        document.getElementById("sq-create-preset-btn").onclick = () => {
            const toAddIds = Array.from(whitelistState.specificIds).filter(id => !PERMANENT_KEEP_IDS.has(id));
            if (toAddIds.length === 0) {
                alert("没有可保存的棋子（已排除永久白名单）。");
                return;
            }
            const names = [];
            toAddIds.forEach(id => {
                const chess = CHESS_DATA.find(c => c.id === id);
                if (chess && !names.includes(chess.name)) names.push(chess.name);
            });
            const presetName = prompt("请输入流派名称：");
            if (!presetName || presetName.trim() === "") return;
            const presets = loadPresets(STORE_KEY_WHITELIST);
            if (presets[presetName.trim()]) {
                if (!confirm(`流派 "${presetName.trim()}" 已存在，是否覆盖？`)) return;
            }
            presets[presetName.trim()] = names;
            savePresets(STORE_KEY_WHITELIST, presets);
            updateWhitelistPresetSelect();
            alert(`流派 "${presetName.trim()}" 创建成功！`);
        };

        const factions = ["魏", "蜀", "吴", "群", "黄巾", "汉", "西凉", "袁"];
        const factionContainer = document.getElementById("sq-faction-list");
        factions.forEach(f => {
            const label = document.createElement("label");
            label.style.cssText = "display:flex;align-items:center;cursor:pointer;";
            label.innerHTML = `<input type="checkbox" value="${f}" style="margin-right:3px;"> ${f}`;
            label.querySelector("input").onchange = (e) => {
                if (e.target.checked) whitelistState.factions.add(f);
                else whitelistState.factions.delete(f);
                updateSelectedList();
            };
            factionContainer.appendChild(label);
        });

        const searchInput = document.getElementById("sq-search-input");
        searchInput.oninput = () => {
            updateSelectedList();
        };

        const whitelistHelp = document.getElementById("sq-whitelist-help");
        if (whitelistHelp) {
            let tip = null;
            whitelistHelp.addEventListener("mouseenter", () => {
                tip = document.createElement("div");
                tip.textContent = "按E一键遣散手牌中的武将，可以搜索并勾选武将或者勾选势力加入白名单，避免遣散，永久白名单：祢衡、左慈、陈珪、黄承彦";
                tip.style.cssText = "position:fixed;z-index:100001;background:rgba(0,0,0,0.8);color:#fff;padding:8px 12px;border-radius:6px;font-size:13px;max-width:280px;pointer-events:none;white-space:pre-wrap;";
                document.body.appendChild(tip);
                const rect = whitelistHelp.getBoundingClientRect();
                tip.style.left = rect.right + 8 + "px";
                tip.style.top = rect.top + "px";
            });
            whitelistHelp.addEventListener("mouseleave", () => { if (tip) { tip.remove(); tip = null; } });
        }
    }

    function updateSelectedList() {
        const searchInput = document.getElementById("sq-search-input");
        const keyword = searchInput ? searchInput.value.trim() : "";
        const selectedList = document.getElementById("sq-selected-list");
        if (!selectedList) return;

        selectedList.innerHTML = "";

        if (keyword) {
            const results = CHESS_DATA.filter(c => c.name.includes(keyword));
            const seenNames = new Set();
            const uniqueResults = [];
            results.forEach(r => {
                if (!seenNames.has(r.name)) {
                    seenNames.add(r.name);
                    uniqueResults.push(r);
                }
            });
            if (uniqueResults.length === 0) {
                selectedList.innerHTML = "<span style='color:#999;'>无匹配结果</span>";
                return;
            }
            uniqueResults.forEach(chess => {
                const isSelected = whitelistState.specificIds.has(chess.id) ||
                    Array.from(whitelistState.factions).some(f => CHESS_DATA.some(c => c.faction === f && c.id === chess.id));
                const tag = document.createElement("div");
                tag.style.cssText = `padding:2px 6px;background:${isSelected ? '#4CAF50' : '#eee'};color:${isSelected ? '#fff' : '#333'};border-radius:4px;cursor:pointer;font-size:12px;`;
                tag.textContent = chess.name;
                tag.onclick = () => {
                    if (whitelistState.specificIds.has(chess.id)) {
                        whitelistState.specificIds.delete(chess.id);
                        tag.style.background = "#eee";
                        tag.style.color = "#333";
                    } else {
                        whitelistState.specificIds.add(chess.id);
                        tag.style.background = "#4CAF50";
                        tag.style.color = "#fff";
                    }
                    updateSelectedCount();
                };
                selectedList.appendChild(tag);
            });
        } else {
            const selectedChesses = new Map();
            whitelistState.factions.forEach(f => {
                CHESS_DATA.forEach(c => {
                    if (c.faction === f && !selectedChesses.has(c.id)) selectedChesses.set(c.id, c.name);
                });
            });
            whitelistState.specificIds.forEach(id => {
                const chess = CHESS_DATA.find(c => c.id === id);
                if (chess && !selectedChesses.has(id)) selectedChesses.set(id, chess.name);
            });

            if (selectedChesses.size === 0) {
                selectedList.innerHTML = "<span style='color:#999;'>暂无</span>";
                updateSelectedCount();
                return;
            }

            selectedChesses.forEach((name, id) => {
                const tag = document.createElement("div");
                tag.style.cssText = "padding:2px 6px;background:#4CAF50;color:#fff;border-radius:4px;cursor:pointer;font-size:12px;";
                tag.textContent = name;
                tag.onclick = () => {
                    if (!whitelistState.specificIds.has(id)) {
                        showToast(`"${name}" 属于已选势力，请在势力选项中取消`);
                        return;
                    }
                    whitelistState.specificIds.delete(id);
                    updateSelectedList();
                    updateSelectedCount();
                };
                selectedList.appendChild(tag);
            });
        }
        updateSelectedCount();
    }

    function updateSelectedCount() {
        const activeIds = getActiveWhitelist();
        const names = new Set();
        activeIds.forEach(id => { const c = CHESS_DATA.find(x => x.id === id); if(c) names.add(c.name); });
        const countSpan = document.getElementById("sq-selected-count");
        if (countSpan) countSpan.textContent = names.size;
    }

    function toggleConfigPanel() {
        const panel = document.getElementById("sq-config-panel");
        if (!panel) return;
        if (panel.style.display === "none") {
            panel.style.display = "block";
            updateSelectedList();
        } else {
            panel.style.display = "none";
        }
    }

    // ── 自动购买助手 ──
    const AutoBuyHelper = {
        nameToMinId: {},
        CHESS_LIST: [],

        state: {
            isRunning: false,
            selectedNames: new Set(),
            maxRefresh: 20,
            currentRefresh: 0,
            boughtCount: 0,
            isExpanded: false
        },

        init: function() {
            this.buildDataFromChessData();
            this.createTriggerButton();
            this.createUI();
        },

        buildDataFromChessData: function() {
            const nameMap = new Map();
            CHESS_DATA.forEach(item => {
                if (!nameMap.has(item.name) || item.id < nameMap.get(item.name)) {
                    nameMap.set(item.name, item.id);
                }
            });
            this.nameToMinId = Object.fromEntries(nameMap);
            this.CHESS_LIST = Object.keys(this.nameToMinId).sort();
        },

        createTriggerButton: function() {
            if (document.getElementById('auto-buy-trigger-btn')) return;
            const btn = document.createElement("div");
            btn.id = "auto-buy-trigger-btn";
            btn.innerHTML = "🛒";
            btn.title = "打开自动购买助手";
            btn.style.cssText = "position:fixed;top:150px;right:20px;z-index:100001;width:40px;height:40px;background:rgba(33,150,243,0.9);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;box-shadow:0 2px 5px rgba(0,0,0,0.3);transition:transform 0.2s;";
            btn.onmouseover = () => btn.style.transform = "scale(1.1)";
            btn.onmouseout = () => btn.style.transform = "scale(1)";
            btn.onclick = () => this.togglePanel();
            document.body.appendChild(btn);
        },

        togglePanel: function() {
            const panel = document.getElementById('smart-buy-panel');
            if (!panel) return;
            this.state.isExpanded = !this.state.isExpanded;
            const content = document.getElementById('panel-content');
            const arrow = document.getElementById('toggle-arrow');
            if (this.state.isExpanded) {
                panel.style.display = 'block';
                content.style.display = 'flex';
                arrow.textContent = '▼';
            } else {
                panel.style.display = 'none';
                arrow.textContent = '▶';
            }
        },

        sleep: function(ms) { return new Promise(resolve => setTimeout(resolve, ms)); },

        startAutoBuy: async function() {
            if (this.state.selectedNames.size === 0) { alert("⚠️ 请先添加目标棋子！"); return; }
            const mgr = getManager();
            if (!mgr) { alert("❌ 未找到游戏管理器。"); return; }
            this.state.maxRefresh = parseInt(document.getElementById('ab-refresh-count').value) || 20;
            this.state.currentRefresh = 0; this.state.boughtCount = 0; this.state.isRunning = true;
            this.updateUIState(true);
            showToast(`🎯 监控 ${this.state.selectedNames.size} 种棋子`);
            while (this.state.isRunning && this.state.currentRefresh < this.state.maxRefresh) {
                const goods = mgr.ShopGoods || [];
                let boughtInThisRound = false;
                for (let item of goods) {
                    if (item && item.chessID) {
                        for (let name of this.state.selectedNames) {
                            if (this.nameToMinId[name] === item.chessID) {
                                const goodsID = item.goodsID || item.GoodsID;
                                if (goodsID) {
                                    mgr.ReqShopBuyChess(goodsID);
                                    this.state.boughtCount++;
                                    boughtInThisRound = true;
                                    await this.sleep(150);
                                    break;
                                }
                            }
                        }
                    }
                }
                if (!boughtInThisRound && this.state.isRunning && this.state.currentRefresh < this.state.maxRefresh) {
                    if (typeof mgr.ReqShopRefreshChess === "function") {
                        mgr.ReqShopRefreshChess();
                        this.state.currentRefresh++;
                        const statusLabel = document.getElementById('ab-status');
                        if (statusLabel) statusLabel.textContent = `${this.state.currentRefresh}/${this.state.maxRefresh}`;
                        await this.sleep(250);
                    } else break;
                }
            }
            this.state.isRunning = false; this.updateUIState(false);
            showToast(`🏁 结束。买入 ${this.state.boughtCount} 个`);
        },

        stopAutoBuy: function() { this.state.isRunning = false; showToast("🛑 已停止"); },

        updateTripleStatus: function() {
            const el = document.getElementById('ab-triple-status');
            if (!el) return;
            el.textContent = window.blockTripleCombine ? '三连阻止' : '三连允许';
            el.style.color = window.blockTripleCombine ? '#f44336' : '#4CAF50';
        },

        addToSelected: function(name) {
            if (!this.state.selectedNames.has(name)) {
                this.state.selectedNames.add(name);
                this.renderSelectedList();
            }
        },

        removeFromSelected: function(name) {
            this.state.selectedNames.delete(name);
            this.renderSelectedList();
        },

        renderSelectedList: function() {
            const container = document.getElementById('selected-list');
            if (!container) return;
            const searchInput = document.getElementById('ab-search-input');
            const keyword = searchInput ? searchInput.value.trim() : "";

            container.innerHTML = '';

            if (keyword) {
                const filtered = this.CHESS_LIST.filter(name => name.includes(keyword));
                if (filtered.length === 0) {
                    container.innerHTML = '<div style="color:#999;font-size:11px;text-align:center;padding:5px;">无匹配结果</div>';
                    return;
                }
                const displayList = filtered.slice(0, 50);
                displayList.forEach(name => {
                    const isSelected = this.state.selectedNames.has(name);
                    const tag = document.createElement('div');
                    tag.style.cssText = `padding:2px 6px;background:${isSelected ? '#4CAF50' : '#eee'};color:${isSelected ? '#fff' : '#333'};border-radius:4px;cursor:pointer;font-size:12px;margin:2px;`;
                    tag.textContent = name;
                    tag.onclick = () => {
                        if (isSelected) {
                            this.removeFromSelected(name);
                        } else {
                            this.addToSelected(name);
                        }
                        this.renderSelectedList();
                    };
                    container.appendChild(tag);
                });
                if (filtered.length > 50) {
                    const more = document.createElement('div');
                    more.textContent = `...还有 ${filtered.length - 50} 个`;
                    more.style.cssText = "text-align:center;font-size:10px;color:#999;padding:5px;width:100%;";
                    container.appendChild(more);
                }
            } else {
                if (this.state.selectedNames.size === 0) {
                    container.innerHTML = '<div style="color:#999;font-size:11px;text-align:center;padding:5px;">空</div>';
                    return;
                }
                this.state.selectedNames.forEach(name => {
                    const tag = document.createElement('span');
                    tag.style.cssText = "display:inline-flex;align-items:center;background:#4CAF50;color:#fff;padding:2px 6px;margin:2px;border-radius:3px;font-size:12px;cursor:pointer;";
                    tag.textContent = name;
                    tag.onclick = (e) => {
                        e.stopPropagation();
                        this.removeFromSelected(name);
                        this.renderSelectedList();
                    };
                    container.appendChild(tag);
                });
            }
        },

        updateUIState: function(running) {
            const panel = document.getElementById('smart-buy-panel'); if(!panel) return;
            const btnStart = panel.querySelector('#btn-start-buy'); const btnStop = panel.querySelector('#btn-stop-buy');
            const inputs = panel.querySelectorAll('input:not(#ab-search-input)');
            if (btnStart && btnStop) { btnStart.disabled = running; btnStart.style.opacity = running ? "0.5" : "1"; btnStop.disabled = !running; btnStop.style.opacity = !running ? "0.5" : "1"; }
            inputs.forEach(i => i.disabled = running);
        },

        refreshBuyPresetSelect: function() {
            const select = document.getElementById("ab-faction-preset");
            if (!select) return;
            select.innerHTML = '<option value="">-- 请选择流派 --</option>';
            const presets = loadPresets(STORE_KEY_BUY);
            Object.keys(presets).forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                select.appendChild(opt);
            });
            select.value = "";
            const deleteBtn = document.getElementById("ab-delete-preset-btn");
            if (deleteBtn) deleteBtn.disabled = true;
        },

        createUI: function() {
            if (document.getElementById('smart-buy-panel')) return;
            const panel = document.createElement('div');
            panel.id = 'smart-buy-panel';
            panel.style.cssText = "display:none;position:fixed;top:200px;right:20px;z-index:99999;background:#fff;color:#333;font-family:sans-serif;width:260px;box-shadow:0 2px 8px rgba(0,0,0,0.15);border:1px solid #ccc;border-radius:4px;overflow:hidden;font-size:14px;";
            const header = document.createElement('div');
            header.style.cssText = "padding:8px 10px;background:#f5f5f5;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;font-size:14px;";
            header.innerHTML = `<span id="ab-buy-help" style="cursor:help;font-size:16px;line-height:1;">❓</span><span id="ab-triple-status" style="font-size:12px;color:#f44336;">三连阻止</span><span style="display:flex;align-items:center;gap:5px;">🛒 自动购买<span id="ab-status" style="font-size:12px;color:#888;">就绪</span></span><span id="toggle-arrow">▼</span>`;
            header.onclick = () => this.togglePanel();
            panel.appendChild(header);

            const content = document.createElement('div');
            content.id = 'panel-content';
            content.style.cssText = "display:flex;flex-direction:column;padding:8px;background:#fff;";

            const presetSection = document.createElement('div');
            presetSection.style.cssText = "margin-bottom:8px;border-bottom:1px dashed #ddd;padding-bottom:8px;";
            presetSection.innerHTML = `<strong style="font-size:14px;">⚔️ 流派快速配置:</strong>
                <select id="ab-faction-preset" style="width:100%;padding:5px;margin-top:4px;background:#fff;border:1px solid #ccc;color:#333;border-radius:3px;font-size:14px;box-sizing:border-box;"><option value="">-- 请选择流派 --</option></select>
                <div style="display:flex; gap:4px; margin-top:4px;">
                    <button id="ab-delete-preset-btn" style="flex:1;padding:5px;background:#f44336;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:12px;" disabled>删除流派</button>
                    <button id="ab-create-preset-btn" style="flex:1;padding:5px;background:#4CAF50;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:12px;">+ 创建流派</button>
                </div>`;
            content.appendChild(presetSection);

            const searchInput = document.createElement('input');
            searchInput.id = "ab-search-input";
            searchInput.type = "text";
            searchInput.placeholder = "搜索棋子名称...";
            searchInput.style.cssText = "width:100%;padding:5px;margin-bottom:8px;background:#fff;border:1px solid #ccc;color:#333;border-radius:3px;box-sizing:border-box;font-size:14px;";
            searchInput.oninput = () => this.renderSelectedList();
            content.appendChild(searchInput);

            const selectedSection = document.createElement('div');
            selectedSection.innerHTML = '<div style="font-size:14px;color:#888;margin-bottom:3px;">已选棋子:</div>';
            const selectedList = document.createElement('div');
            selectedList.id = "selected-list";
            selectedList.style.cssText = "max-height:160px;overflow-y:auto;background:#fafafa;border:1px solid #eee;border-radius:3px;padding:5px;min-height:30px;display:flex;flex-wrap:wrap;gap:4px;align-content:flex-start;";
            selectedSection.appendChild(selectedList);
            content.appendChild(selectedSection);

            const footer = document.createElement('div');
            footer.style.cssText = "border-top:1px solid #eee;padding-top:8px;margin-top:auto;";
            const countInput = document.createElement('input');
            countInput.id = "ab-refresh-count";
            countInput.type = "number";
            countInput.value = "20";
            countInput.style.cssText = "width:100%;padding:5px;margin-bottom:6px;background:#fff;border:1px solid #ccc;color:#333;border-radius:3px;box-sizing:border-box;font-size:14px;";
            footer.appendChild(countInput);
            const btnGroup = document.createElement('div');
            btnGroup.style.display = "flex";
            btnGroup.style.gap = "5px";
            const btnStart = document.createElement('button');
            btnStart.id = "btn-start-buy";
            btnStart.textContent = "开始";
            btnStart.style.cssText = "flex:1;padding:6px;background:#2196F3;color:white;border:none;border-radius:3px;cursor:pointer;font-size:14px;";
            btnStart.onclick = () => this.startAutoBuy();
            const btnStop = document.createElement('button');
            btnStop.id = "btn-stop-buy";
            btnStop.textContent = "停";
            btnStop.style.cssText = "flex:1;padding:6px;background:#f44336;color:white;border:none;border-radius:3px;cursor:pointer;opacity:0.5;font-size:14px;";
            btnStop.disabled = true;
            btnStop.onclick = () => this.stopAutoBuy();
            btnGroup.appendChild(btnStart);
            btnGroup.appendChild(btnStop);
            footer.appendChild(btnGroup);
            content.appendChild(footer);
            panel.appendChild(content);
            document.body.appendChild(panel);

            this.refreshBuyPresetSelect();

            const abFactionSelect = document.getElementById("ab-faction-preset");
            const abDeleteBtn = document.getElementById("ab-delete-preset-btn");

            abFactionSelect.onchange = (e) => {
                const key = e.target.value;
                abDeleteBtn.disabled = !key;
                if (!key) return;
                const presets = loadPresets(STORE_KEY_BUY);
                const names = presets[key];
                if (!names) return;
                names.forEach(name => {
                    if (this.nameToMinId[name]) {
                        this.addToSelected(name);
                    }
                });
                this.renderSelectedList();
            };

            abDeleteBtn.onclick = () => {
                const presetName = abFactionSelect.value;
                if (!presetName) return;
                if (!confirm(`确定删除流派「${presetName}」吗？`)) return;
                const presets = loadPresets(STORE_KEY_BUY);
                delete presets[presetName];
                savePresets(STORE_KEY_BUY, presets);
                this.refreshBuyPresetSelect();
                showToast(`已删除流派 "${presetName}"`);
            };

            document.getElementById("ab-create-preset-btn").onclick = () => {
                if (this.state.selectedNames.size === 0) { alert("请先在已选列表中添加棋子。"); return; }
                const names = Array.from(this.state.selectedNames);
                const presetName = prompt("请输入流派名称：");
                if (!presetName || presetName.trim() === "") return;
                const presets = loadPresets(STORE_KEY_BUY);
                if (presets[presetName.trim()]) { if (!confirm(`流派 "${presetName.trim()}" 已存在，是否覆盖？`)) return; }
                presets[presetName.trim()] = names;
                savePresets(STORE_KEY_BUY, presets);
                this.refreshBuyPresetSelect();
                abFactionSelect.value = presetName.trim();
                alert(`流派 "${presetName.trim()}" 创建成功！`);
            };

            setTimeout(() => {
                const helpIcon = document.getElementById("ab-buy-help");
                if (helpIcon) {
                    let tip = null;
                    helpIcon.addEventListener("mouseenter", () => {
                        tip = document.createElement("div");
                        tip.textContent = "搜索并勾选需要查找的棋子，可以选择多个，会自动查找对应的棋子（仅匹配商店普通品质），默认查找20轮";
                        tip.style.cssText = "position:fixed;z-index:100001;background:rgba(0,0,0,0.75);color:#fff;padding:8px 12px;border-radius:6px;font-size:14px;max-width:280px;pointer-events:none;white-space:pre-wrap;";
                        document.body.appendChild(tip);
                        const rect = helpIcon.getBoundingClientRect();
                        tip.style.left = rect.right + 8 + "px";
                        tip.style.top = rect.top + "px";
                    });
                    helpIcon.addEventListener("mouseleave", () => { if (tip) { tip.remove(); tip = null; } });
                }
            }, 100);

            this.renderSelectedList();
            this.updateTripleStatus();
        }
    };

    // ──────────────────────────────────────────────
    // 模块 3：键盘监听（整合所有快捷键）
    // ──────────────────────────────────────────────

    function onKeyDown(e) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;

        // Q 键切换面板（白名单配置 + 自动购买）
        if (e.key === 'q' || e.key === 'Q') {
            e.preventDefault();
            const panel1 = document.getElementById('sq-config-panel');
            const panel2 = document.getElementById('smart-buy-panel');
            if (panel1 && panel2) {
                const isHidden = panel1.style.display === 'none' || panel1.style.display === '';
                const newDisplay = isHidden ? 'block' : 'none';
                panel1.style.display = newDisplay;
                panel2.style.display = newDisplay;
                if (newDisplay === 'block') {
                    // 刷新两个面板的内容
                    updateSelectedList();
                    AutoBuyHelper.renderSelectedList();
                    AutoBuyHelper.updateTripleStatus();
                }
            } else {
                showToast("面板尚未初始化，请稍后再按 Q");
            }
            return;
        }

        // E 键一键清理（智能遣散）
        if (e.key.toLowerCase() === 'e' || e.code === 'KeyE') {
            e.preventDefault();
            smartClearHand();
            return;
        }

        // Shift+R 强制刷新UI
        if (e.code === 'KeyR' && e.shiftKey) {
            e.preventDefault();
            refreshHandView(undefined, "manual");
            refreshBattleView("manual");
            showToast("强制刷新UI");
            return;
        }

        // Shift+2 使用最右侧锦囊
        if (e.code === 'Digit2' && e.shiftKey) {
            e.preventDefault();
            useRightmostSpell();
            return;
        }

        // Tab 三连开关
        if (e.key === 'Tab') {
            e.preventDefault();
            window.blockTripleCombine = !window.blockTripleCombine;
            const status = window.blockTripleCombine ? "阻止" : "允许";
            showToast("三连" + status);
            AutoBuyHelper.updateTripleStatus();
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

        // Shift+1 遣散手牌最右
        if (e.code === 'Digit1' && e.shiftKey) {
            e.preventDefault();
            discardRightmostHand();
            return;
        }

        // Alt+9 遣散战斗区最右
        if (e.altKey && e.key === "9") {
            e.preventDefault();
            discardRightmostBattle();
            return;
        }

        // Alt+0 上阵手牌最右
        if (e.altKey && e.key === "0") {
            e.preventDefault();
            deployRightmostCard();
            return;
        }

        // 1-6 购买
        if (e.key >= "1" && e.key <= "6") {
            e.preventDefault();
            buyChess(parseInt(e.key) - 1);
            return;
        }

        // R 刷新商店
        if (e.key.toLowerCase() === "r") {
            e.preventDefault();
            refreshShop();
            return;
        }

        // F 锁定商店
        if (e.key.toLowerCase() === "f") {
            e.preventDefault();
            lockShop();
            return;
        }

        // Space 跳过战斗
        if (e.key === " " || e.key === "Space" || e.code === "Space") {
            e.preventDefault();
            skipBattle();
            return;
        }

        // A 强制完成三连
        if (e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            forceCompleteTriple();
            return;
        }
    }

    // ──────────────────────────────────────────────
    // 启动
    // ──────────────────────────────────────────────

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            document.addEventListener("keydown", onKeyDown);
            setTimeout(bindEvents, 1000);
            initConfigPanel();
            AutoBuyHelper.init();
            // 默认隐藏面板
            setTimeout(() => {
                const p1 = document.getElementById('sq-config-panel');
                const p2 = document.getElementById('smart-buy-panel');
                if (p1) p1.style.display = 'none';
                if (p2) p2.style.display = 'none';
            }, 200);
        });
    } else {
        document.addEventListener("keydown", onKeyDown);
        setTimeout(bindEvents, 1000);
        initConfigPanel();
        AutoBuyHelper.init();
        setTimeout(() => {
            const p1 = document.getElementById('sq-config-panel');
            const p2 = document.getElementById('smart-buy-panel');
            if (p1) p1.style.display = 'none';
            if (p2) p2.style.display = 'none';
        }, 200);
    }

    console.info("[全能助手] v2.0.0 已启动 | 新增 E键一键清理  Q键切换面板 | 集成白名单配置+自动购买");
})();