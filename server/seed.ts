import fs from "fs";
import path from "path";
import { storage } from "./storage";
import type { InsertProduct } from "@shared/schema";
import { log } from "./index";

function pick(d: Record<string, any>, keys: string[]): any {
  for (const k of keys) {
    if (d && k in d && d[k] !== null && d[k] !== "") {
      return d[k];
    }
  }
  return null;
}

function normHs(v: any): string {
  return String(v || "").replace(/[^\d]/g, "").trim();
}

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(/,/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

let tariffData: { hs_rates: Record<string, number>; chapter_defaults: Record<string, number> } | null = null;

function loadTariff(): typeof tariffData {
  if (tariffData) return tariffData;
  const tariffPath = path.resolve("attached_assets/tariff_law22_2010.json");
  if (fs.existsSync(tariffPath)) {
    tariffData = JSON.parse(fs.readFileSync(tariffPath, "utf-8"));
  } else {
    tariffData = { hs_rates: {}, chapter_defaults: {} };
  }
  return tariffData;
}

function lookupDutyRate(hsCode: string): number | null {
  const t = loadTariff();
  if (!t) return null;
  const hs = hsCode.replace(/[^\d]/g, "");
  if (t.hs_rates[hs] !== undefined) return t.hs_rates[hs] / 100;
  if (hs.length >= 6 && t.hs_rates[hs.slice(0, 6)] !== undefined) return t.hs_rates[hs.slice(0, 6)] / 100;
  const ch = hs.slice(0, 2);
  if (t.chapter_defaults[ch] !== undefined) return t.chapter_defaults[ch] / 100;
  return 0.20;
}

function normalizeRow(row: Record<string, any>): InsertProduct | null {
  const hs = normHs(pick(row, ["hs_code", "hs", "HS", "hscode", "code", "hsCode"]));
  const desc = String(pick(row, ["description", "desc", "item_description", "name", "arabic_description", "Description"]) || "");
  const unit = String(pick(row, ["unit", "Unit", "uom", "UOM", "measure", "unit_name"]) || "");
  const cst = pick(row, ["cst", "CST", "cst_code", "CST_CODE", "tsc_code", "TSC_CODE", "code_cst", "رمز"]);
  let mn = toNum(pick(row, ["min", "minimum", "min_value", "minValue", "MIN"]));
  let mx = toNum(pick(row, ["max", "maximum", "max_value", "maxValue", "MAX"]));
  let av = toNum(pick(row, ["avg", "average", "mean", "avg_value", "avgValue", "AVG"]));

  if ((av === null || av === 0) && mn !== null && mx !== null) {
    av = (mn + mx) / 2.0;
  }

  const currency = String(pick(row, ["currency", "Currency", "cur"]) || "USD");
  let page = pick(row, ["page", "source_page", "pageno", "Page"]);
  try {
    page = page !== null ? parseInt(String(page), 10) : null;
    if (isNaN(page)) page = null;
  } catch {
    page = null;
  }

  if (!hs && !desc) return null;

  const dutyRate = lookupDutyRate(hs);

  return {
    hsCode: hs,
    cstCode: cst ? String(cst) : null,
    description: desc,
    unit: unit || null,
    minValue: mn,
    avgValue: av,
    maxValue: mx,
    dutyRate,
    currency,
    sourcePage: page,
    rawJson: JSON.stringify(row),
  };
}

async function refreshDutyRates(): Promise<void> {
  const productCount = await storage.getProductCount();
  if (productCount === 0) return;

  log("Refreshing duty rates from CoM reduction tables...", "seed");
  tariffData = null;
  loadTariff();

  const updated = await storage.updateAllDutyRates(lookupDutyRate);
  log(`Updated duty rates for ${updated} products.`, "seed");
}

export async function runSeed(): Promise<void> {
  log("Seeding checkpoints...", "seed");
  await storage.seedCheckpoints();

  const productCount = await storage.getProductCount();
  if (productCount > 500) {
    log(`Database already has ${productCount} products, updating duty rates...`, "seed");
    await refreshDutyRates();
    return;
  }

  const fullPath = path.resolve("attached_assets/TSC_2025-10-13_full.json");
  const legacyPath = path.resolve("attached_assets/iraq_customs_extracted/data/TSC_2025-10-13.json");
  const jsonPath = fs.existsSync(fullPath) ? fullPath : legacyPath;
  if (!fs.existsSync(jsonPath)) {
    log(`TSC JSON file not found, skipping product seed.`, "seed");
    return;
  }

  log("Reading TSC JSON...", "seed");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const parsed = JSON.parse(raw);

  let arr: any[];
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else {
    arr = parsed.rows || parsed.data || parsed.items || [];
  }

  if (!Array.isArray(arr)) {
    log("Unsupported TSC JSON shape.", "seed");
    return;
  }

  const rows: InsertProduct[] = [];
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const normalized = normalizeRow(item);
    if (normalized) rows.push(normalized);
  }

  log(`Inserting ${rows.length} products...`, "seed");
  const inserted = await storage.seedProducts(rows);
  log(`Seeded ${inserted} products successfully.`, "seed");
}
