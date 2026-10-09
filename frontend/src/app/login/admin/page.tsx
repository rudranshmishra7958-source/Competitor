import { LoginForm } from "@/components/LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <LoginForm role="admin" />
    </div>
  );
}
