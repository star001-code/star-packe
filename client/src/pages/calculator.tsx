import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  Search,
  Plus,
  Trash2,
  Receipt,
  ArrowLeftRight,
  Loader2,
  Package,
  AlertCircle,
  Copy,
  RotateCcw,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const GOODS_CATEGORIES = [
  { id: "food_basic", label: "مواد غذائية أساسية", dutyRate: 0.05, taxDeposit: 0.01 },
  { id: "food_processed", label: "مواد غذائية مصنعة", dutyRate: 0.05, taxDeposit: 0.03 },
  { id: "medical", label: "أدوية ومستلزمات طبية", dutyRate: 0.05, taxDeposit: 0.01 },
  { id: "agriculture", label: "مدخلات زراعية", dutyRate: 0.05, taxDeposit: 0.01 },
  { id: "education", label: "مواد تعليمية وقرطاسية", dutyRate: 0.05, taxDeposit: 0.01 },
  { id: "solar", label: "معدات طاقة شمسية", dutyRate: 0.05, taxDeposit: 0.01 },
  { id: "raw_materials", label: "مواد خام", dutyRate: 0.10, taxDeposit: 0.03 },
  { id: "computers", label: "حواسيب ولوازمها", dutyRate: 0.05, taxDeposit: 0.03 },
  { id: "industrial", label: "مدخلات صناعية", dutyRate: 0.15, taxDeposit: 0.03 },
  { id: "construction", label: "مواد بناء", dutyRate: 0.15, taxDeposit: 0.03 },
  { id: "electrical", label: "كهربائيات (ثلاجات، مكيفات، غسالات)", dutyRate: 0.15, taxDeposit: 0.03 },
  { id: "vehicles", label: "مركبات (موحد 15%)", dutyRate: 0.15, taxDeposit: 0.03 },
  { id: "electronics", label: "إلكترونيات استهلاكية", dutyRate: 0.20, taxDeposit: 0.03 },
  { id: "smartphones", label: "هواتف ذكية", dutyRate: 0.20, taxDeposit: 0.03 },
  { id: "clothing", label: "ملابس ومنسوجات", dutyRate: 0.20, taxDeposit: 0.03 },
  { id: "household", label: "أدوات منزلية", dutyRate: 0.25, taxDeposit: 0.03 },
  { id: "consumer", label: "سلع استهلاكية عامة", dutyRate: 0.30, taxDeposit: 0.03 },
  { id: "luxury_goods", label: "سلع كمالية", dutyRate: 0.40, taxDeposit: 0.03 },
  { id: "jewelry", label: "مجوهرات وذهب", dutyRate: 0.05, taxDeposit: 0.02 },
  { id: "machinery", label: "مكائن ومعدات إنتاجية", dutyRate: 0.10, taxDeposit: 0.02 },
  { id: "cleaning", label: "منتجات تنظيف", dutyRate: 0.65, taxDeposit: 0.03 },
  { id: "plastic_protected", label: "بلاستيك (حاويات/أكواب) - محمي", dutyRate: 0.30, taxDeposit: 0.03 },
  { id: "steel_rebar", label: "حديد تسليح (10-32 ملم) - محمي", dutyRate: 0.30, taxDeposit: 0.03 },
  { id: "tobacco", label: "تبغ وسكائر", dutyRate: 1.00, taxDeposit: 0.03 },
  { id: "alcohol", label: "مشروبات كحولية", dutyRate: 1.50, taxDeposit: 0.03 },
  { id: "custom", label: "نسبة مخصصة", dutyRate: 0, taxDeposit: 0.03 },
];

const PROTECTION_RULES: { hsPrefix: string; rate: number; label: string }[] = [
  { hsPrefix: "72142", rate: 0.30, label: "حديد تسليح - حماية منتج وطني" },
  { hsPrefix: "3924", rate: 0.60, label: "حاويات بلاستيك - حماية منتج وطني" },
  { hsPrefix: "3917", rate: 0.60, label: "أنابيب بلاستيك - حماية منتج وطني" },
];

function getAutoProtection(hsCode: string): number {
  const normalized = hsCode.replace(/[^\d]/g, "");
  for (const rule of PROTECTION_RULES) {
    if (normalized.startsWith(rule.hsPrefix)) {
      return rule.rate;
    }
  }
  return 0;
}

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
  invoice_total_value: number;
  duty_rate: number;
  protection_rate: number;
  category: string;
  tsc_basis: "avg" | "min" | "max";
  tsc_min: number | null;
  tsc_avg: number | null;
  tsc_max: number | null;
  paid_duty: number;
};

