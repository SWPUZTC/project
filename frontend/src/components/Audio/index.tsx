import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  PlayCircleOutlined,
  PauseCircleOutlined, 
} from "@ant-design/icons";

interface Src {
  src: string;
}

const Audio: React.FC<Src> = (props) => {
  const AudioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [play, setPlay] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0); // 存储总时长 (秒)
  const [currentTime, setCurrentTime] = useState<number>(0); // 存储当前播放时间 (秒)
  const audioBufferRef = useRef<AudioBuffer | null>(null); // 使用 ref 存储 audioBuffer
  // 定义波形图的颜色
  const playedColor = '#fff'; // 已播放部分的颜色 (白色)
  const defaultColor = '#ccc'; // 未播放部分的颜色 (灰色)
  // 将 Base64 数据转换为 Blob
  const base64ToBlob = (base64Data: string) => {
    const base64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'audio/mpeg';
    return new Blob([array], { type: mimeType });
  };


  // 绘制波形图 (带进度颜色)
  // 使用 useCallback 避免不必要的重渲染，并确保依赖正确
  const drawWaveform = useCallback((currentPlayTime: number) => {
    const canvas = canvasRef.current;
    const audioBuffer = audioBufferRef.current; // 从 ref 获取 audioBuffer
    if (!canvas || !audioBuffer) return;
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) return;
    const channelData = audioBuffer.getChannelData(0);
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = 2;
    const barGap = 3;
    const totalBarWidth = barWidth + barGap;
    const centerY = canvas.height / 2;
    const numBars = Math.floor(canvas.width / totalBarWidth);
    const samplesPerBar = Math.floor(channelData.length / numBars);
    const minHeight = 2;
    const maxHeightRatio = 0.9;
    const sensitivity = 50; 
    let x = 0;
    // 计算当前播放时间对应的 Canvas X 坐标边界
    // totalDuration 是 audioBuffer.duration
    // currentPlayTime 是当前的播放时间
    const progressX = (currentPlayTime / audioBuffer.duration) * canvas.width;
    for (let i = 0; i < numBars; i++) {
        const startSample = i * samplesPerBar;
        const endSample = Math.min(channelData.length, (i + 1) * samplesPerBar);
        let maxAmplitude = 0;
        for (let j = startSample; j < endSample; j++) {
            maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[j]));
        }
        let normalizedAmplitude;
        if (maxAmplitude > 0) {
            normalizedAmplitude = Math.log10(1 + sensitivity * maxAmplitude) / Math.log10(1 + sensitivity);
        } else {
            normalizedAmplitude = 0;
        }
        let barTotalHeight = normalizedAmplitude * canvas.height * maxHeightRatio;
        barTotalHeight = Math.max(minHeight, barTotalHeight);
        const barHalfHeight = barTotalHeight / 2;
        const y = centerY - barHalfHeight;
        // 根据当前条形的 x 坐标和播放进度来设置颜色
        if (x + barWidth < progressX) {
            canvasContext.fillStyle = playedColor; // 已播放部分
        } else {
            canvasContext.fillStyle = defaultColor; // 未播放部分
        }

        canvasContext.fillRect(x, y, barWidth, barTotalHeight);
        x += totalBarWidth;
    }
  }, []); // useCallback 的依赖列表为空，因为内部的 audioBuffer 是通过 ref 访问的

  // 加载、解码并初始化音频
  const loadAudioData = useCallback(async () => {
    if (!props.src) return;
    // 初始化 AudioContext (如果需要的话，但这里主要用 audio 标签播放)
    const audioCtx = new (window.AudioContext)();
    const recordedBlob = base64ToBlob(props.src);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        audioBufferRef.current = decodedBuffer; // 将解码后的 audioBuffer 存储到 ref

        setDuration(decodedBuffer.duration); // 设置总时长

        // 首次绘制波形图 (无播放进度)
        drawWaveform(0); 
        // 为 <audio> 标签创建 Object URL
        const audioUrl = URL.createObjectURL(recordedBlob);
        if (AudioRef.current) {
          AudioRef.current.src = audioUrl;
          AudioRef.current.load(); // 触发加载，以便获取 duration 等元数据
        }
        // 监听 <audio> 标签的 ended 事件，释放 Blob URL
        AudioRef.current?.addEventListener('ended', () => {
            URL.revokeObjectURL(audioUrl);
            setPlay(false);
            setCurrentTime(0);
            drawWaveform(0); // 播放结束，重绘波形图为初始状态
        }, { once: true });
      };
      reader.onerror = (e) => {
        console.error("FileReader error:", e);
      };
      reader.readAsArrayBuffer(recordedBlob);
    } catch (error) {
      console.error("Error loading or decoding audio:", error);
    }
  }, [props.src, drawWaveform]); // 依赖 props.src 和 drawWaveform

  // useEffect 钩子用于在组件挂载时加载音频
  useEffect(() => {
    loadAudioData();
    // 清理函数：组件卸载时停止播放并清理资源
    return () => {
      if (AudioRef.current) {
        AudioRef.current.pause();
        // 移除所有事件监听器，避免内存泄漏，特别是 timeupdate 这种频繁触发的
        AudioRef.current.removeEventListener('timeupdate', updateCurrentTime);
        AudioRef.current.removeEventListener('ended', handleAudioEnded); // 假设您有这些事件
        AudioRef.current.src = ''; 
      }
      // AudioContext 可以在组件卸载时关闭，如果它只在这个组件中使用
      // if (audioContext) { audioContext.close(); } // 如果不再使用 Web Audio API 播放，可以不关闭
    };
  }, [loadAudioData]);

  // 监听 <audio> 元素的 timeupdate 事件来更新当前播放时间并重绘波形图
  const updateCurrentTime = useCallback(() => {
    if (AudioRef.current && audioBufferRef.current) {
        // 使用 Math.round 或 Math.floor 防止小数点过多
        const newCurrentTime = AudioRef.current.currentTime;
        setCurrentTime(newCurrentTime);
        // 在 timeupdate 时重绘波形图以更新颜色
        drawWaveform(newCurrentTime); 
    }
  }, [drawWaveform]);

  const handleAudioEnded = useCallback(() => {
    setPlay(false);
    setCurrentTime(0);
    drawWaveform(0); // 播放结束，重绘波形图为初始状态
  }, [drawWaveform]);


  useEffect(() => {
    const audioElement = AudioRef.current;
    if (!audioElement) return;
    // 确保只添加一次事件监听器
    audioElement.addEventListener('timeupdate', updateCurrentTime);
    audioElement.addEventListener('ended', handleAudioEnded); // 监听播放结束事件
    // 在 loadedmetadata 时获取总时长，这发生在 <audio> 标签的元数据加载完成时
    const handleLoadedMetadata = () => {
        if (!isNaN(audioElement.duration) && isFinite(audioElement.duration)) {
            setDuration(audioElement.duration); // 确保是整数秒
        }
    };
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audioElement.removeEventListener('timeupdate', updateCurrentTime);
      audioElement.removeEventListener('ended', handleAudioEnded);
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [updateCurrentTime, handleAudioEnded]); // 依赖回调函数本身，而不是内部的状态

  // 播放/暂停逻辑
  const handlePlayPause = () => {
    if (AudioRef.current) {
      if (play) {
        AudioRef.current.pause();
      } else {
        AudioRef.current.play();
      }
      setPlay(!play);
    }
  };

  return (
    <>
      <div className="bg-blue-500 text-white flex gap-2 rounded-md shadow-md p-2 items-center">
        {play ? (
          <PauseCircleOutlined 
            onClick={handlePlayPause}
            className="text-lg cursor-pointer"
          />
        ) : (
          <PlayCircleOutlined 
            className="text-lg cursor-pointer"
            onClick={handlePlayPause}
          />
        )}
        <audio ref={AudioRef} className="hidden" /> 
        <canvas ref={canvasRef} width={100} height={20} className="block bg-transparent"></canvas> 
        <span>
          {
            play ? `${parseInt(currentTime.toString())}` : `${parseInt(duration.toString())}` 
          }
        </span>
      </div> 
    </>
  );
};

export default Audio;