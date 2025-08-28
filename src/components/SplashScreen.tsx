import { useEffect, useState } from 'react';
import bunnyLoadingGif from '@/assets/bunny-loading.gif';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Allow fade-out animation to complete before calling onComplete
      setTimeout(onComplete, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-fade-out">
        <div className="flex flex-col items-center gap-6">
          <img 
            src={bunnyLoadingGif} 
            alt="Loading..." 
            className="w-24 h-24 rounded-lg"
          />
          <p className="text-lg font-medium text-foreground">
            Setting Up Budget...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-fade-in">
      <div className="flex flex-col items-center gap-6">
        <img 
          src={bunnyLoadingGif} 
          alt="Loading..." 
          className="w-24 h-24 rounded-lg"
        />
        <p className="text-lg font-medium text-foreground">
          Setting Up Budget...
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;