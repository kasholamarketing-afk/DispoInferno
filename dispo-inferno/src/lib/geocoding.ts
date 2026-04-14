/**
 * Geocoding and Distance Logic
 */

export interface GeoLocation {
  lat: number;
  lng: number;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * Geocoding using Google Maps API if key is available, otherwise falls back to deterministic mock.
 */
export async function geocode(address: string): Promise<GeoLocation | null> {
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng };
      }
      console.warn(`Geocoding failed for address: ${address}`, data.status);
    } catch (error) {
      console.error("Error calling Google Maps Geocoding API:", error);
    }
  }

  // Fallback to mock for demo purposes if API fails or key is missing
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Deterministic mock coordinates based on address string
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const lat = 34.0522 + (hash % 100) / 1000; // Centered around LA
  const lng = -118.2437 + ((hash >> 8) % 100) / 1000;
  
  return { lat, lng };
}

export function calculateDistanceMiles(loc1: GeoLocation, loc2: GeoLocation): number {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
