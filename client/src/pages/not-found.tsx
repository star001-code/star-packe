import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">الصفحة غير موجودة</h1>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            الصفحة التي تبحث عنها غير موجودة. تأكد من الرابط أو عد للصفحة الرئيسية.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
