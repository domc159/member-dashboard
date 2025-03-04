import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const password = process.env.ADMIN_PASSWORD || "vrejije"; // Geslo iz okoljske spremenljivke ali privzeto geslo

  // Pridobi vrednost piškotka kot niz
  const cookieValue = req.cookies.get("auth")?.value;

  // Preveri, ali je uporabnik avtoriziran
  const isAuthorized = cookieValue === password;

  if (!isAuthorized && !url.pathname.startsWith("/prijava")) {
    // Če ni avtoriziran in ni na strani za prijavo, ga preusmeri
    url.pathname = "/prijava";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|public).*)"], // Middleware se uporablja za vse poti razen statičnih datotek
};
