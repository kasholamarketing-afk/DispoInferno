/**
 * Twilio Frontend Service
 */

export async function sendSms(to: string, body: string) {
  try {
    const response = await fetch("/api/twilio/sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, body }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to send SMS");
    }
    return data;
  } catch (error) {
    console.error("sendSms error:", error);
    throw error;
  }
}

export async function initiateCall(to: string, url?: string) {
  try {
    const response = await fetch("/api/twilio/call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, url }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to initiate call");
    }
    return data;
  } catch (error) {
    console.error("initiateCall error:", error);
    throw error;
  }
}

export async function getCallStatus(sid: string) {
  try {
    const response = await fetch(`/api/twilio/call-status/${sid}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch call status");
    }
    return data.status;
  } catch (error) {
    console.error("getCallStatus error:", error);
    throw error;
  }
}
