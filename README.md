篡改猴脚本 https://web.sanguosha.com 一将成名

以Easy开头的.js文件直接在控制台使用

其余为.js文件为篡改猴脚本

- AutoBuyAndSell: 自动寻牌助手
- AutoRefresh.js: 自动刷新（连点器上位方案）
- AutoUseSpell.js: 陆逊小抄 & 一键使用锦囊
  - 一键使用锦囊目前unstable，因为锦囊变化太大，不同锦囊的使用参数区别大，目前用的是这样一套使用逻辑：
    - 优先尝试无参数调用（如先驱、洞烛这类直接使用的锦囊）
	- 如果失败则对营帐第一个格子使用（如过拆）
	- 如果失败尝试对场上第一个棋子使用（如桃、酒等）
	- 如果都失败，则卖掉锦囊
	- 可能出现的问题：如草船、三顾使用后需要手动选择一次（这种情况还没有处理），再比如连续使用过拆，营帐可能没有可以拆掉的对象
- SGSCheater.js: 三国杀打小抄
- SkipBattle.js: 跳过战斗按钮

- TavernchessSkipBattle.js: 跳过自走棋战斗按钮
- TavernChessStats-0.4.3.js: 自走棋数据统计

- EasyAutoRefresh.js: 执行后自动刷新1次
- EasyBuy.js: 自动购买卡牌
- EasyClick.js: 执行后启动页端连点器（跟随鼠标）
- EasyRefreshUI.js: 手动刷新UI（把手牌区没显示的卡牌刷出来）
- EasySell.js: 自动遣散卡牌
- EasySkipBattle.js: 执行后跳过战斗
- EasyUseSpell.js: 脚本操作使用一张锦囊

---

python脚本：
- EasyClick.py: 连点器
- visualization.py: 统计数据可视化

---

txt文本：

关于如何抓包一将成名，数据包加解密教程，移步[https://github.com/caoyang-sufe/sgs_forward_looking](https://github.com/caoyang-sufe/sgs_forward_looking)

- ChessIdMap.txt: 棋子ID映射表
- SpellIdMap.txt: 锦囊ID映射表