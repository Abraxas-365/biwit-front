"use client";

import React, { useRef, useState } from "react";
import Head from "next/head";
import axios from "axios";

export default function Home() {
  const [transcription, setTranscription] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [presignedUrlData, setPresignedUrlData] = useState<{
    presignedUrl: string;
    fileHttpUrl: string;
  } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [textOutput, setTextOutput] = useState("");

  const record = async () => {
    if (isRecording) {
      console.log("Already recording");
      return;
    }

    try {
      const response = await axios.get(
        "https://nnyg9psc41.execute-api.us-east-1.amazonaws.com/default/aiudoPresignesUrl",
      );
      setPresignedUrlData(response.data);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setTranscription("<i>Grabando...</i>");
    } catch (error) {
      console.error("Error fetching presigned URL:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());

      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          await processAndUploadAudio(event.data);
        }
      };
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setTranscription("");
    }
  };

  const processAndUploadAudio = async (audioData: any) => {
    if (presignedUrlData) {
      try {
        await axios.put(presignedUrlData.presignedUrl, audioData, {
          headers: {
            "Content-Type": "audio/webm",
          },
        });
        console.log(
          "File uploaded successfully. Key:",
          presignedUrlData.fileHttpUrl,
        );

        const chatId = "your_chat_id"; // Replace with your chat ID
        const serverUrl = `http://localhost:3001/chat/${chatId}`;

        const response = await axios.post(serverUrl, {
          client_id: 1,
          path: presignedUrlData.fileHttpUrl,
        });

        const textToConvert = response.data.output;
        setTextOutput(textToConvert);
        await convertTextToSpeechAndPlay(textToConvert);
      } catch (error) {
        console.error("Error processing audio:", error);
      }
    }
  };

  const convertTextToSpeechAndPlay = async (text: any) => {
    try {
      const response = await axios.post("/api/text-to-speech", {
        message: text,
        voice: "Wci5PWo4vgC6A0DlQQyI",
      });

      if (!response.data.file) {
        throw new Error("No audio file returned");
      }

      playAudio(`/audio/${response.data.file}`);
    } catch (error) {
      console.error("Error converting text to speech:", error);
    }
  };

  const playAudio = (filePath: any) => {
    const audio = new Audio(filePath);
    audio.play();
  };

  return (
    <div>
      <Head>
        <title>Recorder</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
      </Head>
      <div className="container">
        <div className="row mt-3 px-3">
          <div className="col-12 text-center">
            {isRecording ? (
              <button
                type="button"
                className="btn-record btn-record-red"
                onClick={stopRecording}
              >
                <img className="mic-img" src="/microphone.png" alt="Stop" />
              </button>
            ) : (
              <button
                type="button"
                className="btn-record btn-record-green"
                onClick={record}
              >
                <img className="mic-img" src="/microphone.png" alt="Record" />
              </button>
            )}
          </div>

          <div style={{ fontSize: "24px", marginTop: "10px" }}>
            {textOutput}
          </div>
          <div className="col-12 text-center mt-2">
            <div dangerouslySetInnerHTML={{ __html: transcription }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
