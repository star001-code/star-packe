import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Database, Calculator, FileText, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function About() {
  const { data: stats, isLoading } = useQuery<{
    rows_total: number;
    hs_unique: number;
    units_unique: number;
  }>({
    queryKey: ["/api/stats"],
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-about-title">
          حول النظام
        </h1>
        <p className="text-muted-foreground mt-1">
          معلومات عن حاسبة فرق الرسم الكمركي
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            حاسبة فرق الرسم الكمركي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            نظام إلكتروني متكامل لحساب فرق الرسوم الكمركية في المنافذ الحدودية العراقية.
            يتيح النظام البحث عن المنتجات باستخدام رمز النظام المنسق (HS Code) أو الوصف النصي،
            وعرض القيم الاستدلالية المعتمدة (أدنى، متوسط، أقصى) لكل منتج.
          </p>
          <p>
            يعتمد النظام على بيانات جدول التعرفة الكمركية (TSC) لعام 2025 الصادر
            عن الهيئة العامة للكمارك العراقية.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            إحصائيات قاعدة البيانات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-40" />
            </div>
          ) : stats ? (
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary" data-testid="badge-total-products">
                إجمالي المنتجات: {stats.rows_total.toLocaleString("ar-SA")}
              </Badge>
              <Badge variant="secondary" data-testid="badge-unique-hs">
                رموز HS فريدة: {stats.hs_unique.toLocaleString("ar-SA")}
              </Badge>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            طريقة الحساب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>يتم حساب فرق الرسم الكمركي وفق الخطوات التالية:</p>
          <ol className="list-decimal list-inside space-y-2 pr-2">
            <li>تحديد القيمة الاستدلالية للمنتج من جدول TSC (أدنى / متوسط / أقصى)</li>
            <li>مقارنة قيمة الفاتورة التجارية مع القيمة الاستدلالية</li>
            <li>اعتماد القيمة الأعلى كأساس للتقييم الكمركي</li>
            <li>حساب الرسم الكمركي = القيمة المعتمدة × نسبة الرسم</li>
            <li>إضافة رسوم المنفذ الحدودي (سونار، تصريح، إلخ)</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            إخلاء المسؤولية
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          <p>
            هذا النظام أداة استرشادية فقط ولا يُعد بديلاً عن الحسابات الرسمية.
            القيم المعروضة مبنية على بيانات جدول التعرفة الكمركية وقد تختلف
            عن القيم الفعلية المعتمدة في المنافذ. يُرجى مراجعة الجهات المختصة
            للحصول على الحسابات النهائية الرسمية.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
