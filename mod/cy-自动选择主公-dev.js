// 选将工具 - 完整版（包含点击"选定"按钮）
(function() {
    'use strict';

    // 获取管理器
    function getManager() {
        try {
            if (Laya && Laya.stage) {
                function find(o) {
                    if (!o) return null;
                    if (o.manager && o.manager.ReqShopRefreshChess) return o.manager;
                    if (o.ReqShopRefreshChess) return o;
                    var c = o._children || o.children || o.childList;
                    if (c) {
                        for (var i = 0; i < c.length; i++) {
                            var r = find(c[i]);
                            if (r) return r;
                        }
                    }
                    if (typeof o.numChildren === 'number' && typeof o.getChildAt === 'function') {
                        for (var i = 0; i < o.numChildren; i++) {
                            try {
                                var r = find(o.getChildAt(i));
                                if (r) return r;
                            } catch(e) {}
                        }
                    }
                    return null;
                }
                var m = find(Laya.stage);
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

    // 查找选将窗口
    function findSelectGeneralWindow() {
        try {
            if (!Laya || !Laya.stage) return null;

            function findInChildren(obj) {
                if (!obj) return null;
                if (obj.constructor && obj.constructor.name === 'TavernChessSelectGeneralWindow') {
                    return obj;
                }
                var children = obj._children || obj.children || obj.childList;
                if (children) {
                    for (var i = 0; i < children.length; i++) {
                        var r = findInChildren(children[i]);
                        if (r) return r;
                    }
                }
                if (typeof obj.numChildren === 'number' && typeof obj.getChildAt === 'function') {
                    for (var i = 0; i < obj.numChildren; i++) {
                        try {
                            var r = findInChildren(obj.getChildAt(i));
                            if (r) return r;
                        } catch(e) {}
                    }
                }
                return null;
            }
            return findInChildren(Laya.stage);
        } catch(e) {
            console.warn('[选将] 查找窗口异常:', e.message);
            return null;
        }
    }

    // 查找选将面板
    function findSelectPanel(win) {
        if (!win) return null;
        if (win.panel && win.panel.constructor && win.panel.constructor.name === 'SgsFlatPanel') {
            return win.panel;
        }
        function findPanel(obj) {
            if (!obj) return null;
            if (obj.constructor && obj.constructor.name === 'SgsFlatPanel') {
                return obj;
            }
            var children = obj._children || obj.children || obj.childList;
            if (children) {
                for (var i = 0; i < children.length; i++) {
                    var r = findPanel(children[i]);
                    if (r) return r;
                }
            }
            if (typeof obj.numChildren === 'number' && typeof obj.getChildAt === 'function') {
                for (var i = 0; i < obj.numChildren; i++) {
                    try {
                        var r = findPanel(obj.getChildAt(i));
                        if (r) return r;
                    } catch(e) {}
                }
            }
            return null;
        }
        return findPanel(win);
    }

    // 获取渲染器
    function getRendererByIndex(panel, index) {
        var renderers = panel.CurDrawRenderers || [];
        for (var i = 0; i < renderers.length; i++) {
            if (renderers[i] && renderers[i].RendererIndex === index) {
                return renderers[i];
            }
        }
        return null;
    }

    // 点击"选定"按钮
    function clickSelectBtn(renderer) {
        if (!renderer) return false;

        // 方法1: 直接调用 onSelectBtnClick
        if (typeof renderer.onSelectBtnClick === 'function') {
            renderer.onSelectBtnClick();
            console.info('✅ 已通过 onSelectBtnClick 确认');
            return true;
        }

        // 方法2: 找到 selectBtn 并点击
        try {
            // 在 renderer 的子对象中查找 selectBtn
            function findSelectBtn(obj) {
                if (!obj) return null;
                // 检查是否是 SgsFlatButton 且 visible 为 true
                if (obj.constructor && obj.constructor.name === 'SgsFlatButton') {
                    // 检查是否是 selectBtn（通过位置或标签判断）
                    if (obj.x === 30 && obj.y === 200) {
                        return obj;
                    }
                }
                var children = obj._children || obj.children || obj.childList;
                if (children) {
                    for (var i = 0; i < children.length; i++) {
                        var r = findSelectBtn(children[i]);
                        if (r) return r;
                    }
                }
                if (typeof obj.numChildren === 'number' && typeof obj.getChildAt === 'function') {
                    for (var i = 0; i < obj.numChildren; i++) {
                        try {
                            var r = findSelectBtn(obj.getChildAt(i));
                            if (r) return r;
                        } catch(e) {}
                    }
                }
                return null;
            }

            var selectBtn = findSelectBtn(renderer);
            if (selectBtn) {
                console.info('🔍 找到"选定"按钮');
                if (typeof selectBtn.onClick === 'function') {
                    selectBtn.onClick();
                    console.info('✅ 已点击"选定"按钮');
                    return true;
                }
                if (typeof selectBtn.event === 'function') {
                    selectBtn.event(Laya.Event.CLICK);
                    console.info('✅ 已触发"选定"按钮点击事件');
                    return true;
                }
            }
        } catch(e) {
            console.warn('[选将] 查找选定按钮异常:', e.message);
        }

        // 方法3: 通过管理器确认
        var mgr = getManager();
        if (mgr && renderer.RendererData) {
            var generalID = renderer.RendererData.GeneralID;
            if (generalID && typeof mgr.ReqChessChooseGeneral === 'function') {
                mgr.ReqChessChooseGeneral(generalID, false);
                console.info('✅ 已通过管理器确认选择');
                return true;
            }
        }

        return false;
    }

    // 选择主公（完整流程：选中 + 点击"选定"）
    function selectGeneralByIndex(index) {
        try {
            var win = findSelectGeneralWindow();
            if (!win) {
                console.info('❌ 选将窗口未打开');
                return false;
            }

            var panel = findSelectPanel(win);
            if (!panel) {
                console.info('❌ 未找到选将面板');
                return false;
            }

            var dataList = panel.DataProvider || [];
            if (index < 0 || index >= dataList.length) {
                console.info('❌ 索引超出范围，共 ' + dataList.length + ' 个可选主公');
                return false;
            }

            var targetData = dataList[index];
            var generalID = targetData ? targetData.GeneralID : 0;
            var generalName = targetData ? targetData.GeneralName : '未知';

            console.info('🎯 选择主公:', generalName, '(ID:' + generalID + ')');

            // 步骤1: 选中主公（出现"选定"按钮）
            var renderer = getRendererByIndex(panel, index);
            var selected = false;

            if (renderer) {
                // 调用选择方法
                if (typeof renderer.onOptImgClick === 'function') {
                    renderer.onOptImgClick();
                    console.info('✅ 已点击主公（出现"选定"按钮）');
                    selected = true;
                } else if (panel && typeof panel.onItemClick === 'function') {
                    panel.onItemClick(index, renderer.RendererData, renderer);
                    console.info('✅ 已通过事件选中主公');
                    selected = true;
                }
            }

            if (!selected) {
                // 备用：通过管理器预选
                var mgr = getManager();
                if (mgr && typeof mgr.ReqChessChooseGeneral === 'function') {
                    mgr.ReqChessChooseGeneral(generalID, true);
                    console.info('✅ 已通过管理器预选');
                    selected = true;
                }
            }

            if (!selected) {
                console.info('❌ 选中主公失败');
                return false;
            }

            // 步骤2: 点击"选定"按钮确认
            // 需要等待"选定"按钮出现
            console.info('⏳ 等待"选定"按钮出现...');

            // 立即尝试点击
            var btnClicked = false;

            function tryClickSelectBtn(retryCount) {
                retryCount = retryCount || 0;
                if (retryCount > 10) {
                    console.info('❌ "选定"按钮未出现，放弃');
                    // 尝试通过管理器直接确认
                    var mgr2 = getManager();
                    if (mgr2 && generalID && typeof mgr2.ReqChessChooseGeneral === 'function') {
                        mgr2.ReqChessChooseGeneral(generalID, false);
                        console.info('✅ 已通过管理器直接确认');
                    }
                    return;
                }

                // 重新获取渲染器（UI可能已更新）
                var currentPanel = findSelectPanel(findSelectGeneralWindow());
                if (!currentPanel) {
                    setTimeout(function() { tryClickSelectBtn(retryCount + 1); }, 200);
                    return;
                }

                var currentRenderer = getRendererByIndex(currentPanel, index);
                if (!currentRenderer) {
                    setTimeout(function() { tryClickSelectBtn(retryCount + 1); }, 200);
                    return;
                }

                // 检查"选定"按钮是否可见
                var selectBtnVisible = false;
                try {
                    function checkSelectBtnVisible(obj) {
                        if (!obj) return false;
                        if (obj.constructor && obj.constructor.name === 'SgsFlatButton') {
                            if (obj.x === 30 && obj.y === 200 && obj.visible) {
                                return true;
                            }
                        }
                        var children = obj._children || obj.children || obj.childList;
                        if (children) {
                            for (var i = 0; i < children.length; i++) {
                                if (checkSelectBtnVisible(children[i])) return true;
                            }
                        }
                        if (typeof obj.numChildren === 'number' && typeof obj.getChildAt === 'function') {
                            for (var i = 0; i < obj.numChildren; i++) {
                                try {
                                    if (checkSelectBtnVisible(obj.getChildAt(i))) return true;
                                } catch(e) {}
                            }
                        }
                        return false;
                    }
                    selectBtnVisible = checkSelectBtnVisible(currentRenderer);
                } catch(e) {}

                if (selectBtnVisible) {
                    console.info('✅ "选定"按钮已出现');
                    var result = clickSelectBtn(currentRenderer);
                    if (result) {
                        console.info('✅ 已确认选择主公:', generalName);
                        btnClicked = true;
                    } else {
                        // 如果点击失败，尝试用管理器确认
                        var mgr3 = getManager();
                        if (mgr3 && generalID && typeof mgr3.ReqChessChooseGeneral === 'function') {
                            mgr3.ReqChessChooseGeneral(generalID, false);
                            console.info('✅ 已通过管理器确认选择');
                            btnClicked = true;
                        }
                    }
                } else {
                    setTimeout(function() { tryClickSelectBtn(retryCount + 1); }, 200);
                }
            }

            // 开始尝试点击"选定"按钮
            setTimeout(function() { tryClickSelectBtn(0); }, 300);
            return true;

        } catch(e) {
            console.info('❌ 选择异常:', e.message);
            return false;
        }
    }

    // 通过行列选择
    function selectGeneralByRowCol(row, col) {
        var index = row * 6 + col;
        return selectGeneralByIndex(index);
    }

    // 通过主公ID选择
    function selectGeneralByID(generalID) {
        try {
            var win = findSelectGeneralWindow();
            if (!win) {
                console.info('❌ 选将窗口未打开');
                return false;
            }
            var panel = findSelectPanel(win);
            if (!panel) {
                console.info('❌ 未找到选将面板');
                return false;
            }
            var dataList = panel.DataProvider || [];
            for (var i = 0; i < dataList.length; i++) {
                if (dataList[i] && dataList[i].GeneralID === generalID) {
                    return selectGeneralByIndex(i);
                }
            }
            console.info('❌ 未找到主公ID:', generalID);
            return false;
        } catch(e) {
            console.info('❌ 选择异常:', e.message);
            return false;
        }
    }

    // 获取可选主公列表
    function getAvailableGenerals() {
        try {
            var win = findSelectGeneralWindow();
            if (!win) {
                console.info('❌ 选将窗口未打开');
                return null;
            }
            var panel = findSelectPanel(win);
            if (!panel) {
                console.info('❌ 未找到选将面板');
                return null;
            }
            var dataList = panel.DataProvider || [];
            console.info('===== 可选主公列表 =====');
            if (dataList.length === 0) {
                console.info('  没有可选主公');
                return [];
            }
            dataList.forEach(function(item, i) {
                var name = item.GeneralName || '未知';
                var id = item.GeneralID || 0;
                var row = Math.floor(i / 6);
                var col = i % 6;
                console.info('  [' + i + '] 行' + row + '列' + col + ':', name, '(ID:' + id + ')');
            });
            console.info('');
            console.info('💡 使用 __generalSelect.byIndex(索引) 选择');
            console.info('💡 使用 __generalSelect.byRowCol(行, 列) 选择');
            console.info('💡 使用 __generalSelect.byID(主公ID) 选择');
            return dataList;
        } catch(e) {
            console.info('❌ 获取列表异常:', e.message);
            return null;
        }
    }

    // 检查选将窗口是否打开
    function isSelectWindowOpen() {
        var win = findSelectGeneralWindow();
        if (win && win.visible !== false) {
            console.info('✅ 选将窗口已打开');
            return true;
        }
        console.info('❌ 选将窗口未打开');
        return false;
    }

    // 调试
    function debugWindow() {
        var win = findSelectGeneralWindow();
        if (!win) {
            console.info('❌ 选将窗口未打开');
            return;
        }
        console.info('===== 选将窗口调试 =====');
        console.info('窗口:', win);
        console.info('窗口类名:', win.constructor ? win.constructor.name : '未知');
        console.info('窗口可见:', win.visible);
        
        var panel = findSelectPanel(win);
        if (panel) {
            console.info('面板:', panel);
            console.info('面板类名:', panel.constructor ? panel.constructor.name : '未知');
            console.info('数据数量:', panel.DataProvider ? panel.DataProvider.length : 0);
            console.info('渲染器数量:', panel.CurDrawRenderers ? panel.CurDrawRenderers.length : 0);
        } else {
            console.info('❌ 未找到面板');
        }
    }

    // 暴露到全局
    window.__generalSelect = {
        byIndex: selectGeneralByIndex,
        byRowCol: selectGeneralByRowCol,
        byID: selectGeneralByID,
        list: getAvailableGenerals,
        isOpen: isSelectWindowOpen,
        debug: debugWindow
    };

    console.info('===== 选将工具已加载 =====');
    console.info('📌 在选将界面使用:');
    console.info('  __generalSelect.list()              - 查看可选主公');
    console.info('  __generalSelect.byIndex(索引)       - 选择指定索引（自动确认）');
    console.info('  __generalSelect.byRowCol(行, 列)    - 选择指定行列（自动确认）');
    console.info('  __generalSelect.byID(主公ID)        - 选择指定ID（自动确认）');
    console.info('  __generalSelect.isOpen()            - 检查窗口是否打开');
    console.info('  __generalSelect.debug()             - 调试窗口结构');
    console.info('');
    console.info('💡 示例:');
    console.info('  __generalSelect.byRowCol(0, 0)      - 选择第1行第1个并确认');
    console.info('  __generalSelect.byRowCol(0, 1)      - 选择第1行第2个并确认');

})();