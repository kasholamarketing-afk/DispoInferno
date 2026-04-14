import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { useState } from "react";
import { BuyerRecord, SubjectProperty } from "@/types";
import { MapPin, Target } from "lucide-react";

interface TacticalMapProps {
  subjects: SubjectProperty[];
  leads: BuyerRecord[];
  selectedLeadId?: string | null;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAP_ID = "tactical_map_v1"; // You can create a custom map style in Google Cloud Console

export default function TacticalMap({ subjects, leads, selectedLeadId }: TacticalMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<BuyerRecord | SubjectProperty | null>(null);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-full bg-black/40 border border-white/10 flex items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <MapPin className="w-12 h-12 text-zinc-700 mx-auto" />
          <h3 className="text-sm font-display font-black text-zinc-500 uppercase tracking-widest">
            MAP_SYSTEM_OFFLINE
          </h3>
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider max-w-xs">
            VITE_GOOGLE_MAPS_API_KEY is required to initialize tactical visualization.
          </p>
        </div>
      </div>
    );
  }

  // Calculate center based on subjects
  const activeSubjects = subjects.filter(s => s.lat && s.lng);
  const center = activeSubjects.length > 0 
    ? { lat: activeSubjects[0].lat!, lng: activeSubjects[0].lng! }
    : { lat: 34.0522, lng: -118.2437 }; // Default to LA

  return (
    <div className="w-full h-full relative border border-white/10 overflow-hidden">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={11}
          mapId={MAP_ID}
          disableDefaultUI={true}
          gestureHandling={'greedy'}
          style={{ width: '100%', height: '100%' }}
          colorScheme="DARK"
        >
          {/* Subject Markers */}
          {activeSubjects.map((subject, index) => (
            <AdvancedMarker
              key={`subject-${index}`}
              position={{ lat: subject.lat!, lng: subject.lng! }}
              onClick={() => setSelectedMarker(subject)}
            >
              <div className="relative group">
                <div className="absolute -inset-4 bg-neon-red/20 blur-xl rounded-full animate-pulse" />
                <div className="relative bg-black border-2 border-neon-red p-1.5 shadow-[0_0_15px_rgba(255,0,60,0.5)]">
                  <Target className="w-4 h-4 text-neon-red" />
                </div>
              </div>
            </AdvancedMarker>
          ))}

          {/* Lead Markers */}
          {leads.map((lead) => (
            lead.lat && lead.lng && (
              <AdvancedMarker
                key={lead.id}
                position={{ lat: lead.lat, lng: lead.lng }}
                onClick={() => setSelectedMarker(lead)}
              >
                <div className={`relative transition-all duration-300 ${selectedLeadId === lead.id ? 'scale-125 z-50' : 'scale-100 z-10'}`}>
                  {selectedLeadId === lead.id && (
                    <div className="absolute -inset-4 bg-neon-green/30 blur-xl rounded-full animate-pulse" />
                  )}
                  <div className={`relative p-1 border-2 transition-all ${
                    selectedLeadId === lead.id 
                      ? 'bg-neon-green border-black shadow-[0_0_20px_rgba(0,255,65,0.6)]' 
                      : 'bg-black border-neon-green/50 shadow-[0_0_10px_rgba(0,255,65,0.2)]'
                  }`}>
                    <div className={`w-2 h-2 ${selectedLeadId === lead.id ? 'bg-black' : 'bg-neon-green'}`} />
                  </div>
                </div>
              </AdvancedMarker>
            )
          ))}

          {selectedMarker && (
            <InfoWindow
              position={
                'address' in selectedMarker 
                  ? { lat: selectedMarker.lat!, lng: selectedMarker.lng! }
                  : { lat: (selectedMarker as BuyerRecord).lat!, lng: (selectedMarker as BuyerRecord).lng! }
              }
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="p-2 bg-black text-white min-w-[200px]">
                <h4 className="text-xs font-display font-black text-neon-green uppercase tracking-widest mb-1">
                  {'name' in selectedMarker ? selectedMarker.name : 'TARGET_HOOK'}
                </h4>
                <p className="text-[10px] font-mono text-zinc-400 uppercase leading-tight">
                  {selectedMarker.address}
                </p>
                {'score' in selectedMarker && (
                  <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase">HEAT_SCORE</span>
                    <span className="text-xs font-display font-black text-neon-green">{(selectedMarker as BuyerRecord).score}</span>
                  </div>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Map Overlay UI */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 space-y-1">
          <h3 className="text-[10px] font-display font-black text-white uppercase tracking-[0.2em] italic">
            TACTICAL_VISUALIZATION
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-neon-red shadow-[0_0_5px_rgba(255,0,60,0.5)]" />
              <span className="text-[8px] font-mono text-zinc-400 uppercase">TARGETS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-neon-green shadow-[0_0_5px_rgba(0,255,65,0.5)]" />
              <span className="text-[8px] font-mono text-zinc-400 uppercase">LEADS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-green/30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-green/30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-green/30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-green/30 pointer-events-none" />
    </div>
  );
}
