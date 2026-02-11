"use client";

import Link from "next/link";
import { useState } from "react";
import React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

// Ícones Reutilizáveis
const IconHeart: React.FC<IconProps> = (props) => (
  <svg
    className="w-6 h-6 mr-2"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
);

const IconCalendar: React.FC<IconProps> = (props) => (
  <svg
    className="w-10 h-10"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const IconNetwork: React.FC<IconProps> = (props) => (
  <svg
    className="w-10 h-10"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);

  // Função para verificar se o usuário está logado
  const handleMarcarConsulta = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Verifica se há token de autenticação no localStorage
    const token = typeof window !== "undefined" && localStorage.getItem("authToken");
    
    if (!token) {
      e.preventDefault(); // Impede navegação
      setModalOpen(true); // Abre o modal
    }
    // Se estiver logado, o link funciona normalmente
  };

  return (
    <div className="text-gray-900 antialiased bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600 flex items-center">
            <IconHeart />
            Saúde Conecta
          </Link>
          <nav className="hidden md:flex space-x-8">
            <Link href="#hero" className="text-gray-800 hover:text-blue-600 transition duration-150">
              Home
            </Link>
            <Link href="#funcionalidades" className="text-gray-800 hover:text-blue-600 transition duration-150">
              Funcionalidades
            </Link>
            <Link href="#parceiros" className="text-gray-800 hover:text-blue-600 transition duration-150">
              Rede
            </Link>
          </nav>
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition duration-300"
          >
            Acessar Minha Conta
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section id="hero" className="pt-16 pb-20 md:pt-24 md:pb-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-gray-900">
                Sua Saúde em Suas Mãos. <span className="text-blue-600">Agendamento Transparente.</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-lg">
                Agende consultas e gerencie prontuários de forma simples e segura. Conecte-se com clínicas parceiras em poucos cliques.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/agendamento"
                  onClick={handleMarcarConsulta}
                  className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold text-xl py-3 px-8 rounded-lg shadow-xl transition duration-300 transform hover:scale-105 text-center cursor-pointer"
                >
                  Marcar Consulta
                </Link>
                <Link
                  href="/Cadastro-Clinica"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl py-3 px-8 rounded-lg shadow-xl transition duration-300 transform hover:scale-105 text-center"
                >
                  Criar Conta
                </Link>
              </div>
            </div>
            <div className="hidden md:block">
              <img
                src="https://placehold.co/600x400/1D4ED8/ffffff?text=Interface+Saúde+Conecta"
                alt="Interface de agendamento médico"
                className="rounded-xl shadow-2xl object-cover"
              />
            </div>
          </div>
        </section>

        {/* Funcionalidades */}
        <section id="funcionalidades" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
              Funcionalidades Principais
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-xl shadow-xl transition duration-300 hover:shadow-2xl">
                <div className="text-teal-500 mb-4">
                  <IconCalendar />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">Agendamento Instantâneo</h3>
                <p className="text-gray-600">
                  Marque consultas rapidamente filtrando por clínica ou especialidade, com horários atualizados em tempo real.
                </p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-xl transition duration-300 hover:shadow-2xl">
                <div className="text-blue-600 mb-4">
                  <IconNetwork />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">Rede Conectada</h3>
                <p className="text-gray-600">
                  Conecte-se com clínicas parceiras e troque informações de forma segura, garantindo encaminhamentos e segunda opinião médica.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Parceiros */}
        <section id="parceiros" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Nossa Rede de Clínicas</h2>
            <p className="text-gray-600 mb-12">Clínicas que confiam na nossa plataforma para otimizar atendimento.</p>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8">
              <div className="text-2xl font-extrabold text-gray-500 opacity-80 hover:opacity-100 transition duration-300">
                Clínica SSorrisos <span className="text-blue-600">+</span>
              </div>
              <div className="text-2xl font-extrabold text-gray-500 opacity-80 hover:opacity-100 transition duration-300">
                Clínica Somar Sorrisos <span className="text-teal-500">(Brevemente)</span>
              </div>
              <div className="text-2xl font-extrabold text-gray-500 opacity-80 hover:opacity-100 transition duration-300">
                FarmaCabenda <span className="text-blue-600">(Brevemente)</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modal de alerta - Não está logado */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">⚠️ Faça login primeiro</h2>
            <p className="text-gray-700 mb-6">
              Para marcar uma consulta, você precisa estar logado ou cadastrado em sua conta.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
              >
                Fazer Login
              </Link>
              <Link
                href="/cadastrar"
                className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded transition"
              >
                Cadastre-se
              </Link>
            </div>
            <button
              className="mt-4 text-gray-500 hover:text-gray-700 text-sm underline"
              onClick={() => setModalOpen(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer id="contato" className="bg-gray-800 text-white mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:flex md:justify-between md:items-center">
          <div className="mb-6 md:mb-0">
            <h3 className="text-xl font-bold text-blue-400 mb-2">Saúde Conecta</h3>
            <p className="text-sm text-gray-400">© {new Date().getFullYear()} Todos os direitos reservados.</p>
          </div>
          <div className="flex space-x-6">
            <Link href="/termos" className="text-gray-400 hover:text-white transition duration-150">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="text-gray-400 hover:text-white transition duration-150">
              Política de Privacidade
            </Link>
            <Link href="/parceiro" className="text-teal-400 hover:text-white font-semibold transition duration-150">
              Área do Parceiro
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}