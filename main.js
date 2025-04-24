let port;
let reader;
let dnaControl = {
    radius: 100,    // DNA 螺旋的半徑
    speed: 0.05     // 旋轉速度
};

async function connectToArduino() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        
        const decoder = new TextDecoderStream();
        const inputStream = port.readable.pipeTo(decoder.writable);
        reader = decoder.readable.getReader();
        
        document.getElementById('status').textContent = '已連接';
        document.getElementById('connectButton').disabled = true;
        
        readArduinoData();
    } catch (error) {
        console.error('連接錯誤:', error);
        document.getElementById('status').textContent = '連接失敗';
    }
}

async function readArduinoData() {
    while (true) {
        try {
            const { value, done } = await reader.read();
            if (done) {
                reader.releaseLock();
                break;
            }
            // 解析 Arduino 發送的數據
            // 格式: "R:半徑,S:旋轉速度"
            const data = value.trim();
            const pairs = data.split(',');
            pairs.forEach(pair => {
                const [key, val] = pair.split(':');
                if (key === 'R') {
                    dnaControl.radius = parseFloat(val);
                } else if (key === 'S') {
                    dnaControl.speed = parseFloat(val) * 0.01;
                }
            });
        } catch (error) {
            console.error('讀取錯誤:', error);
            break;
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DNA 動畫已載入！');
    
    document.getElementById('connectButton').addEventListener('click', connectToArduino);
    
    let canvas = document.getElementById('dnaCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'dnaCanvas';
        document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    let time = 0;
    
    // DNA 結構參數
    const dnaParams = {
        segments: 100,          // 螺旋段數
        verticalSpacing: 8,     // 垂直間距
        connectionWidth: 20,    // 連接線寬度
        baseSpacing: 25        // 鹼基對間距
    };

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function projectPoint(x, y, z) {
        // 簡單的 3D 投影
        const perspective = 500;
        const scale = perspective / (perspective + z);
        return {
            x: canvas.width / 2 + x * scale,
            y: canvas.height / 2 + y * scale
        };
    }

    function drawConnection(point1, point2, color, width) {
        ctx.beginPath();
        ctx.moveTo(point1.x, point1.y);
        ctx.lineTo(point2.x, point2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
    }

    function drawDNA() {
        time += dnaControl.speed;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 繪製兩條螺旋骨架
        for (let i = 0; i < dnaParams.segments; i++) {
            const t = i / dnaParams.segments;
            const angle = time + t * Math.PI * 4;
            
            // 第一條螺旋
            const x1 = Math.cos(angle) * dnaControl.radius;
            const y1 = i * dnaParams.verticalSpacing - dnaParams.segments * dnaParams.verticalSpacing / 2;
            const z1 = Math.sin(angle) * dnaControl.radius;
            
            // 第二條螺旋（相位差 π）
            const x2 = Math.cos(angle + Math.PI) * dnaControl.radius;
            const z2 = Math.sin(angle + Math.PI) * dnaControl.radius;
            
            const point1 = projectPoint(x1, y1, z1);
            const point2 = projectPoint(x2, y1, z2);

            // 繪製螺旋骨架
            if (i > 0) {
                const prevAngle = time + (i - 1) / dnaParams.segments * Math.PI * 4;
                const prevX1 = Math.cos(prevAngle) * dnaControl.radius;
                const prevY1 = (i - 1) * dnaParams.verticalSpacing - dnaParams.segments * dnaParams.verticalSpacing / 2;
                const prevZ1 = Math.sin(prevAngle) * dnaControl.radius;
                
                const prevX2 = Math.cos(prevAngle + Math.PI) * dnaControl.radius;
                const prevZ2 = Math.sin(prevAngle + Math.PI) * dnaControl.radius;
                
                const prevPoint1 = projectPoint(prevX1, prevY1, prevZ1);
                const prevPoint2 = projectPoint(prevX2, prevY1, prevZ2);

                // 繪製螺旋骨架
                drawConnection(prevPoint1, point1, '#4a90e2', 3);
                drawConnection(prevPoint2, point2, '#e24a4a', 3);
            }

            // 每隔一定距離繪製鹼基對連接
            if (i % 4 === 0) {
                const depth = Math.sin(angle) * 0.5 + 0.5; // 用於控制連接線的透明度
                const connectionColor = `rgba(200, 200, 200, ${depth})`;
                drawConnection(point1, point2, connectionColor, 2);
            }
        }

        requestAnimationFrame(drawDNA);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    requestAnimationFrame(drawDNA);
});