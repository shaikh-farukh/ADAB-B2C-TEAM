import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to manage Web Speech API speech-to-text recognition
 * with auto-locale mapping for English, Hindi, and Gujarati.
 */
export function useSpeechRecognition({ language = 'en', onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      // Map app language to speech-to-text locale
      const localeMap = {
        en: 'en-IN',
        hi: 'hi-IN',
        gu: 'gu-IN'
      };
      recognition.lang = localeMap[language] || 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
      };
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript && typeof onTranscript === 'function') {
          onTranscript(transcript);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [language, onTranscript]);

  const toggleSpeech = useCallback(() => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Speech start error:', err);
      }
    }
  }, [isListening]);

  return {
    isListening,
    toggleSpeech,
    isSupported: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  };
}
