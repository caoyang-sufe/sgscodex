// 使用需要目标的锦囊（支持多种目标选择方式）
function useSpellWithTarget(index, targetType, targetValue) {
    var m = null;
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
            m = find(Laya.stage);
        }
    } catch(e) {}

    if (!m) {
        for (var k in window) {
            try {
                var o = window[k];
                if (o && o.ReqShopRefreshChess) { m = o; break; }
                if (o && o.manager && o.manager.ReqShopRefreshChess) { m = o.manager; break; }
            } catch(e) {}
        }
    }

    if (!m) {
        console.info('❌ 未找到管理器');
        return false;
    }

    var hand = m.HandChess || m.handChess || [];
    if (index < 0 || index >= hand.length) {
        console.info('❌ 索引超出范围，手牌数量:', hand.length);
        return false;
    }

    var card = hand[index];
    var goodsID = card.goodsID || card.GoodsID || 0;
    var spellID = card.spellID || card.SpellID || 0;
    var chessID = card.chessID || card.ChessID || 0;

    if (!spellID || chessID) {
        console.info('❌ 该位置不是锦囊牌');
        return false;
    }

    // ===== 获取目标 =====
    var targets = [];
    
    // targetType: 
    // 'enemy' - 敌方棋子
    // 'self' - 己方棋子  
    // 'all_enemy' - 所有敌方
    // 'all_self' - 所有己方
    // 'specific' - 指定goodsID
    // 'position' - 指定位置
    // 'shop' - 商店卡牌

    switch(targetType) {
        case 'enemy':
            // 获取敌方棋子
            var enemyChess = m.EnemyChess || m.battlePlayerInfo?.Chess || m.enemyPlayerInfo?.Chess || [];
            if (targetValue !== undefined && targetValue < enemyChess.length) {
                var target = enemyChess[targetValue];
                targets = [target.goodsID || target.GoodsID || target.UniqueId || 0];
                console.info('🎯 目标: 敌方棋子 #' + targetValue, targets);
            } else {
                console.info('❌ 敌方棋子索引无效');
                return false;
            }
            break;

        case 'self':
            // 获取己方棋子
            var selfChess = m.BattleChess || m.selfInfo?.LineUpChess || [];
            if (targetValue !== undefined && targetValue < selfChess.length) {
                var target = selfChess[targetValue];
                targets = [target.goodsID || target.GoodsID || target.UniqueId || 0];
                console.info('🎯 目标: 己方棋子 #' + targetValue, targets);
            } else {
                console.info('❌ 己方棋子索引无效');
                return false;
            }
            break;

        case 'all_enemy':
            // 所有敌方棋子
            var allEnemy = m.EnemyChess || m.battlePlayerInfo?.Chess || m.enemyPlayerInfo?.Chess || [];
            targets = allEnemy.map(function(c) { 
                return c.goodsID || c.GoodsID || c.UniqueId || 0; 
            }).filter(function(id) { return id > 0; });
            console.info('🎯 目标: 所有敌方 (' + targets.length + '个)', targets);
            break;

        case 'all_self':
            // 所有己方棋子
            var allSelf = m.BattleChess || m.selfInfo?.LineUpChess || [];
            targets = allSelf.map(function(c) { 
                return c.goodsID || c.GoodsID || c.UniqueId || 0; 
            }).filter(function(id) { return id > 0; });
            console.info('🎯 目标: 所有己方 (' + targets.length + '个)', targets);
            break;

        case 'specific':
            // 指定goodsID
            if (targetValue) {
                targets = [targetValue];
                console.info('🎯 目标: 指定ID', targets);
            } else {
                console.info('❌ 需要提供目标ID');
                return false;
            }
            break;

        case 'position':
            // 按棋盘位置选择（0-6）
            var allChess = m.BattleChess || [];
            var posTarget = allChess.filter(function(c) { 
                return (c.pos || c.Pos || 0) === targetValue; 
            });
            if (posTarget.length > 0) {
                targets = posTarget.map(function(c) { 
                    return c.goodsID || c.GoodsID || c.UniqueId || 0; 
                });
                console.info('🎯 目标: 位置 ' + targetValue, targets);
            } else {
                console.info('❌ 位置 ' + targetValue + ' 没有棋子');
                return false;
            }
            break;

        case 'shop':
            // 商店卡牌（用于某些可以购买商店卡的锦囊）
            var shopGoods = m.ShopGoods || [];
            if (targetValue !== undefined && targetValue < shopGoods.length) {
                var target = shopGoods[targetValue];
                targets = [target.goodsID || target.GoodsID || 0];
                console.info('🎯 目标: 商店卡牌 #' + targetValue, targets);
            } else {
                console.info('❌ 商店卡牌索引无效');
                return false;
            }
            break;

        default:
            console.info('❌ 未知目标类型:', targetType);
            console.info('  支持的类型: enemy, self, all_enemy, all_self, specific, position, shop');
            return false;
    }

    if (targets.length === 0) {
        console.info('❌ 没有找到有效目标');
        return false;
    }

    // 使用锦囊
    console.info('▶️ 使用锦囊 goodsID:', goodsID, 'spellID:', spellID, 'targets:', targets);
    
    if (typeof m.ReqChessUseSpell === 'function') {
        m.ReqChessUseSpell(goodsID, targets);
        console.info('✅ 已发送使用请求');
        return true;
    } else {
        console.info('❌ ReqChessUseSpell 方法不存在');
        return false;
    }
}

