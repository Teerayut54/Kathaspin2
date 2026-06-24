import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useProjectStore } from '../store/projectStore';

export const useAudioSync = (containerRef: React.RefObject<HTMLDivElement | null>) => {
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  
  const setIsPlaying = useProjectStore(state => state.setIsPlaying);
  const setCurrentTime = useProjectStore(state => state.setCurrentTime);
  const sets = useProjectStore(state => state.data.sets);

  const lastTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  // คำนวณหาเวลารวมทั้งหมดของทุก Set ในโปรเจกต์ (วินาที)
  const getTotalDuration = useCallback(() => {
    return sets.reduce((sum, s) => sum + s.duration, 0);
  }, [sets]);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;
    
    wavesurfer.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4f46e5',
      progressColor: '#9333ea',
      cursorColor: 'transparent',
      cursorWidth: 0,
      height: 64,
      barWidth: 2,
      normalize: true,
      interact: false,
    });

    wavesurfer.current.on('ready', () => {
      setAudioDuration(wavesurfer.current?.getDuration() || 0);
    });

    wavesurfer.current.on('play', () => setIsPlaying(true));
    wavesurfer.current.on('pause', () => setIsPlaying(false));
    wavesurfer.current.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [containerRef, setIsPlaying, setCurrentTime]);

  // Sync wavesurfer with store currentTime when manually scrubbed
  useEffect(() => {
    const unsub = useProjectStore.subscribe((state, prevState) => {
      if (state.currentTime !== prevState.currentTime && !state.isPlaying && wavesurfer.current) {
        const wsTime = wavesurfer.current.getCurrentTime();
        if (Math.abs(wsTime - state.currentTime) > 0.05) {
           wavesurfer.current.setTime(state.currentTime);
        }
      }
    });
    return unsub;
  }, []);

  // Load Audio File
  useEffect(() => {
    if (audioFile && wavesurfer.current) {
      const url = URL.createObjectURL(audioFile);
      wavesurfer.current.load(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioFile]);

  // Unified Animation Loop (ทำงานร่วมกับระบบเสียง และจำลองเองเมื่อไม่มีเพลง)
  useEffect(() => {
    const loop = () => {
      const state = useProjectStore.getState();
      
      if (state.isPlaying) {
        if (audioFile && wavesurfer.current) {
          // โหมดที่ 1: ดึงเวลาตาม Audio จริง
          const time = wavesurfer.current.getCurrentTime();
          state.setCurrentTime(time);
        } else {
          // โหมดที่ 2: ไม่มีไฟล์เพลง คำนวณความต่างเวลา (Delta Time) ระบบคอมพิวเตอร์
          const now = performance.now();
          const delta = (now - lastTimeRef.current) / 1000; // มิลลิวินาที -> วินาที
          lastTimeRef.current = now;

          const nextTime = state.currentTime + delta;
          const totalMaxTime = getTotalDuration();

          if (nextTime >= totalMaxTime) {
            // จบโชว์ สั่งหยุดแอนิเมชันอัตโนมัติ
            state.setIsPlaying(false);
            state.setCurrentTime(0);
          } else {
            state.setCurrentTime(nextTime);
          }
        }
      }
      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [audioFile, getTotalDuration]);

  const togglePlay = () => {
    const state = useProjectStore.getState();
    if (state.isPlaying) {
      if (audioFile && wavesurfer.current) {
        wavesurfer.current.pause();
      } else {
        setIsPlaying(false);
      }
    } else {
      if (audioFile && wavesurfer.current) {
        wavesurfer.current.play();
      } else {
        lastTimeRef.current = performance.now();
        setIsPlaying(true);
      }
    }
  };
  
  const stop = () => {
    if (audioFile && wavesurfer.current) {
      wavesurfer.current.stop();
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // ล้างไฟล์เพลงและรีเซ็ตสถานะ
  const removeAudio = () => {
    if (wavesurfer.current) {
      wavesurfer.current.stop();
      wavesurfer.current.empty(); // ล้างรูปคลื่นเสียงออกจากหน้าจอ
    }
    setAudioFile(null); // ล้างไฟล์ใน React State
    useProjectStore.getState().setIsPlaying(false);
    useProjectStore.getState().setCurrentTime(0);
  };

  return { setAudioFile, removeAudio, togglePlay, stop, hasAudio: !!audioFile, audioDuration };
};
