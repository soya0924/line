// 定義腳位
const int AMPLITUDE_PIN = A0;    // 控制螺旋振幅的可調式電阻
const int TRIG_PIN = 9;         // 超音波感測器 Trig 腳位
const int ECHO_PIN = 10;        // 超音波感測器 Echo 腳位

void setup() {
  Serial.begin(9600);           // 初始化串口通訊
  pinMode(TRIG_PIN, OUTPUT);    // 設定超音波感測器的 Trig 腳位為輸出
  pinMode(ECHO_PIN, INPUT);     // 設定超音波感測器的 Echo 腳位為輸入
}

void loop() {
  // 讀取可調式電阻值（振幅）
  int amplitudeValue = analogRead(AMPLITUDE_PIN);
  
  // 讀取超音波感測器的距離
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // 計算距離（以公分為單位）
  long duration = pulseIn(ECHO_PIN, HIGH);
  int distance = duration * 0.034 / 2;
  
  // 確保距離在有效範圍內（2-200公分）
  distance = constrain(distance, 2, 200);
  
  // 將振幅值映射到適當範圍（30-150）- DNA 螺旋的半徑
  int radius = map(amplitudeValue, 0, 1023, 30, 150);
  
  // 將距離映射到旋轉速度範圍（1-20）
  int rotationSpeed = map(distance, 2, 200, 20, 1);
  
  // 發送數據
  // 格式：R:半徑,S:旋轉速度
  Serial.print("R:");
  Serial.print(radius);
  Serial.print(",S:");
  Serial.println(rotationSpeed);
  
  // 延遲一小段時間以避免數據發送過快
  delay(50);
}