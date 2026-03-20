"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  DollarSign,
  Activity,
  Menu,
  Bell,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { authService } from "@/services/auth";

const [consultas, setConsultas] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  const fetchConsultas = async () => {
    try {
      const token = localStorage.getItem("access");

      const res = await fetch("http://127.0.0.1:8000/api/minhas-consultas/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setConsultas(data);
    } catch (err) {
      console.error("Erro ao buscar consultas", err);
    } finally {
      setLoading(false);
    }
  };

  fetchConsultas();
}, []);

const revenueData = [
  { month: "Jan", receita: 28500 },
  { month: "Fev", receita: 32100 },
  { month: "Mar", receita: 29800 },
  { month: "Abr", receita: 35200 },
  { month: "Mai", receita: 38900 },
  { month: "Jun", receita: 42100 },
];

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="bg-white shadow rounded-xl p-5 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>

      <div className="bg-blue-100 p-3 rounded-lg">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
    </div>
  );
}

export default function Dashboard() {

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  const logout = () => {
    authService.logout();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* SIDEBAR */}

      <aside
        className={`bg-white border-r transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div className="p-5 font-bold text-lg border-b">
          Ssorrisos
        </div>

        <nav className="p-3 space-y-2">

          <button
            onClick={() => router.push("/dashboard")}
            className="w-full text-left p-2 rounded hover:bg-gray-100"
          >
            Dashboard
          </button>

          <button
            onClick={() => router.push("/dashboard/pacientes")}
            className="w-full text-left p-2 rounded hover:bg-gray-100"
          >
            Pacientes
          </button>

          <button
            onClick={() => router.push("/dashboard/consultas")}
            className="w-full text-left p-2 rounded hover:bg-gray-100"
          >
            Consultas
          </button>

          <button
            onClick={() => router.push("/dashboard/medicos")}
            className="w-full text-left p-2 rounded hover:bg-gray-100"
          >
            Médicos
          </button>

          <button
            onClick={() => router.push("/dashboard/financeiro")}
            className="w-full text-left p-2 rounded hover:bg-gray-100"
          >
            Financeiro
          </button>

        </nav>
      </aside>

      {/* MAIN */}

      <main className="flex-1">

        {/* TOPBAR */}

        <header className="bg-white border-b h-16 flex items-center justify-between px-6">

          <div className="flex items-center gap-3">

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="font-bold text-lg">
              Dashboard
            </h1>

          </div>

          <div className="flex items-center gap-3">

            <button
  title="Notificações"
  aria-label="Notificações"
  className="p-2 hover:bg-gray-100 rounded"
>
  <Bell className="w-5 h-5" />
</button>

            <button
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>

          </div>

        </header>

        {/* CONTENT */}

        <div className="p-6 space-y-6">

          {/* STATS */}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

            <StatCard
              title="Total Pacientes"
              value="1248"
              icon={Users}
            />

            <StatCard
              title="Consultas Hoje"
              value="18"
              icon={Calendar}
            />

            <StatCard
              title="Receita Mensal"
              value="42.100€"
              icon={DollarSign}
            />

            <StatCard
              title="Taxa Ocupação"
              value="87%"
              icon={Activity}
            />

          </div>

          {/* CHART */}

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white shadow rounded-xl p-6"
          >

            <h2 className="font-bold mb-4">
              Receita últimos meses
            </h2>

            <ResponsiveContainer width="100%" height={300}>

              <AreaChart data={revenueData}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="month" />

                <YAxis />

                <Tooltip />

                <Area
                  type="monotone"
                  dataKey="receita"
                  stroke="#2563eb"
                  fill="#93c5fd"
                />

              </AreaChart>

            </ResponsiveContainer>

          </motion.div>

          {/* TABLE */}

          <div className="bg-white shadow rounded-xl p-6">

            <h2 className="font-bold mb-4">
              Consultas de Hoje
            </h2>

            <table className="w-full text-sm">

              <thead className="text-left text-gray-500 border-b">

                <tr>
                  <th className="py-2">Paciente</th>
                  <th>Tratamento</th>
                  <th>Hora</th>
                  <th>Status</th>
                </tr>

              </thead>

              <tbody>
  {loading ? (
    <tr>
      <td colSpan={4} className="py-4 text-center">
        Carregando...
      </td>
    </tr>
  ) : consultas.length === 0 ? (
    <tr>
      <td colSpan={4} className="py-4 text-center">
        Nenhuma consulta encontrada
      </td>
    </tr>
  ) : (
    consultas.map((c) => (
      <tr key={c.id} className="border-b">
        <td className="py-3">{c.paciente}</td>
        <td>{c.motivo}</td>
        <td>{c.hora}</td>
        <td>{c.data}</td>
      </tr>
    ))
  )}
</tbody>

            </table>

          </div>

        </div>

      </main>

    </div>
  );
}