type CalcResult = {
  fx: { from: string; to: string; rate: number };
  items: {
    hs_code: string;
    description: string;
    quantity: number;
    unit: string;
    invoice_total_usd: number;
    invoice_unit_usd: number;
    gds_min_iqd: number;
    gds_max_iqd: number;
    valuation_unit_usd: number;
    valuation_unit_iqd: number;
    valuation_flag: "normal" | "raised" | "audit";
    customs_value_usd: number;
    duty_rate: number;
    protection_rate: number;
    duty_after_discount_usd: number;
    discount_rate: number;
    sales_tax_usd: number;
    goods_category: string;
    item_total_usd: number;
    paid_duty_usd: number;
    item_difference_usd: number;
    item_total_iqd: number;
    item_difference_iqd: number;
  }[];
  summary: {
    duty_after_discount_usd: number;
    discount_rate: number;
    sales_tax_usd: number;
    total_payable_usd: number;
    total_payable_iqd: number;
    paid_usd: number;
    difference_usd: number;
    difference_iqd: number;
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
  onSelect: (product: Product) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (val: string) => {
    setQ(val);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setDebounced(val.trim()), 300);
    setTimer(t);
  };

  const { data: results, isLoading } = useQuery<Product[]>({
    queryKey: [`/api/search?q=${encodeURIComponent(debounced)}&limit=20`],
    enabled: debounced.length >= 2,
    staleTime: 30000,
  });

  return (
    <Card data-testid="card-product-search-popup">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Search className="h-4 w-4" />
          ابحث عن المنتج
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input
          data-testid="input-product-search"
          placeholder="رمز HS أو وصف المنتج..."
          value={q}
          onChange={(e) => handleChange(e.target.value)}
          autoFocus
        />
        {isLoading && <Skeleton className="h-8 w-full" />}
        {results && results.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">لا توجد نتائج</p>
        )}
        {results && results.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-1">
            {results.map((p) => (
              <button
                key={p.id}
                className="w-full text-right p-2 rounded-md text-sm hover-elevate cursor-pointer"
                onClick={() => {
                  onSelect(p);
                  onClose();
                }}
                data-testid={`btn-select-product-${p.id}`}
              >
                <span className="font-mono text-xs text-muted-foreground">{p.hs_code}</span>
                <span className="mx-2">-</span>
                <span className="truncate">{p.description || "-"}</span>
              </button>
            ))}
          </div>
        )}
        <Button size="sm" variant="ghost" onClick={onClose} className="w-full" data-testid="button-close-search-popup">
          إلغاء
        </Button>
      </CardContent>
    </Card>
  );
}

