import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { LogIn, UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  username: z.string().min(2, "اسم المستخدم يجب أن يكون حرفين على الأقل"),
  password: z.string().min(4, "كلمة المرور يجب أن تكون 4 أحرف على الأقل"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, navigate] = useLocation();
  const { login, register, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  if (isLoggedIn) {
    navigate("/search");
    return null;
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      if (isRegisterMode) {
        await register.mutateAsync(data);
        toast({ title: "تم التسجيل بنجاح", description: "مرحباً بك!" });
      } else {
        await login.mutateAsync(data);
        toast({ title: "تم تسجيل الدخول", description: "مرحباً بعودتك!" });
      }
      navigate("/search");
    } catch (err: any) {
      const msg = err?.message || "حدث خطأ";
      let parsed = msg;
      try {
        const json = JSON.parse(msg.replace(/^\d+:\s*/, ""));
        parsed = json.error || msg;
      } catch {}
      toast({ title: "خطأ", description: parsed, variant: "destructive" });
    }
  };

  const isPending = login.isPending || register.isPending;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl" data-testid="text-login-title">
            {isRegisterMode ? "إنشاء حساب جديد" : "تسجيل الدخول"}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-login-subtitle">
            حاسبة فرق الرسم الكمركي - العراق
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المستخدم</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-username"
                        placeholder="أدخل اسم المستخدم"
                        disabled={isPending}
                        autoComplete="username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        data-testid="input-password"
                        placeholder="أدخل كلمة المرور"
                        disabled={isPending}
                        autoComplete={isRegisterMode ? "new-password" : "current-password"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isPending}
                data-testid="button-submit-login"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isRegisterMode ? (
                  <UserPlus className="h-4 w-4" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                <span className="mr-2">
                  {isRegisterMode ? "إنشاء حساب" : "دخول"}
                </span>
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                form.reset();
              }}
              data-testid="button-toggle-mode"
            >
              {isRegisterMode
                ? "لديك حساب؟ سجل دخولك"
                : "ليس لديك حساب؟ أنشئ حساباً جديداً"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
