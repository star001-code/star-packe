import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

const calcItemSchema = z.object({
  hs_code: z.string(),
  quantity: z.number().positive(),
  unit: z.string().optional().nullable(),
  invoice_total_value: z.number().min(0),
  duty_rate: z.number().min(0),
  tsc_basis: z.enum(["avg", "min", "max"]).default("avg"),
});

const calcRequestSchema = z.object({
  checkpoint_id: z.string(),
  fx_rate: z.number().positive().default(1310),
  invoice_currency: z.string().default("USD"),
  items: z.array(calcItemSchema).min(1),
});

function normHs(v: string): string {
  return (v || "").replace(/[^\d]/g, "").trim();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/checkpoints", async (_req, res) => {
    try {
      const cps = await storage.getCheckpoints();
      const out = cps.map((cp) => ({
        id: cp.id,
        name: cp.name,
        fees: cp.fees.map((f) => ({
          code: f.code,
          label: f.label,
          amount_iqd: f.amountIqd,
        })),
      }));
      res.json(out);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const q = (req.query.q as string || "").trim();
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 30, 1), 100);
      if (q.length < 2) {
        return res.status(400).json({ error: "Query must be at least 2 characters" });
      }
      const rows = await storage.searchProducts(q, limit);
      const out = rows.map((r) => ({
        id: r.id,
        hs_code: r.hsCode,
        cst_code: r.cstCode,
        description: r.description,
        unit: r.unit,
        min_value: r.minValue,
        avg_value: r.avgValue,
        max_value: r.maxValue,
        currency: r.currency,
      }));
      res.json(out);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/hs/:hs_code", async (req, res) => {
    try {
      const hsCode = normHs(req.params.hs_code);
      if (!hsCode) {
        return res.status(400).json({ error: "Invalid HS code" });
      }
      const unit = req.query.unit as string | undefined;
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
      const rows = await storage.getProductsByHsCode(hsCode, unit, limit);
      const out = rows.map((r) => ({
        id: r.id,
        hs_code: r.hsCode,
        cst_code: r.cstCode,
        description: r.description,
        unit: r.unit,
        min_value: r.minValue,
        avg_value: r.avgValue,
        max_value: r.maxValue,
        currency: r.currency,
      }));
      res.json(out);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/calculate", async (req, res) => {
    try {
      const parsed = calcRequestSchema.parse(req.body);
      const cps = await storage.getCheckpoints();
      const cp = cps.find((c) => c.id === parsed.checkpoint_id);
      if (!cp) {
        return res.status(404).json({ error: "Unknown checkpoint_id" });
      }

      const feesTotal = cp.fees.reduce((s, f) => s + (f.amountIqd || 0), 0);
      const itemsOut: any[] = [];
      let dutySum = 0;

      for (const it of parsed.items) {
        const hs = normHs(it.hs_code);
        const rows = await storage.getProductsByHsCode(hs, it.unit || undefined, 1);
        const row = rows[0] || null;

        let tscUnit = 0;
        let desc = "";
        let unit = row?.unit || it.unit || "";

        if (row) {
          desc = row.description || "";
          if (it.tsc_basis === "min") {
            tscUnit = row.minValue ?? row.avgValue ?? 0;
          } else if (it.tsc_basis === "max") {
            tscUnit = row.maxValue ?? row.avgValue ?? 0;
          } else {
            tscUnit = row.avgValue ?? 0;
          }
        }

        const invoiceUnit = it.quantity ? it.invoice_total_value / it.quantity : 0;
        const valuationUnit = Math.max(invoiceUnit, tscUnit);
        const customsValueBase = valuationUnit * it.quantity;
        const customsValueIqd = parsed.invoice_currency.toUpperCase() === "IQD"
          ? customsValueBase
          : customsValueBase * parsed.fx_rate;
        const dutyIqd = customsValueIqd * it.duty_rate;

        dutySum += dutyIqd;
        itemsOut.push({
          hs_code: hs,
          description: desc,
          quantity: it.quantity,
          unit,
          invoice_total_value: it.invoice_total_value,
          invoice_unit_value: invoiceUnit,
          tsc_unit_value: tscUnit,
          valuation_unit_value: valuationUnit,
          customs_value_iqd: customsValueIqd,
          duty_rate: it.duty_rate,
          duty_iqd: dutyIqd,
        });
      }

      res.json({
        checkpoint: { id: cp.id, name: cp.name },
        fx: { from: parsed.invoice_currency, to: "IQD", rate: parsed.fx_rate },
        fees: {
          items: cp.fees.map((f) => ({ code: f.code, label: f.label, amount_iqd: f.amountIqd })),
          total_iqd: feesTotal,
        },
        items: itemsOut,
        summary: {
          duty_iqd: dutySum,
          fees_iqd: feesTotal,
          total_payable_iqd: dutySum + feesTotal,
        },
      });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: e.errors });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await storage.getStats();
      res.json({
        rows_total: stats.rowsTotal,
        hs_unique: stats.hsUnique,
        units_unique: stats.unitsUnique,
        top_units: stats.topUnits.map((u) => ({ unit: u.unit, c: u.count })),
        top_hs: stats.topHs.map((h) => ({ hs_code: h.hsCode, c: h.count })),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return httpServer;
}
