let port;
let reader;
let waveControl = {
    amplitude: 100,  // 預設振幅
    speed: 0.02     // 預設速度
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
        
        // 開始讀取 Arduino 數據
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
            // 格式: "A:振幅,S:速度"
            const data = value.trim();
            const pairs = data.split(',');
            pairs.forEach(pair => {
                const [key, val] = pair.split(':');
                if (key === 'A') {
                    waveControl.amplitude = parseFloat(val);
                } else if (key === 'S') {
                    waveControl.speed = parseFloat(val) * 0.001; // 轉換為適當的速度範圍
                }
            });
        } catch (error) {
            console.error('讀取錯誤:', error);
            break;
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('波浪動畫已載入！');
    
    // 設置連接按鈕事件
    document.getElementById('connectButton').addEventListener('click', connectToArduino);
    
    // 建立 canvas 元素並插入 body
    let canvas = document.getElementById('waveCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'waveCanvas';
        document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    const verticalCenter = window.innerHeight * 0.5;
    
    // 波形基本參數
    const waveParams = {
        frequency: 0.002,
        phase: 0,
        horizontalSpeed: 1
    };
    
    // 時間變數
    let time = 0;
    let horizontalOffset = 0;
    let previousWavePoints = [];
    const extensionFactor = 0.3;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        previousWavePoints = Array(Math.ceil(canvas.width * (1 + extensionFactor * 2))).fill(verticalCenter);
    }

    function drawSmoothWave(points) {
        if (points.length < 2) return;
        
        const startX = -canvas.width * extensionFactor;
        
        ctx.beginPath();
        ctx.moveTo(startX, points[0]);
        
        for (let i = 1; i < points.length; i++) {
            const x = startX + i;
            ctx.lineTo(x, points[i]);
        }
        
        ctx.stroke();
    }
    
    function generateWavePoint(x, time, offset) {
        const adjustedX = x + offset;
        
        // 使用感測器值控制波浪高度和速度
        return Math.sin(
            adjustedX * waveParams.frequency + 
            time * waveControl.speed + 
            waveParams.phase
        ) * waveControl.amplitude;
    }

    function drawWave() {
        time += 0.01;
        horizontalOffset += waveParams.horizontalSpeed;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const totalWidth = Math.ceil(canvas.width * (1 + extensionFactor * 2));
        const currentWavePoints = [];
        
        for (let i = 0; i < totalWidth; i++) {
            const x = i;
            const waveValue = generateWavePoint(x, time, horizontalOffset);
            let y = verticalCenter + waveValue;
            
            if (previousWavePoints[i]) {
                y = previousWavePoints[i] * 0.85 + y * 0.15;
            }
            
            currentWavePoints[i] = y;
        }

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 0.5;
        drawSmoothWave(currentWavePoints);
        
        previousWavePoints = [...currentWavePoints];
        requestAnimationFrame(drawWave);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    requestAnimationFrame(drawWave);
});