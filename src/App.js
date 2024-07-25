import React, { useState, useRef, useEffect } from "react";
import Preloader from "./Preloader";
import axios from "axios";
import "./App.css";

const App = () => {
  const [response, setResponse] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPreloader, setShowPreloader] = useState(true);
  const [useCamera, setUseCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseCamera = async () => {
    setUseCamera(true);
    setSelectedFile(null);
    setPreviewUrl(null);

    try {
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: window.innerWidth },
          height: { ideal: window.innerHeight }
        }
      };

      const videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(videoStream);

      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      alert("Kameraya erişilemedi. Lütfen kamera izinlerini kontrol edin.");
    }
  };

  const handleCloseCamera = () => {
    setUseCamera(false);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
  };

  const handleCapture = () => {
    if (!videoRef.current) {
      console.error("Video reference is not defined.");
      return;
    }
    if (!canvasRef.current) {
      console.error("Canvas reference is not defined.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        console.error("Failed to create blob from canvas");
      }
    }, "image/jpeg");

    handleCloseCamera();
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      alert("Lütfen bir resim seçin.");
      return;
    }

    setLoading(true);

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onloadend = async () => {
      const base64Image = reader.result.split(",")[1];

      const img = new Image();
      img.src = reader.result;
      await new Promise(resolve => img.onload = resolve);

      try {
        const result = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`,
                    },
                  },
                  {
                    type: "text",
                    text: `Fotoğraftaki en iyi karpuzu seç ve konumunu belirt. Görüntü boyutları: ${img.naturalWidth}x${img.naturalHeight}

                    Önemli kurallar:
                    1. Görüntünün sol üst köşesi (0,0) kabul edilecek.
                    2. Koordinatları 'x,y' formatında ve tam sayı olarak ver (örnek: '150,200').
                    3. Koordinatlar, görüntünün orijinal boyutlarına göre (${img.naturalWidth}x${img.naturalHeight}) verilmelidir.
                    4. Koordinatları karpuzun merkezinde ver, köşesinde olmasın.
                    5. Nesnel ol. Aynı fotoğraf için her zaman aynı karpuzu seç.
                    6. En iyi karpuzu seçerken şekil, renk ve parlaklık gibi faktörleri göz önünde bulundur.
                    7. Seçtiğin karpuz hakkında güzel yorumlar yap ve esprisel olarak yaklaş al pişman olmazsın vb.

                    Yanıtını şu formatta ver:
                    Karpuzun Koordinatları: [X,Y]
                    Açıklama: [Karpuzun kalitesi hakkında kısa bir yorum]

                    Eğer fotoğrafta karpuz yoksa, 'Görsel de karpuz bulunamadı lütfen karpuz içeren bir fotoğraf ekleyiniz.' yaz.
                    Eğer Kavun varsa herhangi bir seçim yapma ve  'Bunun kavun olacağını anlayacak kadar zekiyim' yanıtını ver.`,
                  },
                ],
              },
            ],
            max_tokens: 500,
          },
          {
            headers: {
              Authorization: `Bearer YOUR_APİ_KEY`,
              "Content-Type": "application/json",
            },
          }
        );
        const responseData = result.data.choices[0].message.content;
        setResponse(responseData);
        speakResponse(responseData);
        highlightSelectedWatermelon(responseData);
      } catch (error) {
        console.error("Error fetching data: ", error);
        if (error.response) {
          console.error("Response data:", error.response.data);
          console.error("Response status:", error.response.status);
        }
        setResponse("Bir hata oluştu: " + error.message);
      } finally {
        setLoading(false);
      }
    };
  };

  const highlightSelectedWatermelon = (response) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = imageRef.current;

    if (canvas && ctx && img) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const coords = response.match(/(\d+)\s*,\s*(\d+)/);
      if (coords) {
        let x = parseInt(coords[1]);
        let y = parseInt(coords[2]);

        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        const scaleX = canvasWidth / imgWidth;
        const scaleY = canvasHeight / imgHeight;

        const scaledX = x * scaleX;
        const scaledY = y * scaleY;

        ctx.beginPath();
        ctx.arc(scaledX, scaledY, 20, 0, 2 * Math.PI);
        ctx.strokeStyle = "red";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(scaledX, scaledY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = "black";
        ctx.fill();

        console.log(`Orijinal koordinatlar: (${x}, ${y})`);
        console.log(`Ölçeklendirilmiş koordinatlar: (${scaledX}, ${scaledY})`);
        console.log(`Görüntü boyutları: ${imgWidth}x${imgHeight}`);
        console.log(`Canvas boyutları: ${canvasWidth}x${canvasHeight}`);
      } else {
        console.error("Koordinatlar bulunamadı veya geçersiz format.");
      }
    } else {
      console.error("Canvas or image reference is not defined.");
    }
  };

  const speakResponse = (text) => {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "tr-TR";
    window.speechSynthesis.speak(speech);
  };

  const handleAnimationEnd = () => {
    setShowPreloader(false);
  };

  const handleImageLoad = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (img && canvas) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  if (showPreloader) {
    return <Preloader onAnimationEnd={handleAnimationEnd} />;
  }

  return (
    <div className="container">
      <header>
        <h1>Karpuz Seçici</h1>
      </header>
      <main>
        <div className="upload-section">
        <button className="button file-button" onClick={() => document.getElementById('file-input').click()}>
            Karpuz Seç
          </button>
          <input
            type="file"
            id="file-input"
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: "none" }}
          />
          <button onClick={handleUseCamera} className="button camera-button">
            Karpuz Çek
          </button>
          <button onClick={handleSubmit} className="button analyze-button">
            Analiz Et
          </button>
        </div>
        {useCamera && (
          <div className="camera-section">
            <video ref={videoRef} className="camera-view" playsInline></video>
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            <div className="camera-controls">
              <button onClick={handleCapture} className="capture-button" aria-label="Fotoğraf Çek"></button>
              <button onClick={handleCloseCamera} className="close-camera-button">Kapat</button>
            </div>
          </div>
        )}
        {previewUrl && (
        <div 
          className={`image-preview ${isFullScreen ? 'fullscreen' : ''}`}
          onClick={toggleFullScreen}
        >
          <img
            ref={imageRef}
            src={previewUrl}
            alt="Seçilen ürün"
            style={{ display: "none" }}
            onLoad={handleImageLoad}
          />
          <canvas
            ref={canvasRef}
            style={{ maxWidth: "100%", height: "auto" }}
          />
          {isFullScreen && (
            <button 
              className="close-fullscreen"
              onClick={(e) => {
                e.stopPropagation();
                toggleFullScreen();
              }}
            >
              &times;
            </button>
          )}
        </div>
      )}
        <div className="response-section">
          <h2>Analiz Sonucu</h2>
          {loading ? (
            <p>Cevap yükleniyor...</p>
          ) : (
            <p>
              {response ||
                "Henüz analiz yapılmadı. Lütfen bir görüntü seçin ve 'Analiz Et' butonuna tıklayın."}
            </p>
          )}
        </div>
      </main>
      <footer>
        <p>&copy; 2024</p>
      </footer>
    </div>
  );
};

export default App;