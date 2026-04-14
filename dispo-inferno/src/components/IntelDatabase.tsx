import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Database, 
  History, 
  Search,
  UserCheck,
  Phone,
  Clock,
  Target
} from "lucide-react";
import { BuyerRecord, SessionLog } from "@/types";
import { format } from "date-fns";

interface IntelDatabaseProps {
  vettedBuyers: BuyerRecord[];
  setVettedBuyers: (buyers: BuyerRecord[]) => void;
  sessionLogs: SessionLog[];
}

export default function IntelDatabase({ vettedBuyers, sessionLogs }: IntelDatabaseProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = useMemo(() => {
    return sessionLogs.filter(log => 
      log.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject_address.toLowerCase().includes(searchTerm.toLowerCase())
    ).reverse();
  }, [sessionLogs, searchTerm]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Session Archive */}
      <div className="lg:col-span-8 space-y-6">
        <Card className="glass-card border-white/10 scanline-overlay">
          <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.02]">
            <div className="space-y-1">
              <CardTitle className="text-sm font-display font-black text-white italic uppercase tracking-widest flex items-center gap-3">
                <History className="w-4 h-4 text-neon-red animate-pulse" />
                SESSION_ARCHIVE
              </CardTitle>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Historical tactical engagement logs.</p>
            </div>
            <div className="relative w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 group-focus-within:text-neon-green transition-colors" />
              <input 
                type="text" 
                placeholder="SEARCH_LOGS..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/60 border border-white/10 h-10 pl-10 pr-4 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-neon-green/50 transition-all rounded-none"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-white/5">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, idx) => (
                    <div key={idx} className="p-5 flex items-center gap-8 hover:bg-white/[0.03] transition-all group">
                      <div className="w-14 h-14 bg-white/[0.02] border border-white/10 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-neon-red/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[8px] font-mono text-zinc-500 uppercase relative z-10">{format(new Date(log.timestamp), 'MMM')}</span>
                        <span className="text-lg font-display font-black text-white relative z-10">{format(new Date(log.timestamp), 'dd')}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-display font-black text-white uppercase truncate tracking-tight group-hover:text-neon-green transition-colors">{log.buyer_name}</h4>
                          <Badge className={`text-[8px] font-display font-black h-4 px-2 rounded-none shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
                            log.status === "ANSWERED" ? "bg-neon-green text-black animate-pulse-glow-green" : 
                            log.status === "NO_ANSWER" ? "bg-neon-red/20 text-neon-red border border-neon-red/30" : 
                            "bg-zinc-800 text-zinc-400 border border-white/5"
                          }`}>
                            {log.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-6 mt-2">
                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                            <Target className="w-3 h-3 text-neon-green/40" />
                            <span className="truncate max-w-[200px]">{log.subject_address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                            <Clock className="w-3 h-3 text-zinc-700" />
                            {format(new Date(log.timestamp), 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-24 text-center space-y-6">
                    <div className="w-16 h-16 bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                      <History className="w-8 h-8 text-zinc-800" />
                    </div>
                    <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em]">NO_HISTORICAL_DATA_FOUND</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Vetted Directory */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="glass-card border-white/10 scanline-overlay">
          <CardHeader className="border-b border-white/5 bg-white/[0.02]">
            <CardTitle className="text-sm font-display font-black text-white italic uppercase tracking-widest flex items-center gap-3">
              <UserCheck className="w-4 h-4 text-neon-green" />
              VETTED_DIRECTORY
            </CardTitle>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Trusted high-volume buyers.</p>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-white/5">
                {vettedBuyers.length > 0 ? (
                  vettedBuyers.map((buyer) => (
                    <div key={buyer.id} className="p-5 hover:bg-white/[0.03] transition-all space-y-3 group">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-display font-black text-white uppercase tracking-tight group-hover:text-neon-green transition-colors">{buyer.name}</h4>
                        <span className="text-[10px] font-mono text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.3)]">{buyer.score}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        <Phone className="w-3 h-3 text-zinc-700 group-hover:text-neon-green transition-colors" />
                        {buyer.phone}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-neon-red/40" />
                        <p className="text-[9px] font-mono text-zinc-600 uppercase truncate tracking-widest">{buyer.llc}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-16 text-center space-y-6">
                    <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                      <Database className="w-6 h-6 text-zinc-800" />
                    </div>
                    <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em]">DIRECTORY_EMPTY</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
