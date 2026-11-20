let count = 0;
let isRunning = true;

// 监听鼠标移动，记录当前位置
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// 开始连点
const interval = setInterval(() => {
    if (!isRunning) return;
    const element = document.elementFromPoint(mouseX, mouseY);
    if (element) {
        element.click();
        count++;
        console.log(`第 ${count} 次点击 (${mouseX}, ${mouseY})`);
    }
}, 0);

// 停止连点：输入 isRunning = false; clearInterval(interval)