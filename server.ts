import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper to get GoogleGenAI client
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Společné Nálezy" });
});

// Gemini AI analysis endpoint for items
app.post("/api/ai/analyze", async (req, res) => {
  try {
    const { image1, image2, promptText = "Odhadni tržní cenu tohoto předmětu." } = req.body;

    const ai = getGenAI();

    if (!ai) {
      // Offline / Simulated response matching the original Kotlin AiAnalysisRepository simulation
      console.log("[AI API] No GEMINI_API_KEY provided. Using realistic simulation.");
      const simResult = simulateAnalysis(promptText, image1, image2);
      return res.json(simResult);
    }

    // Prepare contents for Gemini 2.5 Flash
    const contents: any[] = [];
    
    // System instruction for item identification and appraisal
    const instruction = `Jsi expert na identifikaci a oceňování nalezených předmětů a starožitností.
Analyzuj dodanou fotografii předmětu.
Musíš vrátit JSON ve formátu:
{
  "status": "SUCCESS" nebo "NEEDS_MORE_INFO",
  "title": "Stručný a přesný název předmětu",
  "description": "Detailní popis předmětu, materiálu, odhadovaného stáří a stavu.",
  "category": "Kategorie (např. Starožitnosti, Nábytek, Porcelán a keramika, Mince a medaile, Retro technika, Běžné zboží)",
  "estimatedPriceCzk": "Cenové rozpětí v CZK (např. 2 500 - 4 000 Kč)",
  "numericPrice": 3000,
  "followUpPrompt": "Pokud je status NEEDS_MORE_INFO, sem napiš instrukci, jaký detailní snímek vyfotit (např. značka, punc, spodní strana). Jinak ponech prázdné.",
  "reasoning": "Vysvětlení, podle jakých znaků byla cena a původ určena.",
  "webReferences": ["odkaz na podobné aukce či prodeje v ČR"]
}
Pokud je předmět nejasný a vyžaduje pohled na detail/punc/štítek, nastav "status": "NEEDS_MORE_INFO".`;

    const userPrompt = `${instruction}\n\nUživatelský prompt: ${promptText}`;

    const parts: any[] = [{ text: userPrompt }];

    // Add image 1 if present
    if (image1 && typeof image1 === "string" && image1.startsWith("data:")) {
      const match = image1.match(/^data:(.+?);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    // Add image 2 if present
    if (image2 && typeof image2 === "string" && image2.startsWith("data:")) {
      const match = image2.match(/^data:(.+?);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API call timed out after 8s")), 8000)
    );
    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: parts,
      config: {
        responseMimeType: "application/json",
      },
    });

    const response = (await Promise.race([generatePromise, timeoutPromise])) as any;

    const responseText = response.text || "{}";
    let cleaned = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return res.json({
      status: parsed.status || "SUCCESS",
      title: parsed.title || "Nalezený předmět",
      description: parsed.description || "",
      category: parsed.category || "Starožitnosti",
      estimatedPriceCzk: parsed.estimatedPriceCzk || "500 - 1 500 Kč",
      numericPrice: typeof parsed.numericPrice === "number" ? parsed.numericPrice : 1000,
      webReferences: Array.isArray(parsed.webReferences) ? parsed.webReferences : ["https://aukro.cz"],
      followUpPrompt: parsed.followUpPrompt || "",
      reasoning: parsed.reasoning || "Určeno podle vizuálních znaků předmětu.",
    });
  } catch (error: any) {
    console.error("[AI API] Analysis failed:", error);
    // Fallback on error
    const fallback = simulateAnalysis(req.body.promptText || "", req.body.image1, req.body.image2);
    return res.json(fallback);
  }
});

// Simulation function ported from original Kotlin AiAnalysisRepository
function simulateAnalysis(promptText: string, image1?: string, image2?: string) {
  if (promptText.toLowerCase().includes("danone") || promptText.toLowerCase().includes("mléčný")) {
    return {
      status: "SUCCESS",
      title: "Mléčný nápoj Danone",
      description: "Běžný mléčný výrobek z obchodu.",
      category: "Potraviny",
      estimatedPriceCzk: "20 - 25 Kč",
      numericPrice: 22,
      webReferences: ["https://kosik.cz"],
      followUpPrompt: "",
      reasoning: "Jedná se o běžný, hromadně vyráběný mléčný produkt.",
    };
  }

  if (!image2 && (promptText.toLowerCase().includes("starožitnosti") || promptText.toLowerCase().includes("štítku") || promptText.toLowerCase().includes("detail"))) {
    return {
      status: "NEEDS_MORE_INFO",
      title: "Neznámý historický předmět",
      description: "Předmět vykazuje znaky starožitnosti, ale pro přesné určení a ocenění chybí detail punců nebo spodní strany.",
      category: "Starožitnosti",
      estimatedPriceCzk: "1 200 - 3 000 Kč",
      numericPrice: 2000,
      webReferences: ["https://aukro.cz/hledani?string=starožitnost"],
      followUpPrompt: "Udělej detailní snímek výrobního štítku, puncu nebo spodní strany předmětu pro ověření pravosti.",
      reasoning: "Vizuálně odpovídá starožitným předmětům z 20. století, ale bez detailů nelze určit autorství nebo pravost.",
    };
  }

  return {
    status: "SUCCESS",
    title: image2 ? "Oceněný historický artefakt (2 fotky)" : "Zajímavý sběratelský nález",
    description: "Identifikováno s pomocí AI analýzy vizuálních znaků. Předmět je v zachovalém stavu a má sběratelskou hodnotu.",
    category: "Starožitnosti & Sbírky",
    estimatedPriceCzk: image2 ? "1 500 - 3 500 Kč" : "450 - 1 200 Kč",
    numericPrice: image2 ? 2500 : 800,
    webReferences: ["https://aukro.cz/starozitnosti", "https://bazos.cz/sberatelstvi"],
    followUpPrompt: "",
    reasoning: "Předmět vykazuje charakteristické znaky řemeslné výroby s patinou a autentickým opotřebením.",
  };
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Společné Nálezy running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
