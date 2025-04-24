// 定義腳位
const int AMPLITUDE_PIN = A0;    // 控制波浪振幅的可調式電阻
const int TRIG_PIN = 9;         // 超音波感測器 Trig 腳位
const int ECHO_PIN = 10;        // 超音波感測器 Echo 腳位

// 平滑讀取相關變數
const int READ_SAMPLES = 5;     // 讀取樣本數
int lastAmplitudeValue = 0;     // 上次的振幅值
int smoothedAmplitude = 0;      // 平滑後的振幅值

void setup() {
  Serial.begin(9600);           // 初始化串口通訊
  pinMode(TRIG_PIN, OUTPUT);    // 設定超音波感測器的 Trig 腳位為輸出
  pinMode(ECHO_PIN, INPUT);     // 設定超音波感測器的 Echo 腳位為輸入
}

// 計算平均值的輔助函數
int calculateAverage(int samples[], int size) {
  long sum = 0;
  for(int i = 0; i < size; i++) {
    sum += samples[i];
  }
  return sum / size;
}

void loop() {
  // 讀取多個可調式電阻值樣本
  int amplitudeSamples[READ_SAMPLES];
  for(int i = 0; i < READ_SAMPLES; i++) {
    amplitudeSamples[i] = analogRead(AMPLITUDE_PIN);
    delayMicroseconds(100); // 非常短的延遲以確保穩定讀取
  }
  
  // 計算平均值
  int currentAmplitude = calculateAverage(amplitudeSamples, READ_SAMPLES);
  
  // 使用簡單的低通濾波器進行平滑處理
  smoothedAmplitude = (currentAmplitude + smoothedAmplitude * 3) / 4;
  
  // 讀取超音波感測器的距離
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // 計算距離（以公分為單位）
  long duration = pulseIn(ECHO_PIN, HIGH);
  int distance = duration * 0.034 / 2;
  distance = constrain(distance, 2, 200);
  
  // 將平滑後的振幅值映射到適當範圍（30-200）
  int waveAmplitude = map(smoothedAmplitude, 0, 1023, 30, 200);
  
  // 將距離映射到速度範圍（1-80）
  int waveSpeed = map(distance, 2, 200, 80, 1);
  
  // 只有當值有明顯變化時才發送數據
  if(abs(waveAmplitude - lastAmplitudeValue) > 2) {
    Serial.print("R:");
    Serial.print(waveAmplitude);
    Serial.print(",S:");
    Serial.println(waveSpeed);
    lastAmplitudeValue = waveAmplitude;
  }
  
  delay(15);  // 稍微減少延遲時間，但保持適度的更新頻率
}