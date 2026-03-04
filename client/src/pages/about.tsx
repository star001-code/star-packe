import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Database, Calculator, FileText, Shield, Scale, BookOpen } from "lucide-react";
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
          معلومات عن حاسبة فرق الرسم الكمركي - تحديث 2026
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
            عن الهيئة العامة للكمارك العراقية، محدّث وفق قرار مجلس الوزراء 957/2025 النافذ اعتباراً من يناير 2026.
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
            <li>الرسم = الوزن × القيمة × نسبة الرسم%</li>
            <li>الفرق = الرسم - الرسم المدفوع</li>
            <li>الفرق بالدينار = الفرق × سعر الصرف (1320)</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            الإطار القانوني
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <ul className="space-y-2 pr-2">
            <li className="flex items-start gap-2">
              <Scale className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              <span><strong>قرار مجلس الوزراء 957/2025</strong> - تعديل نسب الرسوم الكمركية، نافذ اعتباراً من يناير 2026</span>
            </li>
            <li className="flex items-start gap-2">
              <Scale className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              <span><strong>قانون التعرفة الكمركية رقم 22 لسنة 2010</strong> - القانون الأساسي للتعرفة الكمركية العراقية</span>
            </li>
          </ul>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            جدول التعرفة 2026
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>نسب الرسوم الكمركية وفق قرار 957/2025:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-2 pr-2">التصنيف</th>
                  <th className="text-right py-2">النسبة</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 pr-2">مواد غذائية أساسية / أدوية / مدخلات زراعية / تعليمية / طاقة شمسية / حواسيب / مجوهرات</td>
                  <td className="py-2 font-mono">5%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-2">مواد خام / مكائن ومعدات إنتاجية</td>
                  <td className="py-2 font-mono">10%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-2">مدخلات صناعية / مواد بناء / كهربائيات / مركبات (موحد)</td>
                  <td className="py-2 font-mono">15%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-2">إلكترونيات استهلاكية / هواتف ذكية / ملابس</td>
                  <td className="py-2 font-mono">20%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-2">أدوات منزلية</td>
                  <td className="py-2 font-mono">25%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-2">سلع استهلاكية عامة / بلاستيك محمي / حديد تسليح محمي</td>
                  <td className="py-2 font-mono">30%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-2">سلع كمالية</td>
                  <td className="py-2 font-mono">40%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-2">منتجات تنظيف</td>
                  <td className="py-2 font-mono">65%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-2">تبغ وسكائر</td>
                  <td className="py-2 font-mono">100%</td>
                </tr>
                <tr>
                  <td className="py-2 pr-2">مشروبات كحولية</td>
                  <td className="py-2 font-mono">150%</td>
                </tr>
              </tbody>
            </table>
          </div>
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
