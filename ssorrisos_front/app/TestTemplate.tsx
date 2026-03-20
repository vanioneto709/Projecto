"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Menu,
  X,
  Phone,
  ArrowRight,
  Star,
  Smile,
  Shield,
  Sparkles,
  Heart,
  Stethoscope,
  Baby,
  CheckCircle2,
  MapPin,
  Clock,
  Mail,
} from "lucide-react";

/* imagem de fundo do hero */
const heroImage = "https://picsum.photos/1920/1080";

/* botão simples substituindo o Button */
const Button = ({ children, className = "", ...props }: any) => (
  <button
    className={`px-6 py-3 bg-blue-600 text-white rounded-lg ${className}`}
    {...props}
  >
    {children}
  </button>
);

/* ─── Data ─── */

const navLinks = [
  { label: "Início", href: "#inicio" },
  { label: "Serviços", href: "#servicos" },
  { label: "Sobre Nós", href: "#sobre" },
  { label: "Equipa", href: "#equipa" },
  { label: "Contacto", href: "#contacto" },
];

const services = [
  {
    icon: Smile,
    title: "Ortodontia",
    description:
      "Alinhamento dentário com aparelhos fixos, removíveis e invisíveis.",
  },
  {
    icon: Sparkles,
    title: "Estética Dentária",
    description:
      "Branqueamento e facetas para um sorriso mais bonito.",
  },
  {
    icon: Shield,
    title: "Implantologia",
    description:
      "Implantes dentários modernos para substituir dentes perdidos.",
  },
  {
    icon: Heart,
    title: "Endodontia",
    description:
      "Tratamento de canal com conforto e precisão.",
  },
  {
    icon: Stethoscope,
    title: "Medicina Dentária Geral",
    description:
      "Consultas e limpeza para manter a saúde oral.",
  },
  {
    icon: Baby,
    title: "Odontopediatria",
    description:
      "Cuidados dentários especializados para crianças.",
  },
];

const stats = [
  { number: "15+", label: "Anos de Experiência" },
  { number: "2.000+", label: "Pacientes Felizes" },
  { number: "8", label: "Especialistas" },
  { number: "98%", label: "Taxa de Satisfação" },
];

const highlights = [
  "Mais de 15 anos de experiência",
  "Equipamentos modernos",
  "Equipa especializada",
  "Atendimento personalizado",
];

const team = [
  { name: "Dra. Ana Rodrigues", role: "Implantologia", initials: "AR" },
  { name: "Dr. Miguel Santos", role: "Ortodontia", initials: "MS" },
  { name: "Dra. Sofia Costa", role: "Estética", initials: "SC" },
  { name: "Dr. Pedro Almeida", role: "Endodontia", initials: "PA" },
];

const contactInfo = [
  { icon: MapPin, label: "Morada", value: "Av. da Liberdade 120, Lisboa" },
  { icon: Phone, label: "Telefone", value: "+351 912 345 678" },
  { icon: Mail, label: "Email", value: "info@dentcare.pt" },
  { icon: Clock, label: "Horário", value: "Seg-Sex: 9h-19h" },
];

/* ─── Page ─── */

export default function TestTemplate() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <a href="#inicio" className="text-2xl font-bold text-blue-600">
            DentCare
          </a>

          <div className="hidden md:flex gap-6">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section
        id="inicio"
        className="relative min-h-screen flex items-center pt-16"
      >
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <h1 className="text-5xl font-bold text-white mb-6">
            O seu sorriso merece o melhor
          </h1>

          <Button>
            Marcar Consulta <ArrowRight className="inline ml-2" />
          </Button>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section id="servicos" className="py-24">
        <div className="max-w-6xl mx-auto px-4">

          <h2 className="text-4xl font-bold text-center mb-16">
            Serviços
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {services.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 border rounded-lg"
              >
                <s.icon className="mb-4 text-blue-600" />

                <h3 className="font-semibold text-lg">
                  {s.title}
                </h3>

                <p className="text-gray-600 text-sm">
                  {s.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section id="sobre" className="py-24 bg-gray-100">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 px-4">

          <div className="grid grid-cols-2 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="bg-white p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {s.number}
                </div>
                <div>{s.label}</div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-4xl font-bold mb-6">
              Sobre Nós
            </h2>

            {highlights.map((h) => (
              <div key={h} className="flex gap-3 mb-3">
                <CheckCircle2 className="text-blue-600" />
                <span>{h}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* EQUIPA */}
      <section id="equipa" className="py-24">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-4 gap-8">

          {team.map((m) => (
            <div key={m.name} className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {m.initials}
              </div>

              <h3 className="font-semibold">
                {m.name}
              </h3>

              <p className="text-sm text-gray-600">
                {m.role}
              </p>
            </div>
          ))}

        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="py-24 bg-gray-100">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12">

          <div>
            <h2 className="text-4xl font-bold mb-8">
              Contacto
            </h2>

            {contactInfo.map((c) => (
              <div key={c.label} className="flex gap-3 mb-4">
                <c.icon className="text-blue-600" />
                <div>
                  <div className="text-sm">{c.label}</div>
                  <div className="font-medium">{c.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-lg">
            <form className="space-y-4">
              <input
                placeholder="Nome"
                className="w-full border p-2 rounded"
              />

              <input
                placeholder="Email"
                className="w-full border p-2 rounded"
              />

              <textarea
                placeholder="Mensagem"
                className="w-full border p-2 rounded"
              />

              <Button>Enviar</Button>
            </form>
          </div>

        </div>
      </section>

    </div>
  );
}