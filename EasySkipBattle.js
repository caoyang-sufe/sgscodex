(function() {
    function search(obj) {
        if (!obj) return null;
        if (obj.constructor && obj.constructor.name === 'TavernChessGameScene') return obj;
        if (obj._children) {
            for (let child of obj._children) {
                const result = search(child);
                if (result) return result;
            }
        }
        return null;
    }
    const scene = search(Laya.stage);
    if (scene) {
        scene.onJumpBtnClick?.();  // 只跳过战斗
        // scene.onEndRecruitJump?.(); // 如需结束招募，取消注释这行
    }
})();
