"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Network, Heart, ArrowRight } from "lucide-react";
import { authService } from "@/services/auth";

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setIsLoggedIn(authService.isAuthenticated());
    setUser(authService.getUser());
  }, []);

  const handleMarcarConsulta = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isLoggedIn) {
      e.preventDefault();
      setModalOpen(true);
    }
  };

  const features = [
    {
      title: "Agendamento Instantâneo",
      description:
        "Marque consultas com horários disponíveis em tempo real, de forma simples e rápida.",
      icon: Calendar,
    },
    {
      title: "Rede Conectada",
      description:
        "Conectamos pacientes, clínicas e profissionais de saúde numa única plataforma.",
      icon: Network,
    },
  ];

  return (
    <div className="bg-gray-50 min-h-screen text-gray-900">
      {/* HEADER */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center text-2xl font-bold text-blue-600">
            <Heart className="mr-2 w-6 h-6" /> Saúde Conecta
          </Link>

          <nav className="hidden md:flex space-x-8">
            <Link href="#hero" className="text-gray-600 hover:text-blue-600 transition">Home</Link>
            <Link href="#funcionalidades" className="text-gray-600 hover:text-blue-600 transition">
              Funcionalidades
            </Link>
            <Link href="#rede" className="text-gray-600 hover:text-blue-600 transition">Rede</Link>
          </nav>

          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Olá, {user?.username}</span>
              <Link
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold transition"
              >
                Dashboard
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold transition"
            >
              Entrar
            </Link>
          )}
        </div>
      </header>

      {/* HERO */}
      <section id="hero" className="pt-20 pb-32 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight">
              Sua Saúde em Suas Mãos.{" "}
              <span className="text-blue-600">Agendamento Inteligente.</span>
            </h1>

            <p className="text-lg text-gray-600 max-w-lg">
              Uma plataforma moderna que liga pacientes e clínicas, garantindo rapidez, 
              segurança e transparência em cada consulta agendada.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/agendamento"
                onClick={handleMarcarConsulta}
                className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition transform hover:scale-105 text-center flex items-center justify-center gap-2"
              >
                Marcar Consulta <ArrowRight className="w-5 h-5" />
              </Link>

              {!isLoggedIn && (
                <Link
                  href="/cadastro"
                  className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-3 px-8 rounded-lg shadow-lg transition text-center"
                >
                  Criar Conta
                </Link>
              )}
            </div>
          </motion.div>

          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            src="https://placehold.co/600x420/2563eb/ffffff?text=Saúde+Conecta"
            alt="Interface Saúde Conecta"
            className="hidden md:block rounded-xl shadow-2xl"
          />
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-center mb-16"
          >
            Por que Escolher Saúde Conecta?
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-gray-50 p-8 rounded-xl shadow hover:shadow-lg transition"
              >
                <f.icon className="w-10 h-10 text-blue-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-3">{f.title}</h3>
                <p className="text-gray-600">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* REDE */}
      <section id="rede" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Clínicas Parceiras</h2>
          <p className="text-gray-600 mb-12 text-lg">
            Confie em nossa rede de profissionais credenciados.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Clínica SSorrisos", status: "Ativa" },
              { name: "Somar Sorrisos", status: "Em breve" },
              { name: "FarmaCabenda", status: "Em breve" },
            ].map((clinic) => (
              <div
                key={clinic.name}
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
              >
                <p className="font-semibold text-lg">{clinic.name}</p>
                <p className="text-gray-500 text-sm mt-2">
                  {clinic.status === "Ativa" ? (
                    <span className="text-green-600 font-semibold">✓ Ativa</span>
                  ) : (
                    <span className="text-gray-400">{clinic.status}</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-xl font-bold text-blue-400">Saúde Conecta</h3>
            <p className="text-sm text-gray-400 mt-2">
              © {new Date().getFullYear()} Todos os direitos reservados
            </p>
          </div>

          <div className="flex space-x-6">
            <Link href="/termos" className="text-gray-400 hover:text-white transition">
              Termos
            </Link>
            <Link href="/privacidade" className="text-gray-400 hover:text-white transition">
              Privacidade
            </Link>
            <Link href="/parceiro" className="text-teal-400 hover:text-white font-semibold transition">
              Área do Parceiro
            </Link>
          </div>
        </div>
      </footer>

      {/* MODAL LOGIN */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center"
          >
            <h2 className="text-2xl font-bold mb-3">⚠️ Faça Login</h2>
            <p className="text-gray-600 mb-6">
              Para marcar uma consulta, você precisa estar logado na sua conta.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Login
              </Link>
              <Link
                href="/cadastro"
                className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Cadastro
              </Link>
            </div>

            <button
              onClick={() => setModalOpen(false)}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Fechar
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}