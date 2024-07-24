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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

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

  const handleUseCamera = () => {
    setUseCamera(true);
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      })
      .catch((err) => {
        console.error("Error accessing camera: ", err);
      });
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result);
          handleImageLoad(); 
        };
        reader.readAsDataURL(file);
      }, "image/jpeg");
      setUseCamera(false);
      video.srcObject.getTracks().forEach((track) => track.stop());
    } else {
      console.error("Canvas or video reference is not defined.");
    }
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
                    text: `Fotoğraftaki en iyi karpuzu seç ve konumunu belirt. 

                              Önemli kurallar:
                              1. Görüntünün sol üst köşesi (0,0) kabul edilecek.
                              2. Koordinatları 'x,y' formatında ve tam sayı olarak ver (örnek: '150,200').
                              3. Koordinatlar, görüntü boyutları içinde olmalıdır.
                              4. Koordinatları karpuzun merkezinde ver,köşesinde olmasın.
                              5. Nesnel ol. Aynı fotoğraf için farklı cevapler verme.
                              

                              Yanıtını şu formatta ver:
                              Karpuzun Koordinatları: [X,Y]
                              Açıklama: [Karpuzun kalitesi hakkında kısa bir yorum]


                              Eğer fotoğrafta karpuz yoksa, 'Görsel de karpuz bulunamadı lütfen karpuz içeren bir fotoğraf ekleyiniz.' yaz.`,
                  },
                ],
              },
            ],
            max_tokens: 500,
          },
          {
            headers: {
              Authorization: `Bearer YOUR API KEY`,
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
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
      const coords = response.match(/(\d+)\s*,\s*(\d+)/);
      if (coords) {
        let x = parseInt(coords[1]);
        let y = parseInt(coords[2]);
  
        x = Math.min(Math.max(x, 0), img.naturalWidth);
        y = Math.min(Math.max(y, 0), img.naturalHeight);
  
        const scaleX = canvas.width / img.naturalWidth;
        const scaleY = canvas.height / img.naturalHeight;
  
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
    const maxWidth = 800; 
    const maxHeight = 600; 
    let { width, height } = img;

    if (width > height) {
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width *= maxHeight / height;
        height = maxHeight;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
  };

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject
          ?.getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

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
          <input
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            id="file-input"
            className="file-input"
          />
          <label htmlFor="file-input" className="button file-label">
            Karpuz Seç
          </label>
          <button onClick={handleUseCamera} className="button camera-button">
            Kamera ile Çek
          </button>
          <button onClick={handleSubmit} className="button analyze-button">
            Analiz Et
          </button>
        </div>
        {useCamera && (
          <div className="camera-section">
            <video ref={videoRef} className="camera-view"></video>
            <button onClick={handleCapture} className="button capture-button">
              Fotoğraf Çek
            </button>
          </div>
        )}
        {previewUrl && (
          <div className="image-preview">
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
