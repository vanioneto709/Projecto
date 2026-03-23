"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, Bell } from "lucide-react";
import { authService } from "@/services/auth";

export default function Dashboard() {

  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showUserModal, setShowUserModal] = useState(false);
  const [showConsultaModal, setShowConsultaModal] = useState(false);

  // 👤 usuário
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tipo, setTipo] = useState("paciente");

  // 📅 consulta
  const [paciente, setPaciente] = useState("");
  const [medico, setMedico] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access")
      : null;

  // 🔐 proteção
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
    }
  }, []);

  // 🔄 carregar dados
  useEffect(() => {
    fetchUsers();
    fetchConsultas();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/usuarios/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConsultas = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/minhas-consultas/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setConsultas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 👤 criar usuário
  const criarUsuario = async () => {
    await fetch("http://127.0.0.1:8000/api/cadastro/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username, password, tipo }),
    });

    setShowUserModal(false);
    setUsername("");
    setPassword("");
    setTipo("paciente");

    fetchUsers();
  };

  // ❌ deletar usuário
  const deletarUsuario = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/api/usuarios/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    fetchUsers();
  };

  // 📅 criar consulta
  const criarConsulta = async () => {
    await fetch("http://127.0.0.1:8000/api/criar-consulta/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        paciente,
        medico,
        data,
        hora,
        motivo,
      }),
    });

    setShowConsultaModal(false);
    setPaciente("");
    setMedico("");
    setData("");
    setHora("");
    setMotivo("");

    fetchConsultas();
  };

  const logout = () => {
    authService.logout();
    localStorage.clear();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* SIDEBAR */}
      <aside className="w-64 bg-white p-4 space-y-3">

        <button
          onClick={() => setShowUserModal(true)}
          className="bg-green-600 text-white p-2 rounded w-full"
        >
          + Usuário
        </button>

        <button
          onClick={() => setShowConsultaModal(true)}
          className="bg-blue-600 text-white p-2 rounded w-full"
        >
          + Consulta
        </button>

      </aside>

      {/* MAIN */}
      <main className="flex-1">

        {/* HEADER */}
        <header className="flex justify-between p-4 border-b bg-white">
          <Menu />

          <div className="flex gap-3">
            <Bell />
            <button
              onClick={logout}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6">

          {/* USERS */}
          <div>
            <h2 className="font-bold mb-2">Usuários</h2>

            <table className="w-full bg-white shadow rounded">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Tipo</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.tipo}</td>
                    <td>
                      <button onClick={() => deletarUsuario(u.id)}>
                        ❌
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CONSULTAS */}
          <div>
            <h2 className="font-bold mb-2">Agenda</h2>

            <table className="w-full bg-white shadow rounded">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Data</th>
                  <th>Hora</th>
                  <th>Motivo</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr><td colSpan={5}>Carregando...</td></tr>
                ) : consultas.length === 0 ? (
                  <tr><td colSpan={5}>Nenhuma consulta</td></tr>
                ) : (
                  consultas.map((c) => (
                    <tr key={c.id}>
                      <td>{c.paciente}</td>
                      <td>{c.medico}</td>
                      <td>{c.data}</td>
                      <td>{c.hora}</td>
                      <td>{c.motivo}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>

      {/* MODAL USUÁRIO */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-white p-6 space-y-3 rounded w-80">

            <h2 className="font-bold">Criar Usuário</h2>

            <input
              placeholder="Username"
              className="border p-2 w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              type="password"
              placeholder="Senha"
              className="border p-2 w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <select
              className="border p-2 w-full"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="paciente">Paciente</option>
              <option value="medico">Médico</option>
              <option value="clinica">Clínica</option>
            </select>

            <button
              onClick={criarUsuario}
              className="bg-green-600 text-white w-full p-2 rounded"
            >
              Criar
            </button>

            <button
              onClick={() => setShowUserModal(false)}
              className="text-red-500 w-full"
            >
              Cancelar
            </button>

          </div>
        </div>
      )}

      {/* MODAL CONSULTA */}
      {showConsultaModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-white p-6 space-y-3 rounded w-80">

            <h2 className="font-bold">Criar Consulta</h2>

            <input placeholder="Paciente ID" onChange={e => setPaciente(e.target.value)} className="border p-2 w-full"/>
            <input placeholder="Médico ID" onChange={e => setMedico(e.target.value)} className="border p-2 w-full"/>
            <input type="date" onChange={e => setData(e.target.value)} className="border p-2 w-full"/>
            <input type="time" onChange={e => setHora(e.target.value)} className="border p-2 w-full"/>
            <input placeholder="Motivo" onChange={e => setMotivo(e.target.value)} className="border p-2 w-full"/>

            <button
              onClick={criarConsulta}
              className="bg-blue-600 text-white w-full p-2 rounded"
            >
              Criar
            </button>

            <button
              onClick={() => setShowConsultaModal(false)}
              className="text-red-500 w-full"
            >
              Cancelar
            </button>

          </div>
        </div>
      )}

    </div>
  );
}