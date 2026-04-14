import Papa from 'papaparse';

/**
 * Heuristic Parsing Logic for Dispo Inferno
 */

export interface ParsedLead {
  name: string;
  phone: string;
  email: string;
  address: string;
  llc: string;
  type: string;
  raw?: any;
}

export const PHONE_REGEX = /[0-9\(\)\-\s]{10,}/;
export const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
export const ADDRESS_REGEX = /[0-9]{1,5}\s+[A-Za-z0-9\s,]+/;

export const parseCSVString = (csvString: string): Promise<ParsedLead[]> => {
  return new Promise((resolve) => {
    Papa.parse(csvString, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        let extractedLeads: ParsedLead[] = [];
        let currentMode: "UNKNOWN" | "BUYER" | "AGENT" = "UNKNOWN";
        let colMap: { [key: string]: number } = {};

        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          const rowStr = row.join("").toLowerCase();
          const filledCells = row.filter(c => c && c.trim()).length;
          
          // --- LAYER 1: ADAPTIVE BLOCK LOGIC (MDP/CBRS Section Resets) ---
          const isBlockHeader = filledCells < 4 && (
            rowStr.includes('cbrs') || 
            rowStr.includes('mdp') || 
            rowStr.includes('avoid') || 
            rowStr.includes('owner') || 
            rowStr.includes('listing agent') || 
            rowStr.includes('closed ba')
          );

          if (isBlockHeader) {
            console.log(`📍 Block Reset at Row ${r}: "${row[0]}"`);
            
            // Look ahead for labels (sometimes labels are in the same row or next row)
            let labels = rows[r];
            if (filledCells < 2) labels = rows[r + 1];

            if (labels) {
              colMap = {}; 
              labels.forEach((l, idx) => {
                const label = String(l).toLowerCase().trim();
                if (label) colMap[label] = idx;
              });
              
              const labelStr = labels.join("").toLowerCase();
              if (labelStr.includes('agent') || labelStr.includes('broker') || labelStr.includes('ba') || labelStr.includes('la')) {
                currentMode = "AGENT";
              } else {
                currentMode = "BUYER";
              }
            }
            if (filledCells < 2) r++; 
            continue;
          }

          // --- LAYER 3: FRONTEND HEADER DETECTION (Mode Switching) ---
          const hasAddress = rowStr.includes("address") || rowStr.includes("property");
          const hasName = rowStr.includes("name") || rowStr.includes("first") || rowStr.includes("last") || rowStr.includes("agent") || rowStr.includes("ba") || rowStr.includes("la");
          const hasContact = rowStr.includes("phone") || rowStr.includes("email");
          const hasAgentKeywords = rowStr.includes("agent") || rowStr.includes("broker") || rowStr.includes("ba") || rowStr.includes("la");

          if (hasAddress && (hasName || hasContact) && filledCells > 3) {
            currentMode = hasAgentKeywords ? "AGENT" : "BUYER";
            colMap = {};
            row.forEach((col, idx) => { 
              if (col) colMap[col.toLowerCase().trim()] = idx;
            });
            continue;
          }
          
          // --- LAYER 2: HEURISTIC "CELL-BY-CELL" FALLBACK ---
          if (Object.keys(colMap).length === 0 || currentMode === "UNKNOWN") {
            let email = "";
            let phone = "";
            let address = "";
            let name = "";

            row.forEach(cell => {
              const val = String(cell || '').trim();
              if (!val) return;

              if (!phone && val.replace(/[^0-9]/g, '').length >= 10) {
                phone = val;
              } 
              else if (!email && EMAIL_REGEX.test(val)) {
                email = val.toLowerCase();
              } 
              else if (!address && ADDRESS_REGEX.test(val)) {
                address = val;
              }
              else if (!name && val.length > 2 && !val.includes('@') && !/[0-9]/.test(val)) {
                name = val;
              }
            });
            
            if (!name && email) name = email.split('@')[0];
            
            if (address || (phone && phone.length >= 10)) {
              extractedLeads.push({ 
                address, 
                name: name || "Unknown Lead", 
                phone: phone || "No Phone", 
                email,
                llc: "Individual",
                type: "GENERAL BUYER"
              });
            }
          } else {
            // --- LAYER 3: MAPPED COLUMN EXTRACTION ---
            const address = row[colMap["address"]] || row[colMap["property address"]] || row[colMap["mailing address"]] || row[colMap["property"]] || row[colMap["city"]] || "";
            
            const firstName = row[colMap["first name"]] || row[colMap["first"]] || row[colMap["owner first name"]] || "";
            const lastName = row[colMap["last name"]] || row[colMap["last"]] || row[colMap["owner last name"]] || "";
            const fullName = row[colMap["name"]] || row[colMap["full name"]] || row[colMap["buyer name"]] || row[colMap["listing agent - active remodeled"]] || row[colMap["closed ba - as-is"]] || "";
            const name = fullName || `${firstName} ${lastName}`.trim() || "Unknown Lead";
            
            const phone = row[colMap["phone"]] || row[colMap["phone 1"]] || row[colMap["mobile"]] || row[colMap["contact phone"]] || row[colMap["phone number"]] || row[colMap["phone1_number"]] || row[colMap["owner phone1"]] || row[colMap["owner phone2"]] || "No Phone";
            const email = row[colMap["email"]] || row[colMap["email 1"]] || row[colMap["contact email"]] || "";
            const llc = row[colMap["llc"]] || row[colMap["company"]] || row[colMap["entity"]] || row[colMap["vesting"]] || row[colMap["la broker"]] || row[colMap["ba broker"]] || "Individual";

            // Tagging Logic
            let type = "GENERAL BUYER";
            if (currentMode === "AGENT") {
              const headers = Object.keys(colMap).join(" ");
              if (headers.includes("listing agent") || headers.includes("la")) {
                type = "LISTING AGENT (LA)";
              } else if (headers.includes("buyers agent") || headers.includes("selling agent") || headers.includes("ba") || headers.includes("closed ba")) {
                type = "BUYER AGENT (BA)";
              } else {
                type = "AGENT";
              }
            }

            if (address || (phone !== "No Phone" && phone.length >= 10)) {
              extractedLeads.push({ address, name, phone, email, llc, type });
            }
          }
        }
        resolve(extractedLeads);
      }
    });
  });
};

export function parseLeadsHeuristically(text: string): Promise<ParsedLead[]> {
  return parseCSVString(text);
}
