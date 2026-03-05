import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Calculator,
  Search,
  Plus,
  Trash2,
  Receipt,
  ArrowLeftRight,
  Loader2,
  Package,
  Copy,
  RotateCcw,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Product = {
  id: number;
  hs_code: string;
  cst_code: string | null;
  description: string | null;
  unit: string | null;
  min_value: number | null;
  avg_value: number | null;
  max_value: number | null;
  duty_rate: number | null;
  currency: string | null;
};

type CalcItem = {
  localId: string;
  hs_code: string;
  description: string;
  quantity: number;
  unit: string;
  value_usd: number;
  duty_rate: number;
  paid_duty: number;
  avg_value: number | null;
};

type CalcResult = {
  fx_rate: number;
  items: {
    hs_code: string;
    description: string;
    quantity: number;
    unit: string;
    value_usd: number;
    duty_rate: number;
    duty_usd: number;
    paid_duty_usd: number;
    difference_usd: number;
    difference_iqd: number;
  }[];
  summary: {
    total_duty_usd: number;
    total_paid_usd: number;
    total_difference_usd: number;
    total_difference_iqd: number;
  };
};

function formatUSD(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatIQD(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

let idCounter = 0;
function nextId() {
  return `item-${++idCounter}`;
}

function ProductSearchPopup({
  onSelect,
  onClose,
}: {
  onSelect: (p: Product) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery<Product[]>({
    queryKey: [`/api/search?q=${encodeURIComponent(q)}&limit=20`],
    enabled: q.length >= 2,
  });

  return (
    <Card className="border-primary/30">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="ابحث بالرمز أو الوصف..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            data-testid="input-product-search"
          />
          <Button size="sm" variant="ghost" onClick={onClose} data-testid="button-close-search">
            ✕
          </Button>
        </div>
        {isLoading && <Skeleton className="h-20" />}
        {data && data.length === 0 && q.length >= 2 && (
          <p className="text-sm text-muted-foreground text-center py-2">لا توجد نتائج</p>
        )}
        {data && data.length > 0 && (
          <div className="max-h-60 overflow-y-auto space-y-1">
            {data.slice(0, 20).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelect(p);
                  onClose();
                }}
                className="w-full text-right p-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between gap-2"
                data-testid={`button-product-${p.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs shrink-0">
                      {p.hs_code}
                    </Badge>
                    <span className="text-sm truncate">{p.description || "-"}</span>
                  </div>
                </div>
                {p.duty_rate != null && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {Math.round(p.duty_rate * 100)}%
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CalculatorPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<CalcItem[]>([]);
  const [fxRate, setFxRate] = useState(1320);
  const [showSearch, setShowSearch] = useState(false);
  const [result, setResult] = useState<CalcResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const prefilled = useRef(false);

  useEffect(() => {
    if (prefilled.current) return;
    const params = new URLSearchParams(window.location.search);

    const manifestData = params.get("manifest");
    if (manifestData) {
      prefilled.current = true;
      try {
        const parsed = JSON.parse(decodeURIComponent(manifestData));
        const manifestItems = Array.isArray(parsed) ? parsed : (parsed.items || []);

        if (manifestItems.length > 0) {
          const newItems: CalcItem[] = manifestItems.map((p: any) => ({
            localId: nextId(),
            hs_code: String(p.hs_code || ""),
            description: String(p.description || ""),
            quantity: Number(p.quantity) || 1,
            unit: String(p.unit || ""),
            value_usd: Number(p.total_value) || 0,
            duty_rate: Number(p.duty_rate) > 0 ? Number(p.duty_rate) : 0.30,
            paid_duty: Number(p.duty_amount) || 0,
            avg_value: null,
          }));
          setItems(newItems);
        }
      } catch {}
      window.history.replaceState({}, "", "/calculator");
      return;
    }

    const hs = params.get("hs");
    if (hs) {
      prefilled.current = true;
      setItems((prev) => [
        ...prev,
        {
          localId: nextId(),
          hs_code: hs,
          description: params.get("desc") || "",
          quantity: 1,
          unit: params.get("unit") || "",
          value_usd: 0,
          duty_rate: 0.30,
          paid_duty: 0,
          avg_value: null,
        },
      ]);
      window.history.replaceState({}, "", "/calculator");
    }
  }, []);

  const calcMutation = useMutation({
    mutationFn: async (body: unknown) => {
      const res = await apiRequest("POST", "/api/calculate", body);
      return res.json() as Promise<CalcResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    },
    onError: (err: Error) => {
      let msg = err.message;
      try {
        const json = JSON.parse(msg.replace(/^\d+:\s*/, ""));
        msg = json.error || msg;
      } catch {}
      toast({ title: "خطأ في الحساب", description: msg, variant: "destructive" });
    },
  });

  const addProduct = (product: Product) => {
    const lawRate = product.duty_rate ?? 0.20;
    const isUsd = product.currency === "USD";
    const avgVal = product.avg_value != null
      ? (isUsd ? product.avg_value : product.avg_value / 1320)
      : null;
    setItems((prev) => [
      ...prev,
      {
        localId: nextId(),
        hs_code: product.hs_code,
        description: product.description || "",
        quantity: 1,
        unit: product.unit || "",
        value_usd: avgVal != null ? Math.round(avgVal * 100) / 100 : 0,
        duty_rate: lawRate,
        paid_duty: 0,
        avg_value: avgVal != null ? Math.round(avgVal * 100) / 100 : null,
      },
    ]);
    setResult(null);
  };

  const updateItem = (localId: string, field: keyof CalcItem, value: string | number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.localId === localId ? { ...it, [field]: value } : it
      )
    );
    setResult(null);
  };

  const removeItem = (localId: string) => {
    setItems((prev) => prev.filter((it) => it.localId !== localId));
    setResult(null);
  };

  const handleCalculate = () => {
    if (items.length === 0) {
      toast({ title: "أضف منتج", description: "يجب إضافة منتج واحد على الأقل", variant: "destructive" });
      return;
    }

    calcMutation.mutate({
      fx_rate: fxRate,
      items: items.map((it) => ({
        hs_code: it.hs_code,
        quantity: it.quantity,
        unit: it.unit || null,
        value_usd: it.value_usd,
        duty_rate: it.duty_rate,
        paid_duty: it.paid_duty,
      })),
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-calc-title">
          حاسبة الرسوم الكمركية
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          الوزن × القيمة الاستدلالية × نسبة الرسم% = الرسم
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <Label className="flex items-center gap-1.5 text-sm">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            سعر الصرف (1 USD = ? IQD)
          </Label>
          <Input
            type="number"
            value={fxRate}
            onChange={(e) => {
              setFxRate(parseFloat(e.target.value) || 0);
              setResult(null);
            }}
            data-testid="input-fx-rate"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            المنتجات
            {items.length > 0 && <Badge variant="secondary">{items.length}</Badge>}
          </CardTitle>
          <Button size="sm" onClick={() => setShowSearch(true)} data-testid="button-add-product">
            <Plus className="h-4 w-4" />
            <span className="mr-1">إضافة منتج</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showSearch && (
            <ProductSearchPopup
              onSelect={addProduct}
              onClose={() => setShowSearch(false)}
            />
          )}

          {items.length === 0 && !showSearch && (
            <div className="py-6 text-center text-muted-foreground text-sm" data-testid="text-no-items">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              لم تُضف أي منتجات بعد. اضغط "إضافة منتج" للبدء.
            </div>
          )}

          {items.map((item, idx) => (
            <Card key={item.localId} data-testid={`card-item-${idx}`}>
              <CardContent className="p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono">{item.hs_code}</Badge>
                      <span className="text-sm truncate">{item.description || "-"}</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeItem(item.localId)}
                    data-testid={`button-remove-item-${idx}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">الوزن / الكمية</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.localId, "quantity", parseFloat(e.target.value) || 1)}
                      data-testid={`input-qty-${idx}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      القيمة الاستدلالية (USD)
                      {item.avg_value != null && (
                        <span className="text-emerald-400 font-mono mr-1">
                          متوسط: {item.avg_value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={item.value_usd}
                      onChange={(e) => updateItem(item.localId, "value_usd", parseFloat(e.target.value) || 0)}
                      data-testid={`input-value-${idx}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">نسبة الرسم %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={200}
                      step={1}
                      value={Math.round(item.duty_rate * 100)}
                      onChange={(e) => updateItem(item.localId, "duty_rate", (parseFloat(e.target.value) || 0) / 100)}
                      data-testid={`input-duty-rate-${idx}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">الرسم المدفوع (USD)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={item.paid_duty}
                      onChange={(e) => updateItem(item.localId, "paid_duty", parseFloat(e.target.value) || 0)}
                      data-testid={`input-paid-duty-${idx}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Button
          className="w-full"
          size="lg"
          onClick={handleCalculate}
          disabled={calcMutation.isPending}
          data-testid="button-calculate"
        >
          {calcMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Calculator className="h-4 w-4" />
          )}
          <span className="mr-2">احسب</span>
        </Button>
      )}

      {result && (
        <Card ref={resultRef} data-testid="card-result">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              نتائج الحساب
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const lines: string[] = [];
                  lines.push(`حاسبة الرسوم الكمركية`);
                  lines.push(`سعر الصرف: ${result.fx_rate.toLocaleString()} IQD/USD`);
                  lines.push(`---`);
                  result.items.forEach((ri) => {
                    lines.push(`${ri.hs_code} - ${ri.description}`);
                    lines.push(`  الوزن: ${ri.quantity} ${ri.unit}`);
                    lines.push(`  القيمة الاستدلالية: $${formatUSD(ri.value_usd)}`);
                    lines.push(`  نسبة الرسم: ${(ri.duty_rate * 100).toFixed(0)}%`);
                    lines.push(`  الرسم: $${formatUSD(ri.duty_usd)}`);
                    if (ri.paid_duty_usd > 0) {
                      lines.push(`  المدفوع: $${formatUSD(ri.paid_duty_usd)}`);
                      lines.push(`  الفرق: $${formatUSD(ri.difference_usd)} = ${formatIQD(ri.difference_iqd)} د.ع`);
                    }
                  });
                  lines.push(`---`);
                  lines.push(`إجمالي الرسم: $${formatUSD(result.summary.total_duty_usd)}`);
                  if (result.summary.total_paid_usd > 0) {
                    lines.push(`إجمالي المدفوع: $${formatUSD(result.summary.total_paid_usd)}`);
                  }
                  lines.push(`الفرق: $${formatUSD(result.summary.total_difference_usd)}`);
                  lines.push(`الفرق بالدينار: ${formatIQD(result.summary.total_difference_iqd)} د.ع`);
                  try {
                    await navigator.clipboard.writeText(lines.join("\n"));
                    toast({ title: "تم النسخ", description: "تم نسخ ملخص الحساب" });
                  } catch {
                    toast({ title: "تعذر النسخ", description: "يرجى النسخ يدوياً", variant: "destructive" });
                  }
                }}
                data-testid="button-copy-result"
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="mr-1">نسخ</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setItems([]);
                }}
                data-testid="button-reset"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="mr-1">جديد</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">سعر الصرف:</span>
              <span className="font-mono">{result.fx_rate.toLocaleString()} IQD/USD</span>
            </div>

            {result.items.map((ri, idx) => (
              <Card key={idx} data-testid={`card-result-item-${idx}`}>
                <CardContent className="p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono">{ri.hs_code}</Badge>
                    <span className="truncate">{ri.description || "-"}</span>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3 space-y-1 text-xs font-mono">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">الوزن × القيمة الاستدلالية × نسبة الرسم:</span>
                      <span>{ri.quantity} × ${formatUSD(ri.value_usd)} × {(ri.duty_rate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between gap-2 font-bold text-base">
                      <span className="text-muted-foreground">= الرسم:</span>
                      <span>${formatUSD(ri.duty_usd)}</span>
                    </div>
                  </div>
                  {ri.paid_duty_usd > 0 && (
                    <div className="rounded-md bg-muted/30 p-3 space-y-1 text-xs font-mono">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">الرسم - المدفوع:</span>
                        <span>${formatUSD(ri.duty_usd)} - ${formatUSD(ri.paid_duty_usd)}</span>
                      </div>
                      <div className={`flex justify-between gap-2 font-bold text-base ${ri.difference_usd > 0 ? 'text-destructive' : 'text-emerald-400'}`}>
                        <span>= الفرق:</span>
                        <span>${formatUSD(ri.difference_usd)}</span>
                      </div>
                      <div className={`flex justify-between gap-2 font-bold ${ri.difference_usd > 0 ? 'text-destructive' : 'text-emerald-400'}`}>
                        <span>= بالدينار:</span>
                        <span>{formatIQD(ri.difference_iqd)} د.ع</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="border-t pt-3 space-y-3" data-testid="section-summary">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">إجمالي الرسم:</span>
                <span className="font-mono font-bold">${formatUSD(result.summary.total_duty_usd)}</span>
              </div>
              {result.summary.total_paid_usd > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">إجمالي المدفوع:</span>
                  <span className="font-mono">${formatUSD(result.summary.total_paid_usd)}</span>
                </div>
              )}
              <div className={`flex items-center justify-between text-base font-bold rounded-md p-3 ${result.summary.total_difference_usd > 0 ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-400'}`} data-testid="text-total-diff">
                <span>الفرق:</span>
                <div className="text-left font-mono">
                  <div className="text-lg">${formatUSD(result.summary.total_difference_usd)}</div>
                  <div className="text-sm opacity-75">{formatIQD(result.summary.total_difference_iqd)} د.ع</div>
                </div>
              </div>
              {result.summary.total_difference_usd !== 0 && (
                <div className="text-xs text-muted-foreground text-center">
                  {result.summary.total_difference_usd > 0 ? "موجب = عليك فرق" : "سالب = دافع زايد"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
