import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Halaman operasional dapat dibuka langsung tanpa login.
    if (pathname.startsWith("/admin") || pathname.startsWith("/kasir")) {
        return NextResponse.next();
    }

    // Semua path lain yang dicakup proxy tetap dapat diproses normal.
    return NextResponse.next();
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/kasir/:path*",
        "/login",
    ],
};
