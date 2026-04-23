import {
  type User, type InsertUser,
  type Checkpoint, type CheckpointFee,
  type Product, type InsertProduct,
  users, checkpoints, checkpointFees, products,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, sql, ilike, count, countDistinct } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getCheckpoints(): Promise<Array<Checkpoint & { fees: CheckpointFee[] }>>;
  getProducts(offset: number, limit: number): Promise<Product[]>;
  searchProducts(query: string, limit?: number): Promise<Product[]>;
  getProductsByHsCode(hsCode: string, unit?: string, limit?: number): Promise<Product[]>;
  getStats(): Promise<{
    rowsTotal: number;
    hsUnique: number;
    unitsUnique: number;
    topUnits: Array<{ unit: string; count: number }>;
    topHs: Array<{ hsCode: string; count: number }>;
  }>;
  seedCheckpoints(): Promise<void>;
  seedProducts(rows: InsertProduct[]): Promise<number>;
  clearProducts(): Promise<void>;
  getProductCount(): Promise<number>;
  checkProductDecisionColumn(): Promise<boolean>;
  updateAllDutyRates(lookupFn: (hsCode: string) => number | null): Promise<number>;
}

export const hasDatabase = Boolean(process.env.DATABASE_URL);
export const pool = hasDatabase ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
const db = pool ? drizzle(pool) : null;

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    if (!db) throw new Error("Database not configured");
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) throw new Error("Database not configured");
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) throw new Error("Database not configured");
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getCheckpoints(): Promise<Array<Checkpoint & { fees: CheckpointFee[] }>> {
    if (!db) throw new Error("Database not configured");
    const allCheckpoints = await db.select().from(checkpoints);
    const allFees = await db.select().from(checkpointFees);
    return allCheckpoints.map((cp) => ({
      ...cp,
      fees: allFees.filter((f) => f.checkpointId === cp.id),
    }));
  }

  async getProducts(offset: number, limit: number): Promise<Product[]> {
    if (!db) throw new Error("Database not configured");
    return db
      .select()
      .from(products)
      .orderBy(products.hsCode)
      .offset(offset)
      .limit(limit);
  }

  async searchProducts(query: string, limit = 30): Promise<Product[]> {
    if (!db) throw new Error("Database not configured");
    const trimmed = query.trim();
    const hsDigits = trimmed.replace(/[^\d]/g, "");

    if (hsDigits.length >= 4) {
      const rows = await db
        .select()
        .from(products)
        .where(sql`${products.hsCode} LIKE ${hsDigits + "%"}`)
        .orderBy(products.hsCode)
        .limit(limit);
      if (rows.length > 0) return rows;
    }

    return db
      .select()
      .from(products)
      .where(ilike(products.description, `%${trimmed}%`))
      .limit(limit);
  }

  async getProductsByHsCode(hsCode: string, unit?: string, limit = 50): Promise<Product[]> {
    if (!db) throw new Error("Database not configured");
    const hs = hsCode.replace(/[^\d]/g, "");
    if (unit) {
      const rows = await db
        .select()
        .from(products)
        .where(sql`${products.hsCode} = ${hs} AND ${products.unit} = ${unit}`)
        .limit(limit);
      if (rows.length > 0) return rows;
    }
    const exactRows = await db
      .select()
      .from(products)
      .where(eq(products.hsCode, hs))
      .limit(limit);
    if (exactRows.length > 0) return exactRows;

    if (hs.length >= 4 && hs.length < 8) {
      return db
        .select()
        .from(products)
        .where(sql`${products.hsCode} LIKE ${hs + '%'}`)
        .limit(limit);
    }
    return [];
  }

  async getStats() {
    if (!db) throw new Error("Database not configured");
    const [totalRow] = await db.select({ c: count() }).from(products);
    const [hsRow] = await db
      .select({ c: countDistinct(products.hsCode) })
      .from(products)
      .where(sql`${products.hsCode} <> ''`);
    const [unitRow] = await db
      .select({ c: countDistinct(products.unit) })
      .from(products)
      .where(sql`${products.unit} <> '' AND ${products.unit} IS NOT NULL`);

    const topUnits = await db
      .select({ unit: products.unit, c: count() })
      .from(products)
      .where(sql`${products.unit} <> '' AND ${products.unit} IS NOT NULL`)
      .groupBy(products.unit)
      .orderBy(sql`count(*) DESC`)
      .limit(15);

    const topHs = await db
      .select({ hsCode: products.hsCode, c: count() })
      .from(products)
      .where(sql`${products.hsCode} <> ''`)
      .groupBy(products.hsCode)
      .orderBy(sql`count(*) DESC`)
      .limit(15);

    return {
      rowsTotal: totalRow.c,
      hsUnique: hsRow.c,
      unitsUnique: unitRow.c,
      topUnits: topUnits.map((r) => ({ unit: r.unit || "", count: r.c })),
      topHs: topHs.map((r) => ({ hsCode: r.hsCode, count: r.c })),
    };
  }

  async seedCheckpoints(): Promise<void> {
    if (!db) throw new Error("Database not configured");
    await db.delete(checkpointFees);
    await db.delete(checkpoints);

    const data: Record<string, { name: string; fees: Array<{ code: string; label: string; amountIqd: number }> }> = {
      mosul_dam: {
        name: "صيطرة سد الموصل",
        fees: [
          { code: "SONAR", label: "فحص سونار", amountIqd: 25000 },
          { code: "XRAY", label: "فحص أشعة", amountIqd: 50000 },
          { code: "WEIGHING", label: "وزن وعد", amountIqd: 15000 },
          { code: "STAMP", label: "وسم البضاعة", amountIqd: 10000 },
          { code: "PERMIT", label: "رسم تصريح مرور", amountIqd: 20000 },
          { code: "DOCS", label: "رسم مستمسكات", amountIqd: 5000 },
        ],
      },
      darman: {
        name: "صيطرة دارمان",
        fees: [
          { code: "SONAR", label: "فحص سونار", amountIqd: 25000 },
          { code: "XRAY", label: "فحص أشعة", amountIqd: 50000 },
          { code: "WEIGHING", label: "وزن وعد", amountIqd: 15000 },
          { code: "STAMP", label: "وسم البضاعة", amountIqd: 10000 },
          { code: "PERMIT", label: "رسم تصريح مرور", amountIqd: 15000 },
          { code: "DOCS", label: "رسم مستمسكات", amountIqd: 5000 },
        ],
      },
      ibrahim_khalil: {
        name: "منفذ إبراهيم خليل",
        fees: [
          { code: "SONAR", label: "فحص سونار", amountIqd: 30000 },
          { code: "XRAY", label: "فحص أشعة", amountIqd: 55000 },
          { code: "WEIGHING", label: "وزن وعد", amountIqd: 20000 },
          { code: "STAMP", label: "وسم البضاعة", amountIqd: 10000 },
          { code: "PERMIT", label: "رسم تصريح مرور", amountIqd: 25000 },
          { code: "DOCS", label: "رسم مستمسكات", amountIqd: 10000 },
        ],
      },
      duhok: {
        name: "منفذ دهوك",
        fees: [
          { code: "SONAR", label: "رسم سونار", amountIqd: 15000 },
          { code: "XRAY", label: "رسم تفتيش", amountIqd: 25000 },
          { code: "WEIGHING", label: "رسم وزن", amountIqd: 15000 },
          { code: "STAMP", label: "طوابع", amountIqd: 10000 },
          { code: "PERMIT", label: "رسم إجازة", amountIqd: 30000 },
          { code: "DOCS", label: "رسم مستندات", amountIqd: 25000 },
        ],
      },
    };

    for (const [id, cp] of Object.entries(data)) {
      await db.insert(checkpoints).values({ id, name: cp.name });
      for (const fee of cp.fees) {
        await db.insert(checkpointFees).values({
          checkpointId: id,
          code: fee.code,
          label: fee.label,
          amountIqd: fee.amountIqd,
        });
      }
    }
  }

  async seedProducts(rows: InsertProduct[]): Promise<number> {
    if (!db) throw new Error("Database not configured");
    if (rows.length === 0) return 0;
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await db.insert(products).values(batch);
      inserted += batch.length;
    }
    return inserted;
  }

  async clearProducts(): Promise<void> {
    if (!db) throw new Error("Database not configured");
    await db.delete(products);
  }

  async getProductCount(): Promise<number> {
    if (!db) throw new Error("Database not configured");
    const [row] = await db.select({ c: count() }).from(products);
    return row.c;
  }

  async checkProductDecisionColumn(): Promise<boolean> {
    if (!db) throw new Error("Database not configured");
    const [row] = await db.select({ action: products.decisionAction }).from(products).limit(1);
    return row?.action != null;
  }

  async updateAllDutyRates(lookupFn: (hsCode: string) => number | null): Promise<number> {
    if (!db) throw new Error("Database not configured");
    let updated = 0;
    const allProducts = await db.select({ id: products.id, hsCode: products.hsCode, dutyRate: products.dutyRate }).from(products);
    for (const p of allProducts) {
      const newRate = lookupFn(p.hsCode);
      if (newRate !== null && newRate !== p.dutyRate) {
        await db.update(products).set({ dutyRate: newRate }).where(eq(products.id, p.id));
        updated++;
      }
    }
    return updated;
  }
}

