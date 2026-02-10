import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";

const calcItemSchema = z.object({
  hs_code: z.string(),
  quantity: z.number().positive(),
  unit: z.string().optional().nullable(),
  invoice_total_value: z.number().min(0),
  duty_rate: z.number().min(0),
  protection_rate: z.number().min(0).default(0),
  tsc_basis: z.enum(["avg", "min", "max"]).default("avg"),
  goods_category: z.string().optional().default("consumer"),
});

const calcRequestSchema = z.object({
  checkpoint_id: z.string(),
  fx_rate: z.number().positive().default(1320),
  invoice_currency: z.string().default("USD"),
  items: z.array(calcItemSchema).min(1),
  paid_amount: z.number().min(0).default(0),
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

  app.get("/api/products", async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
      const offset = (page - 1) * limit;
      const rows = await storage.getProducts(offset, limit);
      const totalCount = await storage.getProductCount();
      const totalPages = Math.ceil(totalCount / limit);
      res.json({
        products: rows.map((r) => ({
          id: r.id,
          hs_code: r.hsCode,
          cst_code: r.cstCode,
          description: r.description,
          unit: r.unit,
          min_value: r.minValue,
          avg_value: r.avgValue,
          max_value: r.maxValue,
          currency: r.currency,
        })),
        page,
        total_pages: totalPages,
        total_count: totalCount,
      });
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
      let salesTaxSum = 0;
      let municipalTaxSum = 0;

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
        const invoiceUnitIqd = parsed.invoice_currency.toUpperCase() === "IQD"
          ? invoiceUnit
          : invoiceUnit * parsed.fx_rate;
        const invoiceTotalIqd = parsed.invoice_currency.toUpperCase() === "IQD"
          ? it.invoice_total_value
          : it.invoice_total_value * parsed.fx_rate;
        const tscUnitIqd = tscUnit;
        const valuationUnitIqd = Math.max(invoiceUnitIqd, tscUnitIqd);
        const customsValueIqd = valuationUnitIqd * it.quantity;
        const dutyIqd = customsValueIqd * (it.duty_rate + it.protection_rate);
        const salesTaxIqd = customsValueIqd * 0.05;
        const municipalTaxIqd = (customsValueIqd + dutyIqd) * 0.02;

        dutySum += dutyIqd;
        salesTaxSum += salesTaxIqd;
        municipalTaxSum += municipalTaxIqd;

        itemsOut.push({
          hs_code: hs,
          description: desc,
          quantity: it.quantity,
          unit,
          invoice_total_value: it.invoice_total_value,
          invoice_total_iqd: invoiceTotalIqd,
          invoice_unit_value: invoiceUnit,
          invoice_unit_iqd: invoiceUnitIqd,
          tsc_unit_value_iqd: tscUnitIqd,
          valuation_unit_iqd: valuationUnitIqd,
          customs_value_iqd: customsValueIqd,
          duty_rate: it.duty_rate,
          protection_rate: it.protection_rate,
          duty_iqd: dutyIqd,
          sales_tax_iqd: salesTaxIqd,
          municipal_tax_iqd: municipalTaxIqd,
          goods_category: it.goods_category,
        });
      }

      const totalPayable = dutySum + salesTaxSum + municipalTaxSum + feesTotal;
      const paidAmountUsd = parsed.paid_amount || 0;
      const paidAmount = parsed.invoice_currency.toUpperCase() === "IQD"
        ? paidAmountUsd
        : paidAmountUsd * parsed.fx_rate;

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
          sales_tax_iqd: salesTaxSum,
          municipal_tax_iqd: municipalTaxSum,
          fees_iqd: feesTotal,
          total_payable_iqd: totalPayable,
          paid_amount_iqd: paidAmount,
          difference_iqd: totalPayable - paidAmount,
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

  const authSchema = z.object({
    username: z.string().min(2),
    password: z.string().min(4),
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = authSchema.parse(req.body);
      const existing = await storage.getUserByUsername(parsed.username);
      if (existing) {
        return res.status(409).json({ error: "اسم المستخدم موجود مسبقاً" });
      }
      const hashed = await bcrypt.hash(parsed.password, 10);
      const user = await storage.createUser({ username: parsed.username, password: hashed });
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({ id: user.id, username: user.username });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبة" });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = authSchema.parse(req.body);
      const user = await storage.getUserByUsername(parsed.username);
      if (!user) {
        return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }
      const valid = await bcrypt.compare(parsed.password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({ id: user.id, username: user.username });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبة" });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "فشل تسجيل الخروج" });
      }
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session.userId) {
      res.json({ id: req.session.userId, username: req.session.username });
    } else {
      res.status(401).json({ error: "غير مسجل" });
    }
  });

  return httpServer;
}
