"use client";

import { authService } from "@/services/auth";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  function handleLogout() {
    authService.logout();
    router.push("/login");
  }

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>

      <p>Bem-vindo! 🎉</p>

      <button onClick={handleLogout}>Sair</button>
    </div>
  );
}