// EmotionDetector.jsx
import React, { useRef, useEffect } from 'react';
import Webcam from 'react-webcam';

const videoConstraints = {
  facingMode: 'user',
};

const EmotionDetector = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const drawBox = (ctx, x, y, w, h, label, confidence) => {
    ctx.strokeStyle = 'lime';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.font = '16px Arial';
    ctx.fillStyle = 'lime';
    ctx.fillText(`${label} (${(confidence * 100).toFixed(1)}%)`, x, y - 10);
  };

  const detectEmotion = async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    try {
      const response = await fetch('http://127.0.0.1:5000/detect_emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageSrc }),
      });

      const data = await response.json();
      console.log('Response:', data);

      if (Array.isArray(data) && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        data.forEach(({ box, emotion, confidence }) => {
          if (box && emotion) {
            const { x, y, w, h } = box;
            drawBox(ctx, x, y, w, h, emotion, confidence);
          }
        });
      }
    } catch (err) {
      console.error('Error detecting emotion:', err);
    }
  };

  useEffect(() => {
    const interval = setInterval(detectEmotion, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      />
    </div>
  );
};

export default EmotionDetector;
