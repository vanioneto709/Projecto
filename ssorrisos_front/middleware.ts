import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  const isDashboard = pathname.startsWith("/dashboard");
  const isLogin = pathname === "/login";

  // Sem token tentando acessar dashboard → login
  if (!token && isDashboard) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // COM token tentando acessar login → manda para raiz,
  // deixa o próprio /dashboard redirecionar por tipo
  if (token && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/dashboard-clinica/:path*", "/dashboard-medico/:path*", "/dashboard-paciente/:path*", "/login"],
};