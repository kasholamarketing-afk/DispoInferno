/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionLog, BuyerRecord } from "@/types";
import { toast } from "sonner";
import { getSupabase } from "./supabase";

/**
 * Data Resilience Protocol: Persistence Service
 * Handles emergency recovery and retry mechanisms.
 */

const RETRY_LIMIT = 3;
const RETRY_DELAY = 1000;

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface DispoSession {
  id: string;
  timestamp: string;
  subjects: any[];
  buyers: BuyerRecord[];
  name: string;
}

export const persistence = {
  /**
   * Save a mission session to the database.
   */
  async saveSession(session: DispoSession): Promise<boolean> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('dispo_sessions').upsert([session]);
      if (error) throw error;
      
      // Also save to local storage as fallback
      const sessions = JSON.parse(localStorage.getItem("dispo_sessions") || "[]");
      const index = sessions.findIndex((s: any) => s.id === session.id);
      if (index !== -1) sessions[index] = session;
      else sessions.push(session);
      localStorage.setItem("dispo_sessions", JSON.stringify(sessions));
      
      return true;
    } catch (error) {
      console.warn("[Persistence] Supabase save failed, using localStorage only.", error);
      const sessions = JSON.parse(localStorage.getItem("dispo_sessions") || "[]");
      const index = sessions.findIndex((s: any) => s.id === session.id);
      if (index !== -1) sessions[index] = session;
      else sessions.push(session);
      localStorage.setItem("dispo_sessions", JSON.stringify(sessions));
      return true;
    }
  },

  /**
   * Log a call outcome.
   */
  async logCall(log: SessionLog): Promise<boolean> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('dispo_calls').insert([log]);
      if (error) throw error;
      return true;
    } catch (error) {
      console.warn("[Persistence] Call log Supabase failed, using localStorage fallback.", error);
      const logs = JSON.parse(localStorage.getItem("dispo_calls") || "[]");
      logs.push(log);
      localStorage.setItem("dispo_calls", JSON.stringify(logs));
      return true;
    }
  },

  /**
   * Get all past sessions.
   */
  async getSessions(): Promise<DispoSession[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('dispo_sessions')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn("[Persistence] Get sessions Supabase failed, using localStorage.", error);
      return JSON.parse(localStorage.getItem("dispo_sessions") || "[]").sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
  },

  /**
   * Get call logs for a specific session/buyer.
   */
  async getCallLogs(buyerId?: string): Promise<SessionLog[]> {
    try {
      const supabase = getSupabase();
      let query = supabase.from('dispo_calls').select('*');
      if (buyerId) query = query.eq('buyer_id', buyerId);
      
      const { data, error } = await query.order('timestamp', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      const logs = JSON.parse(localStorage.getItem("dispo_calls") || "[]");
      if (buyerId) return logs.filter((l: any) => l.buyer_id === buyerId);
      return logs;
    }
  }
};
