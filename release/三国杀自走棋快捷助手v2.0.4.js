// ==UserScript==
// @name         三国杀自走棋快捷助手
// @namespace    http://tampermonkey.net/
// @version      2.0.4
// @description  S11昭君出塞更新 [1-6]购买  [R]刷新  [F]锁定  [Shift+1]遣散手牌中最右侧卡牌  [Shift+2]使用最右侧锦囊(自动跳过黑名单)  [Shift+3]自动随征  [Shift+4]一键遣散指定吴国低星卡牌  [Alt+1]打开自动寻牌面板（如兵贵神速时使用）  [Alt+3]锦囊自动使用黑名单管理面板 [Alt+7]陈珪虚空触发丁奉并重新上阵  [Alt+9]遣散上阵区域最右侧卡牌  [Alt+0]上阵手牌中最右侧卡牌 [Space]跳过战斗 [Tab]禁用/启用三连控制 [Shift+R]强制刷新UI | 2x速度 | 事件+轮询刷新
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

    // ── 随征卡ID列表 ──
    var FOLLOWUP_CHESS_IDS = [
        '21103071', '21103072', // 黄盖
        '21101061', '21101062', // 薛灵芸
        '21104141', '21104142', // 马元义
        '21107101', '21107102', // 张勋
        '20904231', '20906321', // 黄巾兵、战马
    ];
	

    // ── 指定遣散的目标 chessId 列表 (Shift+4) ──：刷孙策/苦肉黄盖
	var GEXUAN_CHESS_IDS = [21103081, 21103082]; // ── 葛玄 chessID（Shift+4 上阵用）──
    var TARGET_DISCARD_CHESS_IDS = [
        21103011, 21103021, 21103031, 21103041, 21103061, 21103091,
        21103101, 21103111, 21103121, 21103131, 21103141, 21103151,
        21103161, 21103191, 21103201, 21103221, 21103231,
        21103241
    ];
    var TARGET_DISCARD_SET = new Set(TARGET_DISCARD_CHESS_IDS);

    // ============================================================
    // 【核心】锦囊黑名单 (Shift+2 自动使用时跳过)
    // ============================================================
    // 默认不自动使用的锦囊ID - 版本更新时修改这里
    var SPELL_BLACKLIST_DEFAULT = {
        311009: "釜底抽薪·六",
        311011: "过河拆桥·三",
        311012: "过河拆桥·五",
        311003: "调虎离山·四",
        311007: "斗转星移·四",
        311038: "破釜沉舟·六",
        311062: "偷梁换柱·四",
        311063: "偷梁换柱·六",
        311076: "以逸待劳·五",
        311080: "增兵减灶·四",
		311052: "随机应变·六",
		311081: "鸩毒·六",
		311034: "美人计·五",
    };
    var SPELL_BLACKLIST = new Set(Object.keys(SPELL_BLACKLIST_DEFAULT).map(Number)); // 运行时黑名单 (Set, 用于快速查找)

    // ============================================================
    // 【核心】自动刷新+购买候选配置
    // ============================================================
    // 每次刷新后等待的时间（毫秒）
    var AUTO_REFRESH_BUY_DELAY = 200;

    // 候选卡牌列表（可扩展）：alt+2自动寻牌
    var CANDIDATE_CHESS = [
        { name: '祢衡',     chessId: 21108191 },
        { name: '陈珪',     chessId: 21108081 },
		{ name: '张鲁',   chessId: 21108141 },
		{ name: '赵忠', chessId: 21105181 },
        { name: '南华老仙', chessId: 21108271 },
        { name: '庞德公',   chessId: 21108221 },
        { name: '蔡文姬',   chessId: 21108301 },
        { name: '黄承彦',   chessId: 21108231 },
        { name: '廖化',   chessId: 21102081 },
        { name: '丁奉',   chessId: 21103051 },
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
	
    // ============================================================
    // 【核心】锦囊黑名单配置面板 (Alt+3)
    // ============================================================

    function createSpellConfigPanel() {
        // 如果已存在，先移除
        var existing = document.getElementById('spell-config-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'spell-config-panel';
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
            'min-width:400px',
            'max-width:520px',
            'box-shadow:0 10px 40px rgba(0,0,0,0.8)',
            'font-family:"Microsoft YaHei", sans-serif',
            'color:#e0d5c1'
        ].join(';');

        // 标题
        var title = document.createElement('div');
        title.style.cssText = 'font-size:18px;font-weight:bold;color:#ffd700;margin-bottom:6px;text-align:center;';
        title.textContent = '📜 锦囊自动使用配置';
        panel.appendChild(title);

        // 副标题
        var subtitle = document.createElement('div');
        subtitle.style.cssText = 'font-size:12px;color:#88aadd;margin-bottom:14px;text-align:center;line-height:1.5;';
        subtitle.innerHTML = '勾选 = <span style="color:#5FD553;">允许自动使用</span> | 不勾 = <span style="color:#ED422E;">保持黑名单(跳过)</span>';
        panel.appendChild(subtitle);

        // 列表容器
        var listContainer = document.createElement('div');
        listContainer.style.cssText = [
            'max-height:340px',
            'overflow-y:auto',
            'padding:10px',
            'background:rgba(0,0,0,0.3)',
            'border-radius:8px',
            'margin-bottom:14px'
        ].join(';');

        // 遍历所有默认黑名单锦囊
        Object.keys(SPELL_BLACKLIST_DEFAULT).forEach(function(idStr) {
            var spellId = Number(idStr);
            var spellName = SPELL_BLACKLIST_DEFAULT[spellId];

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
            checkbox.dataset.spellId = spellId;
            checkbox.style.cssText = 'margin-right:10px;width:16px;height:16px;cursor:pointer;';

            // 逻辑: 黑名单里 → 不勾选; 不在黑名单里 → 勾选
            checkbox.checked = !SPELL_BLACKLIST.has(spellId);

            var nameSpan = document.createElement('span');
            nameSpan.style.cssText = 'flex:1;color:#e0d5c1;';
            nameSpan.textContent = spellName;

            var idSpan = document.createElement('span');
            idSpan.style.cssText = 'color:#6a8aad;font-size:12px;font-family:Consolas,monospace;';
            idSpan.textContent = spellId;

            // 勾选状态的颜色反馈
            var updateStyle = function() {
                if (checkbox.checked) {
                    nameSpan.style.color = '#5FD553';
                } else {
                    nameSpan.style.color = '#ED422E';
                }
            };
            checkbox.onchange = updateStyle;
            updateStyle();

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
        btnSelectAll.textContent = '✅ 全部允许';
        btnSelectAll.style.cssText = 'flex:1;padding:6px;background:#2a5a3a;border:1px solid #4a8a5a;color:#e0d5c1;border-radius:5px;cursor:pointer;font-size:12px;';
        btnSelectAll.onclick = function() {
            listContainer.querySelectorAll('input[type=checkbox]').forEach(function(cb) {
                cb.checked = true;
                cb.onchange();
            });
        };

        var btnClearAll = document.createElement('button');
        btnClearAll.textContent = '🚫 全部禁用';
        btnClearAll.style.cssText = 'flex:1;padding:6px;background:#5a2a2a;border:1px solid #8a4a4a;color:#e0d5c1;border-radius:5px;cursor:pointer;font-size:12px;';
        btnClearAll.onclick = function() {
            listContainer.querySelectorAll('input[type=checkbox]').forEach(function(cb) {
                cb.checked = false;
                cb.onchange();
            });
        };

        var btnReset = document.createElement('button');
        btnReset.textContent = '🔄 重置默认';
        btnReset.style.cssText = 'flex:1;padding:6px;background:#3a3a5a;border:1px solid #5a5a8a;color:#e0d5c1;border-radius:5px;cursor:pointer;font-size:12px;';
        btnReset.onclick = function() {
            // 重置为默认黑名单状态
            listContainer.querySelectorAll('input[type=checkbox]').forEach(function(cb) {
                var spellId = Number(cb.dataset.spellId);
                // 默认黑名单 = 不勾选
                cb.checked = !(spellId in SPELL_BLACKLIST_DEFAULT);
                cb.onchange();
            });
        };

        quickBtns.appendChild(btnSelectAll);
        quickBtns.appendChild(btnClearAll);
        quickBtns.appendChild(btnReset);
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

        var btnSave = document.createElement('button');
        btnSave.textContent = '💾 保存';
        btnSave.style.cssText = [
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
        btnSave.onclick = function() {
            // 重新构建黑名单
            var newBlacklist = new Set();
            var allowedNames = [];
            var blockedNames = [];

            listContainer.querySelectorAll('input[type=checkbox]').forEach(function(cb) {
                var spellId = Number(cb.dataset.spellId);
                var spellName = SPELL_BLACKLIST_DEFAULT[spellId];
                if (cb.checked) {
                    // 允许自动使用 → 不在黑名单
                    allowedNames.push(spellName);
                } else {
                    // 禁用 → 在黑名单
                    newBlacklist.add(spellId);
                    blockedNames.push(spellName);
                }
            });

            // 更新运行时黑名单
            SPELL_BLACKLIST.clear();
            newBlacklist.forEach(function(id) { SPELL_BLACKLIST.add(id); });

            console.info("[锦囊配置] ✅ 已保存");
            console.info("[锦囊配置] 允许自动使用 (" + allowedNames.length + "):", allowedNames.join('、'));
            console.info("[锦囊配置] 黑名单跳过 (" + blockedNames.length + "):", blockedNames.join('、'));

            showToast("✅ 配置已保存 (允许 " + allowedNames.length + " / 跳过 " + blockedNames.length + ")");
            panel.remove();
        };

        btnRow.appendChild(btnCancel);
        btnRow.appendChild(btnSave);
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

    // ── 功能函数 ──
	// ── Shift+4 主流程：所有葛玄逐个 上阵→指定目标→遣散，再遣散目标卡牌 ──
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

		// 收集手牌中所有葛玄的 goodsID（从左到右，保证顺序稳定）
		var hand = m.HandChess || m.handChess || [];
		var gexuanGoodsIDs = [];
		var gexuanIdSet = new Set(GEXUAN_CHESS_IDS);
		for (var i = 0; i < hand.length; i++) {
			var card = hand[i];
			if (!card) continue;
			var chessID = card.chessID || card.ChessID || 0;
			if (gexuanIdSet.has(chessID)) {
				var gid = card.goodsID || card.GoodsID || 0;
				if (gid) gexuanGoodsIDs.push(gid);
			}
		}

		if (gexuanGoodsIDs.length === 0) {
			// 手牌无葛玄：直接遣散
			return doDiscard(m);
		}

		console.info("[Shift+4] 发现 " + gexuanGoodsIDs.length + " 张葛玄，逐个处理");
		showToast("处理葛玄 x" + gexuanGoodsIDs.length + "...");

		// 串行处理队列
		var idx = 0;

		function processNextGexuan() {
			if (idx >= gexuanGoodsIDs.length) {
				console.info("[Shift+4] 所有葛玄处理完毕，开始遣散目标卡");
				// 全部葛玄处理完，再执行原遣散逻辑
				setTimeout(function () { doDiscard(m); }, 200);
				return;
			}

			var currentIdx = idx;
			var gGoodsID = gexuanGoodsIDs[idx];
			idx++;

			// 每次处理前重新从手牌定位这张葛玄，确保还能拿到最新对象（拿 skillID）
			var handNow = m.HandChess || m.handChess || [];
			var gCard = null;
			for (var k = 0; k < handNow.length; k++) {
				var c = handNow[k];
				if (c && (c.goodsID === gGoodsID || c.GoodsID === gGoodsID)) {
					gCard = c;
					break;
				}
			}
			if (!gCard) {
				console.warn("[Shift+4] 第" + (currentIdx + 1) + "张葛玄(goodsID=" + gGoodsID + ")已不在手牌，跳过");
				processNextGexuan();
				return;
			}

			// 找当前 lineup 最右侧棋子作为技能目标（此时该葛玄还在手牌，天然排除自身）
			var targetGoodsID = 0;
			var battle = m.BattleChess || [];
			for (var bi = battle.length - 1; bi >= 0; bi--) {
				var bc = battle[bi];
				if (bc && (bc.goodsID || bc.GoodsID)) {
					targetGoodsID = bc.goodsID || bc.GoodsID;
					break;
				}
			}

			var gSkillID = getCardSkillID(gCard);

			console.info("[Shift+4] 处理第" + (currentIdx + 1) + "/" + gexuanGoodsIDs.length +
						 "张葛玄 goodsID=" + gGoodsID +
						 ", skillID=" + gSkillID +
						 ", 目标 goodsID=" + (targetGoodsID || "无"));

			var onLineUpDone = function (ok) {
				if (!ok) {
					console.warn("[Shift+4] 第" + (currentIdx + 1) + "张葛玄上阵失败，跳过遣散");
					// 上阵失败则这张葛玄没进 lineup，无需遣散，直接处理下一张
					setTimeout(processNextGexuan, 150);
					return;
				}
				console.info("[Shift+4] 第" + (currentIdx + 1) + "张葛玄上阵成功，等待技能结算后遣散");
				// 等技能结算，再遣散这张葛玄
				setTimeout(function () {
					discardOneGexuanFromBattle(m, gGoodsID);
					// 等遣散生效、lineup 更新后处理下一张
					setTimeout(processNextGexuan, 200);
				}, 250);
			};

			if (gSkillID && targetGoodsID) {
				lineUpCard(m, gGoodsID, gSkillID, targetGoodsID, onLineUpDone);
			} else {
				if (!gSkillID) console.warn("[Shift+4] 第" + (currentIdx + 1) + "张葛玄 技能ID异常，改为普通上阵");
				if (!targetGoodsID) console.warn("[Shift+4] 上阵区为空，第" + (currentIdx + 1) + "张葛玄普通上阵不指定目标");
				lineUpCard(m, gGoodsID, 0, 0, onLineUpDone);
			}
		}

		processNextGexuan();
		return true;
	}

	// ── 从上阵区遣散指定 goodsID 的葛玄 ──
	// 优先按 goodsID 精确匹配；若上阵后 goodsID 可能变化，则回退到按 chessID 找最右侧葛玄
	function discardOneGexuanFromBattle(m, expectGoodsID) {
		var battle = m.BattleChess || [];
		var gGoodsID = 0;
		var gChessID = 0;

		// 1) 优先按 goodsID 精确匹配
		for (var i = battle.length - 1; i >= 0; i--) {
			var c = battle[i];
			if (c && (c.goodsID === expectGoodsID || c.GoodsID === expectGoodsID)) {
				gGoodsID = c.goodsID || c.GoodsID;
				gChessID = c.chessID || c.ChessID || 0;
				break;
			}
		}

		// 2) 回退：按 chessID 从右往左找最右侧葛玄
		if (!gGoodsID) {
			for (var j = battle.length - 1; j >= 0; j--) {
				var cc = battle[j];
				if (cc && GEXUAN_CHESS_IDS.indexOf(cc.chessID || cc.ChessID) !== -1) {
					gGoodsID = cc.goodsID || cc.GoodsID || 0;
					gChessID = cc.chessID || cc.ChessID || 0;
					break;
				}
			}
		}

		if (!gGoodsID) {
			console.warn("[Shift+4] 上阵区未找到待遣散葛玄(goodsID=" + expectGoodsID + ")");
			return false;
		}
		if (typeof m.ReqShopRecycleChess !== "function") {
			console.warn("[Shift+4] ReqShopRecycleChess 不存在，无法遣散葛玄");
			return false;
		}
		try {
			m.ReqShopRecycleChess(gGoodsID);
			console.info("[Shift+4] 已遣散葛玄(chessID=" + gChessID + ", goodsID=" + gGoodsID + ")");
			setTimeout(function () { refreshBattleView("manual"); }, 100);
			return true;
		} catch (e) {
			console.error("[Shift+4] 遣散葛玄异常:", e);
			return false;
		}
	}

	// ── 原遣散逻辑（不变）──
	function doDiscard(m) {
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

		goodsIDsToDiscard.forEach(function (gid, index) {
			setTimeout(function () {
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


    // ── Alt+8 自动上阵最右侧棋子并指定第0个目标 ──
	// 全局变量：暂存待上阵的阵容



    // ============================================================
    // 【核心】Alt+8 两段式自动上阵 + 技能目标指定
    // ============================================================
    // 全局变量：暂存待上阵的阵容（ReqChessLineUp 劫持用）
    var pendingLineup = null;

    // 卡牌 A：陈珪
    var CHENGUI_CHESS_IDS = [21108081];  // 仅普通；如需金卡可加 21108082
    // 卡牌 B 的判定：丁奉
    var DINGFENG_CHESS_IDS = [21103051, 21103052];
    // 卡牌 C 的候选：凌统 / 孙尚香（普通 + 金色）
    var CANDIDATE_C_CHESS_IDS = [21103061, 21103062, 21103171, 21103172];

    // 从 hand 中从右往左找第一个 chessID 在 ids 里的卡牌
    function findRightmostHandByChessIds(hand, ids) {
        if (!hand) return null;
        var idSet = new Set(ids);
        for (var i = hand.length - 1; i >= 0; i--) {
            var c = hand[i];
            if (c && idSet.has(c.chessID)) return { card: c, index: i };
        }
        return null;
    }

    // 从 hand 中按 goodsID 找卡牌
    function findHandByGoodsID(hand, goodsID) {
        if (!hand || !goodsID) return null;
        for (var i = 0; i < hand.length; i++) {
            var c = hand[i];
            if (c && (c.goodsID === goodsID || c.GoodsID === goodsID)) {
                return { card: c, index: i };
            }
        }
        return null;
    }

    // 从 lineup 中从右往左找第一个 chessID 在 ids 里的卡牌
    // lineup 可以是 BattleChess（对象数组）或 LineUpGoodsIDs（goodsID 数组）
    function findRightmostBattleByChessIds(battle, ids) {
        if (!battle) return null;
        var idSet = new Set(ids);
        for (var i = battle.length - 1; i >= 0; i--) {
            var c = battle[i];
            if (c && idSet.has(c.chessID)) return { card: c, index: i };
        }
        return null;
    }

    // 构建把某张手牌放到 lineup 末尾空位的新 lineup 数组
    function buildLineupWithCard(mgr, handGoodsID) {
        var lineup = mgr.SelfInfo.LineUpGoodsIDs.slice();
        while (lineup.length < 7) lineup.push(0);
        var emptyIndex = lineup.indexOf(0);
        if (emptyIndex === -1) return null;
        lineup[emptyIndex] = handGoodsID;
        return lineup;
    }

    // 从卡牌的 skills 里取第一个技能 ID
    function getCardSkillID(card) {
        if (!card) return 0;
        if (card.skills && card.skills[0] && card.skills[0].skillID) {
            return card.skills[0].skillID;
        }
        return 0;
    }

    // ── 上阵一张手牌（可选指定技能目标） ──
    // 参数：
    //   handGoodsID        要上阵的手牌 goodsID
    //   skillID            若 > 0，走"技能目标选择"流程；否则直接上阵
    //   skillTargetGoodsID 技能目标 goodsID（仅 skillID > 0 时有效）
    //   onDone             完成后回调 (success: boolean)
    function lineUpCard(mgr, handGoodsID, skillID, skillTargetGoodsID, onDone) {
        var lineup = buildLineupWithCard(mgr, handGoodsID);
        if (!lineup) {
            showToast("战斗区已满");
            onDone && onDone(false);
            return;
        }

        // 无技能目标：直接走 ReqChessLineUp
        if (!skillID || !skillTargetGoodsID) {
            try {
                mgr.ReqChessLineUp(lineup);
                onDone && onDone(true);
            } catch (e) {
                console.error("[lineUpCard] ReqChessLineUp 异常:", e);
                onDone && onDone(false);
            }
            return;
        }

        // 有技能目标：劫持 ReqChessLineUp
        pendingLineup = lineup;
        var origReqChessLineUp = mgr.ReqChessLineUp;

        mgr.ReqChessLineUp = function (e, t, i) {
            if ((e === null || e === undefined) && t === true && pendingLineup) {
                var l = pendingLineup;
                pendingLineup = null;
                mgr.ReqChessLineUp = origReqChessLineUp;
                try {
                    return origReqChessLineUp.call(mgr, l, t, i);
                } finally {
                    onDone && onDone(true);
                }
            }
            return origReqChessLineUp.call(mgr, e, t, i);
        };

        try {
            mgr.ReqChessChooseSkillTarget([skillTargetGoodsID], skillID, handGoodsID);
        } catch (e) {
            console.error("[lineUpCard] ReqChessChooseSkillTarget 异常:", e);
            pendingLineup = null;
            mgr.ReqChessLineUp = origReqChessLineUp;
            onDone && onDone(false);
            return;
        }

        // 超时兜底
        setTimeout(function () {
            if (pendingLineup) {
                console.warn("[lineUpCard] 服务端超时未响应，恢复 ReqChessLineUp");
                pendingLineup = null;
                mgr.ReqChessLineUp = origReqChessLineUp;
                onDone && onDone(false);
            }
        }, 3000);
    }

    // ── Alt+8 主流程 ──
    function deployRightmostCardWithTarget() {
        var mgr = getManager();
        if (!mgr) { showToast("管理器未就绪"); return false; }
        if (mgr.phase !== 6) { showToast("非招募阶段"); return false; }
        if (!mgr.CanOperate) { showToast("不可操作"); return false; }

        // ── 步骤 0：找 A（陈珪） ──
        var hand = mgr.HandChess;
        if (!hand || hand.length === 0) { showToast("手牌为空"); return false; }

        var aFound = findRightmostHandByChessIds(hand, CHENGUI_CHESS_IDS);
        if (!aFound) { showToast("手牌中无陈珪"); return false; }

        var cardA = aFound.card;
        var handGoodsA = cardA.goodsID || cardA.GoodsID;
        if (!handGoodsA) { showToast("陈珪 goodsID 异常"); return false; }

        // ── 步骤 0：找 B（上阵前 lineup 最右侧） ──
        var battle = mgr.BattleChess;
        if (!battle || battle.length === 0) { showToast("上阵区为空"); return false; }

        var cardB = null;
        for (var bi = battle.length - 1; bi >= 0; bi--) {
            if (battle[bi] && battle[bi].goodsID) { cardB = battle[bi]; break; }
        }
        if (!cardB) { showToast("上阵区无有效棋子"); return false; }

        var bGoodsID = cardB.goodsID || cardB.GoodsID;
        var bChessID = cardB.chessID || cardB.ChessID;
        if (!bGoodsID) { showToast("B goodsID 异常"); return false; }

        // ── 步骤 1：上阵 A，目标为 B ──
        var skillA = getCardSkillID(cardA);
        if (!skillA) { showToast("陈珪 技能ID异常"); return false; }

        console.info("[Alt+8] 上阵陈珪(goodsID=" + handGoodsA + ")，目标B(goodsID=" + bGoodsID + ", chessID=" + bChessID + ")");

        lineUpCard(mgr, handGoodsA, skillA, bGoodsID, function (ok) {
            if (!ok) {
                showToast("陈珪上阵失败");
                return;
            }

            // 稍等，让服务端状态和客户端同步
            setTimeout(function () {
                afterStepA(mgr, bGoodsID, bChessID);
            }, 150);
        });

        showToast("Alt+8: 上阵陈珪并指定目标...");
        return true;
    }

    // ── 步骤 1 之后：根据 B 的 chessId 分流 ──
    function afterStepA(mgr, bGoodsID, bChessID) {
        var isB_DingFeng = DINGFENG_CHESS_IDS.indexOf(bChessID) !== -1;

        // 在 hand 中找 B
        var handB = findHandByGoodsID(mgr.HandChess, bGoodsID);
        if (!handB) {
            showToast("未找到卡牌B，流程结束");
            console.info("[Alt+8] 未在 hand 中找到 B(goodsID=" + bGoodsID + ")");
            return;
        }

        var cardB = handB.card;

        if (!isB_DingFeng) {
            // ── 情况 1：B 不是丁奉 ──
            // 上阵 B（无技能目标），然后遣散 A
            console.info("[Alt+8] B 不是丁奉，上阵 B(goodsID=" + bGoodsID + ")，然后遣散 A");

            lineUpCard(mgr, bGoodsID, 0, 0, function (ok) {
                if (!ok) {
                    showToast("B 上阵失败");
                    return;
                }
                setTimeout(function () {
                    discardA(mgr);
                }, 150);
            });
            showToast("Alt+8: 上阵 B...");
        } else {
            // ── 情况 2：B 是丁奉 ──
            // 找 C（lineup 中最右的凌统/孙尚香；若不存在则 C = B）
            var cBattle = mgr.BattleChess;
            var cFound = findRightmostBattleByChessIds(cBattle, CANDIDATE_C_CHESS_IDS);

            var cGoodsID = null;
            var cChessID = null;

            if (cFound) {
                cGoodsID = cFound.card.goodsID || cFound.card.GoodsID;
                cChessID = cFound.card.chessID || cFound.card.ChessID;
                console.info("[Alt+8] 找到 C: chessID=" + cChessID + ", goodsID=" + cGoodsID);
            } else {
                cGoodsID = bGoodsID;
                cChessID = bChessID;
                console.info("[Alt+8] 未找到凌统/孙尚香，C = B");
            }

            var skillB = getCardSkillID(cardB);
            if (!skillB) {
                showToast("丁奉 技能ID异常，跳过上阵");
                console.warn("[Alt+8] 丁奉技能ID异常，B 留在手牌");
                return;
            }

            console.info("[Alt+8] 上阵 B(丁奉, goodsID=" + bGoodsID + ")，目标 C(goodsID=" + cGoodsID + ")");

            lineUpCard(mgr, bGoodsID, skillB, cGoodsID, function (ok) {
                if (!ok) {
                    showToast("丁奉上阵失败");
                    return;
                }
                setTimeout(function () {
                    discardA(mgr);
                }, 150);
            });
            showToast("Alt+8: 上阵丁奉并指定目标...");
        }
    }

    // ── 遣散 A（从上阵区） ──
    function discardA(mgr) {
        // 在 BattleChess 中找陈珪
        var battle = mgr.BattleChess;
        if (!battle) return;
        var aGoodsID = null;
        var aChessID = null;
        for (var i = battle.length - 1; i >= 0; i--) {
            var c = battle[i];
            if (c && CHENGUI_CHESS_IDS.indexOf(c.chessID) !== -1) {
                aGoodsID = c.goodsID || c.GoodsID;
                aChessID = c.chessID || c.ChessID;
                break;
            }
        }
        if (!aGoodsID) {
            console.info("[Alt+8] 上阵区未找到陈珪，无需遣散");
            return;
        }
        if (typeof mgr.ReqShopRecycleChess !== "function") {
            console.warn("[Alt+8] ReqShopRecycleChess 不存在");
            return;
        }
        try {
            mgr.ReqShopRecycleChess(aGoodsID);
            console.info("[Alt+8] 已遣散陈珪(chessID=" + aChessID + ", goodsID=" + aGoodsID + ")");
            setTimeout(function () {
                refreshBattleView("manual");
            }, 100);
        } catch (e) {
            console.error("[Alt+8] 遣散陈珪异常:", e);
        }
    }

    // ── Alt+7 陈珪虚空触发丁奉并重新上阵 ──
    var easyChenguiActive = false;
    var EASY_CHENGUI_IDS = [21108081, 21108082];
    var EASY_DINGFENG_IDS = [21103051, 21103052];

    function easyChenguiCardId(card) {
        return card && (card.chessID || card.ChessID || 0);
    }

    function easyChenguiGoodsId(card) {
        return card && (card.goodsID || card.GoodsID || 0);
    }

    function easyChenguiSkillId(card) {
        return card && card.skills && card.skills[0]
            ? (card.skills[0].skillID || card.skills[0].SkillID || 0)
            : 0;
    }

    function easyChenguiBuildLineup(mgr, handGoodsID) {
        var source = mgr.SelfInfo && mgr.SelfInfo.LineUpGoodsIDs;
        if (!Array.isArray(source)) return null;
        var lineup = source.slice();
        while (lineup.length < 7) lineup.push(0);
        var emptyIndex = lineup.indexOf(0);
        if (emptyIndex === -1) return null;
        lineup[emptyIndex] = handGoodsID;
        return lineup;
    }

    function easyChenguiCancelSelection() {
        try {
            if (typeof WindowManager === "undefined") return false;
            var window = WindowManager.GetInstance().GetWindow("TavernChessSelectChessWindow");
            if (!window || typeof window.onContentSpriteClick !== "function") return false;
            window.onContentSpriteClick();
            return true;
        } catch (e) {
            console.error("[Alt+7] 调用选择窗口取消逻辑失败:", e);
            return false;
        }
    }

    function easyChenguiRedeploy(mgr, targetGoodsID, originalLineUp) {
        var deadline = Date.now() + 5000;
        var timer = setInterval(function () {
            if (Date.now() >= deadline) {
                clearInterval(timer);
                showToast("Alt+7: 丁奉重新上阵失败");
                return;
            }

            var hand = Array.isArray(mgr.HandChess) ? mgr.HandChess : [];
            var returned = hand.some(function (card) {
                return easyChenguiGoodsId(card) === targetGoodsID;
            });
            if (!returned) return;

            var lineup = easyChenguiBuildLineup(mgr, targetGoodsID);
            if (!lineup) {
                clearInterval(timer);
                showToast("Alt+7: 丁奉回手后无空位");
                return;
            }

            clearInterval(timer);
            try {
                originalLineUp.call(mgr, lineup);
                console.info("[Alt+7] 已重新上阵丁奉(goodsID=" + targetGoodsID + ")");
                showToast("Alt+7: 丁奉已重新上阵");
            } catch (e) {
                console.error("[Alt+7] 重新上阵丁奉失败:", e);
                showToast("Alt+7: 丁奉重新上阵请求失败");
            }
        }, 100);
    }

    function deployChenguiVoidDingfeng() {
        if (easyChenguiActive) return;
        easyChenguiActive = true;

        try {
            var mgr = getManager();
            if (!mgr) {
                showToast("Alt+7: 管理器未就绪");
                return;
            }
            if (mgr.phase !== 6 || !mgr.CanOperate) {
                showToast("Alt+7: 当前不可操作");
                return;
            }

            var hand = Array.isArray(mgr.HandChess) ? mgr.HandChess : [];
            var chengui = null;
            for (var i = hand.length - 1; i >= 0; i--) {
                if (EASY_CHENGUI_IDS.indexOf(easyChenguiCardId(hand[i])) !== -1) {
                    chengui = hand[i];
                    break;
                }
            }
            if (!chengui) {
                showToast("Alt+7: 手牌中无陈珪");
                return;
            }

            var battle = Array.isArray(mgr.BattleChess) ? mgr.BattleChess : [];
            var target = null;
            for (var j = battle.length - 1; j >= 0; j--) {
                if (easyChenguiGoodsId(battle[j])) {
                    target = battle[j];
                    break;
                }
            }
            if (!target || EASY_DINGFENG_IDS.indexOf(easyChenguiCardId(target)) === -1) {
                showToast("Alt+7: 上阵区最右侧不是丁奉");
                return;
            }

            var chenguiGoodsID = easyChenguiGoodsId(chengui);
            var targetGoodsID = easyChenguiGoodsId(target);
            var skillID = easyChenguiSkillId(chengui);
            var lineup = easyChenguiBuildLineup(mgr, chenguiGoodsID);
            if (!chenguiGoodsID || !targetGoodsID || !skillID || !lineup ||
                typeof mgr.ReqChessChooseSkillTarget !== "function" ||
                typeof mgr.ReqChessLineUp !== "function") {
                showToast("Alt+7: 陈珪或上阵数据异常");
                return;
            }

            var originalLineUp = mgr.ReqChessLineUp;
            var intercepted = false;
            var wrappedLineUp = function (lineupArg, chooseTarget, extra) {
                if (chooseTarget === true && !intercepted) {
                    intercepted = true;
                    var result = originalLineUp.call(mgr, lineup, chooseTarget, extra);
                    if (!easyChenguiCancelSelection()) {
                        console.warn("[Alt+7] 未找到选择窗口取消方法");
                    }
                    setTimeout(function () {
                        if (mgr.ReqChessLineUp === wrappedLineUp) {
                            mgr.ReqChessLineUp = originalLineUp;
                        }
                    }, 3000);
                    return result;
                }
                return originalLineUp.call(mgr, lineupArg, chooseTarget, extra);
            };
            mgr.ReqChessLineUp = wrappedLineUp;
            mgr.ReqChessChooseSkillTarget([targetGoodsID], skillID, chenguiGoodsID);
            easyChenguiRedeploy(mgr, targetGoodsID, originalLineUp);
            console.info("[Alt+7] 已发送陈珪目标选择，目标丁奉 goodsID=" + targetGoodsID);
        } catch (e) {
            console.error("[Alt+7] 执行异常:", e);
            showToast("Alt+7: 执行异常");
        } finally {
            setTimeout(function () {
                easyChenguiActive = false;
            }, 6000);
        }
    }





















	
    // ── 使用最右侧锦囊（Shift+2，跳过黑名单） ──
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

        // 从右向左查找第一个不在黑名单中的锦囊牌
        let spellIndex = -1;
        let spellCard = null;
        let spellGoodsID = 0;
        let spellID = 0;
        let skippedCount = 0;

        for (let i = hand.length - 1; i >= 0; i--) {
            const card = hand[i];
            if (card && (card.spellID || card.SpellID)) {
                const cardSpellID = card.spellID || card.SpellID || 0;
                
                // 检查是否在黑名单中
                if (SPELL_BLACKLIST.has(cardSpellID)) {
                    skippedCount++;
                    console.info("[使用锦囊] 跳过黑名单锦囊: " + cardSpellID + 
                                 " (" + (SPELL_BLACKLIST_DEFAULT[cardSpellID] || '未知') + ")");
                    continue;
                }
                
                spellIndex = i;
                spellCard = card;
                spellGoodsID = card.goodsID || card.GoodsID || 0;
                spellID = cardSpellID;
                break;
            }
        }

        if (spellIndex === -1 || !spellCard || !spellGoodsID) {
            if (skippedCount > 0) {
                showToast("手牌中无可用锦囊（已跳过" + skippedCount + "张黑名单）");
                console.warn("[使用锦囊] 所有锦囊都在黑名单中，共跳过" + skippedCount + "张");
            } else {
                showToast("手牌最右侧无锦囊");
                console.warn("[使用锦囊] 手牌中无锦囊牌");
            }
            return false;
        }

        console.info("[使用锦囊] 找到可用锦囊 index=" + spellIndex + 
                     ", goodsID=" + spellGoodsID + 
                     ", spellID=" + spellID +
                     (skippedCount > 0 ? " (跳过" + skippedCount + "张黑名单)" : ""));

        // 构建目标列表
        const targetList = [];

        // 1. 商店卡牌（位置0）
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

        // 2. 上阵区棋子（按位置顺序 0->6）
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

        // 尝试使用锦囊
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

        // Alt+1 切换自动刷新+购买（配置面板 / 停止）
        if (e.altKey && e.key === "1") {
            e.preventDefault();
            toggleAutoBuy();
            return;
        }
		
        // ============================================================
        // 【新增】Alt+3 打开锦囊自动使用配置面板
        // ============================================================
        if (e.altKey && e.key === "3") {
            e.preventDefault();
            console.info("[快捷键] Alt+3 - 打开锦囊配置面板");
            createSpellConfigPanel();
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

        if (e.altKey && e.key === "7") {
            e.preventDefault();
            deployChenguiVoidDingfeng();
            return;
        }
		
        if (e.altKey && e.key === "8") {
            e.preventDefault();
            deployRightmostCardWithTarget();
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
    console.info("[AutoChess] v1.0.3 已启动");
    console.info("  1-6购买 | Shift+1遣散手牌最右 | Shift+2使用最右侧锦囊(跳过黑名单) | Shift+3自动随征 | Shift+4一键遣散指定卡牌");
    console.info("  Alt+1自动购买祢衡 | Alt+2自动购买庞德公 | Alt+3锦囊自动使用配置");
    console.info("  Alt+9遣散战斗区最右 | Alt+0上阵最右 | R刷新 | F锁定 | 空格跳过 | Tab切换三连状态 | Shift+R强制刷新UI");
    console.info("  当前锦囊黑名单 (" + SPELL_BLACKLIST.size + " 个): " + 
        Array.from(SPELL_BLACKLIST).map(function(id) { return SPELL_BLACKLIST_DEFAULT[id] || id; }).join('、'));

})();