// ==UserScript==
// @name         韩当吴岳飞全自动脚本
// @namespace    sgscodex.autohandang
// @version      1.1.0
// @description  Alt+6触发/关闭吴岳飞自动循环
// @match        https://game.4399iw2.com/yxxsgs/*
// @match        *://*.sanguosha.com/10/*
// @match        *://*.sanguosha.com/x/*
// @match        *://*.sanguosha.com/10th/*
// @match        https://wan.baidu.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var BUY_IDS = [21103051, 21103211, 21108081, 21103071, 21108221];
    var KEEP_IDS = new Set(BUY_IDS);
    var DINGFENG = 21103051;
    var SUN_CE = 21103211;
    var CHENGUI = 21108081;
    var HUANG_GAI_IDS = [21103071];
    var PANG_DE_GONG = 21108221;
    var GOLD_SUN_XIANGXIANG = 21103172;
    var TARGET_DISCARD_IDS = [
        21103011, 21103021, 21103031, 21103041, 21103061, 21103091,
        21103101, 21103111, 21103121, 21103131, 21103141, 21103151,
        21103161, 21103191, 21103201, 21103221, 21103231, 21103241
    ];
    var GEXUAN_IDS = [21103081, 21103082];
    var running = false;
    var triplePatched = false;
    var triplePatchTimer = null;
    var tripleEnforceTimer = null;
    var pendingLineup = null;

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function findScene(node) {
        if (!node) return null;
        if (node.constructor && node.constructor.name === 'TavernChessGameScene') return node;
        var children = node._children || node.children;
        if (!children) return null;
        for (var i = 0; i < children.length; i++) {
            var scene = findScene(children[i]);
            if (scene) return scene;
        }
        return null;
    }

    function getManager() {
        try {
            var scene = typeof Laya !== 'undefined' && Laya.stage ? findScene(Laya.stage) : null;
            return scene && scene.manager ? scene.manager : null;
        } catch (e) {
            console.error('[韩当全自动] 获取管理器失败', e);
            return null;
        }
    }

    function cardId(card) {
        return card && (card.chessID || card.ChessID || card.chessId || card.ChessId || 0);
    }

    function goodsId(card) {
        return card && (card.goodsID || card.GoodsID || card.goodsId || card.GoodsId || 0);
    }

    function skillId(card) {
        var skills = card && (card.skills || card.Skills);
        return skills && skills[0] ? (skills[0].skillID || skills[0].SkillID || 0) : 0;
    }

    function handCards(mgr) {
        return mgr && Array.isArray(mgr.HandChess) ? mgr.HandChess : [];
    }

    function lineupCards(mgr) {
        return mgr && Array.isArray(mgr.BattleChess) ? mgr.BattleChess : [];
    }

    function isRecruit(mgr) {
        var phase = mgr && (mgr.Phase !== undefined ? mgr.Phase : mgr.phase);
        return phase === 6 || phase === 'InRecruit';
    }

    function waitFor(predicate, timeout, interval) {
        var end = Date.now() + timeout;
        var delay = interval || 100;
        return (async function () {
            while (Date.now() < end) {
                if (!running) return false;
                if (predicate()) return true;
                await sleep(delay);
            }
            return !!predicate();
        })();
    }

    function rightmostLineup(mgr) {
        var lineup = lineupCards(mgr);
        for (var i = lineup.length - 1; i >= 0; i--) {
            if (goodsId(lineup[i])) return lineup[i];
        }
        return null;
    }

    function leftmostLineup(mgr) {
        var lineup = lineupCards(mgr);
        for (var i = 0; i < lineup.length; i++) {
            if (goodsId(lineup[i])) return lineup[i];
        }
        return null;
    }

    function findHandByGoodsId(mgr, id) {
        return handCards(mgr).find(function (card) { return goodsId(card) === id; }) || null;
    }

    function findHandByIds(mgr, ids) {
        var wanted = new Set(ids);
        var hand = handCards(mgr);
        for (var i = hand.length - 1; i >= 0; i--) {
            if (wanted.has(cardId(hand[i]))) return hand[i];
        }
        return null;
    }

    function buildLineup(mgr, id) {
        var source = mgr && mgr.SelfInfo && mgr.SelfInfo.LineUpGoodsIDs;
        if (!Array.isArray(source)) return null;
        var lineup = source.slice();
        while (lineup.length < 7) lineup.push(0);
        var empty = lineup.indexOf(0);
        if (empty === -1) return null;
        lineup[empty] = id;
        return lineup;
    }

    function patchTriple() {
        if (triplePatched) return;
        var mgr = getManager();
        if (!mgr || !mgr.constructor || !mgr.constructor.prototype) {
            if (!triplePatchTimer) triplePatchTimer = setTimeout(function () {
                triplePatchTimer = null;
                patchTriple();
            }, 200);
            return;
        }
        var proto = mgr.constructor.prototype;
        var originalCheck = proto.checkSanLianReq;
        var originalComposite = proto.ReqChessComposite;
        if (typeof originalCheck !== 'function' || typeof originalComposite !== 'function') {
            if (!triplePatchTimer) triplePatchTimer = setTimeout(function () {
                triplePatchTimer = null;
                patchTriple();
            }, 200);
            return;
        }
        proto.checkSanLianReq = function () {
            if (window.blockTripleCombine !== false) return;
            return originalCheck.apply(this, arguments);
        };
        proto.ReqChessComposite = function () {
            if (window.blockTripleCombine !== false) return;
            return originalComposite.apply(this, arguments);
        };
        triplePatched = true;
    }

    function setTripleBlocked() {
        window.blockTripleCombine = true;
    }

    function enforceTripleBlocked() {
        setTripleBlocked();
        if (!tripleEnforceTimer) {
            tripleEnforceTimer = setInterval(function () {
                if (running) setTripleBlocked();
            }, 100);
        }
    }

    function stopEnforcingTripleBlocked() {
        if (tripleEnforceTimer) {
            clearInterval(tripleEnforceTimer);
            tripleEnforceTimer = null;
        }
        setTripleBlocked();
    }

    function toast(text) {
        var old = document.getElementById('autohandang-toast');
        if (old) old.remove();
        var node = document.createElement('div');
        node.id = 'autohandang-toast';
        node.textContent = text;
        node.style.cssText = 'position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);z-index:100000;background:rgba(0,0,0,.8);color:#fff;padding:12px 24px;border-radius:8px;font-size:18px;font-weight:bold;pointer-events:none';
        document.body.appendChild(node);
        setTimeout(function () { if (node.parentNode) node.remove(); }, 1200);
    }

    function stop(reason, alertUser) {
        running = false;
        stopEnforcingTripleBlocked();
        console.warn('[韩当全自动] 已停止：' + reason);
        toast('韩当全自动已停止：' + reason);
        if (alertUser && typeof alert === 'function') alert(reason);
    }

    async function buyAllTargets(mgr) {
        var shop = Array.isArray(mgr.ShopGoods) ? mgr.ShopGoods.slice() : [];
        if (typeof mgr.ReqShopBuyChess !== 'function') {
            throw new Error('商店购买接口不存在');
        }
        for (var i = 0; i < shop.length; i++) {
            if (!running) return;
            var card = shop[i];
            var id = goodsId(card);
            if (!id || BUY_IDS.indexOf(cardId(card)) === -1) continue;

            mgr.ReqShopBuyChess(id);
            var purchased = await waitFor(function () {
                var current = getManager();
                if (!current) return false;
                var inHand = !!findHandByGoodsId(current, id);
                var stillInShop = Array.isArray(current.ShopGoods) &&
                    current.ShopGoods.some(function (item) { return goodsId(item) === id; });
                return inHand || !stillInShop;
            }, 2500);
            if (!running) return;
            if (!purchased) throw new Error('购买目标卡失败，goodsID=' + id);
            await sleep(100);
            mgr = getManager();
            if (!mgr) throw new Error('购买后未找到游戏管理器');
        }
    }

    function deployCard(mgr, card, target) {
        var id = goodsId(card);
        var lineup = buildLineup(mgr, id);
        if (!id || !lineup || typeof mgr.ReqChessLineUp !== 'function') {
            return Promise.resolve(false);
        }
        if (!target) {
            try {
                mgr.ReqChessLineUp(lineup);
                return Promise.resolve(true);
            } catch (e) {
                console.error('[韩当全自动] 普通上阵请求失败', e);
                return Promise.resolve(false);
            }
        }
        var skill = skillId(card);
        if (!skill || typeof mgr.ReqChessChooseSkillTarget !== 'function') {
            return Promise.resolve(false);
        }

        return new Promise(function (resolve) {
            var original = mgr.ReqChessLineUp;
            var request = { lineup: lineup, done: false };
            pendingLineup = request;
            var wrapped = function (arg, chooseTarget, extra) {
                if ((arg === null || arg === undefined) && chooseTarget === true &&
                    pendingLineup === request && !request.done) {
                    request.done = true;
                    pendingLineup = null;
                    mgr.ReqChessLineUp = original;
                    try {
                        var result = original.call(mgr, request.lineup, chooseTarget, extra);
                        resolve(true);
                        return result;
                    } catch (e) {
                        console.error('[韩当全自动] 技能上阵请求失败', e);
                        resolve(false);
                        return;
                    }
                }
                return original.apply(mgr, arguments);
            };
            mgr.ReqChessLineUp = wrapped;
            try {
                mgr.ReqChessChooseSkillTarget([goodsId(target)], skill, id);
            } catch (e) {
                request.done = true;
                pendingLineup = null;
                mgr.ReqChessLineUp = original;
                console.error('[韩当全自动] 技能目标请求失败', e);
                resolve(false);
                return;
            }
            setTimeout(function () {
                if (!request.done) {
                    request.done = true;
                    if (pendingLineup === request) pendingLineup = null;
                    if (mgr.ReqChessLineUp === wrapped) mgr.ReqChessLineUp = original;
                    resolve(false);
                }
            }, 4000);
        });
    }

    async function recycleGoods(mgr, id, handExpected) {
        if (!id || typeof mgr.ReqShopRecycleChess !== 'function') {
            throw new Error('遣散接口不可用');
        }
        mgr.ReqShopRecycleChess(id);
        var changed = await waitFor(function () {
            var current = getManager();
            var inHand = !!findHandByGoodsId(current, id);
            var inBattle = lineupCards(current).some(function (card) { return goodsId(card) === id; });
            return handExpected ? !inHand : !inBattle;
        }, 2500);
        if (!changed && running) throw new Error('遣散未确认，goodsID=' + id);
        return changed;
    }

    async function discardOtherHandCards(mgr) {
        var cards = handCards(mgr).slice();
        for (var i = 0; i < cards.length; i++) {
            if (!running) return;
            var card = cards[i];
            var id = goodsId(card);
            if (!id || KEEP_IDS.has(cardId(card))) continue;
            mgr = getManager();
            if (!findHandByGoodsId(mgr, id)) continue;
            await recycleGoods(mgr, id, true);
            await sleep(80);
        }
    }

    async function followUpAllHuangGai() {
        for (var count = 0; count < 30 && running; count++) {
            var mgr = getManager();
            var yellow = findHandByIds(mgr, HUANG_GAI_IDS);
            if (!yellow) return;
            var target = leftmostLineup(mgr);
            if (!target || typeof mgr.ReqChessFollowUp !== 'function') {
                throw new Error('无法随征黄盖：上阵区没有目标或随征接口不存在');
            }
            var yellowID = goodsId(yellow);
            mgr.ReqChessFollowUp(goodsId(target), yellowID);
            var followed = await waitFor(function () {
                return !findHandByGoodsId(getManager(), yellowID);
            }, 2500);
            if (!followed && running) throw new Error('黄盖随征未确认，goodsID=' + yellowID);
            await sleep(100);
        }
        if (running && findHandByIds(getManager(), HUANG_GAI_IDS)) {
            throw new Error('黄盖数量超过单轮安全处理上限');
        }
    }

    async function processGexuanForShift4(mgr) {
        var gexuanIDs = handCards(mgr).filter(function (card) {
            return GEXUAN_IDS.indexOf(cardId(card)) !== -1 && goodsId(card);
        }).map(goodsId);

        for (var i = 0; i < gexuanIDs.length; i++) {
            if (!running) return;
            mgr = getManager();
            var gexuan = findHandByGoodsId(mgr, gexuanIDs[i]);
            if (!gexuan) continue;
            var target = rightmostLineup(mgr);
            var deployed = await deployCard(mgr, gexuan, target);
            if (!deployed) throw new Error('Shift+4处理中葛玄上阵失败');
            var onBoard = await waitFor(function () {
                return lineupCards(getManager()).some(function (card) {
                    return goodsId(card) === gexuanIDs[i];
                });
            }, 2500);
            if (!running) return;
            if (!onBoard && running) throw new Error('Shift+4处理中未确认葛玄上阵');
            await recycleGoods(getManager(), gexuanIDs[i], false);
        }
    }

    async function doShift4Once() {
        var mgr = getManager();
        if (!mgr) throw new Error('Shift+4执行时管理器不可用');
        await processGexuanForShift4(mgr);
        mgr = getManager();
        var ids = handCards(mgr).filter(function (card) {
            return TARGET_DISCARD_IDS.indexOf(cardId(card)) !== -1 && goodsId(card);
        }).map(goodsId);
        for (var i = 0; i < ids.length; i++) {
            if (!running) return;
            mgr = getManager();
            if (findHandByGoodsId(mgr, ids[i])) {
                await recycleGoods(mgr, ids[i], true);
                await sleep(60);
            }
        }
    }

    async function removePlayedCard(goodsID) {
        var onBoard = await waitFor(function () {
            return lineupCards(getManager()).some(function (item) {
                return goodsId(item) === goodsID;
            });
        }, 2000);
        if (!running || !onBoard) return;
        var mgr = getManager();
        await recycleGoods(mgr, goodsID, false);
        await sleep(100);
    }

    async function deployGoldSunAfterA(mgr, cardA) {
        var aID = goodsId(cardA);
        var isDingfengOrChengui = cardId(cardA) === DINGFENG || cardId(cardA) === CHENGUI;
        var target = rightmostLineup(mgr);
        if (isDingfengOrChengui && !target) {
            throw new Error('上阵区为空，无法为丁奉/陈珪指定最右侧技能目标');
        }
        if (!await deployCard(mgr, cardA, isDingfengOrChengui ? target : null)) {
            throw new Error('上阵卡牌A失败');
        }

        var goldReturned = await waitFor(function () {
            return !!findHandByIds(getManager(), [GOLD_SUN_XIANGXIANG]);
        }, 4000);
        if (!running) return;
        if (!goldReturned) throw new Error('未检测到金色孙尚香回到手牌');

        await removePlayedCard(aID);
        if (!running) return;
        mgr = getManager();
        var goldSun = findHandByIds(mgr, [GOLD_SUN_XIANGXIANG]);
        if (!goldSun) throw new Error('手牌中找不到金色孙尚香');

        if (!await deployCard(mgr, goldSun, null)) {
            throw new Error('金色孙尚香上阵失败');
        }
        var goldID = goodsId(goldSun);
        var deployed = await waitFor(function () {
            return lineupCards(getManager()).some(function (card) { return goodsId(card) === goldID; });
        }, 2500);
        if (!running) return;
        if (!deployed) throw new Error('未确认金色孙尚香上阵成功');
    }

    function findRightmostCandidate(mgr) {
        var hand = handCards(mgr);
        for (var i = hand.length - 1; i >= 0; i--) {
            var id = cardId(hand[i]);
            if (id === DINGFENG || id === SUN_CE || id === CHENGUI) return hand[i];
        }
        return null;
    }

    function handHasNonPangDeGong(mgr) {
        return handCards(mgr).some(function (card) {
            return cardId(card) !== PANG_DE_GONG;
        });
    }

    async function runInnerLoop() {
        while (running) {
            var mgr = getManager();
            if (!mgr || !isRecruit(mgr) || !mgr.CanOperate) {
                await sleep(250);
                continue;
            }
            setTripleBlocked();
            if (!handHasNonPangDeGong(mgr)) return;

            await discardOtherHandCards(mgr);
            if (!running) return;
            await followUpAllHuangGai();
            if (!running) return;

            mgr = getManager();
            var candidate = findRightmostCandidate(mgr);
            if (!candidate) return;

            var candidateID = goodsId(candidate);
            await deployGoldSunAfterA(mgr, candidate);
            if (!running) return;

            await doShift4Once();
            if (!running) return;

            await sleep(150);
            if (!findHandByGoodsId(getManager(), candidateID) &&
                lineupCards(getManager()).some(function (card) {
                    return goodsId(card) === candidateID;
                })) {
                console.info('[韩当全自动] 已完成一轮卡牌A处理，goodsID=' + candidateID);
            }
        }
    }

    async function run() {
        if (running) return;
        running = true;
        enforceTripleBlocked();
        toast('韩当全自动已启动，Alt+6关闭');
        console.info('[韩当全自动] 已启动');

        try {
            while (running) {
                var mgr = getManager();
                if (!mgr || !isRecruit(mgr) || !mgr.CanOperate) {
                    setTripleBlocked();
                    await sleep(300);
                    continue;
                }

                setTripleBlocked();
                await buyAllTargets(mgr);
                if (!running) break;

                await runInnerLoop();
                if (!running) break;

                mgr = getManager();
                if (mgr && typeof mgr.ReqShopRefreshChess === 'function') {
                    mgr.ReqShopRefreshChess();
                } else {
                    throw new Error('商店刷新接口不存在');
                }
                await sleep(300);
            }
        } catch (e) {
            console.error('[韩当全自动] 循环异常', e);
            if (!running) {
                stopEnforcingTripleBlocked();
                return;
            }
            stop(e && e.message ? e.message : String(e), true);
            return;
        }
        stopEnforcingTripleBlocked();
        console.info('[韩当全自动] 已关闭');
    }

    window.__autohandang = {
        start: run,
        stop: function () {
            running = false;
            stopEnforcingTripleBlocked();
            toast('韩当全自动已关闭');
        }
    };

    document.addEventListener('keydown', function (event) {
        if (event.altKey && event.key === '6') {
            event.preventDefault();
            if (running) window.__autohandang.stop();
            else run();
        } else if (event.key === 'Escape' && running) {
            event.preventDefault();
            window.__autohandang.stop();
        }
    });

    patchTriple();
})();
