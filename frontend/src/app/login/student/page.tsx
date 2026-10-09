import { LoginForm } from "@/components/LoginForm";

export default function StudentLoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <LoginForm role="student" />
    </div>
  );
}
