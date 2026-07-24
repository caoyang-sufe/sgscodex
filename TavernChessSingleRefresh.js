// ==UserScript==
// @name         三国杀自走棋单次刷新商店
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  在页面中添加一个按钮，点击后调用一次刷新商店请求
// @author       Codex
// @match        https://game.4399iw2.com/yxxsgs/*
// @match        *://*.sanguosha.com/10/*
// @match        *://*.sanguosha.com/x/*
// @match        *://*.sanguosha.com/10th/*
// @match        https://wan.baidu.com/*gameId=19793616*
// @match        *://h5.7k7k.com/web/H5GAMES.html?gid=960982bec2f555de44ea43ca8a7ef418/*
// @match        *://qqgame.qq.com/webappframe/?appid=10951
// @match        *://s118.app1107877410.qqopenapp.com/pc/qqLobby_index.php*
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const LOG_PREFIX = '[单次刷新]';
    const BUTTON_ID = 'sgs-single-refresh-btn';

    function findManager() {
        try {
            if (window.gameManager && typeof window.gameManager.ReqShopRefreshChess === 'function') {
                return window.gameManager;
            }

            if (window.tavernChessManager && typeof window.tavernChessManager.ReqShopRefreshChess === 'function') {
                return window.tavernChessManager;
            }

            if (window.TavernChessGameManager && typeof window.TavernChessGameManager.GetInstance === 'function') {
                const mgr = window.TavernChessGameManager.GetInstance();
                if (mgr && typeof mgr.ReqShopRefreshChess === 'function') {
                    return mgr;
                }
            }

            if (window.Laya && window.Laya.stage) {
                const stage = window.Laya.stage;
                if (stage.manager && typeof stage.manager.ReqShopRefreshChess === 'function') {
                    return stage.manager;
                }
            }
        } catch (e) {
            console.warn(LOG_PREFIX, '查找管理器失败', e);
        }
        return null;
    }

    function sendRefreshOnce() {
        const mgr = findManager();
        if (!mgr) {
            console.warn(LOG_PREFIX, '未找到商店管理器');
            return;
        }

        if (typeof mgr.ReqShopRefreshChess !== 'function') {
            console.warn(LOG_PREFIX, '管理器上没有 ReqShopRefreshChess');
            return;
        }

        mgr.ReqShopRefreshChess(false);
        console.log(LOG_PREFIX, '已发送一次刷新商店请求');
    }

    function createButton() {
        if (document.getElementById(BUTTON_ID)) {
            return;
        }

        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.textContent = '刷新商店';
        button.title = '点击后发送一次刷新商店请求';
        button.style.cssText = [
            'position:fixed',
            'right:20px',
            'bottom:140px',
            'z-index:2147483647',
            'padding:8px 12px',
            'border:none',
            'border-radius:8px',
            'background:#1f8fff',
            'color:white',
            'cursor:pointer',
            'font-size:14px',
            'box-shadow:0 2px 8px rgba(0,0,0,0.25)'
        ].join(';');
        button.addEventListener('click', sendRefreshOnce);

        if (document.body) {
            document.body.appendChild(button);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body && document.body.appendChild(button);
            }, { once: true });
        }
    }

    function init() {
        createButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
