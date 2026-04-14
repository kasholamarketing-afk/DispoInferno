import { useState } from "react";
import * as React from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface SignInProps {
  onSignIn: () => void;
}

export default function SignIn({ onSignIn }: SignInProps) {
  const [email, setEmail] = useState("Kashola.marketing@gmail.com");
  const [password, setPassword] = useState("............");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, we would validate credentials here
    toast.success("ACCESS_GRANTED: WELCOME TO THE GRID");
    onSignIn();
  };

  return (
    <div className="min-h-screen w-full bg-[#05070A] flex flex-col items-center justify-center p-4 overflow-y-auto relative">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05070A] via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md space-y-12 py-12 relative z-10">
        <div className="text-center space-y-6">
          <motion.img 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            src="/branding/dealsnitch-neon.png" 
            alt="Deal$nitch" 
            className="h-24 w-auto mx-auto drop-shadow-[0_0_30px_rgba(0,255,255,0.3)]"
          />
          <div className="space-y-2">
            <h2 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
              Access the Grid
            </h2>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-8 bg-neon-red/30" />
              <p className="text-neon-red text-[10px] font-display font-black uppercase tracking-[0.5em] italic drop-shadow-[0_0_8px_rgba(255,0,60,0.4)]">
                DISPO INFERNO
              </p>
              <div className="h-px w-8 bg-neon-red/30" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-8 bg-black/60 backdrop-blur-xl p-10 border border-white/10 rounded-none shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden scanline-overlay">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-red/50 to-transparent" />
            
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest ml-1">Manager Identity</p>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/[0.03] border-white/10 text-zinc-300 h-14 rounded-none px-6 focus:ring-1 focus:ring-neon-green/30 focus:border-neon-green/50 transition-all font-mono text-sm"
                  placeholder="Email Address"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest ml-1">Access Protocol</p>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/[0.03] border-white/10 text-zinc-300 h-14 rounded-none px-6 focus:ring-1 focus:ring-neon-green/30 focus:border-neon-green/50 transition-all font-mono text-sm"
                  placeholder="Password"
                />
              </div>
            </div>
            
            <div className="space-y-4 pt-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-neon-green/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Button
                  type="submit"
                  className="relative w-full h-16 bg-[#00FF41] hover:bg-[#00FF41]/90 text-black font-display font-black uppercase tracking-[0.2em] rounded-none transition-all text-sm animate-pulse-glow-green italic shadow-[0_0_20px_rgba(0,255,65,0.4)]"
                >
                  INITIALIZE_GRID_ACCESS
                </Button>
              </div>
              
              <Button
                type="button"
                className="w-full h-12 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 font-display font-black uppercase tracking-[0.2em] rounded-none transition-all text-[10px] border border-white/5 italic"
              >
                REQUEST_NEW_CREDENTIALS
              </Button>
            </div>
          </div>
        </form>
      </div>
      
      <div className="fixed bottom-12 left-12 z-50">
        <div className="w-12 h-12 rounded-none border border-neon-red/20 flex items-center justify-center text-neon-red font-display font-black text-sm bg-neon-red/5 animate-pulse shadow-[0_0_15px_rgba(255,0,60,0.2)]">
          DI
        </div>
      </div>
    </div>
  );
}
