import { Capacitor } from "@capacitor/core";
import { AiAnalysisResult } from "../types";

const isNativeApp = () =>
  Capacitor.isNativePlatform() ||
  (typeof window !== "undefined" &&
    (window.location.protocol === "capacitor:" || window.location.protocol === "file:"));

const DEFAULT_API_BASE_URL =
  "https://nalezy-suseto.ai.studio";

export async function analyzeItem(
  image1: string | null | undefined,
  image2: string | null | undefined,
  promptText: string,
): Promise<AiAnalysisResult> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (isNativeApp() ? DEFAULT_API_BASE_URL : "");
  const response = await fetch(`${apiBaseUrl}/api/ai/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image1, image2, promptText }),
  });

  if (!response.ok) {
    let message = `AI služba vrátila chybu (${response.status}).`;
    try {
      const errorBody = (await response.json()) as { error?: string };
      if (errorBody.error) {
        message = errorBody.error;
      }
    } catch {
      // Keep the HTTP status when the server did not return JSON.
    }
    throw new Error(message);
  }

  const result = (await response.json()) as AiAnalysisResult;
  if (
    (result.status !== "SUCCESS" && result.status !== "NEEDS_MORE_INFO") ||
    !result.title ||
    !result.description ||
    !result.category ||
    !result.estimatedPriceCzk
  ) {
    throw new Error("AI vrátila neúplný výsledek. Výsledek nebyl uložen.");
  }

  if (
    result.title === "Starožitný řemeslný předmět s patinou" ||
    result.title === "Sběratelský historický artefakt (ověřeno z více úhlů)"
  ) {
    throw new Error(
      "Server vrátil neověřený obecný výsledek. Analýza nebyla uložena; aktualizujte AI backend."
    );
  }

  return result;
}