class MemoryStorage implements IStorage {
  private users: User[] = [];
  private checkpoints: Checkpoint[] = [];
  private checkpointFees: CheckpointFee[] = [];
  private products: Product[] = [];
  private nextProductId = 1;
  private nextCheckpointFeeId = 1;

  async getUser(id: string): Promise<User | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find((user) => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: randomUUID(),
      username: insertUser.username,
      password: insertUser.password,
    };
    this.users.push(user);
    return user;
  }

  async getCheckpoints(): Promise<Array<Checkpoint & { fees: CheckpointFee[] }>> {
    return this.checkpoints.map((cp) => ({
      ...cp,
      fees: this.checkpointFees.filter((fee) => fee.checkpointId === cp.id),
    }));
  }

  async getProducts(offset: number, limit: number): Promise<Product[]> {
    return this.sortedProducts().slice(offset, offset + limit);
  }

  async searchProducts(query: string, limit = 30): Promise<Product[]> {
    const trimmed = query.trim();
    const hsDigits = trimmed.replace(/[^\d]/g, "");

    if (hsDigits.length >= 4) {
      const hsMatches = this.sortedProducts().filter((product) => product.hsCode.startsWith(hsDigits)).slice(0, limit);
      if (hsMatches.length > 0) return hsMatches;
    }

    const q = trimmed.toLowerCase();
    return this.products.filter((product) => (product.description || "").toLowerCase().includes(q)).slice(0, limit);
  }

  async getProductsByHsCode(hsCode: string, unit?: string, limit = 50): Promise<Product[]> {
    const hs = hsCode.replace(/[^\d]/g, "");
    if (unit) {
      const unitMatches = this.products.filter((product) => product.hsCode === hs && product.unit === unit).slice(0, limit);
      if (unitMatches.length > 0) return unitMatches;
    }

    const exactMatches = this.products.filter((product) => product.hsCode === hs).slice(0, limit);
    if (exactMatches.length > 0) return exactMatches;

    if (hs.length >= 4 && hs.length < 8) {
      return this.products.filter((product) => product.hsCode.startsWith(hs)).slice(0, limit);
    }

    return [];
  }

  async getStats() {
    const productsWithUnit = this.products.filter((product) => product.unit && product.unit.trim() !== "");
    const topUnits = this.countBy(productsWithUnit, (product) => product.unit || "").slice(0, 15);
    const topHs = this.countBy(this.products.filter((product) => product.hsCode !== ""), (product) => product.hsCode).slice(0, 15);

    return {
      rowsTotal: this.products.length,
      hsUnique: new Set(this.products.map((product) => product.hsCode).filter(Boolean)).size,
      unitsUnique: new Set(productsWithUnit.map((product) => product.unit || "")).size,
      topUnits: topUnits.map(([unit, c]) => ({ unit, count: c })),
      topHs: topHs.map(([hsCode, c]) => ({ hsCode, count: c })),
    };
  }

  async seedCheckpoints(): Promise<void> {
    this.checkpoints = [];
    this.checkpointFees = [];
    this.nextCheckpointFeeId = 1;

    const data: Record<string, { name: string; fees: Array<{ code: string; label: string; amountIqd: number }> }> = {
      mosul_dam: {
        name: "صيطرة سد الموصل",
        fees: [
          { code: "SONAR", label: "فحص سونار", amountIqd: 25000 },
          { code: "XRAY", label: "فحص أشعة", amountIqd: 50000 },
          { code: "WEIGHING", label: "وزن وعد", amountIqd: 15000 },
          { code: "STAMP", label: "وسم البضاعة", amountIqd: 10000 },
          { code: "PERMIT", label: "رسم تصريح مرور", amountIqd: 20000 },
          { code: "DOCS", label: "رسم مستمسكات", amountIqd: 5000 },
        ],
      },
      darman: {
        name: "صيطرة دارمان",
        fees: [
          { code: "SONAR", label: "فحص سونار", amountIqd: 25000 },
          { code: "XRAY", label: "فحص أشعة", amountIqd: 50000 },
          { code: "WEIGHING", label: "وزن وعد", amountIqd: 15000 },
          { code: "STAMP", label: "وسم البضاعة", amountIqd: 10000 },
          { code: "PERMIT", label: "رسم تصريح مرور", amountIqd: 15000 },
          { code: "DOCS", label: "رسم مستمسكات", amountIqd: 5000 },
        ],
      },
      ibrahim_khalil: {
        name: "منفذ إبراهيم خليل",
        fees: [
          { code: "SONAR", label: "فحص سونار", amountIqd: 30000 },
          { code: "XRAY", label: "فحص أشعة", amountIqd: 55000 },
          { code: "WEIGHING", label: "وزن وعد", amountIqd: 20000 },
          { code: "STAMP", label: "وسم البضاعة", amountIqd: 10000 },
          { code: "PERMIT", label: "رسم تصريح مرور", amountIqd: 25000 },
          { code: "DOCS", label: "رسم مستمسكات", amountIqd: 10000 },
        ],
      },
      duhok: {
        name: "منفذ دهوك",
        fees: [
          { code: "SONAR", label: "رسم سونار", amountIqd: 15000 },
          { code: "XRAY", label: "رسم تفتيش", amountIqd: 25000 },
          { code: "WEIGHING", label: "رسم وزن", amountIqd: 15000 },
          { code: "STAMP", label: "طوابع", amountIqd: 10000 },
          { code: "PERMIT", label: "رسم إجازة", amountIqd: 30000 },
          { code: "DOCS", label: "رسم مستندات", amountIqd: 25000 },
        ],
      },
    };

    for (const [id, cp] of Object.entries(data)) {
      this.checkpoints.push({ id, name: cp.name });
      for (const fee of cp.fees) {
        this.checkpointFees.push({
          id: this.nextCheckpointFeeId++,
          checkpointId: id,
          code: fee.code,
          label: fee.label,
          amountIqd: fee.amountIqd,
        });
      }
    }
  }

  async seedProducts(rows: InsertProduct[]): Promise<number> {
    this.products = rows.map((row) => ({
      id: this.nextProductId++,
      hsCode: row.hsCode,
      cstCode: row.cstCode ?? null,
      description: row.description ?? null,
      unit: row.unit ?? null,
      weight: row.weight ?? null,
      unitPrice: row.unitPrice ?? null,
      isProtected: row.isProtected ?? false,
      protectionLevel: row.protectionLevel ?? null,
      protectionPercentage: row.protectionPercentage ?? null,
      decisionAction: row.decisionAction ?? null,
      decisionRisk: row.decisionRisk ?? null,
      decisionReason: row.decisionReason ?? null,
      minValue: row.minValue ?? null,
      avgValue: row.avgValue ?? null,
      maxValue: row.maxValue ?? null,
      dutyRate: row.dutyRate ?? null,
      currency: row.currency ?? "USD",
      sourcePage: row.sourcePage ?? null,
      rawJson: row.rawJson ?? null,
    }));
    return this.products.length;
  }

  async clearProducts(): Promise<void> {
    this.products = [];
    this.nextProductId = 1;
  }

  async getProductCount(): Promise<number> {
    return this.products.length;
  }

  async checkProductDecisionColumn(): Promise<boolean> {
    return this.products.some((product) => product.decisionAction != null);
  }

  async updateAllDutyRates(lookupFn: (hsCode: string) => number | null): Promise<number> {
    let updated = 0;
    this.products = this.products.map((product) => {
      const newRate = lookupFn(product.hsCode);
      if (newRate !== null && newRate !== product.dutyRate) {
        updated++;
        return { ...product, dutyRate: newRate };
      }
      return product;
    });
    return updated;
  }

  private sortedProducts(): Product[] {
    return [...this.products].sort((a, b) => a.hsCode.localeCompare(b.hsCode));
  }

  private countBy(items: Product[], getKey: (item: Product) => string): Array<[string, number]> {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = getKey(item);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }
}

export const storage: IStorage = hasDatabase ? new DatabaseStorage() : new MemoryStorage();
