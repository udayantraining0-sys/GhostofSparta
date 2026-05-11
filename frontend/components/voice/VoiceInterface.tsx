'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Settings } from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';
import { useCoreStore } from '@/stores/coreStore';

export default function VoiceInterface() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [wakeWord, setWakeWord] = useState('Hey Kratos');
  const [showSettings, setShowSettings] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const { setState, state } = useCoreStore();

  const WAKE_WORDS = ['Hey Kratos', 'Jarvis', 'Computer', 'Kratos'];

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        setTranscript('Voice capture complete.');
      };
      mediaRecorderRef.current.start(100);
      setIsListening(true);
      setState('speaking');
    } catch {
      setTranscript('Microphone access denied');
    }
  }, [setState]);

  const stopListening = useCallback(() => {
    mediaRecorderRef.current?.stop();
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    setIsListening(false);
    setState('idle');
  }, [setState]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      audioContextRef.current?.close();
    };
  }, []);

  return (
    <div className="flex items-center h-full gap-3">
      <div className="hidden md:flex items-center gap-2">
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: isListening ? '#00FFD1' : 'rgba(0,240,255,0.2)' }}
          animate={{ opacity: isListening ? [0.5, 1, 0.5] : 1, scale: isListening ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="text-[10px] text-white/20 font-mono uppercase">{wakeWord}</span>
      </div>

      <div className="w-32 h-8 md:w-40">
        <WaveformVisualizer
          isActive={isListening || isSpeaking}
          analyserNode={analyserRef.current}
          color={isSpeaking ? '#00FFD1' : '#00F0FF'}
        />
      </div>

      <button
        onClick={isListening ? stopListening : startListening}
        className={`p-2 rounded-lg transition-all ${
          isListening
            ? 'bg-red-500/10 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(255,0,0,0.1)]'
            : 'bg-neon-cyan/5 text-neon-cyan/60 hover:text-neon-cyan hover:bg-neon-cyan/10 border border-glass hover:border-neon-cyan/20'
        }`}
      >
        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>

      <AnimatePresence>
        {transcript && (
          <motion.div
            className="hidden md:block max-w-[200px]"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
          >
            <p className="text-[10px] text-white/40 truncate">{transcript}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 rounded-md hover:bg-white/5 text-white/15 hover:text-white/40"
        >
          <Settings size={12} />
        </button>
        <AnimatePresence>
          {showSettings && (
            <motion.div
              className="absolute bottom-full right-0 mb-2 w-48 glass-panel p-3 space-y-2 z-50"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <p className="text-[10px] text-white/30 font-mono uppercase">Wake Word</p>
              <div className="space-y-1">
                {WAKE_WORDS.map((word) => (
                  <button
                    key={word}
                    onClick={() => { setWakeWord(word); setShowSettings(false); }}
                    className={`w-full text-left px-2 py-1 rounded text-[11px] ${
                      wakeWord === word ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
