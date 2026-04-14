import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, Phone, Zap, Clock, MessageSquare, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendSms, initiateCall, getCallStatus } from "@/services/twilioService";
import { BuyerRecord } from "@/types";
import { useEffect } from "react";

interface TwilioCommsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  buyer: BuyerRecord;
  callStatus: string | null;
  currentCallSid: string | null;
  onCallInitiated: (sid: string) => void;
  onStatusUpdate: (status: string) => void;
}

export default function TwilioCommsOverlay({ 
  isOpen, 
  onClose, 
  buyer, 
  callStatus, 
  currentCallSid,
  onCallInitiated,
  onStatusUpdate
}: TwilioCommsOverlayProps) {
  const [smsBody, setSmsBody] = useState("");
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && currentCallSid && !["completed", "failed", "busy", "no-answer"].includes(callStatus || "")) {
      interval = setInterval(async () => {
        try {
          const status = await getCallStatus(currentCallSid);
          onStatusUpdate(status);
        } catch (error) {
          console.error("Overlay polling error:", error);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isOpen, currentCallSid, callStatus, onStatusUpdate]);

  const handleSendSms = async () => {
    if (!smsBody.trim()) {
      toast.error("SMS body cannot be empty");
      return;
    }
    setIsSendingSms(true);
    try {
      await sendSms(buyer.phone, smsBody);
      toast.success("SMS_TRANSMITTED: MESSAGE_DELIVERED");
      setSmsBody("");
      onClose();
    } catch (error: any) {
      toast.error(`SMS_FAILURE: ${error.message}`);
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleTwilioCall = async () => {
    setIsInitiatingCall(true);
    onStatusUpdate("initiating");
    try {
      const data = await initiateCall(buyer.phone);
      onCallInitiated(data.sid);
      onStatusUpdate("queued");
      toast.success("CALL_INITIATED: CONNECTING_TO_GRID");
    } catch (error: any) {
      toast.error(`CALL_FAILURE: ${error.message}`);
      onStatusUpdate("failed");
    } finally {
      setIsInitiatingCall(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-zinc-950 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-10" />

            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-neon-red animate-pulse" />
                <h3 className="text-xs font-display font-black text-white uppercase tracking-widest italic">
                  TACTICAL_COMMS_OVERLAY
                </h3>
              </div>
              <button 
                onClick={onClose}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Target Info */}
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Target Identity</p>
                <h4 className="text-xl font-display font-black text-white uppercase tracking-tighter">{buyer.name}</h4>
                <div className="flex items-center gap-2">
                  <span 
                    onClick={() => {
                      navigator.clipboard.writeText(buyer.phone);
                      toast.success("COPIED_TO_CLIPBOARD: " + buyer.phone);
                    }}
                    className="text-[10px] font-mono text-neon-green uppercase cursor-pointer hover:text-white transition-colors"
                  >
                    {buyer.phone}
                  </span>
                  <span className="text-[8px] text-zinc-600">•</span>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">{buyer.llc}</span>
                </div>
              </div>

              {/* Action Tabs/Sections */}
              <div className="space-y-4">
                {/* SMS Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 text-neon-green" />
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">SMS Protocol</p>
                  </div>
                  <div className="relative">
                    <textarea
                      value={smsBody}
                      onChange={(e) => setSmsBody(e.target.value)}
                      placeholder="Enter tactical message payload..."
                      className="w-full h-24 bg-white/[0.03] border border-white/10 text-white text-xs p-3 rounded-none focus:ring-1 focus:ring-neon-green/30 focus:border-neon-green/50 transition-all font-mono resize-none"
                    />
                    <div className="absolute bottom-2 right-2 text-[8px] font-mono text-zinc-600">
                      {smsBody.length} CHARS
                    </div>
                  </div>
                  <Button
                    onClick={handleSendSms}
                    disabled={isSendingSms || !smsBody.trim()}
                    className="w-full bg-neon-green hover:bg-neon-green/90 text-black font-display font-black uppercase rounded-none h-10"
                  >
                    {isSendingSms ? <Clock className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    TRANSMIT_MESSAGE
                  </Button>
                </div>

                <div className="h-px bg-white/5" />

                {/* Voice Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-neon-red" />
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Voice Link</p>
                  </div>
                  <Button
                    onClick={handleTwilioCall}
                    disabled={isInitiatingCall || !!currentCallSid}
                    className="w-full bg-neon-red hover:bg-neon-red/90 text-black font-display font-black uppercase rounded-none h-10"
                  >
                    {isInitiatingCall || (currentCallSid && !["completed", "failed", "busy", "no-answer"].includes(callStatus || "")) ? (
                      <Zap className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Phone className="w-4 h-4 mr-2" />
                    )}
                    {currentCallSid ? `STATUS: ${callStatus?.toUpperCase()}` : 'ESTABLISH_VOICE_LINK'}
                  </Button>
                </div>
              </div>

              {/* Security Warning */}
              <div className="p-3 bg-neon-red/5 border border-neon-red/20 flex gap-3 items-start">
                <ShieldAlert className="w-4 h-4 text-neon-red shrink-0 mt-0.5" />
                <p className="text-[8px] font-mono text-neon-red/80 leading-relaxed uppercase">
                  WARNING: All transmissions are logged to the tactical database. Ensure compliance with communication protocols.
                </p>
              </div>
            </div>

            {/* Footer Decoration */}
            <div className="h-1 bg-gradient-to-r from-neon-red via-neon-green to-neon-red animate-shimmer" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
