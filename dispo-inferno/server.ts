import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Twilio Client Initialization (Lazy)
  let twilioClient: any = null;
  const getTwilioClient = () => {
    if (!twilioClient) {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      if (!sid || !token) {
        throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required");
      }
      twilioClient = twilio(sid, token);
    }
    return twilioClient;
  };

  // API Routes
  app.post("/api/twilio/sms", async (req, res) => {
    try {
      const { to, body } = req.body;
      const client = getTwilioClient();
      const from = process.env.TWILIO_PHONE_NUMBER;

      if (!from) {
        return res.status(500).json({ error: "TWILIO_PHONE_NUMBER is not configured" });
      }

      const message = await client.messages.create({
        body,
        to,
        from,
      });

      res.json({ success: true, sid: message.sid });
    } catch (error: any) {
      console.error("Twilio SMS Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/twilio/call", async (req, res) => {
    try {
      const { to, url } = req.body;
      const client = getTwilioClient();
      const from = process.env.TWILIO_PHONE_NUMBER;

      if (!from) {
        return res.status(500).json({ error: "TWILIO_PHONE_NUMBER is not configured" });
      }

      const call = await client.calls.create({
        url: url || "http://demo.twilio.com/docs/voice.xml",
        to,
        from,
      });

      res.json({ success: true, sid: call.sid });
    } catch (error: any) {
      console.error("Twilio Call Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/twilio/call-status/:sid", async (req, res) => {
    try {
      const { sid } = req.params;
      const client = getTwilioClient();
      const call = await client.calls(sid).fetch();
      res.json({ success: true, status: call.status });
    } catch (error: any) {
      console.error("Twilio Status Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
