/**
 * AttomData API Service
 * Provides real-time property intelligence.
 */

export interface PropertyIntel {
  ownerName: string;
  lastSaleDate: string;
  lastSalePrice: number;
  assessedValue: number;
  yearBuilt: number;
  sqft: number;
  lotSize: number;
  beds: number;
  baths: number;
  propertyType: string;
}

const ATTOM_API_KEY = import.meta.env.VITE_ATTOM_API_KEY;
const BASE_URL = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";

export async function fetchPropertyIntel(fullAddress: string): Promise<PropertyIntel | null> {
  if (!ATTOM_API_KEY) {
    console.warn("ATTOM_API_KEY not configured. Skipping property intel fetch.");
    return null;
  }

  try {
    // Basic address parsing (very naive, assumes "Street, City, State Zip")
    const parts = fullAddress.split(",");
    if (parts.length < 2) return null;

    const address1 = parts[0].trim();
    const address2 = parts.slice(1).join(",").trim();

    const url = new URL(`${BASE_URL}/property/detail`);
    url.searchParams.append("address1", address1);
    url.searchParams.append("address2", address2);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "apikey": ATTOM_API_KEY,
        "accept": "application/json"
      }
    });

    if (!response.ok) {
      console.error("Attom API Error:", response.statusText);
      return null;
    }

    const data = await response.json();
    const property = data.property?.[0];

    if (!property) return null;

    return {
      ownerName: property.assessment?.owner?.owner1?.fullName || "Unknown Owner",
      lastSaleDate: property.sale?.amount?.saleDate || "N/A",
      lastSalePrice: property.sale?.amount?.saleAmt || 0,
      assessedValue: property.assessment?.assessed?.assdTotalValue || 0,
      yearBuilt: property.summary?.yearBuilt || 0,
      sqft: property.building?.size?.livingSize || 0,
      lotSize: property.lot?.lotSizeInSqFt || 0,
      beds: property.building?.rooms?.beds || 0,
      baths: property.building?.rooms?.bathTotal || 0,
      propertyType: property.summary?.propType || "Residential"
    };
  } catch (error) {
    console.error("Failed to fetch property intel:", error);
    return null;
  }
}
