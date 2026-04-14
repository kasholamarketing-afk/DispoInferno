/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { LayoutDashboard, Target, Database, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";

// Components
import MissionPlanner from "./components/MissionPlanner";
import TacticalDialer from "./components/TacticalDialer";
import IntelDatabase from "./components/IntelDatabase";
import Portal from "./components/Portal";
import SignIn from "./components/SignIn";

import { BuyerRecord, SubjectProperty, SessionLog } from "./types";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPortal, setShowPortal] = useState(true);
  const [activeTab, setActiveTab] = useState("planner");
  const [subjects, setSubjects] = useState<SubjectProperty[]>([
    { address: "" },
    { address: "" },
    { address: "" },
  ]);
  const [buyers, setBuyers] = useState<BuyerRecord[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [vettedBuyers, setVettedBuyers] = useState<BuyerRecord[]>([]);

  useEffect(() => {
    // Initial data load could go here
    const loadData = async () => {
      // Mocking vetted buyers for now
      setVettedBuyers([]);
    };
    loadData();
  }, []);

  const handleStartSession = (rankedBuyers: BuyerRecord[]) => {
    setBuyers(rankedBuyers);
    setActiveTab("dialer");
    toast.success(`TACTICAL_SESSION_INITIALIZED: ${rankedBuyers.length} LEADS_ENGAGED`);
  };

  const handleSignOut = () => {
    toast.info("SESSION_TERMINATED");
    setIsAuthenticated(false);
    setShowPortal(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-neon-green/30">
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div
            key="signin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SignIn onSignIn={() => setIsAuthenticated(true)} />
          </motion.div>
        ) : showPortal ? (
          <motion.div
            key="portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Portal onEnter={() => setShowPortal(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative min-h-screen overflow-hidden"
          >
            {/* Immersive Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
              <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-neon-red/5 blur-[120px] rounded-full animate-pulse" />
              <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-neon-green/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
            </div>

            <header className="relative z-10 max-w-7xl mx-auto px-4 pt-8 flex items-center justify-between border-b border-white/5 pb-6 mb-8">
              <div className="flex items-center gap-6">
                <img 
                  src="/branding/dealsnitch-neon.png" 
                  alt="Deal$nitch" 
                  className="h-10 w-auto drop-shadow-[0_0_15px_rgba(0,255,255,0.2)]"
                />
                <div className="h-8 w-px bg-white/10" />
                <div className="space-y-1">
                  <h1 className="text-[10px] font-display font-black text-neon-red uppercase tracking-[0.4em] italic drop-shadow-[0_0_8px_rgba(255,0,60,0.4)]">
                    DISPO_INFERNO
                  </h1>
                  <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">TACTICAL_COMMAND_CENTER_V1.0.0</p>
                </div>
              </div>

              <Button 
                variant="ghost" 
                onClick={handleSignOut}
                className="group h-10 px-4 hover:bg-neon-red/10 text-zinc-500 hover:text-neon-red transition-all rounded-none border border-transparent hover:border-neon-red/20"
              >
                <LogOut className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform" />
                <span className="text-[10px] font-display font-black uppercase tracking-widest">TERMINATE_SESSION</span>
              </Button>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto px-4 pb-20">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
                <div className="flex justify-center">
                  <TabsList className="bg-black/40 backdrop-blur-md border border-white/10 h-14 p-1 rounded-none shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <TabsTrigger value="planner" className="data-[state=active]:bg-neon-green data-[state=active]:text-black gap-3 px-10 h-full rounded-none transition-all font-display font-black uppercase tracking-[0.2em] text-[10px] italic">
                      <Target className="w-4 h-4" />
                      MISSION_PLANNER
                    </TabsTrigger>
                    <TabsTrigger value="dialer" className="data-[state=active]:bg-neon-green data-[state=active]:text-black gap-3 px-10 h-full rounded-none transition-all font-display font-black uppercase tracking-[0.2em] text-[10px] italic">
                      <LayoutDashboard className="w-4 h-4" />
                      TACTICAL_DIALER
                    </TabsTrigger>
                  </TabsList>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TabsContent value="planner" className="mt-0 outline-none">
                      <MissionPlanner 
                        subjects={subjects} 
                        setSubjects={setSubjects} 
                        onStartSession={handleStartSession}
                        vettedBuyers={vettedBuyers}
                        sessionLogs={sessionLogs}
                      />
                    </TabsContent>
                    
                    <TabsContent value="dialer" className="mt-0 outline-none">
                      <TacticalDialer 
                        buyers={buyers} 
                        subjects={subjects}
                        sessionLogs={sessionLogs}
                        setSessionLogs={setSessionLogs}
                        onClearSession={() => setBuyers([])}
                      />
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>
              </Tabs>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster position="bottom-right" theme="dark" closeButton />
    </div>
  );
}

