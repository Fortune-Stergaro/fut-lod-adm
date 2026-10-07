// Everything except the login page and auth endpoints requires a signed-in user.
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
