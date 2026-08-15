// ==UserScript==
// @name         三国杀自走棋快捷助手
// @namespace    http://tampermonkey.net/
// @version      1.0.3
// @description  [1-6]购买  [R]刷新  [F]锁定  [Shift+1]遣散手牌中最右侧卡牌  [Shift+2]使用最右侧锦囊(自动尝试商店->上阵)  [Shift+4]遣散指定吴国低星卡牌  [Alt+9]遣散上阵区域最右侧卡牌  [Alt+0]上阵手牌中最右侧卡牌 [Space]跳过战斗 [Tab]禁用/启用三连控制 [Shift+R]强制刷新UI | 2x速度（测试不生效，本质UI动画滞后的同步策略） | 事件+轮询刷新
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

    // ── 全局开关 ──
    window.blockTripleCombine = true;

    // ── 速度 ──
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

    // ── 三连补丁（基于实例，动态获取原型，确保允许时正确调用原始方法） ──
    let triplePatched = false;
    function patchTriple() {
        if (triplePatched) return;
        try {
            const mgr = getManager();
            if (!mgr || !mgr.constructor || !mgr.constructor.prototype) {
                setTimeout(patchTriple, 100);
                return;
            }
            const proto = mgr.constructor.prototype;
            // 保存原始方法到闭包，避免被覆盖
            const origCheck = proto.checkSanLianReq;
            const origComposite = proto.ReqChessComposite;
            if (!origCheck || !origComposite) {
                setTimeout(patchTriple, 100);
                return;
            }
            proto.checkSanLianReq = function() {
                if (window.blockTripleCombine !== false) {
                    console.info("[三连] 阻止自动合成检测");
                    return;
                }
                // 调用原始方法（使用闭包保存的引用）
                return origCheck.call(this);
            };
            proto.ReqChessComposite = function(goodsIDs) {
                if (window.blockTripleCombine !== false) {
                    console.info("[三连] 阻止合成请求", goodsIDs);
                    return;
                }
                return origComposite.call(this, goodsIDs);
            };
            triplePatched = true;
            console.info("[三连] 补丁应用成功，当前状态:", window.blockTripleCombine ? "阻止" : "允许");
        } catch(e) {
            setTimeout(patchTriple, 100);
        }
    }
    // 立即尝试，若失败则轮询
    patchTriple();

    // ── 刷新战斗区 ──
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

    // ── 刷新手牌区 ──
    function refreshHandView(targetGoodsID, source) {
        source = source || "unknown";
        try {
            const scene = getScene();
            if (!scene || !scene.cardView) return false;
            let refreshed = false;

            // 直接隐藏指定卡片
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

            // 常规刷新
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

            // 触发游戏内部事件
            const mgr = getManager();
            if (mgr && typeof mgr.event === "function") {
                mgr.event('UI_UPDATE_HAND_CARD');
                mgr.event('ANI_LINE_UP');
                console.info("[手牌刷新] 手动触发事件，来源: " + source);
            }

            // 延迟再刷新一次
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

    // ── 事件绑定 ──
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
        });
        mgr.on('ANI_CHESS_RECYCLE', this, function(goodsID) {
            console.info("[事件] 遣散成功", goodsID);
        });
        eventBound = true;
        console.info("[事件] 绑定完成 (ANI_SHOP_BUY, ANI_CHESS_RECYCLE)");
    }

    // ── 功能函数 ──

    // ============================================================
    // 【新增】遣散手牌中指定 chessId 的卡牌 (Shift+4)
    // ============================================================
    const TARGET_CHESS_IDS = new Set([
        21003011, // 吕蒙
        21003021, // 陈武
        21003031, // 陆逊
        21003041, // 程普
        21003061, // 凌统
        21003091, // 周善
        21003101, // 徐盛
        21003111, // 甘宁
        21003121, // 太史慈
        21003131, // 张昭
        21003141, // 大乔
        21003151, // 孙坚
        21003161, // 鲁肃
        21003171, // 孙尚香
        21003191, // 孙翎鸾
        21003201, // 周瑜
        21003221, // 小乔
        21003231, // 韩当
        21003241  // 董袭
    ]);

    function discardTargetChessIds() {
        const mgr = getManager();
        if (!mgr) {
            console.warn("[遣散指定卡牌] 管理器不存在");
            showToast("管理器未就绪");
            return false;
        }

        // 检查是否在招募阶段
        if (mgr.phase !== 6) {
            showToast("非招募阶段");
            console.warn("[遣散指定卡牌] 当前阶段非招募，phase=" + mgr.phase);
            return false;
        }

        const hand = mgr.HandChess;
        if (!hand || hand.length === 0) {
            showToast("手牌为空");
            console.warn("[遣散指定卡牌] 手牌为空");
            return false;
        }

        // 收集所有匹配的卡牌 goodsID
        const goodsIDsToDiscard = [];
        const cardNames = [];

        for (let i = 0; i < hand.length; i++) {
            const card = hand[i];
            if (!card) continue;

            const chessID = card.chessID || card.ChessID || 0;
            if (TARGET_CHESS_IDS.has(chessID)) {
                const goodsID = card.goodsID || card.GoodsID || 0;
                if (goodsID) {
                    goodsIDsToDiscard.push(goodsID);
                    // 尝试获取卡牌名称（用于提示）
                    const name = card.name || card.Name || '';
                    if (name) {
                        cardNames.push(name);
                    } else {
                        cardNames.push('ID:' + chessID);
                    }
                }
            }
        }

        if (goodsIDsToDiscard.length === 0) {
            showToast("手牌中无目标卡牌");
            console.info("[遣散指定卡牌] 手牌中无目标卡牌");
            return false;
        }

        console.info("[遣散指定卡牌] 找到", goodsIDsToDiscard.length, "张目标卡牌:", cardNames.join(', '));

        // 逐个遣散（间隔 50ms，避免请求过快）
        goodsIDsToDiscard.forEach((gid, index) => {
            setTimeout(() => {
                if (typeof mgr.ReqShopRecycleChess === "function") {
                    mgr.ReqShopRecycleChess(gid);
                    console.info("[遣散指定卡牌] 遣散 goodsID=", gid);
                }
            }, index * 50);
        });

        showToast(`遣散 ${goodsIDsToDiscard.length} 张目标卡牌`);
        return true;
    }

    // ── 原有功能函数 ──
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

        // 手动隐藏商店卡片，提升即时反馈
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

        // 轮询检测
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

        // 事件监听辅助
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

    // ── 使用最右侧锦囊（Shift+2） ──
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

        // Shift+4 遣散指定 chessId 的卡牌
        if (e.code === 'Digit4' && e.shiftKey) {
            e.preventDefault();
            discardTargetChessIds();
            return;
        }

        // Shift+R 强制刷新UI
        if (e.code === 'KeyR' && e.shiftKey) {
            e.preventDefault();
            console.info("[强制刷新] 手动刷新手牌和战斗区");
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

        // Tab 切换三连状态
        if (e.key === 'Tab') {
            e.preventDefault();
            window.blockTripleCombine = !window.blockTripleCombine;
            const status = window.blockTripleCombine ? "阻止" : "允许";
            console.info("[三连] 当前状态:", status);
            showToast("三连" + status);

            if (!window.blockTripleCombine) {
                const mgr = getManager();
                if (mgr) {
                    setTimeout(() => {
                        if (typeof mgr.checkSanLianReq === 'function') {
                            mgr.checkSanLianReq();
                        }
                        if (typeof mgr.checkSanLianAni === 'function') {
                            mgr.checkSanLianAni();
                        }
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
        document.addEventListener("DOMContentLoaded", () => {
            document.addEventListener("keydown", onKeyDown);
            setTimeout(bindEvents, 1000);
        });
    } else {
        document.addEventListener("keydown", onKeyDown);
        setTimeout(bindEvents, 1000);
    }

    console.info("[AutoChess] v1.0.2 已启动 | 新增 Shift+4 遣散指定吴国低星卡牌 (吕蒙/陈武/陆逊/程普/凌统/周善/徐盛/甘宁/太史慈/张昭/大乔/孙坚/鲁肃/孙尚香/孙翎鸾/周瑜/小乔/韩当/董袭)");
    console.info("[AutoChess] 快捷键: 1-6购买  Shift+1遣散手牌最右  Shift+2使用最右侧锦囊  Shift+4遣散指定卡牌  Alt+9遣散战斗区最右  Alt+0上阵最右  R刷新  F锁定  空格跳过  Tab切换三连状态  Shift+R强制刷新UI");
})();