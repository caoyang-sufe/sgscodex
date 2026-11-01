// ==UserScript==
// @name         丁奉三连循环
// @namespace    sgscodex.wuyuefei
// @version      1.0.0
// @description  自动购买普通丁奉、凑三连、处理锦囊并触发金色丁奉效果
// @match        *://*.sanguosha.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var DINGFENG = 21103051;
    var GOLD_DINGFENG = 21103052;
    var LINGTONG = [21103061, 21103062];
    var running = false;
    var triplePatched = false;
    var pendingLineup = null;

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function getScene() {
        function find(node) {
            if (!node) return null;
            if (node.constructor && node.constructor.name === 'TavernChessGameScene') return node;
            var children = node._children || node.children;
            if (children) {
                for (var i = 0; i < children.length; i++) {
                    var result = find(children[i]);
                    if (result) return result;
                }
            }
            return null;
        }
        try {
            return typeof Laya !== 'undefined' && Laya.stage ? find(Laya.stage) : null;
        } catch (e) {
            return null;
        }
    }

    function getManager() {
        var scene = getScene();
        return scene && scene.manager ? scene.manager : null;
    }

    function cardId(card) {
        return card && (card.chessID || card.ChessID || card.chessId || card.ChessId || 0);
    }

    function goodsId(card) {
        return card && (card.goodsID || card.GoodsID || card.goodsId || card.GoodsId || 0);
    }

    function skillId(card) {
        return card && card.skills && card.skills[0]
            ? (card.skills[0].skillID || card.skills[0].SkillID || 0)
            : 0;
    }

    function handCards(mgr) {
        return mgr && Array.isArray(mgr.HandChess) ? mgr.HandChess : [];
    }

    function lineupCards(mgr) {
        return mgr && Array.isArray(mgr.BattleChess) ? mgr.BattleChess : [];
    }

    function findHand(mgr, ids) {
        var wanted = new Set(ids);
        var hand = handCards(mgr);
        for (var i = hand.length - 1; i >= 0; i--) {
            if (wanted.has(cardId(hand[i]))) return hand[i];
        }
        return null;
    }

    function findHandByGoodsId(mgr, id) {
        return handCards(mgr).find(function (card) { return goodsId(card) === id; }) || null;
    }

    function rightmostLineup(mgr) {
        var lineup = lineupCards(mgr);
        for (var i = lineup.length - 1; i >= 0; i--) {
            if (goodsId(lineup[i])) return lineup[i];
        }
        return null;
    }

    function buildLineup(mgr, id) {
        var source = mgr.SelfInfo && mgr.SelfInfo.LineUpGoodsIDs;
        if (!Array.isArray(source)) return null;
        var lineup = source.slice();
        while (lineup.length < 7) lineup.push(0);
        var empty = lineup.indexOf(0);
        if (empty < 0) return null;
        lineup[empty] = id;
        return lineup;
    }

    function lineUp(mgr, card, target, done) {
        var id = goodsId(card);
        var lineup = buildLineup(mgr, id);
        if (!id || !lineup || typeof mgr.ReqChessLineUp !== 'function') {
            done(false);
            return;
        }

        if (!target || !skillId(card) || typeof mgr.ReqChessChooseSkillTarget !== 'function') {
            try {
                mgr.ReqChessLineUp(lineup);
                done(true);
            } catch (e) {
                console.error('[丁奉循环] 上阵失败', e);
                done(false);
            }
            return;
        }

        pendingLineup = lineup;
        var original = mgr.ReqChessLineUp;
        mgr.ReqChessLineUp = function (arg, chooseTarget) {
            if ((arg === null || arg === undefined) && chooseTarget === true && pendingLineup) {
                var request = pendingLineup;
                pendingLineup = null;
                mgr.ReqChessLineUp = original;
                original.call(mgr, request, chooseTarget, arguments[2]);
                done(true);
                return;
            }
            return original.apply(mgr, arguments);
        };

        try {
            mgr.ReqChessChooseSkillTarget([goodsId(target)], skillId(card), id);
        } catch (e) {
            pendingLineup = null;
            mgr.ReqChessLineUp = original;
            console.error('[丁奉循环] 技能目标请求失败', e);
            done(false);
            return;
        }
        setTimeout(function () {
            if (pendingLineup) {
                pendingLineup = null;
                mgr.ReqChessLineUp = original;
                done(false);
            }
        }, 5000);
    }

    function lineUpAsync(mgr, card, target) {
        return new Promise(function (resolve) { lineUp(mgr, card, target, resolve); });
    }

    function patchTriple() {
        if (triplePatched) return;
        var mgr = getManager();
        if (!mgr || !mgr.constructor || !mgr.constructor.prototype) {
            setTimeout(patchTriple, 200);
            return;
        }
        var proto = mgr.constructor.prototype;
        var check = proto.checkSanLianReq;
        var composite = proto.ReqChessComposite;
        if (typeof check !== 'function' || typeof composite !== 'function') {
            setTimeout(patchTriple, 200);
            return;
        }
        proto.checkSanLianReq = function () {
            if (window.blockTripleCombine !== false) return;
            return check.apply(this, arguments);
        };
        proto.ReqChessComposite = function () {
            if (window.blockTripleCombine !== false) return;
            return composite.apply(this, arguments);
        };
        triplePatched = true;
    }

    function setTripleBlocked(blocked) {
        window.blockTripleCombine = blocked;
        var mgr = getManager();
        if (!blocked && mgr) {
            if (typeof mgr.checkSanLianReq === 'function') mgr.checkSanLianReq();
            if (typeof mgr.checkSanLianAni === 'function') mgr.checkSanLianAni();
        }
    }

    function completeTriple() {
        if (typeof window.__triple === 'object' &&
            typeof window.__triple.complete === 'function') {
            try {
                window.__triple.complete();
                return true;
            } catch (e) {
                console.error('[丁奉循环] __triple.complete() 执行失败', e);
                return false;
            }
        }
        var mgr = getManager();
        if (!mgr) return false;
        var first = mgr.WaitSelectCards && mgr.WaitSelectCards[0];
        if (first && first.ServerInfo && typeof mgr.ReqSelectOtherChess === 'function') {
            var id = first.ServerInfo.goodsID || first.ServerInfo.GoodsID;
            if (id) {
                mgr.ReqSelectOtherChess(id, false);
                return true;
            }
        } else if (first && first.CardVO && typeof mgr.ReqChessSelectSpellID === 'function') {
            var cardIdValue = first.CardVO.CardID;
            if (cardIdValue) {
                mgr.ReqChessSelectSpellID(cardIdValue, false);
                return true;
            }
        }
        return false;
    }

    async function waitForTripleReward(timeout) {
        var end = Date.now() + timeout;
        var selectionSent = false;
        var emptySince = 0;
        await sleep(2000);
        selectionSent = completeTriple();

        while (Date.now() < end) {
            var mgr = getManager();
            if (!mgr) {
                await sleep(100);
                continue;
            }

            var waitingCards = mgr.WaitSelectCards && mgr.WaitSelectCards.length > 0;
            completeTriple();
            selectionSent = true;
            if (waitingCards) {
                emptySince = 0;
            } else if (selectionSent) {
                var goldInHand = !!findHand(mgr, [GOLD_DINGFENG]);
                if (goldInHand) {
                    if (!emptySince) emptySince = Date.now();
                    if (Date.now() - emptySince >= 500) return true;
                } else {
                    emptySince = 0;
                }
            }
            await sleep(100);
        }
        return true;
    }

    function buyDingfeng(mgr) {
        var shop = Array.isArray(mgr.ShopGoods) ? mgr.ShopGoods : [];
        for (var i = 0; i < shop.length; i++) {
            if (cardId(shop[i]) === DINGFENG && goodsId(shop[i])) {
                if (typeof mgr.ReqShopBuyChess !== 'function') return false;
                mgr.ReqShopBuyChess(goodsId(shop[i]));
                return true;
            }
        }
        return false;
    }

    function refreshShop(mgr) {
        if (typeof mgr.ReqShopRefreshChess !== 'function') return false;
        mgr.ReqShopRefreshChess();
        return true;
    }

    async function prepareHandBeforeDingfeng(mgr) {
        var snapshot = handCards(mgr).slice();
        var lingtong = null;
        var dingfengIds = [DINGFENG, GOLD_DINGFENG];

        for (var i = snapshot.length - 1; i >= 0; i--) {
            if (LINGTONG.indexOf(cardId(snapshot[i])) !== -1) {
                lingtong = snapshot[i];
                break;
            }
        }

        if (lingtong) {
            if (!await lineUpAsync(mgr, lingtong, null)) {
                return false;
            }
            await sleep(100);
        }

        mgr = getManager();
        for (var j = 0; j < snapshot.length; j++) {
            var card = snapshot[j];
            if (!goodsId(card) ||
                dingfengIds.indexOf(cardId(card)) !== -1 ||
                (lingtong && goodsId(card) === goodsId(lingtong))) {
                continue;
            }
            if (typeof mgr.ReqShopRecycleChess !== 'function') return false;
            mgr.ReqShopRecycleChess(goodsId(card));
            await sleep(120);
        }

        return true;
    }

    function countOrdinaryDingfeng(mgr) {
        return lineupCards(mgr).filter(function (card) {
            return cardId(card) === DINGFENG;
        }).length;
    }

    async function waitFor(predicate, timeout) {
        var end = Date.now() + timeout;
        while (Date.now() < end) {
            if (predicate()) return true;
            await sleep(100);
        }
        return predicate();
    }

    function stop(reason) {
        running = false;
        setTripleBlocked(true);
        console.warn('[丁奉循环] 已停止：' + reason);
        alert('丁奉循环已停止：' + reason);
    }

    async function run() {
        if (running) return;
        running = true;
        setTripleBlocked(true);
        console.info('[丁奉循环] 已启动，Alt+5停止/重新启动，Esc停止');

        while (running) {
            var mgr = getManager();
            if (!mgr || mgr.phase !== 6 || !mgr.CanOperate) {
                await sleep(100);
                continue;
            }

            if (!buyDingfeng(mgr)) {
                if (!refreshShop(mgr)) {
                    stop('商店刷新接口不存在');
                    return;
                }
                await sleep(100);
                continue;
            }
            var bought = await waitFor(function () {
                return !!findHand(getManager(), [DINGFENG]);
            }, 5000);
            if (!bought) {
                stop('购买后的手牌中未找到普通丁奉');
                return;
            }

            mgr = getManager();
            if (!await prepareHandBeforeDingfeng(mgr)) {
                stop('普通丁奉上阵前处理手牌失败');
                return;
            }
            mgr = getManager();
            var dingfeng = findHand(mgr, [DINGFENG]);
            var target = rightmostLineup(mgr);
            if (!target) {
                stop('上阵区没有可指定的技能目标');
                return;
            }
            if (!await lineUpAsync(mgr, dingfeng, target)) {
                stop('普通丁奉上阵或技能目标指定失败');
                return;
            }
            await sleep(100);

            if (countOrdinaryDingfeng(getManager()) < 3) continue;

            setTripleBlocked(false);
            var gotGold = await waitForTripleReward(3000);
            setTripleBlocked(true);
            if (!gotGold) {
                stop('三连后未在手牌中找到金色丁奉');
                return;
            }

            mgr = getManager();
            if (!await prepareHandBeforeDingfeng(mgr)) {
                stop('金色丁奉上阵前处理手牌失败');
                return;
            }

            mgr = getManager();
            var gold = findHand(mgr, [GOLD_DINGFENG]);
            var goldTarget = rightmostLineup(mgr);
            if (!gold || !goldTarget || !await lineUpAsync(mgr, gold, goldTarget)) {
                stop('金色丁奉上阵或技能目标指定失败');
                return;
            }
            await sleep(100);

            var goldOnBoard = lineupCards(getManager()).find(function (card) {
                return cardId(card) === GOLD_DINGFENG;
            });
            if (!goldOnBoard || typeof getManager().ReqShopRecycleChess !== 'function') {
                stop('上阵区未找到金色丁奉或遣散接口不存在');
                return;
            }
            getManager().ReqShopRecycleChess(goodsId(goldOnBoard));
            await sleep(100);
            setTripleBlocked(true);
        }
    }

    window.__wuyuefei = {
        start: run,
        stop: function () { running = false; setTripleBlocked(true); }
    };

    document.addEventListener('keydown', function (event) {
        if (event.altKey && event.key === '5') {
            event.preventDefault();
            if (running) window.__wuyuefei.stop();
            else run();
        } else if (event.key === 'Escape' && running) {
            event.preventDefault();
            window.__wuyuefei.stop();
        }
    });

    patchTriple();
})();
