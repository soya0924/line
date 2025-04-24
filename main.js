let port;
let reader;
let waveControls = Array(6).fill().map((_, i) => ({
    amplitude: 100 + i * 10,  // 每條線的預設振幅稍有不同
    speed: 0.02 + i * 0.005   // 每條線的預設速度稍有不同
}));

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
            // 格式: "A1:值,S1:值,A2:值,S2:值,..."
            const data = value.trim();
            const pairs = data.split(',');
            pairs.forEach(pair => {
                const [key, val] = pair.split(':');
                const lineIndex = parseInt(key.slice(1)) - 1;
                const paramType = key.charAt(0);
                if (paramType === 'A') {
                    waveControls[lineIndex].amplitude = parseFloat(val);
                } else if (paramType === 'S') {
                    waveControls[lineIndex].speed = parseFloat(val) * 0.001;
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
    const verticalSpacing = window.innerHeight / 7; // 將畫面分成7等分，留出空間
    
    // 波形基本參數
    const waveParams = {
        frequency: 0.002,
        phase: 0,
        horizontalSpeed: 1
    };
    
    // 時間變數
    let time = 0;
    let horizontalOffset = 0;
    let previousWavePoints = Array(6).fill().map(() => []);
    const extensionFactor = 0.3;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // 重設每條線的前一幀波形
        previousWavePoints = Array(6).fill().map(() => 
            Array(Math.ceil(canvas.width * (1 + extensionFactor * 2))).fill(0)
        );
    }

    function drawSmoothWave(points, verticalCenter, color) {
        if (points.length < 2) return;
        
        const startX = -canvas.width * extensionFactor;
        
        ctx.beginPath();
        ctx.moveTo(startX, points[0]);
        
        for (let i = 1; i < points.length; i++) {
            const x = startX + i;
            ctx.lineTo(x, points[i]);
        }
        
        ctx.strokeStyle = color;
        ctx.stroke();
    }
    
    function generateWavePoint(x, time, offset, control, verticalCenter) {
        const adjustedX = x + offset;
        
        return verticalCenter + Math.sin(
            adjustedX * waveParams.frequency + 
            time * control.speed + 
            waveParams.phase
        ) * control.amplitude;
    }

    function drawWave() {
        time += 0.01;
        horizontalOffset += waveParams.horizontalSpeed;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 繪製每條波浪線
        waveControls.forEach((control, index) => {
            const verticalCenter = verticalSpacing * (index + 1);
            const totalWidth = Math.ceil(canvas.width * (1 + extensionFactor * 2));
            const currentWavePoints = [];
            
            // 生成當前波形的點
            for (let i = 0; i < totalWidth; i++) {
                const x = i;
                let y = generateWavePoint(x, time, horizontalOffset, control, verticalCenter);
                
                // 與前一幀進行平滑過渡
                if (previousWavePoints[index][i] !== undefined) {
                    y = previousWavePoints[index][i] * 0.85 + y * 0.15;
                }
                
                currentWavePoints[i] = y;
            }

            // 為每條線設定不同的顏色
            const colors = [
                'rgba(0, 0, 0, 0.8)',
                'rgba(50, 50, 50, 0.8)',
                'rgba(100, 100, 100, 0.8)',
                'rgba(150, 150, 150, 0.8)',
                'rgba(200, 200, 200, 0.8)',
                'rgba(250, 250, 250, 0.8)'
            ];
            
            ctx.lineWidth = 0.5;
            drawSmoothWave(currentWavePoints, verticalCenter, colors[index]);
            
            // 保存當前波形作為下一幀的前一幀
            previousWavePoints[index] = [...currentWavePoints];
        });
        
        requestAnimationFrame(drawWave);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    requestAnimationFrame(drawWave);
});