export default class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: BlobPart[] = [];
  private stream: MediaStream | null = null;
  private maxDuration: number = 60000; // 最大录制时间（毫秒）
  private autoStopTimer: number | null = null;
  private recordingStartTime: number = 0;
  private recordingDuration: number = 0;
  private durationUpdateCallback: ((duration: number) => void) | null = null;
  private durationUpdateInterval: number | null = null;

  // 设置录音时长更新回调
  setDurationUpdateCallback(callback: (duration: number) => void) {
    this.durationUpdateCallback = callback;
  }

  // 获取当前录音时长（秒）
  getCurrentDuration(): number {
    if (!this.recordingStartTime) return 0;
    return Math.floor((Date.now() - this.recordingStartTime) / 1000);
  }

  // 开始录制（返回 Promise，成功时 resolve true）
  async startRecording() {
    try {
      // 检查浏览器支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('浏览器不支持录音功能');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.start();
      this.recordingStartTime = Date.now();
      
      // 设置自动停止计时器（最长录制时间）
      this.autoStopTimer = setTimeout(() => {
        if (this.isRecording()) {
          console.log('达到最大录制时间，自动停止');
          this.stopRecording();
        }
      }, this.maxDuration);

      // 设置时长更新定时器
      if (this.durationUpdateCallback) {
        this.durationUpdateInterval = setInterval(() => {
          const duration = this.getCurrentDuration();
          this.durationUpdateCallback!(duration);
        }, 1000) as unknown as number;
      }
      
      return true;
    } catch (error) {
      console.error('获取麦克风权限失败:', error);
      // 提供更详细的错误信息
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          throw new Error('麦克风权限被拒绝，请允许浏览器使用麦克风');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          throw new Error('未找到麦克风设备，请检查设备连接');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          throw new Error('麦克风设备无法使用，可能被其他应用占用');
        } else if (error.name === 'OverconstrainedError') {
          throw new Error('麦克风设备不满足要求');
        } else if (error.name === 'TypeError') {
          throw new Error('无效的音频约束条件');
        }
      }
      return false;
    }
  }

  // 停止录制并返回音频 Blob
  stopRecording() {
    return new Promise<Blob>((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
        resolve(new Blob());
        return;
      }
      
      this.mediaRecorder.onstop = () => {
        // 计算录音时长
        this.recordingDuration = Date.now() - this.recordingStartTime;
        
        // 创建音频 Blob
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.audioChunks = [];
        
        // 清除时长更新定时器
        if (this.durationUpdateInterval) {
          clearInterval(this.durationUpdateInterval);
          this.durationUpdateInterval = null;
        }
        
        resolve(audioBlob);
      };
      
      // 清除自动停止计时器
      if (this.autoStopTimer) {
        clearTimeout(this.autoStopTimer);
        this.autoStopTimer = null;
      }
      
      // 停止录制和流
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      this.mediaRecorder.stop();
    });
  }

  // 检查是否正在录制
  isRecording() {
    return this.mediaRecorder?.state === 'recording';
  }
  
  // 获取录音时长（毫秒）
  getRecordingDuration() {
    return this.recordingDuration;
  }
  
  // 压缩音频文件（如果大于指定大小）
  async compressAudioIfNeeded(audioBlob: Blob, maxSizeInBytes: number = 1024 * 1024) {
    if (audioBlob.size <= maxSizeInBytes) {
      return audioBlob; // 如果文件小于最大大小，直接返回
    }
    
    // 这里可以实现音频压缩逻辑
    // 简单示例：降低采样率或比特率
    // 实际实现可能需要使用 Web Audio API 或第三方库
    
    // 返回压缩后的音频
    return audioBlob;
  }
}