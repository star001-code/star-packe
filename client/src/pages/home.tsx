import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
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

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground" data-testid="text-waiting">
              بانتظار التصميم الجديد...
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
