import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search as SearchIcon,
  Package,
  X,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Hash,
  FileText,
  Ruler,
  Coins,
  ChevronRight,
  ChevronLeft,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

type ProductsResponse = {
  products: Product[];
  page: number;
  total_pages: number;
  total_count: number;
};

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ValueCard({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number | null | undefined;
  icon: typeof DollarSign;
  variant: "min" | "avg" | "max";
}) {
  const colors = {
    min: "text-blue-400",
    avg: "text-emerald-400",
    max: "text-amber-400",
  };

  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-md bg-muted/50" data-testid={`value-card-${variant}`}>
      <Icon className={`h-5 w-5 ${colors[variant]}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-bold font-mono">
        {formatNumber(value)}
      </span>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => {
        setDebouncedQuery(value.trim());
        setPage(1);
      }, 400);
      setDebounceTimer(timer);
    },
    [debounceTimer],
  );

  const clearSearch = () => {
    setQuery("");
    setDebouncedQuery("");
    setSelectedProduct(null);
    setPage(1);
    if (debounceTimer) clearTimeout(debounceTimer);
  };

  const isSearching = debouncedQuery.length >= 2;

  const { data: searchResults, isLoading: searchLoading } = useQuery<Product[]>({
    queryKey: [`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=50`],
    enabled: isSearching,
    staleTime: 30000,
  });

  const { data: browseData, isLoading: browseLoading } = useQuery<ProductsResponse>({
    queryKey: [`/api/products?page=${page}&limit=50`],
    enabled: !isSearching,
    staleTime: 60000,
  });

  const displayProducts = isSearching ? (searchResults || []) : (browseData?.products || []);
  const isLoading = isSearching ? searchLoading : browseLoading;
  const totalPages = browseData?.total_pages || 1;
  const totalCount = browseData?.total_count || 0;

  const renderTable = (products: Product[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">رمز HS</TableHead>
            <TableHead className="text-right">الوصف</TableHead>
            <TableHead className="text-right">الوحدة</TableHead>
            <TableHead className="text-right">أدنى</TableHead>
            <TableHead className="text-right">متوسط</TableHead>
            <TableHead className="text-right">أقصى</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow
              key={product.id}
              className="cursor-pointer"
              onClick={() => setSelectedProduct(product)}
              data-testid={`row-product-${product.id}`}
            >
              <TableCell className="font-mono text-sm whitespace-nowrap">
                {product.hs_code}
              </TableCell>
              <TableCell className="max-w-xs truncate text-sm">
                {product.description || "-"}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {product.unit || "-"}
              </TableCell>
              <TableCell className="text-sm font-mono whitespace-nowrap">
                {formatNumber(product.min_value)}
              </TableCell>
              <TableCell className="text-sm font-mono whitespace-nowrap">
                {formatNumber(product.avg_value)}
              </TableCell>
              <TableCell className="text-sm font-mono whitespace-nowrap">
                {formatNumber(product.max_value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          المنتجات
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          تصفح المنتجات أو ابحث برمز HS أو الوصف لمعرفة القيمة الاستدلالية
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          data-testid="input-search"
          placeholder="ابحث برمز HS (مثال: 87032390) أو وصف المنتج..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pr-10 pl-10"
        />
        {query && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={clearSearch}
            data-testid="button-clear-search"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {debouncedQuery.length > 0 && debouncedQuery.length < 2 && (
        <p className="text-sm text-muted-foreground">ادخل حرفين على الأقل للبحث</p>
      )}

      {selectedProduct && (
        <Card data-testid="card-product-detail">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              تفاصيل المنتج
            </CardTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSelectedProduct(null)}
              data-testid="button-close-detail"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground">رمز HS</span>
                  <p className="font-mono font-bold text-lg" data-testid="text-detail-hs">
                    {selectedProduct.hs_code}
                  </p>
                </div>
              </div>
              {selectedProduct.cst_code && (
                <div className="flex items-start gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">رمز CST</span>
                    <p className="font-mono" data-testid="text-detail-cst">{selectedProduct.cst_code}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2 sm:col-span-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground">الوصف</span>
                  <p className="mt-0.5" data-testid="text-detail-desc">
                    {selectedProduct.description || "-"}
                  </p>
                </div>
              </div>
              {selectedProduct.unit && (
                <div className="flex items-start gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">الوحدة</span>
                    <p>{selectedProduct.unit}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Coins className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground">العملة</span>
                  <p>{selectedProduct.currency || "USD"}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">القيم الاستدلالية ({selectedProduct.currency || "USD"})</p>
              <div className="grid grid-cols-3 gap-3">
                <ValueCard label="أدنى قيمة" value={selectedProduct.min_value} icon={TrendingDown} variant="min" />
                <ValueCard label="متوسط القيمة" value={selectedProduct.avg_value} icon={BarChart3} variant="avg" />
                <ValueCard label="أقصى قيمة" value={selectedProduct.max_value} icon={TrendingUp} variant="max" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {!isLoading && displayProducts.length === 0 && isSearching && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground" data-testid="text-no-results">
              لا توجد نتائج لـ "{debouncedQuery}"
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && displayProducts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              {isSearching ? "نتائج البحث" : "جدول المنتجات"}
              <Badge variant="secondary">
                {isSearching ? displayProducts.length : totalCount.toLocaleString()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {renderTable(displayProducts)}
          </CardContent>

          {!isSearching && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 p-3 border-t">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                data-testid="button-prev-page"
              >
                <ChevronRight className="h-4 w-4" />
                السابق
              </Button>
              <span className="text-sm text-muted-foreground" data-testid="text-page-info">
                صفحة {page} من {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                data-testid="button-next-page"
              >
                التالي
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
