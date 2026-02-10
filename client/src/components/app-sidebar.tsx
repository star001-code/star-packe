import { useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Home, Package, Info, LogIn, LogOut, Calculator, User, FileImage } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import logoImg from "@assets/IMG_2293_1770690757765.png";

const menuItems = [
  { title: "الرئيسية", url: "/", icon: Home },
  { title: "المنتجات", url: "/search", icon: Package },
  { title: "الحاسبة", url: "/calculator", icon: Calculator },
  { title: "قراءة المنفست", url: "/manifest", icon: FileImage },
  { title: "حول النظام", url: "/about", icon: Info },
];

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { user, isLoggedIn, logout } = useAuth();

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img
            src={logoImg}
            alt="الكمارك العراقية"
            className="h-9 w-auto shrink-0 object-contain"
            data-testid="img-logo-sidebar"
          />
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold truncate">الحاسبة الكمركية</span>
            <span className="text-xs text-muted-foreground truncate">فرق الرسم - العراق</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>القائمة</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`link-${item.url === "/" ? "home" : item.url.slice(1)}`}
                  >
                    <a
                      href={item.url}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.url);
                      }}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        {isLoggedIn ? (
          <div className="space-y-2 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2 px-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground truncate" data-testid="text-username">
                {user?.username}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => logout.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="mr-2">خروج</span>
            </Button>
          </div>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location === "/login"}
                data-testid="link-login"
              >
                <a
                  href="/login"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/login");
                  }}
                >
                  <LogIn className="h-4 w-4" />
                  <span>تسجيل الدخول</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
