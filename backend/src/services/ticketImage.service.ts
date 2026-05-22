import { execSync } from "child_process";
import fs from "fs";
import puppeteer from "puppeteer-core";
import { PaymentType } from "@prisma/client";
import { AppError } from "../middlewares/errorHandler.js";
import { getTicketById } from "./ticket.service.js";
import * as settingsService from "./settings.service.js";
import * as templateService from "./ticketTemplate.service.js";
import type { TemplateElementType, TemplateLayout } from "./ticketTemplate.service.js";

type TicketWithRelations = Awaited<ReturnType<typeof getTicketById>>;
type ActivityLine = TicketWithRelations["activities"][number];

const PAYMENT_LABELS: Record<PaymentType, string> = {
  FULL_PAID: "Full Paid",
  TO_PAY: "To Pay",
  FREE: "Free",
  NO_SHOW: "No Show",
};

const SKIP_ELEMENTS: TemplateElementType[] = ["transfer", "amount"];

let browserInstance: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
let browserLaunching: Promise<Awaited<ReturnType<typeof puppeteer.launch>>> | null =
  null;

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/usr/lib/chromium/chromium",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter((p): p is string => Boolean(p));

function resolveRealPath(candidate: string): string | undefined {
  try {
    if (!fs.existsSync(candidate)) return undefined;
    const real = fs.realpathSync(candidate);
    return fs.existsSync(real) ? real : candidate;
  } catch {
    return fs.existsSync(candidate) ? candidate : undefined;
  }
}

function findChromeViaWhich(): string | undefined {
  for (const name of [
    "chromium",
    "chromium-browser",
    "google-chrome-stable",
    "google-chrome",
  ]) {
    try {
      const p = execSync(`which ${name} 2>/dev/null`, { encoding: "utf8" }).trim();
      if (p && fs.existsSync(p)) return p;
    } catch {
      /* not on PATH */
    }
  }
  return undefined;
}

function resolveChromePath(): string | undefined {
  for (const p of CHROME_CANDIDATES) {
    const resolved = resolveRealPath(p);
    if (resolved) return resolved;
  }
  const fromPath = findChromeViaWhich();
  if (fromPath) {
    const resolved = resolveRealPath(fromPath);
    if (resolved) return resolved;
  }
  return undefined;
}

async function getBrowser() {
  if (browserInstance) return browserInstance;
  if (browserLaunching) return browserLaunching;

  const executablePath = resolveChromePath();
  if (!executablePath) {
    console.error("Chromium bulunamadı. PUPPETEER_EXECUTABLE_PATH=", process.env.PUPPETEER_EXECUTABLE_PATH);
    throw new AppError(
      503,
      "Bilet görseli için sunucuda Chromium gerekli. EasyPanel backend Environment: PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium ve Dockerfile ile yeniden deploy edin."
    );
  }

  const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-extensions",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
    ],
  };

  browserLaunching = puppeteer.launch(launchOptions);
  try {
    browserInstance = await browserLaunching;
    console.info("Puppeteer Chromium:", executablePath);
    return browserInstance;
  } catch (err) {
    browserInstance = null;
    browserLaunching = null;
    console.error("Puppeteer başlatılamadı:", executablePath, err);
    throw new AppError(
      503,
      `Bilet görseli oluşturulamadı (${executablePath}). Sunucuyu Dockerfile ile deploy edin veya npx puppeteer browsers install chrome çalıştırın.`
    );
  } finally {
    browserLaunching = null;
  }
}

function formatDate(d: Date) {
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMoney(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 0 }) + " ₺";
}

function lineRemaining(line: ActivityLine) {
  if (line.paymentType === PaymentType.FREE) return 0;
  return Math.max(0, line.unitPrice - line.prepaidAmount);
}

type BrandInfo = Awaited<ReturnType<typeof settingsService.getBrand>>;

function activityDetailHtml(line: ActivityLine) {
  const label = line.activity.displayName || line.activity.name;
  const dateStr = formatDate(line.tourDate);
  const timeStr = line.tourStartTime ? ` · ${line.tourStartTime}` : "";
  const transfer =
    line.hasTransfer && (line.hotelName || line.pickupTime)
      ? `<p class="activity-meta">Transfer: ${escapeHtml(line.hotelName ?? "")}${line.pickupTime ? ` · ${line.pickupTime}` : ""}</p>`
      : "";
  return `<div class="activity-block">
    <div class="label">Aktivite</div>
    <div class="value">${escapeHtml(label)} (${dateStr}${timeStr})</div>
    ${transfer}
  </div>`;
}

