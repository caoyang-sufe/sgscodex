// ==UserScript==
// @name         三国杀自走棋快捷助手
// @namespace    http://tampermonkey.net/
// @version      1.0.2.1
// @description  [1-6]购买  [R]刷新  [F]锁定  [Shift+1]遣散手牌中最右侧卡牌  [Shift+2]使用最右侧锦囊  [Shift+3]自动随征  [Shift+4]一键遣散指定吴国低星卡牌  [Alt+1]自动刷新+购买(可多选配置)  [Alt+9]遣散上阵区域最右侧卡牌  [Alt+0]上阵手牌中最右侧卡牌 [Space]跳过战斗 [Tab]禁用/启用三连控制 [Shift+R]强制刷新UI | 2x速度 | 事件+轮询刷新
// @author       鲁班大王
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

    // ── 随征卡ID列表 ──
    var FOLLOWUP_CHESS_IDS = [
        '21003071', '21003072',
        '21001061', '21001062',
        '21004141', '21004142',
        '21007101', '21007102',
        '20904231'
    ];

    // ── 指定遣散的目标 chessId 列表 (Shift+4) ──
    var TARGET_DISCARD_CHESS_IDS = [
        21003011, 21003021, 21003031, 21003041, 21003061, 21003091,
        21003101, 21003111, 21003121, 21003131, 21003141, 21003151,
        21003161, 21003171, 21003191, 21003201, 21003221, 21003231,
        21003241
    ];
    var TARGET_DISCARD_SET = new Set(TARGET_DISCARD_CHESS_IDS);

    // ============================================================
    // 【核心】自动刷新+购买候选配置
    // ============================================================
    // 每次刷新后等待的时间（毫秒）
    var AUTO_REFRESH_BUY_DELAY = 200;

    // 候选卡牌列表（可扩展）
    var CANDIDATE_CHESS = [
        { name: '祢衡',     chessId: 21008191 },
        { name: '陈珪',     chessId: 21008081 },
		{ name: '张鲁',   chessId: 21008141 },
        { name: '南华老仙', chessId: 21008271 },
        { name: '庞德公',   chessId: 21008221 },
        { name: '蔡文姬',   chessId: 21008301 },
        { name: '黄承彦',   chessId: 21008231 },
        { name: '廖化',   chessId: 21002081 },
        { name: '雷薄',   chessId: 21007041 },
        { name: '邓茂',   chessId: 21004011 },
        { name: '丁奉',   chessId: 21003051 },
    ];

    // 自动购买状态（全局单例）
    var autoBuyState = {
        active: false,       // 是否激活
        stopFlag: false,     // 停止标志
        running: false,      // 循环是否正在运行
        targets: [],         // 选中的目标列表 [{name, chessId}]
        purchasedCount: 0,   // 已购买数量
        refreshCount: 0      // 已刷新次数
    };

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

    // ── 三连补丁 ──
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
            const origCheck = proto.checkSanLianReq;
            const origComposite = proto.ReqChessComposite;
            if (!origCheck || !origComposite) {
                setTimeout(patchTriple, 100);
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
        } catch(e) {
            setTimeout(patchTriple, 100);
        }
    }
    patchTriple();

    // ── 刷新战斗区 ──
    function refreshBattleView(source) {
        try {
            const scene = getScene();
            if (!scene || !scene.chessView) return false;
            if (typeof scene.chessView.Calibration === "function") {
                scene.chessView.Calibration(true);
                return true;
            }
            return false;
        } catch(e) { return false; }
    }

    // ── 刷新手牌区 ──
    function refreshHandView(targetGoodsID, source) {
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
                        refreshed = true;
                    }
                }
            }

            if (typeof scene.cardView.Calibration === "function") {
                scene.cardView.Calibration(true);
                refreshed = true;
            }
            if (typeof scene.cardView.UpdateHandCards === "function") {
                scene.cardView.UpdateHandCards();
                refreshed = true;
            }

            const mgr = getManager();
            if (mgr && typeof mgr.event === "function") {
                mgr.event('UI_UPDATE_HAND_CARD');
                mgr.event('ANI_LINE_UP');
            }

            setTimeout(() => {
                if (scene.cardView && typeof scene.cardView.Calibration === "function") {
                    scene.cardView.Calibration(true);
                }
            }, 50);

            return refreshed;
        } catch(e) { return false; }
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
    }

    // ============================================================
    // 【核心】配置面板 UI
    // ============================================================

    function createAutoBuyPanel() {
        // 如果已存在，先移除
        var existing = document.getElementById('autobuy-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'autobuy-panel';
        panel.style.cssText = [
            'position:fixed',
            'top:50%',
            'left:50%',
            'transform:translate(-50%,-50%)',
            'z-index:100001',
            'background:linear-gradient(145deg, #1e2a44, #141e33)',
            'border:2px solid #4a6a9a',
            'border-radius:12px',
            'padding:20px 24px',
            'min-width:340px',
            'box-shadow:0 10px 40px rgba(0,0,0,0.8)',
            'font-family:"Microsoft YaHei", sans-serif',
            'color:#e0d5c1'
        ].join(';');

        // 标题
        var title = document.createElement('div');
        title.style.cssText = 'font-size:18px;font-weight:bold;color:#ffd700;margin-bottom:6px;text-align:center;';
        title.textContent = '🎯 自动刷新+购买配置';
        panel.appendChild(title);

        // 副标题
        var subtitle = document.createElement('div');
        subtitle.style.cssText = 'font-size:12px;color:#88aadd;margin-bottom:14px;text-align:center;';
        subtitle.textContent = '勾选要自动购买的卡牌，然后点击开始';
        panel.appendChild(subtitle);

        // 候选列表容器
        var listContainer = document.createElement('div');
        listContainer.style.cssText = [
            'max-height:280px',
            'overflow-y:auto',
            'padding:10px',
            'background:rgba(0,0,0,0.3)',
            'border-radius:8px',
            'margin-bottom:14px'
        ].join(';');

        CANDIDATE_CHESS.forEach(function(candidate, index) {
            var item = document.createElement('label');
            item.style.cssText = [
                'display:flex',
                'align-items:center',
                'padding:8px 10px',
                'margin-bottom:4px',
                'border-radius:6px',
                'cursor:pointer',
                'transition:background 0.2s',
                'font-size:14px'
            ].join(';');
            item.onmouseenter = function() { item.style.background = 'rgba(74,138,255,0.15)'; };
            item.onmouseleave = function() { item.style.background = 'transparent'; };

            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = candidate.chessId;
            checkbox.dataset.name = candidate.name;
            checkbox.style.cssText = 'margin-right:10px;width:16px;height:16px;cursor:pointer;';

            // 恢复之前的选择状态
            if (autoBuyState.targets.some(function(t) { return t.chessId === candidate.chessId; })) {
                checkbox.checked = true;
            }

            var nameSpan = document.createElement('span');
            nameSpan.style.cssText = 'flex:1;color:#e0d5c1;';
            nameSpan.textContent = candidate.name;

            var idSpan = document.createElement('span');
            idSpan.style.cssText = 'color:#6a8aad;font-size:12px;font-family:Consolas,monospace;';
            idSpan.textContent = candidate.chessId;

            item.appendChild(checkbox);
            item.appendChild(nameSpan);
            item.appendChild(idSpan);
            listContainer.appendChild(item);
        });

        panel.appendChild(listContainer);

        // 快捷选择按钮
        var quickBtns = document.createElement('div');
        quickBtns.style.cssText = 'display:flex;gap:6px;margin-bottom:14px;';
        
        var btnSelectAll = document.createElement('button');
        btnSelectAll.textContent = '全选';
        btnSelectAll.style.cssText = 'flex:1;padding:6px;background:#2a4a7a;border:1px solid #4a6a9a;color:#e0d5c1;border-radius:5px;cursor:pointer;font-size:12px;';
        btnSelectAll.onclick = function() {
            listContainer.querySelectorAll('input[type=checkbox]').forEach(function(cb) { cb.checked = true; });
        };
        
        var btnClearAll = document.createElement('button');
        btnClearAll.textContent = '清空';
        btnClearAll.style.cssText = 'flex:1;padding:6px;background:#2a4a7a;border:1px solid #4a6a9a;color:#e0d5c1;border-radius:5px;cursor:pointer;font-size:12px;';
        btnClearAll.onclick = function() {
            listContainer.querySelectorAll('input[type=checkbox]').forEach(function(cb) { cb.checked = false; });
        };

        quickBtns.appendChild(btnSelectAll);
        quickBtns.appendChild(btnClearAll);
        panel.appendChild(quickBtns);

        // 底部按钮
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;';

        var btnCancel = document.createElement('button');
        btnCancel.textContent = '取消';
        btnCancel.style.cssText = [
            'flex:1',
            'padding:10px',
            'background:linear-gradient(145deg, #4a3a2a, #2a1a0a)',
            'border:1px solid #6a5a3a',
            'color:#e0d5c1',
            'border-radius:6px',
            'cursor:pointer',
            'font-size:14px',
            'font-weight:bold'
        ].join(';');
        btnCancel.onclick = function() {
            panel.remove();
        };

        var btnStart = document.createElement('button');
        btnStart.textContent = '🚀 开始';
        btnStart.style.cssText = [
            'flex:2',
            'padding:10px',
            'background:linear-gradient(145deg, #2a6a3a, #1a4a2a)',
            'border:1px solid #4a8a5a',
            'color:#fff',
            'border-radius:6px',
            'cursor:pointer',
            'font-size:14px',
            'font-weight:bold'
        ].join(';');
        btnStart.onclick = function() {
            var selected = [];
            listContainer.querySelectorAll('input[type=checkbox]:checked').forEach(function(cb) {
                selected.push({
                    name: cb.dataset.name,
                    chessId: parseInt(cb.value)
                });
            });

            if (selected.length === 0) {
                showToast("⚠️ 请至少选择一张卡牌");
                return;
            }

            panel.remove();
            startAutoBuy(selected);
        };

        btnRow.appendChild(btnCancel);
        btnRow.appendChild(btnStart);
        panel.appendChild(btnRow);

        document.body.appendChild(panel);

        // 点击面板外关闭
        setTimeout(function() {
            var outsideClick = function(ev) {
                if (!panel.contains(ev.target)) {
                    panel.remove();
                    document.removeEventListener('mousedown', outsideClick);
                }
            };
            document.addEventListener('mousedown', outsideClick);
        }, 100);
    }

    // ============================================================
    // 【核心】自动刷新+购买逻辑
    // ============================================================

    function isInRecruitPhase() {
        var m = getManager();
        if (!m) return false;
        var phase = m.Phase || m.phase;
        return phase === 6 || phase === 'InRecruit';
    }

    function findShopGoodsByChessIds(chessIdSet) {
        var m = getManager();
        if (!m) return null;

        var shop = m.ShopGoods || [];
        var results = [];
        for (var i = 0; i < shop.length; i++) {
            var goods = shop[i];
            if (!goods) continue;
            var goodsChessId = goods.chessID || goods.ChessID || 0;
            if (chessIdSet.has(goodsChessId)) {
                results.push({
                    slotIndex: i,
                    goodsID: goods.goodsID || goods.GoodsID || 0,
                    chessID: goodsChessId
                });
            }
        }
        return results.length > 0 ? results : null;
    }

    function sleep(ms) {
        return new Promise(function(resolve) { setTimeout(resolve, ms); });
    }

    async function autoRefreshBuyLoop() {
        autoBuyState.running = true;
        autoBuyState.stopFlag = false;
        autoBuyState.purchasedCount = 0;
        autoBuyState.refreshCount = 0;

        // 构建目标 chessId Set 用于快速查找
        var targetSet = new Set(autoBuyState.targets.map(function(t) { return t.chessId; }));
        var targetNames = autoBuyState.targets.map(function(t) { return t.name; }).join('、');

        console.info("[自动购买] 🚀 开始循环，目标:", targetNames);

        while (!autoBuyState.stopFlag && autoBuyState.active) {
            // 检查招募阶段
            if (!isInRecruitPhase()) {
                await sleep(500);
                continue;
            }

            var m = getManager();
            if (!m) { await sleep(200); continue; }
            if (!m.CanOperate) { await sleep(200); continue; }

            // 查找商店中是否有目标卡牌
            var foundList = findShopGoodsByChessIds(targetSet);

            if (foundList && foundList.length > 0) {
                // ===== 找到目标，购买 =====
                var boughtThisRound = false;

                for (var i = 0; i < foundList.length; i++) {
                    if (autoBuyState.stopFlag || !autoBuyState.active) break;

                    var found = foundList[i];

                    // 每次购买前重新检查手牌和金币（因为购买会改变状态）
                    var cost = m.GetShopBuyCost ? m.GetShopBuyCost(found.goodsID) : 3;
                    if (m.CoinNum < cost) {
                        console.info("[自动购买] 💰 金币不足:", m.CoinNum, "<", cost);
                        break;
                    }

                    var handLimit = m.HandCardLimit || 20;
                    var handCount = m.HandCardCnt || 0;
                    if (handCount >= handLimit) {
                        console.info("[自动购买] 🃏 手牌已满:", handCount, "/", handLimit);
                        break;
                    }

                    // 找到目标卡牌名称
                    var targetName = '';
                    for (var t = 0; t < autoBuyState.targets.length; t++) {
                        if (autoBuyState.targets[t].chessId === found.chessID) {
                            targetName = autoBuyState.targets[t].name;
                            break;
                        }
                    }

                    console.info("[自动购买] ✅ 找到", targetName, "第" + (found.slotIndex + 1) + "格，购买");
                    showToast("🛒 购买 " + targetName);

                    if (typeof m.ReqShopBuyChess === "function") {
                        m.ReqShopBuyChess(found.goodsID);
                        autoBuyState.purchasedCount++;
                        boughtThisRound = true;
                    }

                    await sleep(350);
                }

                // 购买完本轮所有目标后，继续循环（商店可能还有卡）
                if (boughtThisRound) {
                    await sleep(200);
                    continue;
                }
            }

            // ===== 没找到目标，刷新商店 =====
            var refreshCost = m.ShopRefreshCost || 1;
            if (m.CoinNum < refreshCost) {
                console.info("[自动购买] 💰 金币不足以刷新:", m.CoinNum, "<", refreshCost);
                await sleep(500);
                continue;
            }

            autoBuyState.refreshCount++;
            console.info("[自动购买] 🔄 第" + autoBuyState.refreshCount + "次刷新");
            showToast("🔄 刷新中... (" + autoBuyState.refreshCount + ")");

            if (typeof m.ReqShopRefreshChess === "function") {
                m.ReqShopRefreshChess();
            }

            await sleep(AUTO_REFRESH_BUY_DELAY);
        }

        autoBuyState.running = false;
        console.info("[自动购买] ⏹ 循环结束，共购买 " + autoBuyState.purchasedCount + " 张，刷新 " + autoBuyState.refreshCount + " 次");
    }

    function startAutoBuy(targets) {
        autoBuyState.active = true;
        autoBuyState.targets = targets;
        autoBuyState.stopFlag = false;

        var names = targets.map(function(t) { return t.name; }).join('、');
        showToast("▶ 自动购买已启动: " + names);

        // 启动循环
        autoRefreshBuyLoop();
    }

    function stopAutoBuy() {
        autoBuyState.active = false;
        autoBuyState.stopFlag = true;
        showToast("🛑 自动购买已停止 (共买 " + autoBuyState.purchasedCount + " 张)");
    }

    function toggleAutoBuy() {
        if (autoBuyState.active) {
            stopAutoBuy();
        } else {
            createAutoBuyPanel();
        }
    }

    // ── 功能函数 ──

    function discardTargetChessIds() {
        var m = getManager();
        if (!m) {
            showToast("管理器未就绪");
            return false;
        }

        var phase = m.Phase || m.phase;
        if (phase !== 6 && phase !== 'InRecruit') {
            showToast("非招募阶段");
            return false;
        }

        var hand = m.HandChess || m.handChess || [];
        if (!hand || hand.length === 0) {
            showToast("手牌为空");
            return false;
        }

        var goodsIDsToDiscard = [];

        for (var i = 0; i < hand.length; i++) {
            var card = hand[i];
            if (!card) continue;
            var chessID = card.chessID || card.ChessID || 0;
            if (TARGET_DISCARD_SET.has(chessID)) {
                var goodsID = card.goodsID || card.GoodsID || 0;
                if (goodsID) goodsIDsToDiscard.push(goodsID);
            }
        }

        if (goodsIDsToDiscard.length === 0) {
            showToast("手牌中无目标卡牌");
            return false;
        }

        goodsIDsToDiscard.forEach(function(gid, index) {
            setTimeout(function() {
                if (typeof m.ReqShopRecycleChess === "function") {
                    m.ReqShopRecycleChess(gid);
                }
            }, index * 60);
        });

        showToast("遣散 " + goodsIDsToDiscard.length + " 张目标卡牌");
        return true;
    }

    function isFollowUpCard(card) {
        if (!card) return false;
        var chessID = card.chessID || card.ChessID || 0;
        return FOLLOWUP_CHESS_IDS.indexOf(String(chessID)) !== -1;
    }

    function getRightmostFollowUpCard() {
        var m = getManager();
        if (!m) return null;
        var hand = m.HandChess || m.handChess || [];
        for (var i = hand.length - 1; i >= 0; i--) {
            var card = hand[i];
            if (isFollowUpCard(card)) {
                return {
                    index: i,
                    card: card,
                    goodsID: card.goodsID || card.GoodsID || 0,
                    chessID: card.chessID || card.ChessID || 0
                };
            }
        }
        return null;
    }

    function getTargetChess(position) {
        var m = getManager();
        if (!m) return null;
        position = position || 0;
        var lineup = m.BattleChess || m.SelfInfo?.LineUpChess || [];
        if (position < 0 || position >= lineup.length) return null;
        var target = lineup[position];
        if (!target) return null;
        return {
            chess: target,
            goodsID: target.goodsID || target.GoodsID || 0,
            chessID: target.chessID || target.ChessID || 0
        };
    }

    function autoFollowUp() {
        var m = getManager();
        if (!m) { showToast("管理器未就绪"); return false; }

        var phase = m.Phase || m.phase;
        if (phase !== 6 && phase !== 'InRecruit') {
            showToast("非招募阶段");
            return false;
        }

        var followUp = getRightmostFollowUpCard();
        if (!followUp) { showToast("无随征卡"); return false; }

        var target = getTargetChess(0);
        if (!target) { showToast("位置0无棋子"); return false; }

        if (typeof m.ReqChessFollowUp === 'function') {
            m.ReqChessFollowUp(target.goodsID, followUp.goodsID);
            showToast("随征成功");
            return true;
        } else {
            showToast("随征失败");
            return false;
        }
    }

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

        showToast("买入第" + (index+1) + "格");
        return true;
    }

    function discardRightmostHand() {
        const mgr = getManager();
        if (!mgr) return false;
        const hand = mgr.HandChess;
        if (!hand || hand.length === 0) { showToast("手牌为空"); return false; }
        const last = hand[hand.length - 1];
        if (!last || !last.goodsID) return false;
        const goodsID = last.goodsID;
        if (typeof mgr.ReqShopRecycleChess !== "function") return false;
        mgr.ReqShopRecycleChess(goodsID);
        showToast("遣散手牌最右侧");
        return true;
    }

    function discardRightmostBattle() {
        const mgr = getManager();
        if (!mgr) return false;
        const lineup = mgr.SelfInfo.LineUpGoodsIDs;
        if (!lineup || lineup.length === 0) { showToast("战斗区为空"); return false; }
        let goodsID = null;
        for (let i = lineup.length - 1; i >= 0; i--) {
            if (lineup[i] !== 0) { goodsID = lineup[i]; break; }
        }
        if (!goodsID) { showToast("战斗区无棋子"); return false; }
        if (typeof mgr.ReqShopRecycleChess !== "function") return false;
        mgr.ReqShopRecycleChess(goodsID);
        showToast("遣散战斗区最右侧");
        refreshBattleView("manual");
        return true;
    }

    function deployRightmostCard() {
        const mgr = getManager();
        if (!mgr) { showToast("管理器未就绪"); return false; }
        if (mgr.phase !== 6) { showToast("非招募阶段"); return false; }
        if (!mgr.CanOperate) { showToast("不可操作"); return false; }

        const hand = mgr.HandChess;
        if (!hand || hand.length === 0) { showToast("手牌为空"); return false; }

        const last = hand[hand.length - 1];
        if (!last || !last.goodsID) { showToast("无效卡牌"); return false; }
        const goodsID = last.goodsID;

        let lineup = mgr.SelfInfo.LineUpGoodsIDs.slice();
        while (lineup.length < 7) lineup.push(0);

        const emptyIndex = lineup.indexOf(0);
        if (emptyIndex === -1) { showToast("战斗区已满"); return false; }
        lineup[emptyIndex] = goodsID;

        if (typeof mgr.ReqChessLineUp !== "function") {
            showToast("ReqChessLineUp 方法不存在");
            return false;
        }

        let pollInterval = null;
        let pollCount = 0;
        const MAX_POLL = 10;
        const POLL_INTERVAL_MS = 100;

        const stopPolling = () => {
            if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        };

        const checkHand = () => {
            pollCount++;
            const currentHand = mgr.HandChess;
            let found = false;
            if (currentHand) {
                for (let i = 0; i < currentHand.length; i++) {
                    if (currentHand[i] && currentHand[i].goodsID === goodsID) {
                        found = true; break;
                    }
                }
            }
            if (!found) {
                setTimeout(() => {
                    refreshHandView(goodsID, "polling");
                    refreshBattleView("polling");
                }, 50);
                stopPolling();
            } else if (pollCount >= MAX_POLL) {
                refreshHandView(goodsID, "polling");
                refreshBattleView("polling");
                stopPolling();
            }
        };

        pollInterval = setInterval(checkHand, POLL_INTERVAL_MS);
        setTimeout(checkHand, 0);

        mgr.ReqChessLineUp(lineup);

        setTimeout(() => {
            if (pollInterval) {
                stopPolling();
                refreshHandView(goodsID, "polling");
                refreshBattleView("polling");
            }
        }, 1000);

        return true;
    }

    function useRightmostSpell() {
        const mgr = getManager();
        if (!mgr) { showToast("管理器未就绪"); return false; }
        if (mgr.phase !== 6) { showToast("非招募阶段"); return false; }

        const hand = mgr.HandChess;
        if (!hand || hand.length === 0) { showToast("手牌为空"); return false; }

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
            return false;
        }

        const targetList = [];
        const shopGoods = mgr.ShopGoods || [];
        if (shopGoods.length > 0 && shopGoods[0]) {
            const tid = shopGoods[0].goodsID || shopGoods[0].GoodsID || 0;
            if (tid) targetList.push({ id: tid, label: '商店', type: 'shop' });
        }

        const lineup = mgr.BattleChess || mgr.selfInfo?.LineUpChess || [];
        for (let i = 0; i < lineup.length; i++) {
            const target = lineup[i];
            if (target) {
                const tid = target.goodsID || target.GoodsID || target.UniqueId || 0;
                if (tid) targetList.push({ id: tid, label: '上阵位置' + i, type: 'lineup', index: i });
            }
        }

        if (targetList.length === 0) { showToast("无可用目标"); return false; }

        let currentTargetIdx = 0;
        let isCompleted = false;
        let timeoutId = null;

        function onSpellResponse(e) {
            if (isCompleted) return;
            const proto = e.Protocol;
            if (proto.errCode) {
                currentTargetIdx++;
                tryNextTarget();
            } else {
                isCompleted = true;
                clearTimeout(timeoutId);
                mgr.off('RESP_CHESS_SPELL_USE', onSpellResponse);
                showToast("使用锦囊成功");
            }
        }

        function tryNextTarget() {
            if (isCompleted) return;
            if (currentTargetIdx >= targetList.length) {
                isCompleted = true;
                mgr.off('RESP_CHESS_SPELL_USE', onSpellResponse);
                showToast("锦囊无可用目标");
                return;
            }
            const target = targetList[currentTargetIdx];
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

        // Alt+1 切换自动刷新+购买（配置面板 / 停止）
        if (e.altKey && e.key === "1") {
            e.preventDefault();
            toggleAutoBuy();
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

        // Shift+3 自动随征
        if (e.code === 'Digit3' && e.shiftKey) {
            e.preventDefault();
            autoFollowUp();
            return;
        }

        // Shift+4 一键遣散指定卡牌
        if (e.code === 'Digit4' && e.shiftKey) {
            e.preventDefault();
            discardTargetChessIds();
            return;
        }

        // Tab 切换三连状态
        if (e.key === 'Tab') {
            e.preventDefault();
            window.blockTripleCombine = !window.blockTripleCombine;
            const status = window.blockTripleCombine ? "阻止" : "允许";
            showToast("三连" + status);
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
        document.addEventListener("DOMContentLoaded", () => {
            document.addEventListener("keydown", onKeyDown);
            setTimeout(bindEvents, 1000);
        });
    } else {
        document.addEventListener("keydown", onKeyDown);
        setTimeout(bindEvents, 1000);
    }

    console.info("[AutoChess] v1.0.1.5 已启动");
    console.info("  1-6购买 | Shift+1遣散手牌最右 | Shift+2使用最右侧锦囊 | Shift+3自动随征 | Shift+4一键遣散指定卡牌");
    console.info("  Alt+1自动刷新+购买(可多选配置)");
    console.info("  Alt+9遣散战斗区最右 | Alt+0上阵最右 | R刷新 | F锁定 | 空格跳过 | Tab切换三连状态 | Shift+R强制刷新UI");

})();