import { jsPDF } from "jspdf";
import { ItemEntity, ItemLogEntry } from "../types";
import { StorageService } from "../services/storage";

// Helper to wrap text onto multiple lines on a canvas
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  if (!text) return y;
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}

// Helper to load an image inside a Promise
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export class PdfGeneratorService {
  /**
   * Generates and downloads a beautiful PDF report for a single item.
   */
  static async downloadSingleItemReport(item: ItemEntity, logs: ItemLogEntry[]): Promise<void> {
    const canvas = document.createElement("canvas");
    canvas.width = 1240; // A4 size at 150 DPI width
    canvas.height = 1754; // A4 size at 150 DPI height
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load images
    const mainImg = await loadImage(item.imageLocalPath || "");
    const secImg = await loadImage(item.secondaryImageLocalPath || "");

    // Background
    ctx.fillStyle = "#FAF9F6"; // Warm archival paper background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top Header band
    ctx.fillStyle = "#0F1420"; // Dark slate
    ctx.fillRect(0, 0, canvas.width, 220);

    // Header title and text
    ctx.fillStyle = "#00F2FE"; // Turquoise accent
    ctx.font = "bold 32px Arial, sans-serif";
    ctx.fillText("SPOLEČNÉ NÁLEZY", 60, 90);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.fillText("PROTOKOL O NÁLEZU A EXPERTNÍM AI OCENĚNÍ", 60, 130);

    ctx.fillStyle = "#8A99AD";
    ctx.font = "14px Arial, sans-serif";
    const dateStr = new Date(item.timestamp).toLocaleDateString("cs-CZ") + " " + new Date(item.timestamp).toLocaleTimeString("cs-CZ", { hour: '2-digit', minute: '2-digit' });
    ctx.fillText(`Generováno: ${new Date().toLocaleDateString("cs-CZ")}  •  ID nálezu: ${item.id}`, 60, 175);

    // Main section
    let currentY = 270;

    // Outer grid line
    ctx.strokeStyle = "#7C5CFC";
    ctx.lineWidth = 2;
    
    // Draw Item Photos Section on the left, info card on the right
    const photoWidth = 480;
    const photoHeight = 360;
    
    if (mainImg) {
      // Draw frame
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(60 - 5, currentY - 5, photoWidth + 10, photoHeight + 10);
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 1;
      ctx.strokeRect(60 - 5, currentY - 5, photoWidth + 10, photoHeight + 10);
      
      // Draw image
      ctx.drawImage(mainImg, 60, currentY, photoWidth, photoHeight);
    } else {
      // Placeholder
      ctx.fillStyle = "#E2E8F0";
      ctx.fillRect(60, currentY, photoWidth, photoHeight);
      ctx.strokeStyle = "#CBD5E1";
      ctx.strokeRect(60, currentY, photoWidth, photoHeight);
      ctx.fillStyle = "#64748B";
      ctx.font = "bold 16px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Fotografie předmětu nebyla pořízena", 60 + photoWidth / 2, currentY + photoHeight / 2);
      ctx.textAlign = "left"; // reset
    }

    // Secondary image thumbnail (if exists)
    if (secImg) {
      const secW = 120;
      const secH = 90;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(60 + photoWidth - secW - 10, currentY + photoHeight - secH - 10, secW + 6, secH + 6);
      ctx.drawImage(secImg, 60 + photoWidth - secW - 7, currentY + photoHeight - secH - 7, secW, secH);
    }

    // Info card on the right
    const cardX = 580;
    const cardWidth = 600;
    
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(cardX, currentY, cardWidth, photoHeight);
    ctx.strokeStyle = "#7C5CFC";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cardX, currentY, cardWidth, photoHeight);

    // Card Header
    ctx.fillStyle = "#7C5CFC";
    ctx.fillRect(cardX, currentY, cardWidth, 50);
    
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillText("IDENTIFIKAČNÍ KARTA PŘEDMĚTU", cardX + 20, currentY + 32);

    // Card fields
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 18px Arial, sans-serif";
    ctx.fillText(item.title || "Bez názvu", cardX + 20, currentY + 95);

    ctx.font = "13px Arial, sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText("KATEGORIE:", cardX + 20, currentY + 130);
    ctx.fillStyle = "#0F1420";
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillText(item.category || "Nespecifikováno", cardX + 170, currentY + 130);

    ctx.font = "13px Arial, sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText("STAV NÁLEZU:", cardX + 20, currentY + 165);
    ctx.fillStyle = item.itemStatus === "ACTIVE" ? "#10B981" : item.itemStatus === "ACQUIRED" ? "#06B6D4" : "#64748B";
    ctx.font = "bold 14px Arial, sans-serif";
    const statusText = item.itemStatus === "ACTIVE" ? "Aktivní / Hledá se" : item.itemStatus === "ACQUIRED" ? "Získáno / V držení" : "Archivováno";
    ctx.fillText(statusText, cardX + 170, currentY + 165);

    ctx.font = "13px Arial, sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText("ODHAD CENY:", cardX + 20, currentY + 200);
    ctx.fillStyle = "#7C5CFC";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillText(item.estimatedPriceCzk || "Nenaceněno", cardX + 170, currentY + 200);

    ctx.font = "13px Arial, sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText("NALEZENO KDY:", cardX + 20, currentY + 235);
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillText(dateStr, cardX + 170, currentY + 235);

    ctx.font = "13px Arial, sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText("NALEZENO KÝM:", cardX + 20, currentY + 270);
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillText(item.author === "Husband" ? "Manžel (Společný účet)" : item.author === "Wife" ? "Manželka (Společný účet)" : item.author, cardX + 170, currentY + 270);

    ctx.font = "13px Arial, sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText("LOKALITA GPS:", cardX + 20, currentY + 305);
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 12px Arial, sans-serif";
    const gpsStr = item.latitude && item.longitude ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}` : "Nezaměřeno";
    ctx.fillText(gpsStr, cardX + 170, currentY + 305);

    ctx.font = "13px Arial, sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText("MAPOVÝ ODKAZ:", cardX + 20, currentY + 340);
    ctx.fillStyle = "#00F2FE";
    ctx.font = "bold 11px Arial, sans-serif";
    const shortUrl = item.googleMapsUrl ? "Klikněte pro zobrazení na mapě" : "Není k dispozici";
    ctx.fillText(shortUrl, cardX + 170, currentY + 340);

    currentY += photoHeight + 40;

    // Detailed description block
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(60, currentY, 1120, 240);
    ctx.strokeStyle = "#E2E8F0";
    ctx.strokeRect(60, currentY, 1120, 240);

    // Left border stripe for aesthetics
    ctx.fillStyle = "#7C5CFC";
    ctx.fillRect(60, currentY, 6, 240);

    ctx.fillStyle = "#0F1420";
    ctx.font = "bold 15px Arial, sans-serif";
    ctx.fillText("PODROBNÝ POPIS PŘEDMĚTU", 85, currentY + 35);

    ctx.fillStyle = "#334155";
    ctx.font = "13px Arial, sans-serif";
    const descText = item.description || "K tomuto předmětu nebyl vložen podrobný slovní popis.";
    wrapText(ctx, descText, 85, currentY + 70, 1070, 20);

    currentY += 280;

    // AI Expert appraisal block (Aesthetic reasoning card)
    ctx.fillStyle = "#E0F2FE"; // Light blue subtle background
    ctx.fillRect(60, currentY, 1120, 220);
    ctx.strokeStyle = "#00F2FE";
    ctx.strokeRect(60, currentY, 1120, 220);

    ctx.fillStyle = "#0369A1";
    ctx.fillRect(60, currentY, 6, 220);

    ctx.fillStyle = "#0369A1";
    ctx.font = "bold 15px Arial, sans-serif";
    ctx.fillText("ODBORNÉ EXPERTNÍ STANOVISKO (GEMINI AI)", 85, currentY + 35);

    // Reasoning from latest AI analysis run
    const analyses = StorageService.getAnalysisHistory(item.id);
    const latestAnalysis = analyses.length > 0 ? analyses[0] : null;

    ctx.fillStyle = "#1E293B";
    ctx.font = "italic 13px Arial, sans-serif";
    const reasoningText = latestAnalysis?.result?.reasoning || "Stanovisko nebylo vygenerováno. Spusťte AI analýzu pro nacenění a zjištění historických referencí.";
    wrapText(ctx, reasoningText, 85, currentY + 70, 1070, 20);

    currentY += 260;

    // Audit logs timeline
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(60, currentY, 1120, 240);
    ctx.strokeStyle = "#E2E8F0";
    ctx.strokeRect(60, currentY, 1120, 240);

    ctx.fillStyle = "#0F1420";
    ctx.font = "bold 15px Arial, sans-serif";
    ctx.fillText("TIMELINE & HISTORIE ÚPRAV (AUDIT LOG)", 85, currentY + 35);

    let logY = currentY + 65;
    ctx.font = "12px Arial, sans-serif";
    
    const relevantLogs = logs.slice(0, 6); // Up to 6 logs to prevent spill
    if (relevantLogs.length > 0) {
      relevantLogs.forEach((log) => {
        ctx.fillStyle = "#64748B";
        const lDate = new Date(log.timestamp).toLocaleDateString("cs-CZ") + " " + new Date(log.timestamp).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
        ctx.fillText(lDate, 85, logY);

        ctx.fillStyle = "#0F1420";
        ctx.font = "bold 12px Arial, sans-serif";
        ctx.fillText(`[${log.author === "Husband" ? "Manžel" : log.author === "Wife" ? "Manželka" : log.author}]`, 240, logY);

        ctx.fillStyle = "#334155";
        ctx.font = "12px Arial, sans-serif";
        ctx.fillText(log.changeDescription, 360, logY);

        logY += 24;
      });
    } else {
      ctx.fillStyle = "#94A3B8";
      ctx.fillText("Pro tento předmět nejsou zaznamenány žádné dodatečné systémové události.", 85, logY);
    }

    // Page Footer
    ctx.fillStyle = "#94A3B8";
    ctx.font = "11px Arial, sans-serif";
    ctx.fillText("Tento dokument slouží jako oficiální archivní záznam rodinné sbírky společných nálezů.", 60, 1680);
    ctx.fillText("Technologie: Společné Nálezy PWA  •  Identifikace podpořena Gemini 3.8 Multimodal AI.", 60, 1700);

    // Save as PDF
    const pdf = new jsPDF("portrait", "pt", "a4");
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", 0, 0, 595, 842);
    pdf.save(`protokol-${item.title.toLowerCase().replace(/[^a-z0-9]/gi, "-")}.pdf`);
  }

  /**
   * Generates and downloads a beautiful multi-page PDF catalog of the entire inventory.
   */
  static async downloadInventoryReport(items: ItemEntity[]): Promise<void> {
    const pdf = new jsPDF("portrait", "pt", "a4");
    const itemsPerPage = 12;
    const totalPages = Math.ceil(items.length / itemsPerPage) || 1;

    for (let p = 0; p < totalPages; p++) {
      if (p > 0) {
        pdf.addPage();
      }

      const canvas = document.createElement("canvas");
      canvas.width = 1240;
      canvas.height = 1754;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      // Background
      ctx.fillStyle = "#FAF9F6";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header band
      ctx.fillStyle = "#0F1420";
      ctx.fillRect(0, 0, canvas.width, 200);

      // Title
      ctx.fillStyle = "#00F2FE";
      ctx.font = "bold 30px Arial, sans-serif";
      ctx.fillText("SPOLEČNÉ NÁLEZY", 60, 75);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 20px Arial, sans-serif";
      ctx.fillText("CELKOVÝ KATALOG RODINNÝCH NÁLEZŮ A STAROŽITNOSTÍ", 60, 115);

      ctx.fillStyle = "#8A99AD";
      ctx.font = "13px Arial, sans-serif";
      ctx.fillText(`Exportováno: ${new Date().toLocaleDateString("cs-CZ")}  •  Stránka ${p + 1} z ${totalPages}  •  Celkem evidováno ${items.length} položek`, 60, 155);

      // Draw summary box on the first page
      let startY = 240;
      if (p === 0) {
        // Draw KPI dashboard
        const totalVal = items.reduce((sum, item) => sum + (item.numericPriceCzk || 0), 0);
        
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(60, 240, 1120, 120);
        ctx.strokeStyle = "#7C5CFC";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(60, 240, 1120, 120);

        // Subdivide dashboard
        ctx.fillStyle = "#64748B";
        ctx.font = "bold 13px Arial, sans-serif";
        ctx.fillText("CELKOVÝ POČET NÁLEZŮ", 100, 280);
        ctx.fillStyle = "#0F1420";
        ctx.font = "bold 32px Arial, sans-serif";
        ctx.fillText(items.length.toString(), 100, 330);

        ctx.fillStyle = "#64748B";
        ctx.font = "bold 13px Arial, sans-serif";
        ctx.fillText("HODNOTA CELÉ SBÍRKY", 480, 280);
        ctx.fillStyle = "#7C5CFC";
        ctx.font = "bold 32px Arial, sans-serif";
        ctx.fillText(`${totalVal.toLocaleString("cs-CZ")} Kč`, 480, 330);

        ctx.fillStyle = "#64748B";
        ctx.font = "bold 13px Arial, sans-serif";
        ctx.fillText("DRŽITELÉ / AUTOŘI", 880, 280);
        ctx.fillStyle = "#06B6D4";
        ctx.font = "bold 20px Arial, sans-serif";
        ctx.fillText("Manželé společně", 880, 325);

        startY = 390;
      }

      // Draw table header
      ctx.fillStyle = "#7C5CFC";
      ctx.fillRect(60, startY, 1120, 45);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 13px Arial, sans-serif";
      ctx.fillText("NÁHLED", 80, startY + 28);
      ctx.fillText("NÁZEV NÁLEZU A KATEGORIE", 200, startY + 28);
      ctx.fillText("LOKACE", 680, startY + 28);
      ctx.fillText("STAV", 880, startY + 28);
      ctx.fillText("ODHAD CENY", 1020, startY + 28);

      // Render rows
      let rowY = startY + 45;
      const pageItems = items.slice(p * itemsPerPage, (p + 1) * itemsPerPage);

      for (let i = 0; i < pageItems.length; i++) {
        const item = pageItems[i];
        
        // Zebra striping bg
        ctx.fillStyle = i % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
        ctx.fillRect(60, rowY, 1120, 85);
        ctx.strokeStyle = "#F1F5F9";
        ctx.lineWidth = 1;
        ctx.strokeRect(60, rowY, 1120, 85);

        // Draw image thumbnail
        const thumbImg = await loadImage(item.imageLocalPath || "");
        if (thumbImg) {
          ctx.drawImage(thumbImg, 80, rowY + 10, 85, 65);
        } else {
          ctx.fillStyle = "#E2E8F0";
          ctx.fillRect(80, rowY + 10, 85, 65);
          ctx.fillStyle = "#94A3B8";
          ctx.font = "bold 10px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Bez fota", 80 + 85/2, rowY + 45);
          ctx.textAlign = "left"; // reset
        }

        // Title and Category
        ctx.fillStyle = "#1E293B";
        ctx.font = "bold 13px Arial, sans-serif";
        ctx.fillText(item.title.substring(0, 48) + (item.title.length > 48 ? "..." : ""), 200, rowY + 35);
        
        ctx.fillStyle = "#64748B";
        ctx.font = "11px Arial, sans-serif";
        ctx.fillText(item.category || "Nespecifikováno", 200, rowY + 58);

        // GPS Location
        ctx.fillStyle = "#334155";
        ctx.font = "bold 11px Arial, sans-serif";
        const locationStr = item.latitude && item.longitude ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}` : "Nezaměřeno";
        ctx.fillText(locationStr, 680, rowY + 38);
        ctx.fillStyle = "#94A3B8";
        ctx.font = "10px Arial, sans-serif";
        ctx.fillText(new Date(item.timestamp).toLocaleDateString("cs-CZ"), 680, rowY + 58);

        // Status pill
        ctx.fillStyle = item.itemStatus === "ACTIVE" ? "#10B981" : item.itemStatus === "ACQUIRED" ? "#06B6D4" : "#64748B";
        ctx.font = "bold 11px Arial, sans-serif";
        const rowStatus = item.itemStatus === "ACTIVE" ? "Aktivní" : item.itemStatus === "ACQUIRED" ? "Získáno" : "Archiv";
        ctx.fillText(rowStatus, 880, rowY + 45);

        // Estimated Price
        ctx.fillStyle = "#7C5CFC";
        ctx.font = "bold 13px Arial, sans-serif";
        ctx.fillText(item.estimatedPriceCzk || "Nenaceněno", 1020, rowY + 45);

        rowY += 85;
      }

      // Page Footer
      ctx.fillStyle = "#94A3B8";
      ctx.font = "11px Arial, sans-serif";
      ctx.fillText(`Katalog Společné Nálezy  •  Vyexportováno dne ${new Date().toLocaleDateString("cs-CZ")}`, 60, 1680);
      ctx.fillText(`Stránka ${p + 1} z ${totalPages}`, 1100, 1680);

      // Append image representation to PDF page
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, 595, 842);
    }

    // Save
    pdf.save("katalog-vsech-nalezu.pdf");
  }
}
