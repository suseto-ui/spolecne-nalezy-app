import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

// Capacitor WebView calls the public API from a different origin.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper to get GoogleGenAI client with official AI Studio Build user-agent
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Společné Nálezy" });
});

// Digital Asset Links for Android TWA APK validation
app.get("/.well-known/assetlinks.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "cz.spolecnenalezy.app",
        sha256_cert_fingerprints: [
          "14:6D:E9:7D:01:A0:6C:C1:F6:28:C2:59:7A:B4:DE:6E:9A:BA:5D:84:DE:C2:08:92:4B:B2:7D:A6:61:52:F5:BD"
        ]
      }
    }
  ]);
});

// Gemini AI analysis endpoint for items
app.post("/api/ai/analyze", async (req, res) => {
  try {
    const { image1, image2, promptText = "Odhadni tržní cenu tohoto předmětu." } = req.body;

    const ai = getGenAI();

    if (!ai) {
      return res.status(503).json({
        error: "AI služba není nakonfigurovaná. Výsledek nebyl vytvořen.",
      });
    }

    if (!image1 || typeof image1 !== "string" || !image1.startsWith("data:")) {
      return res.status(400).json({
        error: "Chybí platná fotografie předmětu.",
      });
    }

    // Prepare contents for Gemini Flash
    const contents: any[] = [];
    
    // System instruction for item identification and appraisal
    const instruction = `Jsi opatrný expert na identifikaci nalezených předmětů a orientační ocenění v ČR.
Analyzuj výhradně to, co je skutečně vidět na dodané fotografii. Nevymýšlej značku, materiál, stáří, stav, punc, model ani vlastnosti, které fotografie nepotvrzuje.
Pokud je předmět malý, rozmazaný, zakrytý nebo identifikace není jistá, vrať NEEDS_MORE_INFO místo hádání a požádej o konkrétní detail.
Cena je pouze orientační rozpětí pro běžný český bazar/aukci, ne vydávej ji za ověřenou tržní cenu. Bez ověřitelné značky, modelu nebo rozměrů použij široké rozpětí a nízkou jistotu.
Nevytvářej odkazy na konkrétní nabídky, pokud je skutečně nemůžeš ověřit; v takovém případě vrať prázdné webReferences.
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
Pokud je předmět nejasný nebo fotografie neumožňuje bezpečnou identifikaci, nastav "status": "NEEDS_MORE_INFO".`;

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

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API call timed out")), 30000)
    );
    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: {
        parts: parts
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    const response = (await Promise.race([generatePromise, timeoutPromise])) as any;

    const responseText = response.text || "{}";
    let cleaned = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (
      (parsed.status !== "SUCCESS" && parsed.status !== "NEEDS_MORE_INFO") ||
      typeof parsed.title !== "string" ||
      typeof parsed.description !== "string" ||
      typeof parsed.category !== "string" ||
      typeof parsed.estimatedPriceCzk !== "string" ||
      typeof parsed.numericPrice !== "number" ||
      !Array.isArray(parsed.webReferences)
    ) {
      throw new Error("Gemini returned an incomplete analysis");
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error("[AI API] Gemini call error or timeout:", error?.message || error);
    return res.status(502).json({
      error: "AI analýzu se nepodařilo spolehlivě dokončit. Výsledek nebyl vytvořen.",
    });
  }
});

// Intelligent simulation engine for object identification, description and appraisal
function simulateAnalysis(promptText: string, image1?: string, image2?: string) {
  const p = promptText.toLowerCase();

  // 1. Food / Modern product test
  if (p.includes("danone") || p.includes("mléčný") || p.includes("jogurt") || p.includes("potravin")) {
    return {
      status: "SUCCESS",
      title: "Mléčný nápoj Danone",
      description: "Běžný mléčný chlazený výrobek z maloobchodní sítě. Plastový obal s originálním potiskem.",
      category: "Běžné zboží & Potraviny",
      estimatedPriceCzk: "22 - 28 Kč",
      numericPrice: 25,
      webReferences: ["https://kosik.cz", "https://rohlik.cz"],
      followUpPrompt: "",
      reasoning: "Jedná se o běžný průmyslový spotřební produkt s nízkou sběratelskou hodnotou.",
    };
  }

  // 2. Numismatics & Coins
  if (p.includes("minc") || p.includes("tolar") || p.includes("korun") || p.includes("dukát") || p.includes("haléř") || p.includes("krejcar") || p.includes("medail")) {
    return {
      status: "SUCCESS",
      title: "Stříbrná historická mince / tolar z 19. století",
      description: "Historická oběžná či pamětní mince ražená ze stříbra (cca 1870–1915). Na aversu je patrný panovnický portrét s opisem, revers nese říšský znak s nominálem. Zachovalá jemná patina, zřetelný perlovec a bez stop nešetrného čištění.",
      category: "Mince a medaile",
      estimatedPriceCzk: "1 400 - 3 200 Kč",
      numericPrice: 2200,
      webReferences: ["https://aukro.cz/mince", "https://www.numismatika.cz"],
      followUpPrompt: "",
      reasoning: "Stříbrná ražba v zachovalém sběratelském stavu 1/1 s čitelným letopočtem a zachovalým leskem v plochách.",
    };
  }

  // 3. Pocket Watches & Clocks
  if (p.includes("hodin") || p.includes("cibul") || p.includes("orloj") || p.includes("stopk") || p.includes("ciferník")) {
    return {
      status: "SUCCESS",
      title: "Secesní stříbrné kapesní hodinky (cibule)",
      description: "Tříplášťové kapesní hodinky s gravírovaným zadním víkem florálními motivy (období secese cca 1905–1920). Smaltovaný ciferník s arabskými i římskými číslicemi, samostatný sekundový subciferník na pozici 6. Mechanický kalibr s kotvovým krokem.",
      category: "Hodiny a hodinky",
      estimatedPriceCzk: "3 500 - 6 800 Kč",
      numericPrice: 4800,
      webReferences: ["https://aukro.cz/hodinky-a-hodiny", "https://antik-bazar.cz/hodiny"],
      followUpPrompt: "",
      reasoning: "Mechanické hodinky s nepoškozeným smaltem ciferníku a zachovalým gilošováním pláště.",
    };
  }

  // 4. Porcelain, Ceramics & Pottery
  if (p.includes("porcelán") || p.includes("keramik") || p.includes("džbán") || p.includes("talíř") || p.includes("váza") || p.includes("soška") || p.includes("cibulák") || p.includes("mísa")) {
    return {
      status: "SUCCESS",
      title: "Ručně malovaná porcelánová váza s květinovým dekorem",
      description: "Kvalitní český porcelán z proslulé oblasti Karlovarska / Dubí (období meziválečné, cca 1920–1938). Plasticky tvarovaný okraj se zlacenou linkou, ručně malovaný florální dekor v pastelových tónech. Spodní strana nese podglazurní značku výrobce.",
      category: "Porcelán a keramika",
      estimatedPriceCzk: "1 200 - 2 900 Kč",
      numericPrice: 1900,
      webReferences: ["https://aukro.cz/keramika-a-porcelan", "https://bazos.cz/starozitnosti"],
      followUpPrompt: "",
      reasoning: "Výborný stav bez oťuků, vlasových trhlin a se zachovalým zlacením na lemech.",
    };
  }

  // 5. Glass & Crystal
  if (p.includes("sklo") || p.includes("láhev") || p.includes("karaf") || p.includes("křišťál") || p.includes("sklenic") || p.includes("vitráž")) {
    return {
      status: "SUCCESS",
      title: "Broušená křišťálová karafa se zátkou (první republika)",
      description: "Olovnaté křišťálové sklo s precizním hvězdicovým a fasetovým brusem z českých skláren (cca 1925–1935). Kompletní včetně původní broušené skleněné zátky. Čiré sklo s vysokým lomem světla, bez vnitřního vodního kamene.",
      category: "Sklo a krystaly",
      estimatedPriceCzk: "900 - 2 400 Kč",
      numericPrice: 1600,
      webReferences: ["https://aukro.cz/sklo", "https://sberatel.com"],
      followUpPrompt: "",
      reasoning: "Klasická česká sklářská tradice první poloviny 20. století v intaktním sběratelském stavu.",
    };
  }

  // 6. Militaria & Badges
  if (p.includes("vojensk") || p.includes("militari") || p.includes("odznak") || p.includes("bajonet") || p.includes("helma") || p.includes("přilba") || p.includes("zbraň") || p.includes("bodák")) {
    return {
      status: "SUCCESS",
      title: "Dobový vojenský pamětní odznak s patinou",
      description: "Kovový vojenský odznak ražený z tombaku / mosazi s původní ušlechtilou patinou (období první poloviny 20. století). Funkční zadní připínací systém, ostrá reliéfní kresba detailů bez mechanických deformací.",
      category: "Militarie a odznaky",
      estimatedPriceCzk: "800 - 2 100 Kč",
      numericPrice: 1300,
      webReferences: ["https://aukro.cz/militarie", "https://valka.cz"],
      followUpPrompt: "",
      reasoning: "Autentický historický artefakt s vysokou vypovídací hodnotou a nečištěnou původní patinou.",
    };
  }

  // 7. Jewelry & Precious metals
  if (p.includes("šperk") || p.includes("prsten") || p.includes("brož") || p.includes("stříbr") || p.includes("zlat") || p.includes("punc") || p.includes("granát") || p.includes("řetízek")) {
    return {
      status: "SUCCESS",
      title: "Starožitná stříbrná brož s českými granáty",
      description: "Klasický český granátový šperk z dílen na Turnovsku (cca 1910–1930). Stříbrná montáž (ryzost Ag 800/1000) osazená přírodními pyropy s fasetovým brusem v několika stupních. Původní funkční jehlice s pojistkou.",
      category: "Šperky a drahé kovy",
      estimatedPriceCzk: "2 600 - 5 200 Kč",
      numericPrice: 3800,
      webReferences: ["https://aukro.cz/starozitne-sperky", "https://granat.cz"],
      followUpPrompt: "",
      reasoning: "Žádaný sběratelský granátový šperk s kompletním osazením všech kamenů a dobovým puncem.",
    };
  }

  // 8. Vintage tech & Lighting
  if (p.includes("lampa") || p.includes("petrolej") || p.includes("nářadí") || p.includes("přístroj") || p.includes("rádio") || p.includes("svítidl") || p.includes("žehličk")) {
    return {
      status: "SUCCESS",
      title: "Mosazná secesní petrolejová lampa s cylindrem",
      description: "Kombinovaná stolní petrolejová lampa s litou mosaznou patkou a skleněným zásobníkem na petrolej (cca 1900–1915). Včetně funkčního mosazného hořáku s posuvem knotu a neprasklého skleněného cylindru.",
      category: "Retro technika & Nářadí",
      estimatedPriceCzk: "1 500 - 3 400 Kč",
      numericPrice: 2200,
      webReferences: ["https://aukro.cz/svitidla-a-lampy", "https://bazos.cz/starozitnosti"],
      followUpPrompt: "",
      reasoning: "Kompletní funkční svítidlo s originálními díly a zachovalým sklem bez prasklin.",
    };
  }

  // 9. If second photo is explicitly needed
  if (!image2 && (p.includes("detail") || p.includes("štítk") || p.includes("ověř"))) {
    return {
      status: "NEEDS_MORE_INFO",
      title: "Historický řemeslný předmět (vyžaduje detail puncu)",
      description: "Předmět vykazuje zřetelné znaky starožitného řemesla, pro přesné určení dílny, autora a ryzosti kovu je však potřeba doplňkový snímek značky nebo spodní strany.",
      category: "Starožitnosti & Sbírky",
      estimatedPriceCzk: "1 500 - 3 800 Kč",
      numericPrice: 2400,
      webReferences: ["https://aukro.cz/starozitnosti"],
      followUpPrompt: "Vyfoťte detailní makro snímek výrobního puncu, vyraženého letopočtu nebo spodní signatury předmětu.",
      reasoning: "Vizuální styl odpovídá první třetině 20. století, ale pro autorství chybí čitelná značka výrobce.",
    };
  }

  // 10. Default rich collectible identification
  return {
    status: "SUCCESS",
    title: image2 ? "Sběratelský historický artefakt (ověřeno z více úhlů)" : "Starožitný řemeslný předmět s patinou",
    description: "Ručně zhotovený historický artefakt s charakteristickou autentickou patinou a stopami dobového užívání (odhadované stáří cca 1910–1935). Původní zachovalost bez novodobých neodborných zásahů.",
    category: "Starožitnosti & Sbírky",
    estimatedPriceCzk: image2 ? "1 800 - 4 200 Kč" : "950 - 2 400 Kč",
    numericPrice: image2 ? 2800 : 1500,
    webReferences: ["https://aukro.cz/starozitnosti", "https://bazos.cz/sberatelstvi"],
    followUpPrompt: "",
    reasoning: "Kvalitní řemeslné zpracování s přirozenou oxidací povrchu, vhodné do sbírky starožitností.",
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Společné Nálezy running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
