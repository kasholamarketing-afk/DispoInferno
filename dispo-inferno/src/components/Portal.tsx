import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortalProps {
  onEnter: () => void;
}

export default function Portal({ onEnter }: PortalProps) {
  const [isEntering, setIsEntering] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [cardRect, setCardRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isZooming && videoRef.current) {
      const video = videoRef.current;
      
      const setupVideo = () => {
        if (video.duration) {
          video.currentTime = Math.max(0, video.duration - 4);
        }
        video.loop = false;
        video.muted = false;
        video.volume = 1.0;
        video.play().catch(err => {
          console.error("Video play failed:", err);
          setIsEntering(true);
          setTimeout(onEnter, 800);
        });
      };

      video.onended = () => {
        setIsEntering(true);
        setTimeout(onEnter, 1500);
      };

      if (video.readyState >= 1) {
        setupVideo();
      } else {
        video.onloadedmetadata = setupVideo;
      }
    }
  }, [isZooming, onEnter]);

  const handleEnter = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setCardRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }

    setIsZooming(true);
  };

  return (
    <div className="min-h-screen w-full bg-[#05070A] flex flex-col items-center justify-start overflow-hidden p-4 pt-8 md:pt-12 pb-20">
      {/* Main Content */}
      <motion.div 
        animate={{ 
          opacity: isZooming ? 0 : 1,
          scale: isZooming ? 0.9 : 1,
          filter: isZooming ? "blur(20px)" : "blur(0px)"
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-20 flex flex-col items-center w-full max-w-5xl"
      >
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl mb-4"
        >
          <img 
            src="/branding/dealsnitch-neon.png" 
            alt="Deal$nitch" 
            className="w-full h-auto drop-shadow-[0_0_30px_rgba(0,255,255,0.2)]"
          />
        </motion.div>

        {/* Header Text */}
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-xl md:text-2xl font-display font-black text-[#FF0033] uppercase tracking-[0.2em] drop-shadow-[0_0_15px_rgba(255,0,51,0.6)] animate-pulse">
            🔥🔥🔥Burn Baby Burn! Dispo Inferno 🔥🔥🔥
          </h2>
          <p className="text-zinc-400 text-sm md:text-base font-medium">
            Deal$nitch™ Dispo edition Version 1.0.0 Now with references from the 80's! 🕺🪩🔥
          </p>
        </div>

        {/* Portal Grid (Single Green Card) */}
        <div className="flex justify-center w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
            }}
            className="relative group"
          >
            {/* Card Container */}
            <div 
              ref={cardRef}
              className="w-[320px] md:w-[420px] h-[360px] md:h-[440px] border-[3px] border-neon-green/40 rounded-[2.5rem] p-6 flex flex-col items-center justify-start bg-black/40 backdrop-blur-xl shadow-[0_0_60px_rgba(0,255,102,0.15)] group-hover:border-neon-green group-hover:shadow-[0_0_80px_rgba(0,255,102,0.3)] transition-all duration-500 overflow-hidden"
            >
              
              {/* Video Background (Static inside card when not zooming) */}
              {!isZooming && (
                <div className="absolute inset-0 z-0">
                  <video
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-500"
                  >
                    <source src="/marketing/dispo_portal.mp4" type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                </div>
              )}

              {/* Button */}
              <div className="relative z-10 w-full mt-4">
                <Button
                  onClick={handleEnter}
                  disabled={isZooming}
                  className="w-full h-16 md:h-20 bg-black/60 border-2 border-neon-green/50 hover:border-neon-green text-neon-green font-display font-black text-lg md:text-xl uppercase tracking-widest rounded-none transition-all duration-300 shadow-[0_0_20px_rgba(0,255,65,0.2)] hover:shadow-[0_0_40px_rgba(0,255,65,0.5)] group/btn disabled:opacity-50 animate-pulse-glow-green"
                >
                  <span className="flex items-center gap-3">
                    ENTER PORTAL
                    <ArrowRight className="w-6 h-6 group-hover/btn:translate-x-2 transition-transform" />
                  </span>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Full Screen Transition Video */}
      <AnimatePresence>
        {isZooming && (
          <motion.div
            initial={{ 
              clipPath: cardRect 
                ? `inset(${cardRect.top}px ${window.innerWidth - (cardRect.left + cardRect.width)}px ${window.innerHeight - (cardRect.top + cardRect.height)}px ${cardRect.left}px round 2.5rem)`
                : "inset(20% 30% 20% 30% round 2.5rem)",
              opacity: 0,
              scale: 1
            }}
            animate={{ 
              clipPath: "inset(0% 0% 0% 0% round 0rem)",
              opacity: 1,
              scale: 1.1
            }}
            transition={{ 
              duration: 1.2, 
              ease: [0.16, 1, 0.3, 1] 
            }}
            className="fixed inset-0 z-[100] bg-black overflow-hidden"
          >
            <video
              ref={videoRef}
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/marketing/dispo_portal.mp4" type="video/mp4" />
            </video>
            
            {/* Cinematic Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80" />
            
            {/* CRT Scanlines Effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-30" />
            
            {/* Vignette */}
            <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Logo */}
      <div className="fixed bottom-8 left-8 z-50">
        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/60 font-display font-black text-sm bg-white/5">
          N
        </div>
      </div>

      {/* Final Loading overlay */}
      <AnimatePresence>
        {isEntering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-[#05070A] flex flex-col items-center justify-center"
          >
            <div className="relative">
              <div className="text-neon-green font-display font-black text-5xl tracking-tighter italic animate-pulse uppercase mb-4">
                INITIALIZING_SYSTEM...
              </div>
              <div className="w-full h-1 bg-white/10 relative overflow-hidden">
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-neon-green shadow-[0_0_15px_rgba(0,255,102,0.8)]"
                />
              </div>
              <div className="mt-4 flex justify-between font-mono text-[10px] text-neon-green/40 uppercase tracking-widest">
                <span>DEAL$NITCH_DISPO_V1.0.0</span>
                <span>SECURE_LINK_ESTABLISHED</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
