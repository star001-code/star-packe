import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  Trash2,
  Calculator,
  Download,
  RotateCcw,
  BarChart3,
  Settings,
  Package,
  DollarSign,
} from "lucide-react";

type CheckpointFee = { code: string; label: string; amount_iqd: number };
type Checkpoint = { id: string; name: string; fees: CheckpointFee[] };
type Product = {
  id: number;
  hs_code: string;
  cst_code: string | null;
  description: string | null;
  unit: string | null;
  min_value: number | null;
  avg_value: number | null;
  max_value: number | null;
  currency: string | null;
};
type CalcItem = {
  hs_code: string;
  unit: string;
  quantity: number;
  invoice_total_value: number;
  duty_rate: number;
  description?: string;
  invoice_unit_value?: number;
  tsc_unit_value?: number;
  valuation_unit_value?: number;
  customs_value_iqd?: number;
  duty_iqd?: number;
};
type Stats = {
  rows_total: number;
  hs_unique: number;
  units_unique: number;
  top_units: { unit: string; c: number }[];
  top_hs: { hs_code: string; c: number }[];
};

function fmt(n: number | null | undefined): string {
  const x = Number(n);
  return Number.isFinite(x)
    ? x.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : "0";
}

function SearchSection({
  onUse,
}: {
  onUse: (product: Product) => void;
}) {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: results, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/search", `q=${encodeURIComponent(searchTerm)}&limit=30`],
    enabled: searchTerm.length >= 2,
  });

  const handleSearch = useCallback(() => {
    if (query.trim().length >= 2) {
      setSearchTerm(query.trim());
    }
  }, [query]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="w-5 h-5 text-primary" />
          بحث TSC
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            data-testid="input-search"
            type="search"
            placeholder="اكتب HS أو جزء من الوصف..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button
            data-testid="button-search"
            onClick={handleSearch}
            disabled={query.trim().length < 2}
          >
            <Search className="w-4 h-4" />
            بحث
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {results && results.length === 0 && (
          <p className="text-sm text-muted-foreground" data-testid="text-no-results">
            لا نتائج.
          </p>
        )}

        {results && results.length > 0 && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {results.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                data-testid={`card-result-${r.id}`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <Badge variant="default" className="text-xs" data-testid={`badge-hs-${r.id}`}>
                    HS: {r.hs_code}
                  </Badge>
                  <p className="text-sm leading-relaxed">{r.description || "—"}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground" style={{ fontVariant: "tabular-nums" }}>
                    <span>الوحدة: <code className="text-foreground">{r.unit || "—"}</code></span>
                    <span>أدنى: <code className="text-foreground">{fmt(r.min_value)}</code></span>
                    <span>متوسط: <code className="text-foreground">{fmt(r.avg_value)}</code></span>
                    <span>أعلى: <code className="text-foreground">{fmt(r.max_value)}</code></span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid={`button-use-${r.id}`}
                  onClick={() => onUse(r)}
                >
                  استخدام
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsSection({
  checkpointId,
  setCheckpointId,
  currency,
  setCurrency,
  fxRate,
  setFxRate,
  tscBasis,
  setTscBasis,
}: {
  checkpointId: string;
  setCheckpointId: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  fxRate: string;
  setFxRate: (v: string) => void;
  tscBasis: string;
  setTscBasis: (v: string) => void;
}) {
  const { data: checkpoints, isLoading } = useQuery<Checkpoint[]>({
    queryKey: ["/api/checkpoints"],
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          إعدادات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>السيطرة</Label>
          {isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select value={checkpointId} onValueChange={setCheckpointId} data-testid="select-checkpoint">
              <SelectTrigger data-testid="select-checkpoint-trigger">
                <SelectValue placeholder="اختر السيطرة" />
              </SelectTrigger>
              <SelectContent>
                {checkpoints?.map((cp) => (
                  <SelectItem key={cp.id} value={cp.id}>
                    {cp.name || cp.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>عملة الفاتورة</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger data-testid="select-currency-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="IQD">IQD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="CNY">CNY</SelectItem>
                <SelectItem value="TRY">TRY</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>سعر الصرف (IQD)</Label>
            <Input
              data-testid="input-fx-rate"
              type="number"
              value={fxRate}
              onChange={(e) => setFxRate(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>أساس TSC</Label>
          <Select value={tscBasis} onValueChange={setTscBasis}>
            <SelectTrigger data-testid="select-basis-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="avg">متوسط (avg)</SelectItem>
              <SelectItem value="min">أدنى (min)</SelectItem>
              <SelectItem value="max">أعلى (max)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function AddItemSection({
  hsCode,
  setHsCode,
  unit,
  setUnit,
  quantity,
  setQuantity,
  invoiceTotal,
  setInvoiceTotal,
  dutyRate,
  setDutyRate,
  onAdd,
}: {
  hsCode: string;
  setHsCode: (v: string) => void;
  unit: string;
  setUnit: (v: string) => void;
  quantity: string;
  setQuantity: (v: string) => void;
  invoiceTotal: string;
  setInvoiceTotal: (v: string) => void;
  dutyRate: string;
  setDutyRate: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="w-5 h-5 text-primary" />
          إضافة صنف
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>رمز HS</Label>
            <Input
              data-testid="input-hs-code"
              placeholder="مثال: 87032100"
              value={hsCode}
              onChange={(e) => setHsCode(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>الوحدة</Label>
            <Input
              data-testid="input-unit"
              placeholder="مثال: NO"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>الكمية</Label>
            <Input
              data-testid="input-quantity"
              type="number"
              placeholder="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>إجمالي الفاتورة</Label>
            <Input
              data-testid="input-invoice-total"
              type="number"
              placeholder="0"
              value={invoiceTotal}
              onChange={(e) => setInvoiceTotal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>نسبة الرسم</Label>
            <Input
              data-testid="input-duty-rate"
              type="number"
              step="0.01"
              placeholder="0.05"
              value={dutyRate}
              onChange={(e) => setDutyRate(e.target.value)}
            />
          </div>
        </div>
        <Button data-testid="button-add-item" className="w-full" onClick={onAdd}>
          <Plus className="w-4 h-4" />
          إضافة
        </Button>
      </CardContent>
    </Card>
  );
}

function ItemsTable({
  items,
  onDelete,
}: {
  items: CalcItem[];
  onDelete: (idx: number) => void;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5 text-primary" />
            الأصناف
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-items">
            لم يتم إضافة أصناف بعد
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="w-5 h-5 text-primary" />
          الأصناف ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center w-10">#</TableHead>
                <TableHead>HS</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead className="text-center">الكمية</TableHead>
                <TableHead className="text-center">الوحدة</TableHead>
                <TableHead className="text-center">فاتورة/وحدة</TableHead>
                <TableHead className="text-center">TSC/وحدة</TableHead>
                <TableHead className="text-center">معتمد/وحدة</TableHead>
                <TableHead className="text-center">القيمة IQD</TableHead>
                <TableHead className="text-center">الرسم IQD</TableHead>
                <TableHead className="text-center w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx} data-testid={`row-item-${idx}`}>
                  <TableCell className="text-center text-muted-foreground" style={{ fontVariant: "tabular-nums" }}>
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="text-xs">
                      {item.hs_code}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {item.description || "—"}
                  </TableCell>
                  <TableCell className="text-center" style={{ fontVariant: "tabular-nums" }}>
                    {fmt(item.quantity)}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {item.unit || "—"}
                  </TableCell>
                  <TableCell className="text-center" style={{ fontVariant: "tabular-nums" }}>
                    {fmt(item.invoice_unit_value)}
                  </TableCell>
                  <TableCell className="text-center" style={{ fontVariant: "tabular-nums" }}>
                    {fmt(item.tsc_unit_value)}
                  </TableCell>
                  <TableCell className="text-center font-semibold" style={{ fontVariant: "tabular-nums" }}>
                    {fmt(item.valuation_unit_value)}
                  </TableCell>
                  <TableCell className="text-center" style={{ fontVariant: "tabular-nums" }}>
                    {fmt(item.customs_value_iqd)}
                  </TableCell>
                  <TableCell className="text-center" style={{ fontVariant: "tabular-nums" }}>
                    {fmt(item.duty_iqd)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`button-delete-item-${idx}`}
                      onClick={() => onDelete(idx)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function TotalsSection({
  dutyTotal,
  feesTotal,
  grandTotal,
}: {
  dutyTotal: number;
  feesTotal: number;
  grandTotal: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="w-5 h-5 text-primary" />
          المجاميع
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between" data-testid="text-duty-total">
          <span className="text-muted-foreground">إجمالي الرسوم</span>
          <span className="font-semibold" style={{ fontVariant: "tabular-nums" }}>{fmt(dutyTotal)} IQD</span>
        </div>
        <div className="flex items-center justify-between" data-testid="text-fees-total">
          <span className="text-muted-foreground">رسوم السيطرة</span>
          <span className="font-semibold" style={{ fontVariant: "tabular-nums" }}>{fmt(feesTotal)} IQD</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between" data-testid="text-grand-total">
          <span className="text-lg font-bold">المجموع النهائي</span>
          <span className="text-lg font-bold text-primary" style={{ fontVariant: "tabular-nums" }}>
            {fmt(grandTotal)} IQD
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionsSection({
  onCalculate,
  onExport,
  onReset,
  isCalculating,
  hasItems,
}: {
  onCalculate: () => void;
  onExport: () => void;
  onReset: () => void;
  isCalculating: boolean;
  hasItems: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        data-testid="button-calculate"
        onClick={onCalculate}
        disabled={!hasItems || isCalculating}
        className="flex-1"
      >
        <Calculator className="w-4 h-4" />
        {isCalculating ? "جاري الحساب..." : "حساب"}
      </Button>
      <Button
        data-testid="button-export"
        variant="outline"
        onClick={onExport}
        disabled={!hasItems}
      >
        <Download className="w-4 h-4" />
        تصدير JSON
      </Button>
      <Button
        data-testid="button-reset"
        variant="destructive"
        onClick={onReset}
      >
        <RotateCcw className="w-4 h-4" />
        تصفير
      </Button>
    </div>
  );
}

function StatsDisplay() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-primary" />
          إحصائيات قاعدة البيانات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center" data-testid="stats-display">
          <div>
            <p className="text-2xl font-bold" style={{ fontVariant: "tabular-nums" }} data-testid="text-stat-rows">
              {fmt(stats.rows_total)}
            </p>
            <p className="text-xs text-muted-foreground">إجمالي الصفوف</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ fontVariant: "tabular-nums" }} data-testid="text-stat-hs">
              {fmt(stats.hs_unique)}
            </p>
            <p className="text-xs text-muted-foreground">رموز HS فريدة</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ fontVariant: "tabular-nums" }} data-testid="text-stat-units">
              {fmt(stats.units_unique)}
            </p>
            <p className="text-xs text-muted-foreground">وحدات فريدة</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { toast } = useToast();

  const [checkpointId, setCheckpointId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [fxRate, setFxRate] = useState("1310");
  const [tscBasis, setTscBasis] = useState("avg");

  const [hsCode, setHsCode] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [invoiceTotal, setInvoiceTotal] = useState("");
  const [dutyRate, setDutyRate] = useState("");

  const [items, setItems] = useState<CalcItem[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const { data: checkpoints } = useQuery<Checkpoint[]>({
    queryKey: ["/api/checkpoints"],
  });

  const handleUseProduct = useCallback((product: Product) => {
    setHsCode(product.hs_code || "");
    setUnit(product.unit || "");
  }, []);

  const handleAddItem = useCallback(() => {
    const hs = (hsCode || "").replace(/[^\d]/g, "").trim();
    if (!hs) {
      toast({ title: "خطأ", description: "أدخل رمز HS", variant: "destructive" });
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast({ title: "خطأ", description: "الكمية يجب أن تكون أكبر من 0", variant: "destructive" });
      return;
    }
    const inv = Number(invoiceTotal) || 0;
    const rate = Number(dutyRate) || 0;

    setItems((prev) => [
      ...prev,
      {
        hs_code: hs,
        unit: unit.trim(),
        quantity: qty,
        invoice_total_value: inv,
        duty_rate: rate,
      },
    ]);

    setHsCode("");
    setUnit("");
    setQuantity("");
    setInvoiceTotal("");
    setDutyRate("");
  }, [hsCode, unit, quantity, invoiceTotal, dutyRate, toast]);

  const handleDeleteItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleCalculate = useCallback(async () => {
    if (!items.length) return;
    const cpId = checkpointId || checkpoints?.[0]?.id || "";
    if (!cpId) {
      toast({ title: "خطأ", description: "اختر السيطرة أولاً", variant: "destructive" });
      return;
    }

    setIsCalculating(true);
    try {
      const payload = {
        checkpoint_id: cpId,
        fx_rate: Number(fxRate) || 1310,
        invoice_currency: currency,
        items: items.map((it) => ({
          hs_code: it.hs_code,
          unit: it.unit || null,
          quantity: it.quantity,
          invoice_total_value: it.invoice_total_value,
          duty_rate: it.duty_rate,
          tsc_basis: tscBasis,
        })),
      };

      const res = await apiRequest("POST", "/api/calculate", payload);
      const data = await res.json();
      setLastResult(data);
      setItems(
        data.items.map((x: any, idx: number) => ({
          ...items[idx],
          ...x,
        }))
      );
      toast({ title: "تم الحساب بنجاح" });
    } catch (e: any) {
      toast({
        title: "خطأ في الحساب",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  }, [items, checkpointId, checkpoints, fxRate, currency, tscBasis, toast]);

  const handleExport = useCallback(() => {
    const out = lastResult || { items };
    const blob = new Blob([JSON.stringify(out, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "customs_calc_result.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, [lastResult, items]);

  const handleReset = useCallback(() => {
    setItems([]);
    setLastResult(null);
  }, []);

  const dutyTotal = items.reduce((s, x) => s + (Number(x.duty_iqd) || 0), 0);
  const feesTotal = lastResult?.fees?.total_iqd ?? 0;
  const grandTotal = dutyTotal + feesTotal;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            حاسبة كمركية داخلية
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">
            نظام حساب الرسوم الكمركية - العراق
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchSection onUse={handleUseProduct} />
          <SettingsSection
            checkpointId={checkpointId || checkpoints?.[0]?.id || ""}
            setCheckpointId={setCheckpointId}
            currency={currency}
            setCurrency={setCurrency}
            fxRate={fxRate}
            setFxRate={setFxRate}
            tscBasis={tscBasis}
            setTscBasis={setTscBasis}
          />
        </div>

        <AddItemSection
          hsCode={hsCode}
          setHsCode={setHsCode}
          unit={unit}
          setUnit={setUnit}
          quantity={quantity}
          setQuantity={setQuantity}
          invoiceTotal={invoiceTotal}
          setInvoiceTotal={setInvoiceTotal}
          dutyRate={dutyRate}
          setDutyRate={setDutyRate}
          onAdd={handleAddItem}
        />

        <ItemsTable items={items} onDelete={handleDeleteItem} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TotalsSection
            dutyTotal={dutyTotal}
            feesTotal={feesTotal}
            grandTotal={grandTotal}
          />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">الإجراءات</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionsSection
                onCalculate={handleCalculate}
                onExport={handleExport}
                onReset={handleReset}
                isCalculating={isCalculating}
                hasItems={items.length > 0}
              />
            </CardContent>
          </Card>
        </div>

        <StatsDisplay />
      </main>
    </div>
  );
}