function paymentRowHtml(line: ActivityLine) {
  const label = PAYMENT_LABELS[line.paymentType] ?? line.paymentType;
  const remaining = lineRemaining(line);
  let right = `<span class="payment-amount"></span>`;

  if (line.paymentType === PaymentType.TO_PAY && remaining > 0) {
    right = `<span class="payment-amount">${formatMoney(remaining)}</span>`;
  } else if (
    line.paymentType === PaymentType.FULL_PAID &&
    line.remainderToOperator &&
    remaining > 0
  ) {
    right = `<span class="payment-amount payment-note">Ön ödeme alındı · Kalan ${formatMoney(remaining)} tur firmasına</span>`;
  }

  return `<div class="payment-row">
    <span class="payment-badge">${escapeHtml(label)}</span>
    ${right}
  </div>`;
}

function renderElement(
  type: TemplateElementType,
  ticket: TicketWithRelations,
  line: ActivityLine,
  brand: BrandInfo
): string {
  switch (type) {
    case "logo":
      return brand.companyLogo
        ? `<div class="logo"><img src="${brand.companyLogo}" alt="Logo" /></div>`
        : "";
    case "companyName":
      return `<div class="company">${escapeHtml(brand.companyName)}</div>`;
    case "ticketNo":
      return `<div class="ticket-no-large">${escapeHtml(ticket.ticketNo)}</div>`;
    case "ticketBadge": {
      const isRevised = (ticket.revisionCount ?? 0) > 0;
      const label = isRevised ? "REVİZE BİLET" : "YENİ BİLET";
      const cls = isRevised ? "ticket-badge ticket-badge--rev" : "ticket-badge ticket-badge--new";
      return `<div class="${cls}">${label}</div>`;
    }
    case "customerName":
      return row("Müşteri", ticket.customerName);
    case "customerPhone":
      return row("Telefon", ticket.customerPhone);
    case "tourDate":
      return row("Tur Tarihi", formatDate(line.tourDate));
    case "activities":
      return activityDetailHtml(line);
    case "activityNotes":
      if (!line.notes?.trim()) return "";
      return `<div class="row notes-row">
        <div class="label">Not</div>
        <div class="value notes-value">${escapeHtml(line.notes.trim())}</div>
      </div>`;
    case "personCount":
      return row(
        "Kişi",
        `Y: ${line.adultCount} · Ç: ${line.childCount} · B: ${line.infantCount}`
      );
    case "transfer":
    case "amount":
      return "";
    case "paymentStatus":
      return paymentRowHtml(line);
    case "qr": {
      const qrData = `${ticket.ticketNo}-${line.id}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}`;
      return `<div class="qr"><img src="${qrUrl}" alt="QR" loading="eager" /></div>`;
    }
    case "footer": {
      const contact = [brand.companyPhone, brand.companyEmail, brand.companyAddress]
        .filter(Boolean)
        .join(" · ");
      return `<div class="footer">${escapeHtml(contact || "Bu bilet elektronik ortamda oluşturulmuştur.")}</div>`;
    }
    default:
      return "";
  }
}

function row(label: string, value: string) {
  return `<div class="row"><div class="label">${label}</div><div class="value">${escapeHtml(value)}</div></div>`;
}

