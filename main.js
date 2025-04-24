let port;
let reader;
let waveControl = {
    amplitude: 100,    // 波浪振幅
    speed: 0.05,      // 波動速度
    targetAmplitude: 100,  // 目標振幅值
    targetSpeed: 0.05,    // 目標速度值
    smoothingFactor: 0.15  // 平滑因子
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
            const data = value.trim();
            const pairs = data.split(',');
            pairs.forEach(pair => {
                const [key, val] = pair.split(':');
                if (key === 'R') {
                    // 設置目標值而不是直接改變
                    waveControl.targetAmplitude = parseFloat(val);
                } else if (key === 'S') {
                    // 設置目標值而不是直接改變
                    waveControl.targetSpeed = parseFloat(val) * 0.01;
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
    
    document.getElementById('connectButton').addEventListener('click', connectToArduino);
    
    let canvas = document.getElementById('waveCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'waveCanvas';
        document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    let time = 0;
    
    // 波浪參數
    const waveParams = {
        points: 200,          // 每條波浪線的點數
        layers: 30,          // 螺旋的層數
        verticalSpacing: 3,  // 增加層與層之間的垂直間距
        frequency: 0.03      // 增加波浪頻率
    };

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function drawWaveSpiral(centerX, centerY) {
        // 螺旋的總高度
        const totalHeight = waveParams.layers * waveParams.verticalSpacing;
        const startY = centerY - totalHeight / 2;

        // 為每一層繪製波浪
        for (let layer = 0; layer < waveParams.layers; layer++) {
            ctx.beginPath();
            
            // 計算這一層的顏色（從上到下由黑變白）
            const brightness = Math.round((layer / waveParams.layers) * 100);
            const alpha = 1 - (layer / waveParams.layers) * 0.5;
            ctx.strokeStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${alpha})`;
            ctx.lineWidth = 1;
            
            // 波浪的垂直位置，加入螺旋效果
            const angle = (layer / waveParams.layers) * Math.PI * 2 + time * waveControl.speed;
            const spiralRadius = 20 * (1 - layer / waveParams.layers); // 螺旋半徑隨層數變化
            const baseY = startY + layer * waveParams.verticalSpacing;
            
            // 繪製波浪
            for (let i = 0; i < waveParams.points; i++) {
                const x = (i / waveParams.points) * canvas.width;
                
                // 計算 y 值（組合多個正弦波和螺旋效果）
                const waveY = 
                    Math.sin(x * waveParams.frequency + time * waveControl.speed * 2) * waveControl.amplitude * 0.5 +
                    Math.sin(x * waveParams.frequency * 2 + time * waveControl.speed * 3) * waveControl.amplitude * 0.25;
                
                const spiralY = baseY + Math.sin(angle + x * 0.01) * spiralRadius;
                const y = spiralY + waveY;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
        }
    }

    function updateControlValues() {
        // 平滑過渡到目標值
        waveControl.amplitude += (waveControl.targetAmplitude - waveControl.amplitude) * waveControl.smoothingFactor;
        waveControl.speed += (waveControl.targetSpeed - waveControl.speed) * waveControl.smoothingFactor;
    }

    function animate() {
        updateControlValues(); // 更新控制值
        time += 0.04; // 增加時間步進值，使動畫更快
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawWaveSpiral(canvas.width / 2, canvas.height / 2);
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    requestAnimationFrame(animate);
});