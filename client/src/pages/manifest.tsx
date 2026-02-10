import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload,
  FileImage,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Package,
  X,
  Calculator,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ExtractedItem = {
  hs_code: string;
  description: string;
  quantity: number;
  unit_value: number;
  total_value: number;
  unit: string;
};

function formatUSD(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ManifestPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "خطأ", description: "يرجى رفع صورة فقط", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "خطأ", description: "حجم الصورة يجب أن لا يتجاوز 10 ميغابايت", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    setItems([]);
    setError(null);
    setSelectedItems(new Set());

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/manifest/extract", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "فشل في استخراج البيانات" }));
        throw new Error(body.error || "فشل في استخراج البيانات");
      }

      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setItems(data.items);
        const allIndices = new Set<number>(data.items.map((_: ExtractedItem, i: number) => i));
        setSelectedItems(allIndices);
        toast({ title: "تم الاستخراج", description: `تم استخراج ${data.items.length} منتج من الصورة` });
      } else {
        setError("لم يتم العثور على منتجات في الصورة. حاول رفع صورة أوضح.");
      }
    } catch (e: any) {
      setError(e.message || "فشل في استخراج البيانات");
    } finally {
      setIsExtracting(false);
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const toggleItem = (idx: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedItems(new Set(items.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const sendToCalculator = () => {
    const selected = items.filter((_, i) => selectedItems.has(i));
    if (selected.length === 0) {
      toast({ title: "تنبيه", description: "يرجى اختيار منتج واحد على الأقل", variant: "destructive" });
      return;
    }
    const encoded = encodeURIComponent(JSON.stringify(selected));
    navigate(`/calculator?manifest=${encoded}`);
  };

  const clearAll = () => {
    setPreview(null);
    setFileName("");
    setItems([]);
    setError(null);
    setSelectedItems(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-manifest-title">
          قراءة المنفست
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          ارفع صورة المنفست أو الفاتورة الكمركية وسيتم استخراج بيانات المنتجات تلقائياً بالذكاء الاصطناعي
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            data-testid="input-manifest-file"
          />

          {!preview ? (
            <div
              className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              data-testid="dropzone-manifest"
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">اسحب الصورة هنا أو اضغط للاختيار</p>
              <p className="text-xs text-muted-foreground mt-1">
                صور PNG, JPG, WEBP — حد أقصى 10 ميغابايت
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm truncate" data-testid="text-file-name">{fileName}</span>
                  {isExtracting && <Badge variant="secondary">جاري التحليل...</Badge>}
                  {!isExtracting && items.length > 0 && (
                    <Badge variant="outline">
                      <CheckCircle2 className="h-3 w-3 ml-1" />
                      {items.length} منتج
                    </Badge>
                  )}
                </div>
                <Button size="icon" variant="ghost" onClick={clearAll} data-testid="button-clear-manifest">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex justify-center">
                <img
                  src={preview}
                  alt="صورة المنفست"
                  className="max-h-64 rounded-md object-contain border"
                  data-testid="img-manifest-preview"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isExtracting && (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">جاري تحليل الصورة بالذكاء الاصطناعي...</p>
            <p className="text-xs text-muted-foreground">قد يستغرق هذا بضع ثوانٍ</p>
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">فشل في استخراج البيانات</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-retry-upload"
              >
                حاول مرة أخرى
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {items.length > 0 && !isExtracting && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                المنتجات المستخرجة
                <Badge variant="secondary">{selectedItems.size}/{items.length}</Badge>
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={selectAll} data-testid="button-select-all">
                  تحديد الكل
                </Button>
                <Button size="sm" variant="ghost" onClick={deselectAll} data-testid="button-deselect-all">
                  إلغاء التحديد
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${
                    selectedItems.has(idx) ? "border-primary/50 bg-primary/5" : "border-border"
                  }`}
                  onClick={() => toggleItem(idx)}
                  data-testid={`card-extracted-item-${idx}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(idx)}
                          onChange={() => toggleItem(idx)}
                          className="shrink-0"
                          data-testid={`checkbox-item-${idx}`}
                        />
                        {item.hs_code && (
                          <Badge variant="outline" className="font-mono">{item.hs_code}</Badge>
                        )}
                        <span className="text-sm truncate">{item.description || "بدون وصف"}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>الكمية: <span className="font-mono">{item.quantity}</span> {item.unit}</span>
                        {item.unit_value > 0 && (
                          <span>سعر الوحدة: <span className="font-mono">${formatUSD(item.unit_value)}</span></span>
                        )}
                        {item.total_value > 0 && (
                          <span>الإجمالي: <span className="font-mono">${formatUSD(item.total_value)}</span></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              className="flex-1"
              size="lg"
              onClick={sendToCalculator}
              disabled={selectedItems.size === 0}
              data-testid="button-send-to-calculator"
            >
              <Calculator className="h-4 w-4" />
              <span className="mr-2">نقل إلى الحاسبة ({selectedItems.size} منتج)</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={clearAll}
              data-testid="button-upload-another"
            >
              <Upload className="h-4 w-4" />
              <span className="mr-2">صورة جديدة</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
