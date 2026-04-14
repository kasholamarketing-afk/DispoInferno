import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Phone, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Copy,
  Target,
  X,
  MessageSquare,
  PhoneOff,
  Voicemail,
  SkipForward,
  UserCheck,
  Send,
  Zap,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { sendSms, initiateCall, getCallStatus } from "@/services/twilioService";
import { BuyerRecord, SessionLog, SubjectProperty } from "@/types";
import { motion, AnimatePresence } from "motion/react";
import { persistence } from "@/lib/persistence";
import TwilioCommsOverlay from "./TwilioCommsOverlay";

interface TacticalDialerProps {
  buyers: BuyerRecord[];
  subjects: SubjectProperty[];
  sessionLogs: SessionLog[];
  setSessionLogs: (logs: SessionLog[]) => void;
  onClearSession: () => void;
}

export default function TacticalDialer({ buyers, subjects, sessionLogs, setSessionLogs, onClearSession }: TacticalDialerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [smsBody, setSmsBody] = useState("");
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [isCommsOverlayOpen, setIsCommsOverlayOpen] = useState(false);
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<string | null>(null);

  const currentBuyer = buyers[currentIndex];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentCallSid && !["completed", "failed", "busy", "no-answer"].includes(callStatus || "")) {
      interval = setInterval(async () => {
        try {
          const status = await getCallStatus(currentCallSid);
          setCallStatus(status);
          if (["completed", "failed", "busy", "no-answer"].includes(status)) {
            // Keep status visible for a bit then clear SID
            setTimeout(() => setCurrentCallSid(null), 5000);
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [currentCallSid, callStatus]);

  const handleSendSms = async () => {
    if (!smsBody.trim()) {
      toast.error("SMS body cannot be empty");
      return;
    }
    setIsSendingSms(true);
    try {
      await sendSms(currentBuyer.phone, smsBody);
      toast.success("SMS_TRANSMITTED: MESSAGE_DELIVERED");
      setSmsBody("");
    } catch (error: any) {
      toast.error(`SMS_FAILURE: ${error.message}`);
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleTwilioCall = async () => {
    setIsInitiatingCall(true);
    setCallStatus("initiating");
    try {
      const data = await initiateCall(currentBuyer.phone);
      setCurrentCallSid(data.sid);
      setCallStatus("queued");
      toast.success("CALL_INITIATED: CONNECTING_TO_GRID");
    } catch (error: any) {
      toast.error(`CALL_FAILURE: ${error.message}`);
      setCallStatus("failed");
    } finally {
      setIsInitiatingCall(false);
    }
  };

  const currentSubject = useMemo(() => {
    if (!currentBuyer) return null;
    return subjects.find(s => s.address === currentBuyer.primaryHook);
  }, [currentBuyer, subjects]);

  useEffect(() => {
    if (!currentBuyer) return;
    const prevBuyer = buyers[currentIndex - 1];
    if (prevBuyer && prevBuyer.primaryHook !== currentBuyer.primaryHook) {
      toast.info(`TARGET_HOOK_SWITCHED: ${currentBuyer.primaryHook}`, { duration: 4000 });
    }
    toast.success(`ENGAGING_LEAD: ${currentBuyer.name}`, { duration: 2000 });
  }, [currentIndex, currentBuyer, buyers]);

  const handleOutcome = async (status: SessionLog["status"]) => {
    if (!currentBuyer) return;

    const newLog: SessionLog = {
      timestamp: new Date().toISOString(),
      buyer_id: currentBuyer.id,
      buyer_name: currentBuyer.name,
      subject_address: currentBuyer.primaryHook,
      status,
    };

    try {
      await persistence.logCall(newLog);
      setSessionLogs([...sessionLogs, newLog]);
      toast.success(`OUTCOME_LOGGED: ${status}`);
      
      if (status !== "SKIPPED") {
        handleNext();
      }
    } catch (err) {
      console.error(err);
      setSessionLogs([...sessionLogs, newLog]);
      toast.success(`OUTCOME_LOGGED: ${status} (Local)`);
      if (status !== "SKIPPED") handleNext();
    }
  };

  const handleNext = () => {
    if (currentIndex < buyers.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}_COPIED`);
  };

  if (!currentBuyer) {
    return (
      <Card className="glass-card border-white/10 p-20 flex flex-col items-center justify-center text-center space-y-8 scanline-overlay">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center relative"
        >
          <Phone className="w-12 h-12 text-zinc-700" />
          <div className="absolute inset-0 border border-neon-red/20" />
        </motion.div>
        <div className="space-y-4">
          <h3 className="text-xl font-display font-black text-zinc-400 uppercase tracking-[0.3em] italic drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
            COCKPIT_OFFLINE
          </h3>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] text-zinc-600 font-mono max-w-xs mx-auto uppercase tracking-[0.2em] leading-relaxed">
              No active mission session. Ingest data in the Mission Planner to engage the dialer.
            </p>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <motion.div 
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
                  className="w-1 h-1 bg-neon-red"
                />
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const hookScript = `Hey ${currentBuyer.name.split(' ')[0]}, checking in because you bought ${currentBuyer.purchases[0].address} recently. I've got another pocket listing in that same pocket, you still buying there?`;

  const progress = ((currentIndex + 1) / buyers.length) * 100;

  return (
    <div className="space-y-6">
      {/* Batch Progress Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-4">
            <span className="text-neon-red font-black italic">DIAL_INDEX:</span>
            <span className="text-white">{currentIndex + 1} / {buyers.length}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-neon-red font-black italic">PROGRESS:</span>
            <span className="text-white">{Math.round(progress)}%</span>
          </div>
        </div>
        <div className="h-1 bg-white/5 w-full overflow-hidden relative">
          <motion.div 
            className="h-full bg-neon-green shadow-[0_0_10px_rgba(0,255,65,0.6)] relative z-10"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Queue Control */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="glass-card border-white/10 scanline-overlay">
            <CardHeader className="pb-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[10px] font-display font-black uppercase tracking-[0.3em] text-neon-red italic">MISSION_QUEUE</CardTitle>
                <Button variant="ghost" size="icon" onClick={onClearSession} className="h-6 w-6 text-zinc-500 hover:text-neon-red hover:bg-neon-red/10 rounded-none transition-all">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y divide-white/5">
                  {buyers.map((buyer, idx) => {
                    const isContacted = sessionLogs.some(l => l.buyer_id === buyer.id);
                    return (
                      <button
                        key={buyer.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-full p-4 text-left transition-all flex items-center gap-4 group ${idx === currentIndex ? 'bg-neon-green/10 border-l-4 border-neon-green' : 'hover:bg-white/5 border-l-4 border-transparent'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-display font-black uppercase truncate transition-colors ${idx === currentIndex ? 'text-neon-green' : 'text-white group-hover:text-neon-green'}`}>{buyer.name}</span>
                            {isContacted && <CheckCircle2 className="w-3 h-3 text-neon-green animate-pulse" />}
                          </div>
                          <p className="text-[10px] font-mono text-zinc-500 uppercase truncate">{buyer.llc}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-display font-black transition-colors ${idx === currentIndex ? 'text-neon-green' : 'text-zinc-600 group-hover:text-neon-green'}`}>{buyer.score}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tactical Cockpit */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tactical Contact Card */}
            <Card className="glass-card border-white/10 scanline-overlay">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <CardTitle className="text-sm font-display font-black text-white italic uppercase tracking-widest flex items-center gap-3">
                  <div className="w-2 h-2 bg-neon-red animate-pulse" />
                  TACTICAL_CONTACT_CARD
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Target Identity</p>
                  <h2 className="text-2xl font-display font-black text-white uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{currentBuyer.name}</h2>
                  <p className="text-xs font-mono text-neon-green uppercase tracking-widest">{currentBuyer.llc}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Heat Score</p>
                    <p className="text-xl font-display font-black text-neon-green">{currentBuyer.score}</p>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Buyer Intelligence</p>
                    <div 
                      className="px-2 py-1 text-[8px] font-display font-black uppercase tracking-widest inline-block"
                      style={{
                        background: currentBuyer.type.includes('BUYER') ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255, 204, 0, 0.1)',
                        color: currentBuyer.type.includes('AGENT') ? '#ffcc00' : '#00d2ff',
                        border: `1px solid ${currentBuyer.type.includes('AGENT') ? '#ffcc0044' : '#00d2ff44'}`
                      }}
                    >
                      INTEL: {currentBuyer.type}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-neon-green/5 border border-neon-green/20 relative">
                    <p className="text-[10px] font-mono text-neon-green uppercase tracking-[0.2em] mb-1">Subject Property</p>
                    <p className="text-xs font-display font-black text-white uppercase tracking-tight">{currentBuyer.primaryHook}</p>
                  </div>

                  {currentSubject?.intel && (
                    <div className="grid grid-cols-2 gap-2 p-3 bg-black/40 border border-white/5">
                      <div className="space-y-1">
                        <p className="text-[8px] font-mono text-zinc-500 uppercase">Owner</p>
                        <p className="text-[10px] font-display font-black text-white truncate">{currentSubject.intel.ownerName}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-mono text-zinc-500 uppercase">Last Sale</p>
                        <p className="text-[10px] font-display font-black text-white">
                          {currentSubject.intel.lastSalePrice > 0 ? `$${(currentSubject.intel.lastSalePrice / 1000).toFixed(0)}k` : "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-mono text-zinc-500 uppercase">Year Built</p>
                        <p className="text-[10px] font-display font-black text-white">{currentSubject.intel.yearBuilt || "N/A"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-mono text-zinc-500 uppercase">SqFt</p>
                        <p className="text-[10px] font-display font-black text-white">{currentSubject.intel.sqft.toLocaleString() || "N/A"}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-neon-green/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <Button 
                        onClick={() => {
                          navigator.clipboard.writeText(currentBuyer.phone);
                          toast.success("COPIED_TO_CLIPBOARD: " + currentBuyer.phone);
                        }}
                        className="relative w-full h-14 bg-[#00FF41] hover:bg-[#00FF41]/90 text-black font-display font-black text-lg rounded-none transition-all duration-300 shadow-[0_0_20px_rgba(0,255,65,0.4)]"
                      >
                        <Phone className="w-5 h-5 mr-3 fill-current" />
                        {currentBuyer.phone}
                      </Button>
                    </div>
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-neon-red/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <Button 
                        onClick={handleTwilioCall}
                        disabled={isInitiatingCall || !!currentCallSid}
                        className="relative w-full h-14 bg-neon-red hover:bg-neon-red/90 text-black font-display font-black text-lg rounded-none transition-all duration-300 shadow-[0_0_20px_rgba(255,0,60,0.4)]"
                      >
                        <Zap className={`w-5 h-5 mr-3 fill-current ${isInitiatingCall || (currentCallSid && !["completed", "failed", "busy", "no-answer"].includes(callStatus || "")) ? 'animate-spin' : ''}`} />
                        {currentCallSid ? `STATUS: ${callStatus?.toUpperCase()}` : 'TWILIO_CALL'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-white/5">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Quick SMS Protocol</p>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={smsBody}
                        onChange={(e) => setSmsBody(e.target.value)}
                        placeholder="Enter tactical message..."
                        className="flex-1 bg-white/[0.03] border border-white/10 text-white text-xs px-4 py-2 rounded-none focus:ring-1 focus:ring-neon-green/30 focus:border-neon-green/50 transition-all font-mono"
                      />
                      <Button 
                        onClick={handleSendSms}
                        disabled={isSendingSms || !smsBody.trim()}
                        className="bg-neon-green hover:bg-neon-green/90 text-black rounded-none px-4 h-10"
                      >
                        {isSendingSms ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={() => setIsCommsOverlayOpen(true)}
                    variant="outline"
                    className="w-full border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white text-[10px] font-mono uppercase tracking-widest h-8 rounded-none"
                  >
                    <Zap className="w-3 h-3 mr-2" />
                    OPEN_TACTICAL_COMMS_OVERLAY
                  </Button>
                </div>
              </CardContent>
            </Card>

            <TwilioCommsOverlay 
              isOpen={isCommsOverlayOpen}
              onClose={() => setIsCommsOverlayOpen(false)}
              buyer={currentBuyer}
              callStatus={callStatus}
              currentCallSid={currentCallSid}
              onCallInitiated={(sid) => setCurrentCallSid(sid)}
              onStatusUpdate={(status) => setCallStatus(status)}
            />

            {/* The Hook & Intel */}
            <Card className="glass-card border-white/10 flex flex-col scanline-overlay">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <CardTitle className="text-sm font-display font-black text-white italic uppercase tracking-widest flex items-center gap-3">
                  <Target className="w-4 h-4 text-neon-green animate-pulse" />
                  THE_HOOK_INTEL
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] mb-1">Buyer's Previous Purchase</p>
                    <p className="text-xs font-bold text-white uppercase tracking-tight">{currentBuyer.purchases[0].address}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-1 h-1 bg-zinc-700" />
                      <p className="text-[10px] font-mono text-zinc-500 uppercase">DIST: {currentBuyer.closestDistance.toFixed(1)} MI</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Tactical Script</p>
                    <div className="p-4 bg-black/60 border border-white/5 font-mono text-[10px] text-zinc-300 leading-relaxed italic relative">
                      <div className="absolute top-0 left-0 w-1 h-full bg-neon-green/20" />
                      "{hookScript}"
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Engagement Control Strip</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      onClick={() => handleOutcome("ANSWERED")}
                      className="bg-neon-green/10 border border-neon-green/30 text-neon-green hover:bg-neon-green hover:text-black rounded-none h-10 text-[9px] font-display font-black uppercase tracking-widest transition-all"
                    >
                      🗣 ANSWERED
                    </Button>
                    <Button 
                      onClick={() => handleOutcome("NO_ANSWER")}
                      className="bg-white/5 border border-white/10 text-white hover:bg-neon-red hover:text-white hover:border-neon-red rounded-none h-10 text-[9px] font-display font-black uppercase tracking-widest transition-all"
                    >
                      📵 NO_ANSWER
                    </Button>
                    <Button 
                      onClick={() => handleOutcome("LEFT_VM")}
                      className="bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black rounded-none h-10 text-[9px] font-display font-black uppercase tracking-widest transition-all"
                    >
                      📬 LEFT_VM
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Button 
                      variant="ghost" 
                      onClick={handlePrev} 
                      disabled={currentIndex === 0}
                      className="flex-1 text-zinc-500 hover:text-white hover:bg-white/5 text-[9px] font-display font-black uppercase tracking-widest rounded-none border border-white/5"
                    >
                      ⏪ BACK
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleOutcome("SKIPPED")}
                      className="flex-1 text-zinc-500 hover:text-white hover:bg-white/5 text-[9px] font-display font-black uppercase tracking-widest rounded-none border border-white/5"
                    >
                      ⏩ SKIP
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
