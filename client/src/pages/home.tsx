import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Calculator,
  RotateCcw,
  BarChart3,
  Weight,
  DollarSign,
} from "lucide-react";

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

function fmtIQD(n: number): string {
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : "0";
}

export default function Home() {
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [hsCode, setHsCode] = useState("");
  const [gdsYer, setGdsYer] = useState("");

  const [weight, setWeight] = useState("");
  const [paidValue, setPaidValue] = useState("");

  const [result, setResult] = useState<{
    requiredDuty: number;
    difference: number;
    requiredDutyIQD: number;
    differenceIQD: number;
  } | null>(null);

  const RATE = 6.5;
  const USD_TO_IQD = 1320;

  const { data: results, isLoading } = useQuery<Product[]>({
    queryKey: [`/api/search?q=${encodeURIComponent(searchTerm)}&limit=20`],
    enabled: searchTerm.length >= 2,
  });

  const handleSearch = useCallback(() => {
    if (query.trim().length >= 2) {
      setSearchTerm(query.trim());
    }
  }, [query]);

  const handleSelectProduct = useCallback((product: Product) => {
    setHsCode(product.hs_code || "");
    setGdsYer(String(product.avg_value || 0));
    setSearchTerm("");
    setQuery("");
    setResult(null);
  }, []);

  const handleCalculate = useCallback(() => {
    const gds = parseFloat(gdsYer);
    const w = parseFloat(weight);
    const paid = parseFloat(paidValue);

    if (isNaN(gds) || isNaN(w) || isNaN(paid)) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال كل البيانات بشكل صحيح",
        variant: "destructive",
      });
      return;
    }

    if (w <= 0) {
      toast({
        title: "خطأ",
        description: "الوزن يجب أن يكون أكبر من صفر",
        variant: "destructive",
      });
      return;
    }

    const requiredDuty = w * gds * (RATE / 100);
    let difference = requiredDuty - paid;
    if (difference < 0) difference = 0;

    setResult({
      requiredDuty,
      difference,
      requiredDutyIQD: requiredDuty * USD_TO_IQD,
      differenceIQD: difference * USD_TO_IQD,
    });
  }, [gdsYer, weight, paidValue, toast]);

  const handleReset = useCallback(() => {
    setHsCode("");
    setGdsYer("");
    setWeight("");
    setPaidValue("");
    setResult(null);
    setQuery("");
    setSearchTerm("");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            حاسبة فرق الرسم الكمركي
          </h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">
            نظام حساب فرق الرسوم الكمركية - العراق
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="w-5 h-5 text-primary" />
              ابحث عن المنتج (اسم أو HS Code)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                data-testid="input-search"
                type="search"
                placeholder="مثال: 7020000 أو طماطة"
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
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            )}

            {results && results.length === 0 && (
              <p className="text-sm text-muted-foreground" data-testid="text-no-results">
                لا نتائج.
              </p>
            )}

            {results && results.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.map((r) => (
                  <Card
                    key={r.id}
                    className="cursor-pointer hover-elevate"
                    data-testid={`card-result-${r.id}`}
                    onClick={() => handleSelectProduct(r)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="default" className="text-xs">
                              HS: {r.hs_code}
                            </Badge>
                            {r.unit && (
                              <Badge variant="secondary" className="text-xs">
                                {r.unit}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 mt-1"
                          tabIndex={-1}
                          data-testid={`button-select-${r.id}`}
                        >
                          اختيار
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="w-5 h-5 text-primary" />
              حساب فرق الرسم
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Weight className="w-3.5 h-3.5" />
                  الوزن (بالطن)
                </Label>
                <Input
                  data-testid="input-weight"
                  type="number"
                  step="0.01"
                  placeholder="مثال: 25"
                  value={weight}
                  onChange={(e) => {
                    setWeight(e.target.value);
                    setResult(null);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  الرسم المدفوع ($)
                </Label>
                <Input
                  data-testid="input-paid-value"
                  type="number"
                  step="0.01"
                  placeholder="مثال: 500"
                  value={paidValue}
                  onChange={(e) => {
                    setPaidValue(e.target.value);
                    setResult(null);
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>نسبة الكمارك: <code className="text-foreground">{RATE}%</code></span>
              <Separator orientation="vertical" className="h-4" />
              <span>سعر الصرف: <code className="text-foreground">{USD_TO_IQD.toLocaleString()} IQD/$</code></span>
            </div>

            <div className="flex gap-2">
              <Button
                data-testid="button-calculate"
                className="flex-1"
                onClick={handleCalculate}
                disabled={!hsCode || !weight || !paidValue}
              >
                <Calculator className="w-4 h-4" />
                احسب فرق الرسم
              </Button>
              <Button
                data-testid="button-reset"
                variant="outline"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4" />
                تصفير
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5 text-primary" />
                النتيجة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2" data-testid="text-weight-info">
                  <span className="text-muted-foreground">الوزن</span>
                  <span style={{ fontVariant: "tabular-nums" }}>{fmt(parseFloat(weight))} طن</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-2" data-testid="text-required-duty">
                  <span className="text-muted-foreground">الرسم المطلوب</span>
                  <span className="font-semibold" style={{ fontVariant: "tabular-nums" }}>
                    ${fmt(result.requiredDuty)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2" data-testid="text-paid-duty">
                  <span className="text-muted-foreground">الرسم المدفوع</span>
                  <span style={{ fontVariant: "tabular-nums" }}>${fmt(parseFloat(paidValue))}</span>
                </div>
                <Separator />
                <div
                  className="flex items-center justify-between gap-2 rounded-md p-3 bg-muted"
                  data-testid="text-difference"
                >
                  <span className="font-bold text-base">فرق الرسم المستحق</span>
                  <div className="text-left">
                    <p className="font-bold text-base" style={{ fontVariant: "tabular-nums" }}>
                      ${fmt(result.difference)}
                    </p>
                    <p className="text-xs text-muted-foreground" style={{ fontVariant: "tabular-nums" }}>
                      {fmtIQD(result.differenceIQD)} دينار عراقي
                    </p>
                  </div>
                </div>
                {result.difference === 0 && (
                  <p className="text-sm text-center text-muted-foreground" data-testid="text-no-difference">
                    لا يوجد فرق - المبلغ المدفوع يغطي الرسم المطلوب
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <StatsDisplay />
      </main>
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
            <p className="text-xs text-muted-foreground">إجمالي المنتجات</p>
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
