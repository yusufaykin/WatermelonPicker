import React, { useEffect } from 'react';
import './Preloader.css';

const Preloader = ({ onAnimationEnd }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onAnimationEnd();
    }, 2000); 

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  return (
    <div className="preloader">
      <h1>Yapay Zeka İle Karpuz Seç Tadını Çıkart</h1>
      <div className="preloader-animation">
        <img src="https://i.pinimg.com/originals/6a/97/a1/6a97a14a0fa69fa1f3fcac7102b19462.gif" alt="Karpuz" />
      </div>
    </div>
  );
};

export default Preloader;
