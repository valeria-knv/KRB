"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Save, Upload, Square } from "lucide-react";
import { useLanguage } from "../../contexts/language-context"
import { useAuth } from "../../contexts/auth-context"
import {
  RecorderContainer,
  RecorderCard,
  IconButton,
  TranscriptBox,
  Placeholder,
  CharCount,
  ButtonGroup,
  Button,
  ModalOverlay,
  ModalContent,
  ModalButton,
  RecordingIndicator,
} from './styles';

interface TranscriptionData {
  text: string;
  speakers_text?: string;
  speakers?: Record<string, Array<{start: number; end: number; text: string}>>;
}

const Recorder: React.FC = () => {
  const { t } = useLanguage()
  const { user, token } = useAuth()
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionData>({text: ""});
  const [hasScroll, setHasScroll] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const transcriptBoxRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const checkScroll = useCallback(() => {
    if (transcriptBoxRef.current) {
      setHasScroll(
        transcriptBoxRef.current.scrollHeight > transcriptBoxRef.current.clientHeight
      );
    }
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, transcription]);

  useEffect(() => {
    console.log("Auth state:", { user, token: token ? "present" : "missing" })
    if (!user || !token) {
      console.warn("User not authenticated")
    }
  }, [user, token])

  const handleReset = () => {
    setTranscription({text: ""});
    setUploadedFileName(null);
    setUploadedFile(null);
    setRecordedAudio(null);
    setIsRecording(false);
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedAudio(audioBlob);
        
        const audioFile = new File([audioBlob], `recording_${Date.now()}.wav`, { type: 'audio/wav' });
        setUploadedFile(audioFile);
        setUploadedFileName(audioFile.name);
        setTranscription({text: ""});
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert(t("alert.microphoneError"));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setUploadedFileName(file.name);
      setTranscription({text: ""});
      setRecordedAudio(null);
    }
  };

  const handleTranscribe = async () => {
    if (!user || !token) {
      alert(t("auth.loginRequired") || "Please log in to transcribe files")
      return
    }

    if (!uploadedFile) {
      alert(t("alert.uploadFileFirst"));
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", uploadedFile);
    
    try {
      const response = await fetch("http://localhost:5070/upload", {
        method: "POST",
        body: formData,
        headers: {
          // 'Accept': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("alert.transcriptionFailed"));
      }

      const uploadData = await response.json();
      const transcriptionUuid = uploadData.uuid;

      // Перевіряємо статус транскрипції кожні 2 секунди
      const checkStatus = async () => {
        try {
          const statusResponse = await fetch(`http://localhost:5070/status/${transcriptionUuid}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const statusData = await statusResponse.json();

          if (statusData.status === 'completed') {
            setTranscription({
              text: statusData.text,
              speakers_text: statusData.speakers_text,
              speakers: statusData.speakers
            });
            setLoading(false);
          } else if (statusData.status === 'failed') {
            throw new Error("Transcription failed");
          } else {
            // Продовжуємо перевіряти статус
            setTimeout(checkStatus, 2000);
          }
        } catch (error) {
          console.error("Status check error:", error);
          setLoading(false);
          alert("Error checking transcription status");
        }
      };

      // Починаємо перевіряти статус
      setTimeout(checkStatus, 2000);

    } catch (error) {
      console.error("Transcription error:", error);
      setLoading(false);
      alert("Transcription failed");
    }
  };

  const downloadFile = (format: 'txt' | 'json') => {
    if (!transcription.text && !transcription.speakers_text) {
      alert(t("alert.noDataToDownload"));
      return;
    }

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'txt') {
      content = transcription.speakers_text || transcription.text;
      filename = `transcription_${Date.now()}.txt`;
      mimeType = 'text/plain';
    } else {
      content = JSON.stringify(transcription, null, 2);
      filename = `transcription_${Date.now()}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setShowDownloadModal(false);
  };

  const handleDownloadClick = () => {
    if (!transcription.text && !transcription.speakers_text) {
      alert(t("alert.noDataToDownload"));
      return;
    }
    setShowDownloadModal(true);
  };

  const renderTranscription = () => {
    if (transcription.speakers_text) {
      return (
        <div style={{ 
          whiteSpace: 'pre-wrap', 
          textAlign: 'left',
          fontFamily: 'monospace',
          fontSize: '0.95rem'
        }}>
          {transcription.speakers_text.split('\n').map((line, i) => {
              if (line.startsWith('===')) {
                  return (
                      <div key={i} style={{ 
                          fontWeight: 'bold', 
                          margin: '15px 0 5px',
                          color: '#4a6baf',
                          fontSize: '1.05em'
                      }}>
                          {line}
                      </div>
                  );
              }
              return <div key={i}>{line}</div>;
          })}
        </div>
      );
    }
    if (transcription.text) {
      return (
        <div style={{ fontSize: '0.95rem' }}>
          {transcription.text}
        </div>
      );
    }
    if (uploadedFileName) {
      return uploadedFileName;
    }
    return t("recorder.placeholder");
  };

  const hasTranscriptionText = !!(transcription.text || transcription.speakers_text);
  
  if (!user) {
    return (
      <RecorderContainer>
        <RecorderCard>
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <h3>{t("auth.loginRequired") || "Please log in to use transcription"}</h3>
            <p>{t("auth.loginToTranscribe") || "You need to be logged in to transcribe audio files."}</p>
          </div>
        </RecorderCard>
      </RecorderContainer>
    )
  }

  return (
    <RecorderContainer>
      <RecorderCard>
        <IconButton top onClick={handleDownloadClick}>
          <Save />
        </IconButton>

        <TranscriptBox ref={transcriptBoxRef}>
          <Placeholder 
            hasText={hasTranscriptionText || !!uploadedFileName}
            isPlaceholder={!hasTranscriptionText}
          >
          {renderTranscription()}
          </Placeholder>
        </TranscriptBox>

        <CharCount>
          {t("recorder.characterCount")}: {transcription.text?.length || 0}
        </CharCount>

        <ButtonGroup>
          <Button variant="main" onClick={handleTranscribe} disabled={loading}>
            {loading ? t("recorder.transcribing") : t("recorder.transcribe")}
          </Button>
        </ButtonGroup>

        <ButtonGroup>
          <label htmlFor="audio-upload" style={{ flex: 1 }}>
            <Button as="span" variant="upload" style={{ width: "100%" }}>
              <Upload style={{ marginRight: "0.5rem" }} />
              {t("recorder.uploadFile")}
            </Button>
          </label>
          <input
            type="file"
            accept="audio/*"
            id="audio-upload"
            style={{ display: "none" }}
            onChange={handleUpload}
          />
          <Button 
            variant={isRecording ? "recording" : "main"} 
            style={{ flex: 1, position: 'relative' }} 
            onClick={handleRecordingToggle}
          >
            {isRecording ? <Square /> : <Mic />}
            {isRecording ? t("recorder.stopRecording") : t("recorder.startRecording")}
            {isRecording && <RecordingIndicator />}
          </Button>
        </ButtonGroup>

        <ButtonGroup>
          <Button 
            variant="secondary" 
            style={{ width: "100%" }} 
            onClick={handleReset}
          >
            {t("recorder.reset")}
          </Button>
        </ButtonGroup>
      </RecorderCard>

      {showDownloadModal && (
        <ModalOverlay onClick={() => setShowDownloadModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <h3>{t("download.title")}</h3>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <ModalButton onClick={() => downloadFile("txt")}>
              {t("download.txt")}
            </ModalButton>
            <ModalButton onClick={() => downloadFile("json")}>
              {t("download.json")}
            </ModalButton>
            </div>
            <ModalButton 
              variant="secondary" 
              onClick={() => setShowDownloadModal(false)}
              style={{ marginTop: '1rem', width: '100%' }}
            >
              {t("download.cancel")}
            </ModalButton>
          </ModalContent>
        </ModalOverlay>
      )}
    </RecorderContainer>
  );
};

export default Recorder;
