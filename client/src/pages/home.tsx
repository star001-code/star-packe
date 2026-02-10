import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calculator,
  Package,
  Hash,
  ArrowLeft,
  Search,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { useLocation } from "wouter";
import logoImg from "@assets/IMG_2293_1770690757765.png";

type StatsData = {
  rows_total: number;
  hs_unique: number;
  units_unique: number;
};

type Checkpoint = {
  id: string;
  name: string;
  fees: { code: string; label: string; amount_iqd: number }[];
};

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  testId,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  loading?: boolean;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-6 w-16 mt-0.5" />
          ) : (
            <p className="text-xl font-bold font-mono">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [, navigate] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
  });

  const { data: checkpoints, isLoading: cpLoading } = useQuery<Checkpoint[]>({
    queryKey: ["/api/checkpoints"],
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <img
          src={logoImg}
          alt="الكمارك العراقية"
          className="h-14 w-auto object-contain shrink-0"
          data-testid="img-logo-home"
        />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-home-title">
            حاسبة فرق الرسم الكمركي
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            نظام حساب الرسوم الكمركية للمنافذ الحدودية العراقية
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="المنتجات"
          value={stats?.rows_total?.toLocaleString() || "0"}
          icon={Package}
          loading={statsLoading}
          testId="stat-products"
        />
        <StatCard
          label="رموز HS"
          value={stats?.hs_unique?.toLocaleString() || "0"}
          icon={Hash}
          loading={statsLoading}
          testId="stat-hs"
        />
        <StatCard
          label="المنافذ"
          value={checkpoints?.length?.toString() || "0"}
          icon={MapPin}
          loading={cpLoading}
          testId="stat-checkpoints"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="cursor-pointer overflow-visible hover-elevate" onClick={() => navigate("/calculator")} data-testid="card-go-calculator">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
              <Calculator className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base">حاسبة الرسوم</h3>
              <p className="text-sm text-muted-foreground mt-1">
                احسب الرسوم الكمركية لمنتجاتك عبر المنافذ الحدودية
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                <span>ابدأ الحساب</span>
                <ArrowLeft className="h-3 w-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer overflow-visible hover-elevate" onClick={() => navigate("/search")} data-testid="card-go-products">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary text-secondary-foreground shrink-0">
              <Search className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base">تصفح المنتجات</h3>
              <p className="text-sm text-muted-foreground mt-1">
                ابحث في قاعدة بيانات المنتجات برمز HS أو الوصف
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                <span>تصفح الآن</span>
                <ArrowLeft className="h-3 w-3" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!cpLoading && checkpoints && checkpoints.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              المنافذ الحدودية المتاحة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checkpoints.map((cp) => (
                <div
                  key={cp.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/40"
                  data-testid={`checkpoint-${cp.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{cp.name}</span>
                  </div>
                  {cp.fees.length > 0 && (
                    <Badge variant="secondary" className="shrink-0">
                      {cp.fees.length} رسوم
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            كيف يعمل النظام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 mx-auto">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <h4 className="text-sm font-medium">ابحث عن المنتج</h4>
              <p className="text-xs text-muted-foreground">ابحث برمز HS أو وصف المنتج في قاعدة البيانات</p>
            </div>
            <div className="text-center space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 mx-auto">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <h4 className="text-sm font-medium">أدخل البيانات</h4>
              <p className="text-xs text-muted-foreground">حدد المنفذ والكمية وقيمة الفاتورة ونسبة الرسم</p>
            </div>
            <div className="text-center space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 mx-auto">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h4 className="text-sm font-medium">احصل على النتيجة</h4>
              <p className="text-xs text-muted-foreground">شاهد تفاصيل الرسوم الكمركية والمبالغ المستحقة</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
