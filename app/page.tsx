import { LoginForm } from "@/components/login-form";

export default function Home() {
  return (
    <div className="font-sans flex flex-col items-center justify-center min-h-screen p-8 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] items-center sm:items-start">
        <LoginForm />
      </main>
    </div>
  );
}
