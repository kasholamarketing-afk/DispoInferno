import { useState, useRef, useMemo, useEffect } from "react";
import * as React from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  MapPin, 
  Search, 
  FileText, 
  Loader2, 
  CheckSquare, 
  Database,
  History,
  Play,
  Map as MapIcon
} from "lucide-react";
import { toast } from "sonner";
import { parseLeadsHeuristically, ParsedLead } from "@/lib/heuristics";
import { geocode, calculateDistanceMiles, GeoLocation } from "@/lib/geocoding";
import { fetchPropertyIntel } from "@/lib/attom";
import { BuyerRecord, SubjectProperty, calculateHeatScore, SessionLog, PurchaseRecord } from "@/types";
import { persistence, DispoSession } from "@/lib/persistence";
import TacticalMap from "./TacticalMap";

interface MissionPlannerProps {
  subjects: SubjectProperty[];
  setSubjects: (subjects: SubjectProperty[]) => void;
  onStartSession: (buyers: BuyerRecord[]) => void;
  vettedBuyers: BuyerRecord[];
  sessionLogs: SessionLog[];
}

export default function MissionPlanner({ subjects, setSubjects, onStartSession, vettedBuyers, sessionLogs }: MissionPlannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [accumulatedLeads, setAccumulatedLeads] = useState<ParsedLead[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [processedLeads, setProcessedLeads] = useState<BuyerRecord[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [pastSessions, setPastSessions] = useState<DispoSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const sessions = await persistence.getSessions();
    setPastSessions(sessions);
  };

  const handleSubjectChange = (index: number, value: string) => {
    const newSubjects = [...subjects];
    newSubjects[index].address = value;
    setSubjects(newSubjects);
  };

  const processRawText = async (text: string, sourceName: string) => {
    try {
      setIsProcessing(true);
      const newLeads = await parseLeadsHeuristically(text);
      setAccumulatedLeads(prev => [...prev, ...newLeads]);
      toast.success(`APPENDED_${newLeads.length}_LEADS_FROM_${sourceName.toUpperCase()}`);
    } catch (err) {
      toast.error(`FAILED_TO_PARSE_${sourceName.toUpperCase()}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      await processRawText(text, file.name);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;
    await processRawText(pasteText, "pasted text");
    setPasteText("");
  };

  const reloadSession = (session: DispoSession) => {
    setSubjects(session.subjects);
    setProcessedLeads(session.buyers);
    setSelectedLeadIds(new Set(session.buyers.map(b => b.id)));
    setShowHistory(false);
    toast.success(`RELOADED_MISSION: ${session.name}`);
  };

  const runMission = async () => {
    if (accumulatedLeads.length === 0) {
      toast.error("ERROR: NO_LEAD_DATA_DETECTED");
      return;
    }

    const activeSubjects = subjects.filter(s => s.address.trim() !== "");
    if (activeSubjects.length === 0) {
      toast.error("ERROR: NO_TARGET_HOOKS_DEFINED");
      return;
    }

    setIsProcessing(true);
    toast.info("GEOCODING_TARGETS_&_RANKING_LEADS...");

    try {
      const subjectLocations: (GeoLocation & { address: string })[] = [];
      const updatedSubjects = [...subjects];
      
      for (let i = 0; i < subjects.length; i++) {
        const s = subjects[i];
        if (s.address.trim() === "") continue;
        
        const loc = await geocode(s.address);
        const intel = await fetchPropertyIntel(s.address);
        
        if (loc) {
          subjectLocations.push({ ...loc, address: s.address });
          updatedSubjects[i] = { ...s, ...loc, intel: intel || undefined };
        }
      }
      
      setSubjects(updatedSubjects);

      if (subjectLocations.length === 0) {
        toast.error("ERROR: GEOCODING_FAILED");
        setIsProcessing(false);
        return;
      }

      // Group leads by identity (phone or email) to find repeat purchases (Whale Bonus)
      const leadMap = new Map<string, ParsedLead[]>();
      accumulatedLeads.forEach((lead, idx) => {
        const hasPhone = lead.phone && lead.phone !== "No Phone";
        const hasEmail = lead.email && lead.email !== "";
        const hasName = lead.name && lead.name !== "Unknown Lead";

        let key: string;
        if (hasPhone) key = `phone:${lead.phone}`;
        else if (hasEmail) key = `email:${lead.email}`;
        else if (hasName) key = `name:${lead.name}`;
        else key = `unique:${idx}`; // Don't group if we have no real identifier

        if (!leadMap.has(key)) leadMap.set(key, []);
        leadMap.get(key)!.push(lead);
      });

      const processed: BuyerRecord[] = [];
      const leadEntries = Array.from(leadMap.entries());

      for (let i = 0; i < leadEntries.length; i++) {
        const [_, rawLeads] = leadEntries[i];
        const primaryLead = rawLeads[0];
        
        const isVetted = vettedBuyers.some(v => v.phone === primaryLead.phone || v.name === primaryLead.name);

        const purchases: PurchaseRecord[] = [];
        let minDistance = Infinity;
        let primaryHook = "";
        let buyerLat: number | undefined;
        let buyerLng: number | undefined;

        // Process all purchases for this buyer to find the closest one
        for (const lead of rawLeads) {
          const leadLoc = await geocode(lead.address);
          if (!leadLoc) continue;

          if (!buyerLat) {
            buyerLat = leadLoc.lat;
            buyerLng = leadLoc.lng;
          }

          let closestSubjectDist = Infinity;
          subjectLocations.forEach(sl => {
            const dist = calculateDistanceMiles(sl, leadLoc);
            if (dist < closestSubjectDist) {
              closestSubjectDist = dist;
            }
          });

          if (closestSubjectDist < minDistance) {
            minDistance = closestSubjectDist;
            primaryHook = lead.address;
          }

          purchases.push({
            address: lead.address,
            distance: closestSubjectDist === Infinity ? 0 : closestSubjectDist,
            rawRecord: lead
          });
        }

        if (purchases.length === 0) continue;

        const buyer: BuyerRecord = {
          id: `lead-${Date.now()}-${i}`,
          name: primaryLead.name,
          phone: primaryLead.phone,
          email: primaryLead.email,
          llc: primaryLead.llc,
          type: primaryLead.type, 
          closestDistance: minDistance === Infinity ? 0 : minDistance,
          primaryHook: primaryHook || primaryLead.address,
          purchases,
          isVetted,
          score: 0,
          lat: buyerLat,
          lng: buyerLng,
        };

        buyer.score = calculateHeatScore(buyer);
        processed.push(buyer);
      }

      // Group by primaryHook and apply limits
      const groupedByHook = new Map<string, BuyerRecord[]>();
      processed.forEach(b => {
        if (!groupedByHook.has(b.primaryHook)) {
          groupedByHook.set(b.primaryHook, []);
        }
        groupedByHook.get(b.primaryHook)!.push(b);
      });

      const finalLeads: BuyerRecord[] = [];
      const hookCount = activeSubjects.length;
      const limitPerHook = hookCount === 1 ? 50 : hookCount === 2 ? 25 : 20;

      for (const [hook, leads] of groupedByHook.entries()) {
        const uncalledLeads = leads.filter(l => {
          const hasBeenCalled = sessionLogs.some(log => 
            log.buyer_name === l.name && 
            log.subject_address === hook
          );
          return !hasBeenCalled;
        });

        uncalledLeads.sort((a, b) => b.score - a.score);
        finalLeads.push(...uncalledLeads.slice(0, limitPerHook));
      }

      finalLeads.sort((a, b) => b.score - a.score);

      setProcessedLeads(finalLeads);
      setSelectedLeadIds(new Set(finalLeads.map(l => l.id)));

      // Save session to history
      const newSession: DispoSession = {
        id: `session-${Date.now()}`,
        timestamp: new Date().toISOString(),
        name: `Mission: ${activeSubjects[0].address.split(',')[0]}`,
        subjects: updatedSubjects,
        buyers: finalLeads
      };
      await persistence.saveSession(newSession);
      loadHistory();

      toast.success("MISSION_ANALYSIS_COMPLETE");
    } catch (err) {
      console.error(err);
      toast.error("ERROR: PROCESSING_FAILURE");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleLeadSelection = (id: string) => {
    const next = new Set(selectedLeadIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeadIds(next);
  };

  const startSession = () => {
    const selected = processedLeads.filter(l => selectedLeadIds.has(l.id));
    if (selected.length === 0) {
      toast.error("ERROR: NO_LEADS_SELECTED");
      return;
    }
    onStartSession(selected);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative"
    >
      {/* Left Column: Mission Setup */}
      <div className="lg:col-span-4 space-y-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-display font-black text-neon-red uppercase tracking-[0.3em] italic drop-shadow-[0_0_8px_rgba(255,0,60,0.5)]">
            DISPO_INFERNO_MODULE
          </h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowHistory(!showHistory)}
              className={`h-8 w-8 rounded-none border border-white/10 ${showHistory ? 'bg-neon-green/20 text-neon-green' : 'text-zinc-500'}`}
            >
              <History className="w-4 h-4" />
            </Button>
            <Badge className="bg-neon-red/10 text-neon-red border-neon-red/20 text-[8px] font-mono rounded-none">V1.0.0</Badge>
          </div>
        </div>

        {showHistory ? (
          <Card className="glass-card border-white/10 scanline-overlay">
            <CardHeader className="border-b border-white/5 bg-white/[0.02]">
              <CardTitle className="flex items-center gap-3 text-neon-green font-display font-black uppercase tracking-widest text-sm italic">
                <History className="w-4 h-4" />
                MISSION_HISTORY
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="divide-y divide-white/5">
                  {pastSessions.length === 0 ? (
                    <div className="p-8 text-center text-[10px] font-mono text-zinc-600 uppercase">NO_PAST_MISSIONS_FOUND</div>
                  ) : (
                    pastSessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => reloadSession(session)}
                        className="w-full p-4 text-left hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-display font-black text-white uppercase group-hover:text-neon-green transition-colors">{session.name}</span>
                          <span className="text-[8px] font-mono text-zinc-500">{new Date(session.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">{session.buyers.length} LEADS</span>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">{session.subjects.filter(s => s.address).length} HOOKS</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="glass-card border-white/10 scanline-overlay">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <CardTitle className="flex items-center gap-3 text-neon-green font-display font-black uppercase tracking-widest text-sm italic">
                  <MapPin className="w-4 h-4" />
                  TARGET_HOOKS
                </CardTitle>
                <CardDescription className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">
                  Define subject property coordinates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {subjects.map((s, i) => (
                  <div key={i} className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-green/40 font-mono text-[10px] group-focus-within:text-neon-green transition-colors z-10">
                      SEC_0{i + 1}
                    </div>
                    <Input
                      placeholder="Enter Address..."
                      value={s.address}
                      onChange={(e) => handleSubjectChange(i, e.target.value)}
                      className="pl-16 bg-black/60 border-white/10 focus:border-neon-green/50 focus:ring-1 focus:ring-neon-green/20 rounded-none h-12 text-xs font-mono transition-all"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <CardTitle className="flex items-center gap-3 text-neon-green font-display font-black uppercase tracking-widest text-sm italic">
                  <Upload className="w-4 h-4" />
                  INTEL_STREAM
                </CardTitle>
                <CardDescription className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">
                  Ingest buyer transaction history.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <textarea 
                    className="w-full h-32 bg-black/60 border border-white/10 focus:border-neon-green/50 p-3 text-xs font-mono text-zinc-300 resize-none rounded-none focus:outline-none transition-all"
                    placeholder="Paste CSV or raw text data here..."
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                  />
                  <Button 
                    onClick={handlePasteSubmit}
                    disabled={!pasteText.trim() || isProcessing}
                    className="w-full bg-white/5 hover:bg-white/10 text-neon-green border border-white/10 rounded-none text-[10px] font-display font-black uppercase tracking-widest transition-all"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "APPEND_PASTED_DATA"}
                  </Button>
                </div>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink-0 mx-4 text-[10px] text-zinc-500 font-mono uppercase tracking-widest">OR</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                <div 
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-white/10 hover:border-neon-green/30 hover:bg-neon-green/5 rounded-none p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                  <Upload className="w-8 h-8 text-zinc-700 group-hover:text-neon-green transition-colors" />
                  <p className="text-[10px] font-display font-black text-zinc-400 group-hover:text-neon-green uppercase tracking-widest transition-colors">UPLOAD_CSV</p>
                </div>

                {accumulatedLeads.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-neon-green/10 border border-neon-green/30 p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-neon-green" />
                      <span className="text-[10px] font-display font-black text-neon-green uppercase tracking-widest">DATA_SYNCHRONIZED</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">{accumulatedLeads.length} RECORDS</span>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <div className="relative group">
          <div className="absolute -inset-1 bg-neon-green/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Button 
            onClick={runMission} 
            disabled={isProcessing || accumulatedLeads.length === 0}
            className={`relative w-full h-16 bg-[#00FF41] hover:bg-[#00FF41]/90 text-black font-display font-black text-lg rounded-none uppercase tracking-[0.2em] italic transition-all duration-500 shadow-[0_0_20px_rgba(0,255,65,0.4)] ${!isProcessing && accumulatedLeads.length > 0 ? 'animate-pulse-glow-green' : ''}`}
          >
            {isProcessing ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>ANALYZING...</span>
              </div>
            ) : (
              "ANALYZE_MISSION"
            )}
          </Button>
        </div>
      </div>

      {/* Right Column: Analysis */}
      <div className="lg:col-span-8 space-y-8 flex flex-col">
        {processedLeads.length > 0 ? (
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-xs font-display font-black text-white uppercase tracking-widest italic">MISSION_ANALYSIS_RESULTS</h3>
                <div className="h-px w-24 bg-white/10" />
              </div>
              <Button 
                onClick={startSession}
                className="h-10 bg-neon-red text-white font-display font-black uppercase tracking-widest text-[10px] rounded-none hover:bg-neon-red/80 px-8 animate-pulse-glow-red"
              >
                ENGAGE_{selectedLeadIds.size}_LEADS
              </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 min-h-[600px]">
              <Card className="glass-card border-white/10 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
                  <MapIcon className="w-3 h-3 text-neon-green" />
                  <span className="text-[10px] font-display font-black text-neon-green uppercase tracking-widest italic">TACTICAL_MAP</span>
                </div>
                <div className="flex-1 min-h-[400px]">
                  <TacticalMap 
                    subjects={subjects} 
                    leads={processedLeads} 
                    selectedLeadId={Array.from(selectedLeadIds)[0] as string | undefined} // Just highlighting first selected for now or we could track hover
                  />
                </div>
              </Card>

              <Card className="glass-card border-white/10 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
                  <FileText className="w-3 h-3 text-neon-green" />
                  <span className="text-[10px] font-display font-black text-neon-green uppercase tracking-widest italic">LEAD_INTEL</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="divide-y divide-white/5">
                    {processedLeads.map((lead) => (
                    <div 
                      key={lead.id} 
                      className={`p-4 flex items-center gap-4 transition-colors group ${selectedLeadIds.has(lead.id) ? 'bg-neon-green/5' : 'hover:bg-white/5'}`}
                    >
                      <button 
                        onClick={() => toggleLeadSelection(lead.id)}
                        className={`w-6 h-6 border flex items-center justify-center transition-all ${selectedLeadIds.has(lead.id) ? 'bg-neon-green border-neon-green shadow-[0_0_10px_rgba(0,255,65,0.4)]' : 'border-white/20 hover:border-neon-green/50'}`}
                      >
                        {selectedLeadIds.has(lead.id) && <CheckSquare className="w-4 h-4 text-black" />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-display font-black text-white uppercase truncate tracking-tight group-hover:text-neon-green transition-colors">{lead.name}</h3>
                          {lead.isVetted && <Badge className="bg-neon-green text-black text-[8px] font-display font-black h-4 px-1 rounded-none shadow-[0_0_8px_rgba(0,255,65,0.3)]">VETTED</Badge>}
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase truncate">{lead.llc}</p>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">HEAT</span>
                          <span className="text-sm font-display font-black text-neon-green tracking-tighter drop-shadow-[0_0_5px_rgba(0,255,65,0.3)]">{lead.score}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">DIST</span>
                          <span className="text-[10px] font-mono text-zinc-300">{lead.closestDistance.toFixed(1)}mi</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="h-full glass-card border-white/10 flex flex-col items-center justify-center p-12 text-center space-y-8 scanline-overlay">
            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center relative"
            >
              <Search className="w-12 h-12 text-zinc-700" />
              <div className="absolute inset-0 border border-neon-green/20" />
            </motion.div>
            <div className="space-y-4">
              <h3 className="text-xl font-display font-black text-zinc-400 uppercase tracking-[0.3em] italic drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                AWAITING_MISSION_PARAMETERS
              </h3>
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] text-zinc-600 font-mono max-w-xs mx-auto uppercase tracking-[0.2em] leading-relaxed">
                  Define target hooks and ingest lead data to generate tactical analysis.
                </p>
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
                      className="w-1 h-1 bg-neon-green"
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
