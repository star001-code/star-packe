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
import { Search as SearchIcon, Package, ArrowUpDown } from "lucide-react";
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

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => {
        setDebouncedQuery(value.trim());
      }, 400);
      setDebounceTimer(timer);
    },
    [debounceTimer],
  );

  const { data: results, isLoading, isFetching } = useQuery<Product[]>({
    queryKey: ["/api/search", `?q=${encodeURIComponent(debouncedQuery)}&limit=50`],
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-search-title">
          بحث المنتجات
        </h1>
        <p className="text-muted-foreground mt-1">
          ابحث برمز HS أو وصف المنتج
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="input-search"
          placeholder="ابحث برمز HS (مثال: 87032390) أو وصف المنتج..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {debouncedQuery.length > 0 && debouncedQuery.length < 2 && (
        <p className="text-sm text-muted-foreground">أدخل حرفين على الأقل للبحث</p>
      )}

      {isLoading && debouncedQuery.length >= 2 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {results && results.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground" data-testid="text-no-results">
              لا توجد نتائج لـ "{debouncedQuery}"
            </p>
          </CardContent>
        </Card>
      )}

      {results && results.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              النتائج
              <Badge variant="secondary">{results.length}</Badge>
            </CardTitle>
            {isFetching && <Skeleton className="h-4 w-16" />}
          </CardHeader>
          <CardContent className="p-0">
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
                  {results.map((product) => (
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
          </CardContent>
        </Card>
      )}

      {selectedProduct && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">تفاصيل المنتج</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedProduct(null)}
              data-testid="button-close-detail"
            >
              إغلاق
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">رمز HS:</span>
                <p className="font-mono font-bold text-lg mt-1" data-testid="text-detail-hs">
                  {selectedProduct.hs_code}
                </p>
              </div>
              {selectedProduct.cst_code && (
                <div>
                  <span className="text-muted-foreground">رمز CST:</span>
                  <p className="font-mono mt-1">{selectedProduct.cst_code}</p>
                </div>
              )}
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">الوصف:</span>
                <p className="mt-1" data-testid="text-detail-desc">
                  {selectedProduct.description || "-"}
                </p>
              </div>
              {selectedProduct.unit && (
                <div>
                  <span className="text-muted-foreground">الوحدة:</span>
                  <p className="mt-1">{selectedProduct.unit}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">العملة:</span>
                <p className="mt-1">{selectedProduct.currency || "USD"}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">القيم الاستدلالية:</span>
                <div className="flex flex-wrap gap-3 mt-2">
                  <Badge variant="outline" className="font-mono" data-testid="badge-min-value">
                    أدنى: {formatNumber(selectedProduct.min_value)}
                  </Badge>
                  <Badge variant="secondary" className="font-mono" data-testid="badge-avg-value">
                    متوسط: {formatNumber(selectedProduct.avg_value)}
                  </Badge>
                  <Badge variant="outline" className="font-mono" data-testid="badge-max-value">
                    أقصى: {formatNumber(selectedProduct.max_value)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
