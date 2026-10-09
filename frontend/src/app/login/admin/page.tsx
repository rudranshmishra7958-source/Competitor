import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Faculty sign in" };

export default function AdminLoginPage() {
  return <LoginForm role="admin" />;
}
