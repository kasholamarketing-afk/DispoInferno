/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PropertyIntel } from "./lib/attom";

export interface PurchaseRecord {
  address: string;
  distance: number; // Miles from target
  date?: string;
  price?: number;
  rawRecord?: any;
}

export type BuyerType = "GENERAL BUYER" | "LISTING AGENT (LA)" | "BUYER AGENT (BA)" | "AGENT";

export interface BuyerRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  type: string;
  llc: string;
  score: number;
  closestDistance: number;
  primaryHook: string; // The address that matched
  purchases: PurchaseRecord[];
  isVetted: boolean;
  lastCalled?: string;
  notes?: string;
  lat?: number;
  lng?: number;
  communicationPreference?: "Phone" | "Email" | "Text";
  lastContacted?: string;
}

export interface SubjectProperty {
  address: string;
  lat?: number;
  lng?: number;
  intel?: PropertyIntel;
}

export interface SessionLog {
  id?: string;
  timestamp: string;
  buyer_id: string;
  buyer_name: string;
  subject_address: string;
  status: "ANSWERED" | "NO_ANSWER" | "LEFT_VM" | "SKIPPED";
  notes?: string;
}

export const RANKING_CONFIG = {
  DISTANCE_PENALTY_BASE: 100,
  WHALE_BONUS_PER_PURCHASE: 50,
  DIRECTORY_BONUS: 500,
};

/**
 * Tactical Ranking Algorithm
 * Distance Penalty: 100 / max(1, miles).
 * Whale Bonus: +50 for every repeat purchase.
 * Directory Bonus: +500 if vetted.
 */
export function calculateHeatScore(buyer: Partial<BuyerRecord>): number {
  // 1. Distance Penalty (Closer = much higher score)
  const dist = buyer.closestDistance || 0;
  const distPenalty = dist > 0 ? (100 / Math.max(1, dist)) : 200;
  
  // 2. Whale Bonus (Adds 50 points for every extra property they own in the area)
  const purchaseCount = buyer.purchases?.length || 0;
  const whaleBonus = purchaseCount > 1 ? (purchaseCount - 1) * 50 : 0;
  
  // 3. Vetted Bonus (Instant +500 if they are in our 'Primary Buyers' database)
  const vettedBonus = buyer.isVetted ? 500 : 0;
  
  return Math.round(distPenalty + whaleBonus + vettedBonus);
}
