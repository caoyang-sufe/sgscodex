// ==UserScript==
// @name         自走棋跳过战斗（手动版）
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  点击按钮跳过自走棋战斗动画
// @author       YourName
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
    'use strict';
    // 查找自走棋场景
    function search(obj) {
        if (!obj) return null;
        if (obj.constructor && obj.constructor.name === 'TavernChessGameScene') {
            return obj;
        }
        if (obj._children) {
            for (let child of obj._children) {
                const result = search(child);
                if (result) return result;
            }
        }
        return null;
    }

    // 跳过战斗函数
    function skipBattle() {
        try {
            const scene = search(Laya.stage);
            if (scene && typeof scene.onJumpBtnClick === 'function') {
                const phase = scene.manager?.phase;
                if (phase === 9) {
                    scene.onJumpBtnClick();
                    console.log('[跳过战斗] 已跳过战斗动画');
                    return true;
                } else if (phase === 7) {
                    scene.onEndRecruitJump();
                    console.log('[跳过战斗] 已结束招募阶段');
                    return true;
                } else {
                    console.log('[跳过战斗] 当前阶段无需跳过 (阶段:', phase, ')');
                    return false;
                }
            } else if (scene) {
                console.log('[跳过战斗] 场景中找到但方法不存在');
            } else {
                console.log('[跳过战斗] 未找到自走棋场景');
            }
            return false;
        } catch(e) {
            console.log('[跳过战斗] 错误:', e.message);
            return false;
        }
    }

    // 创建按钮
    function createButton() {
        // 检查按钮是否已存在
        if (document.getElementById('my-skip-battle-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'my-skip-battle-btn';
        btn.textContent = '跳过战斗';
        btn.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 1800px;
            z-index: 99999;
            padding: 10px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            user-select: none;
        `;

        // 鼠标悬停效果
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
        });
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        });

        // 点击事件
        btn.addEventListener('click', function() {
            const originalText = this.textContent;
            this.textContent = '执行中...';
            this.style.opacity = '0.7';

            const result = skipBattle();

            if (result) {
                this.textContent = '已跳过';
                this.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
            } else {
                this.textContent = '无法跳过';
                this.style.background = 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)';
            }

            setTimeout(() => {
                this.textContent = originalText;
                this.style.opacity = '1';
                this.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }, 1500);
        });

        document.body.appendChild(btn);
        console.log('[跳过战斗] 按钮已添加');
    }

    // 等待页面加载完成后添加按钮
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createButton);
        } else {
            createButton();
        }
    }

    // 启动脚本
    init();
    console.log('[跳过战斗] 脚本已启动，点击右下角按钮跳过战斗');
})();