export default function CalculatorPage() {
  const { toast } = useToast();
  const [fxRate, setFxRate] = useState(1320);
  const [items, setItems] = useState<CalcItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [paidUsd, setPaidUsd] = useState(0);
  const [discountRate, setDiscountRate] = useState(25);
  const prefilled = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const fetchTscValues = async (hsCode: string) => {
    try {
      const res = await fetch(`/api/hs/${encodeURIComponent(hsCode)}`);
      if (res.ok) {
        const products: Product[] = await res.json();
        if (products.length > 0) {
          const p = products[0];
          setItems((prev) =>
            prev.map((it) =>
              it.hs_code === hsCode && it.tsc_min === null
                ? { ...it, tsc_min: p.min_value, tsc_avg: p.avg_value, tsc_max: p.max_value }
                : it
            )
          );
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (prefilled.current) return;
    const params = new URLSearchParams(window.location.search);

    const manifestData = params.get("manifest");
    if (manifestData) {
      prefilled.current = true;
      try {
        const parsed = JSON.parse(decodeURIComponent(manifestData));
        const manifestItems = Array.isArray(parsed) ? parsed : (parsed.items || []);

        if (parsed.paid_amount_usd) {
          setPaidUsd(Number(parsed.paid_amount_usd) || 0);
        }

        if (manifestItems.length > 0) {
          const newItems: CalcItem[] = manifestItems.map((p: any) => {
            let matchedCatId = "consumer";
            if (p.goods_category && GOODS_CATEGORIES.some(c => c.id === p.goods_category)) {
              matchedCatId = p.goods_category;
            } else if (Number(p.duty_rate) > 0) {
              matchedCatId = GOODS_CATEGORIES.filter(c => c.id !== "custom").reduce((best, c) =>
                Math.abs(c.dutyRate - Number(p.duty_rate)) < Math.abs(best.dutyRate - Number(p.duty_rate)) ? c : best
              ).id;
            }
            return {
              localId: nextId(),
              hs_code: String(p.hs_code || ""),
              description: String(p.description || ""),
              quantity: Number(p.quantity) || 1,
              unit: String(p.unit || ""),
              invoice_total_value: Number(p.total_value) || 0,
              duty_rate: Number(p.duty_rate) > 0 ? Number(p.duty_rate) : 0.30,
              protection_rate: getAutoProtection(String(p.hs_code || "")),
              category: matchedCatId,
              tsc_basis: "avg" as const,
              tsc_min: null,
              tsc_avg: null,
              tsc_max: null,
              paid_duty: Number(p.duty_amount) || 0,
            };
          });
          setItems(newItems);
          newItems.forEach((it) => {
            if (it.hs_code) fetchTscValues(it.hs_code);
          });
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
          invoice_total_value: 0,
          duty_rate: 0.30,
          protection_rate: getAutoProtection(hs),
          category: "consumer",
          tsc_basis: "avg",
          tsc_min: null,
          tsc_avg: null,
          tsc_max: null,
          paid_duty: 0,
        },
      ]);
      fetchTscValues(hs);
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
    const matchedCat = GOODS_CATEGORIES.reduce((best, c) =>
      Math.abs(c.dutyRate - lawRate) < Math.abs(best.dutyRate - lawRate) ? c : best
    , GOODS_CATEGORIES[0]);
    setItems((prev) => [
      ...prev,
      {
        localId: nextId(),
        hs_code: product.hs_code,
        description: product.description || "",
        quantity: 1,
        unit: product.unit || "",
        invoice_total_value: 0,
        duty_rate: lawRate,
        protection_rate: getAutoProtection(product.hs_code),
        category: matchedCat.id,
        tsc_basis: "avg",
        tsc_min: product.min_value,
        tsc_avg: product.avg_value,
        tsc_max: product.max_value,
        paid_duty: 0,
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

  const handleCategoryChange = (localId: string, categoryId: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.localId === localId
          ? { ...it, category: categoryId }
          : it
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
      invoice_currency: "USD",
      paid_usd: paidUsd,
      discount_rate: discountRate / 100,
      items: items.map((it) => ({
        hs_code: it.hs_code,
        quantity: it.quantity,
        unit: it.unit || null,
        invoice_total_value: it.invoice_total_value,
        duty_rate: it.duty_rate,
        protection_rate: it.protection_rate,
        tsc_basis: it.tsc_basis,
        goods_category: it.category,
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
          أضف المنتجات لحساب الرسوم الكمركية والضرائب
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <CardContent className="p-4 space-y-2">
            <Label className="flex items-center gap-1.5 text-sm">
              <Receipt className="h-3.5 w-3.5" />
              المدفوع (USD)
            </Label>
            <Input
              type="number"
              min={0}
              value={paidUsd}
              onChange={(e) => {
                setPaidUsd(parseFloat(e.target.value) || 0);
                setResult(null);
              }}
              data-testid="input-paid-duty"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <Label className="flex items-center gap-1.5 text-sm">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              نسبة التخفيض (%)
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={discountRate}
              onChange={(e) => {
                setDiscountRate(parseFloat(e.target.value) || 0);
                setResult(null);
              }}
              data-testid="input-discount-rate"
            />
          </CardContent>
        </Card>
      </div>

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

                {(item.tsc_min !== null || item.tsc_avg !== null || item.tsc_max !== null) && (
                  <div className="flex items-center gap-3 text-xs flex-wrap" data-testid={`tsc-values-${idx}`}>
                    <span className="text-muted-foreground">TSC:</span>
                    {item.tsc_min !== null && (
                      <span className="text-blue-400">أدنى <span className="font-mono">{Math.round(item.tsc_min).toLocaleString()} د.ع</span></span>
                    )}
                    {item.tsc_avg !== null && (
                      <span className="text-emerald-400">متوسط <span className="font-mono">{Math.round(item.tsc_avg).toLocaleString()} د.ع</span></span>
                    )}
                    {item.tsc_max !== null && (
                      <span className="text-amber-400">أقصى <span className="font-mono">{Math.round(item.tsc_max).toLocaleString()} د.ع</span></span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">الكمية</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.localId, "quantity", parseFloat(e.target.value) || 1)}
                      data-testid={`input-qty-${idx}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">قيمة الفاتورة (USD)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={item.invoice_total_value}
                      onChange={(e) => updateItem(item.localId, "invoice_total_value", parseFloat(e.target.value) || 0)}
                      data-testid={`input-invoice-${idx}`}
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
                  <div className="space-y-1">
                    <Label className="text-xs">تصنيف البضاعة</Label>
                    <Select
                      value={item.category}
                      onValueChange={(v) => handleCategoryChange(item.localId, v)}
                      data-testid={`select-category-${idx}`}
                    >
                      <SelectTrigger data-testid={`trigger-category-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOODS_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.label} ({(cat.dutyRate * 100).toFixed(0)}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">أساس التقييم</Label>
                    <Select
                      value={item.tsc_basis}
                      onValueChange={(v) => updateItem(item.localId, "tsc_basis", v)}
                    >
                      <SelectTrigger data-testid={`trigger-basis-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avg">متوسط</SelectItem>
                        <SelectItem value="min">أدنى</SelectItem>
                        <SelectItem value="max">أقصى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                    <Label className="text-xs">نسبة حماية المنتج %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={200}
                      step={1}
                      value={Math.round(item.protection_rate * 100)}
                      onChange={(e) => updateItem(item.localId, "protection_rate", (parseFloat(e.target.value) || 0) / 100)}
                      data-testid={`input-protection-rate-${idx}`}
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
          <span className="mr-2">احسب الرسوم الكمركية</span>
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
                  lines.push(`سعر الصرف: ${result.fx.rate.toLocaleString()} IQD/USD`);
                  lines.push(`نسبة التخفيض: ${(result.summary.discount_rate * 100).toFixed(0)}%`);
                  lines.push(`---`);
                  result.items.forEach((ri) => {
                    lines.push(`${ri.hs_code} - ${ri.description}`);
                    lines.push(`  الكمية: ${ri.quantity} ${ri.unit}`);
                    lines.push(`  قيمة الفاتورة: $${formatUSD(ri.invoice_total_usd)}`);
                    if (ri.valuation_flag === "raised") {
                      lines.push(`  [رفع] رُفعت للحد الأدنى GDS: ${formatIQD(ri.gds_min_iqd)} د.ع`);
                    } else if (ri.valuation_flag === "audit") {
                      lines.push(`  [تدقيق] أعلى من الحد الأقصى GDS: ${formatIQD(ri.gds_max_iqd)} د.ع`);
                    }
                    lines.push(`  القيمة الكمركية: $${formatUSD(ri.customs_value_usd)}`);
                    lines.push(`  الرسم بعد التخفيض (${(ri.duty_rate * 100).toFixed(0)}%): $${formatUSD(ri.duty_after_discount_usd)}`);
                    lines.push(`  ضريبة مبيعات (5%): $${formatUSD(ri.sales_tax_usd)}`);
                    lines.push(`  إجمالي المنتج: $${formatUSD(ri.item_total_usd)}`);
                  });
                  lines.push(`---`);
                  lines.push(`الرسم بعد التخفيض: $${formatUSD(result.summary.duty_after_discount_usd)}`);
                  lines.push(`ضريبة مبيعات: $${formatUSD(result.summary.sales_tax_usd)}`);
                  lines.push(`المجموع الكلي: $${formatUSD(result.summary.total_payable_usd)} (${formatIQD(result.summary.total_payable_iqd)} د.ع)`);
                  if (result.summary.paid_usd > 0) {
                    lines.push(`---`);
                    lines.push(`المدفوع: $${formatUSD(result.summary.paid_usd)}`);
                    lines.push(`الفرق: $${formatUSD(result.summary.difference_usd)} (${formatIQD(result.summary.difference_iqd)} د.ع)`);
                  }
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
                  setPaidUsd(0);
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
              <span className="font-mono">{result.fx.rate.toLocaleString()} IQD/USD</span>
            </div>

            {result.items.map((ri, idx) => (
              <Card key={idx} data-testid={`card-result-item-${idx}`}>
                <CardContent className="p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono">{ri.hs_code}</Badge>
                    <span className="truncate">{ri.description || "-"}</span>
                    {ri.valuation_flag === "raised" && (
                      <Badge variant="destructive" className="text-[10px] px-1.5" data-testid={`badge-raised-${idx}`}>
                        <AlertCircle className="h-3 w-3 ml-1 inline" />
                        رُفعت للحد الأدنى
                      </Badge>
                    )}
                    {ri.valuation_flag === "audit" && (
                      <Badge variant="outline" className="border-amber-500 text-amber-400 text-[10px] px-1.5" data-testid={`badge-audit-${idx}`}>
                        <AlertCircle className="h-3 w-3 ml-1 inline" />
                        تدقيق - أعلى من الحد الأقصى
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">الكمية:</span>
                      <span className="font-mono mr-1">{ri.quantity} {ri.unit}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">قيمة الفاتورة:</span>
                      <span className={`font-mono mr-1 ${ri.valuation_flag === "raised" ? "line-through text-muted-foreground" : ""}`}>
                        ${formatUSD(ri.invoice_unit_usd)}/وحدة
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">GDS أدنى:</span>
                      <span className="font-mono mr-1">{formatIQD(ri.gds_min_iqd)} د.ع</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">GDS أقصى:</span>
                      <span className="font-mono mr-1">{formatIQD(ri.gds_max_iqd)} د.ع</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CIF المعتمدة:</span>
                      <span className={`font-mono mr-1 font-bold ${ri.valuation_flag === "raised" ? "text-destructive" : ri.valuation_flag === "audit" ? "text-amber-400" : ""}`}>
                        ${formatUSD(ri.valuation_unit_usd)}/وحدة
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">القيمة الكمركية:</span>
                      <span className="font-mono mr-1">${formatUSD(ri.customs_value_usd)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        الرسم ({ri.protection_rate > 0 ? `${((ri.duty_rate + ri.protection_rate) * 100).toFixed(0)}%` : `${(ri.duty_rate * 100).toFixed(0)}%`}) بعد تخفيض {(ri.discount_rate * 100).toFixed(0)}%:
                      </span>
                      <span className="font-bold font-mono mr-1">${formatUSD(ri.duty_after_discount_usd)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ضريبة مبيعات (5%):</span>
                      <span className="font-mono mr-1">${formatUSD(ri.sales_tax_usd)}</span>
                    </div>
                  </div>
                  <div className="border-t pt-2 mt-2 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">إجمالي رسوم المنتج:</span>
                      <span className="font-mono font-bold">${formatUSD(ri.item_total_usd)}</span>
                    </div>
                    {ri.paid_duty_usd > 0 && (
                      <>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">المدفوع لهذا المنتج:</span>
                          <span className="font-mono">${formatUSD(ri.paid_duty_usd)}</span>
                        </div>
                        <div className={`flex items-center justify-between gap-2 text-xs font-bold rounded-md px-2 py-1 ${ri.item_difference_usd > 0 ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          <span>فرق المنتج:</span>
                          <span className="font-mono">${formatUSD(ri.item_difference_usd)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="border-t pt-3 space-y-2" data-testid="section-summary">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-muted-foreground">الرسم بعد التخفيض ({(result.summary.discount_rate * 100).toFixed(0)}%):</span>
                <span className="font-mono">${formatUSD(result.summary.duty_after_discount_usd)}</span>
              </div>
              <div className="flex items-center justify-between text-sm" data-testid="text-sales-tax">
                <span className="text-muted-foreground">ضريبة المبيعات (5%):</span>
                <span className="font-mono">${formatUSD(result.summary.sales_tax_usd)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-bold bg-muted/50 rounded-md p-3" data-testid="text-total">
                <span>المجموع الكلي المستحق:</span>
                <div className="text-left font-mono">
                  <div className="text-lg">${formatUSD(result.summary.total_payable_usd)}</div>
                  <div className="text-sm text-muted-foreground">{formatIQD(result.summary.total_payable_iqd)} د.ع</div>
                </div>
              </div>

              {result.summary.paid_usd > 0 && (
                <>
                  <div className="border-t pt-3 mt-2">
                    <p className="text-xs text-muted-foreground mb-2">المدفوع والفرق:</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">المدفوع:</span>
                    <span className="font-mono">${formatUSD(result.summary.paid_usd)}</span>
                  </div>
                  <div className={`flex items-center justify-between text-base font-bold rounded-md px-3 py-3 ${result.summary.difference_usd > 0 ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-400'}`} data-testid="text-total-diff">
                    <span>الفرق:</span>
                    <div className="text-left font-mono">
                      <div className="text-lg">${formatUSD(result.summary.difference_usd)}</div>
                      <div className="text-sm opacity-75">{formatIQD(result.summary.difference_iqd)} د.ع</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-center mt-1">
                    {result.summary.difference_usd > 0 ? "موجب = عليك فرق" : "سالب = دافع زايد"}
                  </div>
                </>
              )}
            </div>

            {result.items.some((ri) => ri.valuation_flag === "raised") && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-md p-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  بعض المنتجات قيمة فاتورتها أقل من الحد الأدنى (GDS_MIN). تم رفع القيمة تلقائياً إلى الحد الأدنى المرجعي.
                </p>
              </div>
            )}
            {result.items.some((ri) => ri.valuation_flag === "audit") && (
              <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-600/10 rounded-md p-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  بعض المنتجات قيمة فاتورتها أعلى من الحد الأقصى (GDS_MAX). يجب التدقيق في هذه المنتجات.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