// ===== 快捷命令 =====

// 查看所有可选目标
function listTargets() {
    var m = null;
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
            m = find(Laya.stage);
        }
    } catch(e) {}

    if (!m) {
        for (var k in window) {
            try {
                var o = window[k];
                if (o && o.ReqShopRefreshChess) { m = o; break; }
                if (o && o.manager && o.manager.ReqShopRefreshChess) { m = o.manager; break; }
            } catch(e) {}
        }
    }

    if (!m) {
        console.info('❌ 未找到管理器');
        return;
    }

    console.info('===== 可选目标 =====');
    
    // 己方棋子
    var selfChess = m.BattleChess || m.selfInfo?.LineUpChess || [];
    console.info('【己方棋子】');
    selfChess.forEach(function(c, i) {
        var name = c.name || c.Name || '未知';
        console.info('  ' + i + '.', name, 'goodsID:', c.goodsID || c.GoodsID || 0, 'pos:', c.pos || c.Pos || 0);
    });

    // 敌方棋子
    var enemyChess = m.EnemyChess || m.battlePlayerInfo?.Chess || m.enemyPlayerInfo?.Chess || [];
    console.info('【敌方棋子】');
    enemyChess.forEach(function(c, i) {
        var name = c.name || c.Name || '未知';
        console.info('  ' + i + '.', name, 'goodsID:', c.goodsID || c.GoodsID || 0, 'pos:', c.pos || c.Pos || 0);
    });

    // 商店卡牌
    var shopGoods = m.ShopGoods || [];
    console.info('【商店卡牌】');
    shopGoods.forEach(function(c, i) {
        if (c) {
            console.info('  ' + i + '.', 'goodsID:', c.goodsID || 0, 'chessID:', c.chessID || 0);
        }
    });

    console.info('💡 使用: useSpellWithTarget(手牌索引, 目标类型, 目标值)');
    console.info('  示例: useSpellWithTarget(0, "enemy", 0)  // 对敌方第1个棋子使用');
    console.info('  示例: useSpellWithTarget(1, "all_enemy")  // 对所有敌方棋子使用');
    console.info('  示例: useSpellWithTarget(2, "self", 0)    // 对己方第1个棋子使用');
    console.info('  示例: useSpellWithTarget(3, "position", 2) // 对位置2的棋子使用');
}

// 暴露到全局
window.useSpellWithTarget = useSpellWithTarget;
window.listTargets = listTargets;

console.info('===== 需要目标的锦囊使用命令已加载 =====');
console.info('📌 命令:');
console.info('  listTargets()                          - 查看所有可选目标');
console.info('  useSpellWithTarget(手牌索引, 类型, 值) - 使用锦囊');
console.info('');
console.info('📖 目标类型:');
console.info('  "enemy", 值: 敌方棋子索引');
console.info('  "self", 值: 己方棋子索引');
console.info('  "all_enemy" (无需值)');
console.info('  "all_self" (无需值)');
console.info('  "specific", 值: goodsID');
console.info('  "position", 值: 棋盘位置(0-6)');
console.info('  "shop", 值: 商店卡牌索引');
console.info('');
console.info('💡 示例:');
console.info('  useSpellWithTarget(0, "enemy", 0)      // 对敌方第1个棋子使用');
console.info('  useSpellWithTarget(1, "all_enemy")     // 对所有敌方棋子使用');