function buildActivityTicketHtml(
  ticket: TicketWithRelations,
  line: ActivityLine,
  brand: BrandInfo,
  layout: TemplateLayout
) {
  const primary = layout.primaryColor ?? "#0f766e";

  const headerParts: string[] = [];
  if (layout.showLogo && brand.companyLogo) {
    headerParts.push(`<div class="logo"><img src="${brand.companyLogo}" alt="" /></div>`);
  }
  if (layout.elements.includes("companyName")) {
    headerParts.push(`<div class="company">${escapeHtml(brand.companyName)}</div>`);
  }
  if (layout.elements.includes("ticketNo")) {
    headerParts.push(
      `<div class="ticket-no-large">${escapeHtml(ticket.ticketNo)}</div>`
    );
  }
  if (layout.elements.includes("ticketBadge")) {
    const isRevised = (ticket.revisionCount ?? 0) > 0;
    const label = isRevised ? "REVİZE BİLET" : "YENİ BİLET";
    const cls = isRevised ? "ticket-badge ticket-badge--rev" : "ticket-badge ticket-badge--new";
    headerParts.push(`<div class="${cls}">${label}</div>`);
  }

  const headerOnly = new Set([
    "logo",
    "companyName",
    "ticketNo",
    "ticketBadge",
    ...SKIP_ELEMENTS,
  ]);
  const contentParts = layout.elements
    .filter((el) => !headerOnly.has(el))
    .map((el) => renderElement(el, ticket, line, brand))
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      width: 400px;
      padding: 24px;
      color: #0f172a;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid ${primary};
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .logo img { max-height: 48px; max-width: 160px; margin-bottom: 8px; }
    .company { font-size: 22px; font-weight: 700; color: ${primary}; }
    .ticket-no-large {
      font-family: ui-monospace, monospace;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: ${primary};
      margin-top: 8px;
    }
    .ticket-badge {
      display: inline-block;
      margin-top: 10px;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.12em;
    }
    .ticket-badge--new { background: #dcfce7; color: #166534; border: 2px solid #86efac; }
    .ticket-badge--rev { background: #fef3c7; color: #92400e; border: 2px solid #fcd34d; }
    .row { margin-bottom: 10px; font-size: 14px; line-height: 1.5; }
    .label { color: #64748b; font-size: 12px; text-transform: uppercase; }
    .value { font-weight: 600; font-size: 15px; }
    .activity-block { margin-bottom: 10px; }
    .activity-meta { margin-top: 6px; font-size: 13px; color: #475569; }
    .notes-row { margin-top: 4px; }
    .notes-value { white-space: pre-wrap; font-weight: 500; color: #334155; }
    .payment-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
    }
    .payment-badge {
      padding: 6px 14px;
      border-radius: 999px;
      background: #ccfbf1;
      color: ${primary};
      font-size: 14px;
      font-weight: 600;
    }
    .payment-amount {
      font-size: 18px;
      font-weight: 700;
      color: #b45309;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
    .qr { text-align: center; margin-top: 16px; }
    .qr img { width: 100px; height: 100px; }
  </style>
</head>
<body>
  <div class="header">${headerParts.join("")}</div>
  ${contentParts}
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeSlug(name: string) {
  return name
    .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function renderHtmlToBuffer(
  html: string,
  format: "png" | "pdf",
  filename: string
) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.setViewport({ width: 400, height: 800, deviceScaleFactor: 2 });

    if (format === "pdf") {
      const buffer = Buffer.from(
        await page.pdf({
          width: "400px",
          printBackground: true,
          margin: { top: "12px", right: "12px", bottom: "12px", left: "12px" },
        })
      );
      return {
        buffer,
        contentType: "application/pdf",
        filename,
      };
    }

    const buffer = Buffer.from(
      await page.screenshot({ type: "png", fullPage: true, omitBackground: false })
    );
    return {
      buffer,
      contentType: "image/png",
      filename,
    };
  } finally {
    await page.close();
  }
}

function getActivityLine(ticket: TicketWithRelations, activityLineId: number) {
  const line = ticket.activities.find((a) => a.id === activityLineId);
  if (!line) throw new AppError(404, "Aktivite satırı bulunamadı");
  return line;
}

export async function listActivityImages(ticketId: number) {
  const ticket = await getTicketById(ticketId);
  return ticket.activities.map((line, index) => ({
    lineId: line.id,
    index: index + 1,
    displayName: line.activity.displayName || line.activity.name,
    tourDate: line.tourDate,
    paymentType: line.paymentType,
    remainingAmount: lineRemaining(line),
  }));
}

export async function generateTicketImage(
  ticketId: number,
  format: "png" | "pdf" = "png",
  activityLineId: number
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const ticket = await getTicketById(ticketId);
  const line = getActivityLine(ticket, activityLineId);

  const brand = await settingsService.getBrand();
  const template = await templateService.getDefaultTemplate();
  const layout = templateService.parseLayout(template?.layout);

  const html = buildActivityTicketHtml(ticket, line, brand, layout);
  const base = ticket.ticketNo.replace(/[^a-zA-Z0-9-]/g, "_");
  const slug = safeSlug(line.activity.displayName || line.activity.name);
  const ext = format === "pdf" ? "pdf" : "png";
  const filename = `${base}-${slug}.${ext}`;

  try {
    return await renderHtmlToBuffer(html, format, filename);
  } catch (err) {
    if (err instanceof AppError) throw err;
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Bilet görseli oluşturma hatası:", err);
    throw new AppError(503, `Bilet görseli oluşturulamadı: ${detail}`);
  }
}

export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
  browserLaunching = null;
}
