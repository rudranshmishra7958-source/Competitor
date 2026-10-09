import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Student sign in" };

export default function StudentLoginPage() {
  return <LoginForm role="student" />;
}
