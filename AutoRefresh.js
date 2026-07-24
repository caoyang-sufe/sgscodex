// ==UserScript==
// @name         自走棋批量刷新商店
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  输入刷新次数，一键批量刷新商店（无任何条件检查）
// @author       caoyang-sufe
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

(function() {
    'use strict';

    // ============================================================
    // 获取管理器 - 使用你已验证可行的方法
    // ============================================================
    function getManager() {
        try {
            if (Laya && Laya.stage) {
                function f(o) {
                    if (!o) return null;
                    if (o.manager && o.manager.ReqShopRefreshChess) return o.manager;
                    if (o.ReqShopRefreshChess) return o;
                    var c = o._children || o.children || o.childList;
                    if (c) {
                        for (var i = 0; i < c.length; i++) {
                            var r = f(c[i]);
                            if (r) return r;
                        }
                    }
                    if (typeof o.numChildren === 'number' && typeof o.getChildAt === 'function') {
                        for (var i = 0; i < o.numChildren; i++) {
                            try {
                                var r = f(o.getChildAt(i));
                                if (r) return r;
                            } catch(e) {}
                        }
                    }
                    return null;
                }
                var m = f(Laya.stage);
                if (m) return m;
            }
        } catch(e) {}

        for (var k in window) {
            try {
                var o = window[k];
                if (o && o.ReqShopRefreshChess) return o;
                if (o && o.manager && o.manager.ReqShopRefreshChess) return o.manager;
            } catch(e) {}
        }
        return null;
    }

    // ============================================================
    // 执行一次刷新 - 不做任何检查
    // ============================================================
    function refreshOnce() {
        var m = getManager();
        if (!m) {
            console.log('❌ 未找到管理器');
            return false;
        }
        m.ReqShopRefreshChess(false);
        return true;
    }

    // ============================================================
    // 批量刷新
    // ============================================================
    function batchRefresh(count, interval) {
        interval = interval || 0;
        var successCount = 0;
        var failCount = 0;
        var index = 0;
        var timer = null;
        var isStopped = false;

        function doNext() {
            if (isStopped || index >= count) {
                if (timer) {
                    clearInterval(timer);
                    timer = null;
                }
                console.log('✅ 完成! 成功:', successCount, '失败:', failCount);
                updateUIStatus('完成! 成功:' + successCount + ' 失败:' + failCount);
                return;
            }

            index++;
            var result = refreshOnce();
            if (result) {
                successCount++;
            } else {
                failCount++;
            }
            updateUIStatus('刷新中... ' + index + '/' + count + ' (成功:' + successCount + ' 失败:' + failCount + ')');
            updateUIProgress(index, count);
        }

        console.log('🔄 开始刷新:', count, '次');
        doNext();

        if (index < count) {
            timer = setInterval(doNext, interval);
        }

        return function() {
            isStopped = true;
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            console.log('⏹ 已停止，成功:', successCount, '失败:', failCount);
        };
    }

    // ============================================================
    // UI
    // ============================================================
    var stopFn = null;
    var isRunning = false;

    function createUI() {
        if (document.getElementById('tavern-batch-refresh-panel')) return;

        var panel = document.createElement('div');
        panel.id = 'tavern-batch-refresh-panel';
        panel.style.cssText = [
            'position:fixed',
            'top:100px',
            'right:20px',
            'z-index:99999',
            'background:rgba(20,24,35,0.95)',
            'color:#f6f7fb',
            'border:1px solid #596275',
            'border-radius:10px',
            'padding:16px 20px',
            'font:13px/1.5 Microsoft YaHei,Arial,sans-serif',
            'min-width:200px',
            'box-shadow:0 6px 22px rgba(0,0,0,0.5)',
            'user-select:none'
        ].join(';');

        panel.innerHTML = [
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">',
            '<b style="font-size:14px;">🔄 批量刷新</b>',
            '<button id="tavern-batch-refresh-close" style="cursor:pointer;border:0;border-radius:4px;padding:0 8px;background:transparent;color:#a5b1c2;font-size:18px;">×</button>',
            '</div>',
            '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">',
            '<label style="color:#a5b1c2;">次数:</label>',
            '<input id="tavern-batch-refresh-input" type="number" value="10" min="1" max="999" style="width:70px;background:#2d3436;color:#fff;border:1px solid #596275;border-radius:4px;padding:4px 8px;text-align:center;">',
            '<button id="tavern-batch-refresh-btn" style="cursor:pointer;border:0;border-radius:4px;padding:5px 16px;background:#4b7bec;color:#fff;font-weight:bold;">执行</button>',
            '</div>',
            '<div id="tavern-batch-refresh-status" style="color:#a5b1c2;font-size:12px;min-height:20px;">就绪</div>',
            '<div id="tavern-batch-refresh-progress" style="margin-top:6px;height:4px;background:#2d3436;border-radius:2px;overflow:hidden;display:none;">',
            '<div id="tavern-batch-refresh-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#4b7bec,#00d2d3);border-radius:2px;transition:width 0.2s;"></div>',
            '</div>'
        ].join('');

        document.body.appendChild(panel);

        var input = document.getElementById('tavern-batch-refresh-input');
        var btn = document.getElementById('tavern-batch-refresh-btn');
        var status = document.getElementById('tavern-batch-refresh-status');
        var progress = document.getElementById('tavern-batch-refresh-progress');
        var bar = document.getElementById('tavern-batch-refresh-bar');
        var closeBtn = document.getElementById('tavern-batch-refresh-close');

        function updateStatus(text, isError) {
            status.textContent = text;
            status.style.color = isError ? '#ff6b6b' : '#a5b1c2';
        }

        window.updateUIStatus = updateStatus;

        function updateProgress(current, total) {
            if (total > 0) {
                var pct = Math.min(100, (current / total) * 100);
                bar.style.width = pct + '%';
                progress.style.display = 'block';
            }
        }
        window.updateUIProgress = updateProgress;

        function resetProgress() {
            progress.style.display = 'none';
            bar.style.width = '0%';
        }

        function startRefresh() {
            if (isRunning) {
                if (stopFn) {
                    stopFn();
                    stopFn = null;
                }
                isRunning = false;
                btn.textContent = '执行';
                btn.style.background = '#4b7bec';
                updateStatus('已停止', false);
                resetProgress();
                return;
            }

            var count = parseInt(input.value) || 10;
            if (count < 1) {
                updateStatus('请输入有效的次数', true);
                return;
            }

            // 先检查管理器
            var m = getManager();
            if (!m) {
                updateStatus('❌ 未找到管理器', true);
                return;
            }

            isRunning = true;
            btn.textContent = '停止';
            btn.style.background = '#e17055';
            updateStatus('开始刷新...', false);
            resetProgress();

            stopFn = batchRefresh(count, 0);
        }

        btn.addEventListener('click', startRefresh);

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                startRefresh();
            }
        });

        closeBtn.addEventListener('click', function() {
            if (isRunning && stopFn) {
                stopFn();
                stopFn = null;
                isRunning = false;
            }
            panel.style.display = 'none';
        });

        // 拖拽
        (function() {
            var isDragging = false;
            var startX, startY, startLeft, startTop;

            panel.addEventListener('mousedown', function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                isDragging = true;
                var rect = panel.getBoundingClientRect();
                startX = e.clientX - rect.left;
                startY = e.clientY - rect.top;
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';
                panel.style.left = rect.left + 'px';
                panel.style.top = rect.top + 'px';
                e.preventDefault();
            });

            document.addEventListener('mousemove', function(e) {
                if (!isDragging) return;
                panel.style.left = Math.max(0, e.clientX - startX) + 'px';
                panel.style.top = Math.max(0, e.clientY - startY) + 'px';
            });

            document.addEventListener('mouseup', function() {
                isDragging = false;
            });
        })();
    }

    // ============================================================
    // 快捷键 Ctrl+Shift+R 显示/隐藏
    // ============================================================
    document.addEventListener('keydown', function(e) {
        if (e.key === 'R' && e.ctrlKey && e.shiftKey) {
            e.preventDefault();
            var panel = document.getElementById('tavern-batch-refresh-panel');
            if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
        }
    });

    // ============================================================
    // 控制台命令
    // ============================================================
    window.__batchRefresh = {
        run: function(count, interval) {
            return batchRefresh(count || 10, interval || 200);
        },
        once: function() {
            return refreshOnce();
        },
        find: function() {
            var m = getManager();
            if (m) {
                console.log('✅ 找到管理器');
                return m;
            }
            console.log('❌ 未找到管理器');
            return null;
        },
        toggle: function() {
            var panel = document.getElementById('tavern-batch-refresh-panel');
            if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
        }
    };

    // ============================================================
    // 启动
    // ============================================================
    setTimeout(createUI, 1500);

    console.log('========================================');
    console.log('🔄 批量刷新商店 v1.0.2');
    console.log('========================================');
    console.log('界面: 页面右上角');
    console.log('快捷键: Ctrl+Shift+R 显示/隐藏');
    console.log('控制台命令:');
    console.log('  __batchRefresh.run(次数)  - 批量刷新');
    console.log('  __batchRefresh.once()     - 刷新一次');
    console.log('  __batchRefresh.find()     - 查找管理器');
    console.log('========================================');

})();