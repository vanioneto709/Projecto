"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu, X, Phone, ArrowRight, Star, Smile, Shield, Sparkles,
  Heart, Stethoscope, Baby, CheckCircle2, MapPin, Clock, Mail,
  ChevronRight, ArrowLeft, Calendar, Users, Search, Loader2,
  CheckCircle, AlertCircle, User, ChevronLeft, Quote,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Medico { id: number; nome: string; especialidade: string; crm: string; }
type AgStep = "medico" | "data-hora" | "motivo" | "confirmar";
const AG_STEPS: AgStep[] = ["medico", "data-hora", "motivo", "confirmar"];
const STEP_LABELS = ["Médico", "Data & Hora", "Motivo", "Confirmar"];
const HORARIOS = [
  "08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30",
];

// ─── Data ─────────────────────────────────────────────────────────────────────
const navLinks = [
  { label: "Início", href: "#inicio" },
  { label: "Serviços", href: "#servicos" },
  { label: "Sobre", href: "#sobre" },
  { label: "Equipa", href: "#equipa" },
  { label: "Contacto", href: "#contacto" },
];

const services = [
  { icon: Smile,      title: "Ortodontia",           desc: "Alinhamento dentário com aparelhos fixos, removíveis e invisíveis.", img: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=600&q=80" },
  { icon: Sparkles,   title: "Estética Dentária",    desc: "Branqueamento e facetas para um sorriso mais bonito.", img: "https://images.unsplash.com/photo-1588776814546-1ffbb172748c?w=600&q=80" },
  { icon: Shield,     title: "Implantologia",        desc: "Implantes dentários modernos para substituir dentes perdidos.", img: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&q=80" },
  { icon: Heart,      title: "Endodontia",           desc: "Tratamento de canal com conforto e precisão.", img: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&q=80" },
  { icon: Stethoscope,title: "Medicina Dentária Geral", desc: "Consultas e limpeza para manter a saúde oral.", img: "https://images.unsplash.com/photo-1629909615184-74f495363b67?w=600&q=80" },
  { icon: Baby,       title: "Odontopediatria",      desc: "Cuidados dentários especializados para crianças.", img: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=600&q=80" },
];

const stats = [
  { number: "15+",    label: "Anos de Experiência" },
  { number: "2.000+", label: "Pacientes Felizes" },
  { number: "8",      label: "Especialistas" },
  { number: "98%",    label: "Taxa de Satisfação" },
];

const highlights = [
  "Mais de 15 anos de experiência",
  "Equipamentos modernos de última geração",
  "Equipa especializada e dedicada",
  "Atendimento personalizado e humanizado",
];

const team = [
  { name: "Dra. Ana Rodrigues", role: "Implantologia",  initials: "AR", color: "#C9A84C" },
  { name: "Dr. Miguel Santos",  role: "Ortodontia",     initials: "MS", color: "#A68A3A" },
  { name: "Dra. Sofia Costa",   role: "Estética",       initials: "SC", color: "#D4B85A" },
  { name: "Dr. Pedro Almeida",  role: "Endodontia",     initials: "PA", color: "#8B7A4A" },
];

const contactInfo = [
  { icon: MapPin, label: "Morada",   value: "Av. da Liberdade 120, Luanda" },
  { icon: Phone,  label: "Telefone", value: "+244 912 345 678" },
  { icon: Mail,   label: "Email",    value: "info@ssorrisos.ao" },
  { icon: Clock,  label: "Horário",  value: "Seg–Sex: 08h–18h" },
];

const testimonials = [
  { name: "Maria Fernandes", text: "A melhor clínica dentária em que já estive. Profissionais incríveis e um atendimento de excelência!", role: "Paciente" },
  { name: "João Carlos", text: "Fiz implantes e o resultado foi fantástico. Recomendo a todos que procuram qualidade.", role: "Paciente" },
  { name: "Ana Beatriz", text: "Minha filha adora ir à SSorrisos. A equipa pediátrica é super atenciosa e divertida.", role: "Mãe de paciente" },
];

const carouselImages = [

  "/sorrisos-logo.jpeg",
  "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1200&q=80",
  "https://images.unsplash.com/photo-1629909615184-74f495363b67?w=1200&q=80",
  "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1200&q=80",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getStoredTipo() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("user_tipo");
}
function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access");
}

// ─── Image Carousel Component ────────────────────────────────────────────────
function ImageCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  const [touchStart, setTouchStart] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIdx(p => (p + 1) % images.length), 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setIdx(p => (p + 1) % images.length);
      else setIdx(p => (p - 1 + images.length) % images.length);
    }
  };

  return (
    <div className="cl-carousel" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <AnimatePresence mode="wait">
        <motion.img
          key={idx}
          src={images[idx]}
          alt={`Slide ${idx + 1}`}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.6 }}
          className="cl-carousel-img"
        />
      </AnimatePresence>
      <div className="cl-carousel-dots">
        {images.map((_, i) => (
          <button key={i} className={`cl-carousel-dot ${i === idx ? "active" : ""}`} onClick={() => setIdx(i)} />
        ))}
      </div>
      <button className="cl-carousel-arrow cl-carousel-prev" onClick={() => setIdx(p => (p - 1 + images.length) % images.length)}>
        <ChevronLeft size={20} />
      </button>
      <button className="cl-carousel-arrow cl-carousel-next" onClick={() => setIdx(p => (p + 1) % images.length)}>
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClinicaSsorrisos() {
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const router = useRouter();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [userTipo, setUserTipo]       = useState<string|null>(null);

  const [showAgModal, setShowAgModal] = useState(false);

  // Agendamento state
  const [agStep, setAgStep]           = useState<AgStep>("medico");
  const [medicos, setMedicos]         = useState<Medico[]>([]);
  const [medicoSel, setMedicoSel]     = useState<Medico|null>(null);
  const [dataSel, setDataSel]         = useState("");
  const [horaSel, setHoraSel]         = useState("");
  const [motivo, setMotivo]           = useState("");
  const [buscaMed, setBuscaMed]       = useState("");
  const [horarioOcup, setHorarioOcup] = useState<string[]>([]);
  const [submitting, setSubmitting]   = useState(false);
  const [agendado, setAgendado]       = useState(false);
  const [agError, setAgError]         = useState("");

  // Paciente sem login
  const [pacNome, setPacNome]         = useState("");
  const [pacTel, setPacTel]           = useState("");
  const [pacEmail, setPacEmail]       = useState("");

  useEffect(() => {
    const tipo = getStoredTipo();
    const token = getStoredToken();
    setIsLoggedIn(!!token && !!tipo);
    setUserTipo(tipo);
    fetchMedicos();
  }, []);

  const fetchMedicos = async () => {
    try {
      const r = await fetch(`${API}/api/publico/medicos/`);
      if (r.ok) setMedicos(await r.json());
    } catch {}
  };

 const fetchHorarios = async (medicoId: number, data: string) => {
  setLoadingHorarios(true);
  try {
    const r = await fetch(`${API}/api/publico/horarios/?medico_id=${medicoId}&data=${data}`);
    if (r.ok) {
      const d = await r.json();
      const todos = [
        "08:00","08:30","09:00","09:30","10:00","10:30",
        "11:00","11:30","14:00","14:30","15:00","15:30",
        "16:00","16:30","17:00","17:30",
      ];
      const disponiveis: string[] = d.horariosDisponiveis ?? [];
      setHorarioOcup(todos.filter(h => !disponiveis.includes(h)));
    }
  } catch {} finally {
    setLoadingHorarios(false);
  }
};

  const handleMarcarConsulta = () => {
    resetAg();
    setShowAgModal(true);
  };

  const handleEntrar = () => {
    if (isLoggedIn && userTipo) {
      const map: Record<string, string> = {
        admin: "/dashboard", clinica: "/dashboard-clinica",
        admin_clinica: "/dashboard-clinica", medico: "/dashboard-medico",
        paciente: "/dashboard-paciente",
      };
      router.push(map[userTipo] ?? "/dashboard-paciente");
    } else {
      router.push("/login");
    }
  };

  const resetAg = () => {
    setAgStep("medico"); setMedicoSel(null); setDataSel(""); setHoraSel("");
    setMotivo(""); setBuscaMed(""); setAgendado(false); setAgError("");
    setPacNome(""); setPacTel(""); setPacEmail("");
  };

  const confirmarAgendamento = async () => {
  setSubmitting(true);
  setAgError("");
  try {
    const token = getStoredToken();
    const isAuth = !!token && userTipo === "paciente";

    const endpoint = isAuth
      ? `${API}/api/paciente/agendar/`
      : `${API}/api/publico/agendar/`;

    const body = isAuth
      ? { medicoId: medicoSel!.id, data: dataSel, hora: horaSel, motivo }
      : {
          clinicaId: 1,
          medicoId: medicoSel!.id,
          data: dataSel,
          hora: horaSel,
          motivo,
          nome: pacNome,
          telefone: pacTel,
          email: pacEmail,
        };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (isAuth && token) headers["Authorization"] = `Bearer ${token}`;

    const r = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });

    if (r.ok) {
      setAgendado(true);
      if (isAuth) {
        setTimeout(() => {
          setShowAgModal(false);
          router.push("/dashboard-paciente");
        }, 2000);
      }
    } else {
      const e = await r.json();
      setAgError(e.error ?? "Erro ao agendar. Tente novamente.");
    }
  } catch {
    setAgError("Erro de conexão. Verifique sua internet.");
  } finally {
    setSubmitting(false);
  }
};

  const agStepIdx = AG_STEPS.indexOf(agStep);
  const medicosFiltrados = medicos.filter(m =>
    m.nome.toLowerCase().includes(buscaMed.toLowerCase()) ||
    (m.especialidade ?? "").toLowerCase().includes(buscaMed.toLowerCase())
  );

  const podeAvancar = () => {
    if (agStep === "medico") return true;
    if (agStep === "data-hora") return !!dataSel && !!horaSel;
    if (agStep === "motivo") {
      const isAuth = !!getStoredToken() && userTipo === "paciente";
      if (!isAuth) return !!(pacNome && pacTel);
      return true;
    }
    return true;
  };

  return (
    <>
      <style>{css}</style>
      <div className="cl-root">

        {/* ── NAVBAR ── */}
        <nav className="cl-nav">
          <div className="cl-nav-inner">
            <a href="#inicio" className="cl-logo">
              <span className="cl-logo-tooth">🦷</span> SSorrisos
            </a>

            <div className="cl-nav-links">
              {navLinks.map(l => (
                <a key={l.href} href={l.href} className="cl-nav-link">{l.label}</a>
              ))}
            </div>

            <div className="cl-nav-actions">
              <button className="cl-btn-outline" onClick={handleEntrar}>
                {isLoggedIn ? (
                  <><User size={15}/> Meu Painel</>
                ) : (
                  <><User size={15}/> Entrar</>
                )}
              </button>
              <button className="cl-btn-primary" onClick={handleMarcarConsulta}>
                <Calendar size={15}/> Marcar Consulta
              </button>
            </div>

            <button className="cl-hamburger" onClick={() => setMenuOpen(p => !p)}>
              {menuOpen ? <X size={22}/> : <Menu size={22}/>}
            </button>
          </div>

          <AnimatePresence>
            {menuOpen && (
              <motion.div className="cl-mobile-menu"
                initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
                {navLinks.map(l => (
                  <a key={l.href} href={l.href} className="cl-mobile-link" onClick={()=>setMenuOpen(false)}>{l.label}</a>
                ))}
                <button className="cl-btn-primary w-full" onClick={()=>{setMenuOpen(false);handleMarcarConsulta();}}>
                  <Calendar size={15}/> Marcar Consulta
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* ── HERO COM LOGO DE FUNDO ── */}
        <section id="inicio" className="cl-hero">
  <div className="cl-hero-logo-bg" />
  <div className="cl-hero-overlay"/>
  <img 
    src="/Captura de ecrã_2-5-2026_2115_www.instagram.com.jpeg"
    alt="Clínica SSorrisos" 
    className="cl-hero-img"
  />
  
  <div className="cl-hero-content">
    <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:.7}}>
      <div className="cl-hero-badge">
        <Star size={13}/> Clínica de Excelência em Angola
      </div>
      <h1 className="cl-hero-title font-display">
        O seu sorriso merece<br/><span>o melhor cuidado</span>
      </h1>
      <p className="cl-hero-desc">
        Medicina dentária moderna com a mais avançada tecnologia.<br/>
        Cuidamos do seu sorriso com dedicação e profissionalismo.
      </p>
      <div className="cl-hero-btns">
        <button className="cl-btn-hero-primary" onClick={handleMarcarConsulta}>
          <Calendar size={18}/> Marcar Consulta
        </button>
        <a href="#servicos" className="cl-btn-hero-ghost">
          Ver Serviços <ArrowRight size={16}/>
        </a>
      </div>
    </motion.div>
  </div>
</section>

        {/* ── STATS BAR ── */}
        <div className="cl-stats-bar">
          {stats.map(s => (
            <div key={s.label} className="cl-stat">
              <strong>{s.number}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── CARROSSEL DE IMAGENS ── */}
        <section className="cl-section cl-carousel-section">
          <div className="cl-section-inner">
            <div className="cl-section-header">
              <p className="cl-section-pre">A Nossa Clínica</p>
              <h2 className="font-display">Ambiente de Excelência</h2>
            </div>
            <ImageCarousel images={carouselImages} />
          </div>
        </section>

        {/* ── O QUE FAZEMOS COM CUIDADO ── */}
        <section className="cl-section cl-cuidado-section">
          <div className="cl-section-inner">
            <div className="cl-cuidado-grid">
              <motion.div 
                className="cl-cuidado-text"
                initial={{opacity:0,x:-30}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{duration:.6}}>
                <p className="cl-section-pre">O nosso compromisso</p>
                <h2 className="font-display">O que fazemos<br/>com <span>cuidado</span></h2>
                <p className="cl-cuidado-desc">
                  Na SSorrisos, cada tratamento é realizado com a máxima atenção aos detalhes. 
                  Utilizamos tecnologia de ponta e técnicas minimamente invasivas para garantir 
                  o seu conforto e os melhores resultados.
                </p>
                <div className="cl-cuidado-features">
                  {[
                    { icon: Shield, title: "Esterilização Total", desc: "Protocolos rigorosos de higiene" },
                    { icon: Heart, title: "Conforto Primeiro", desc: "Ambiente acolhedor e relaxante" },
                    { icon: Sparkles, title: "Tecnologia Avançada", desc: "Equipamentos de última geração" },
                  ].map((f, i) => (
                    <div key={i} className="cl-cuidado-feature">
                      <div className="cl-cuidado-icon"><f.icon size={20}/></div>
                      <div>
                        <strong>{f.title}</strong>
                        <span>{f.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div 
                className="cl-cuidado-image"
                initial={{opacity:0,x:30}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{duration:.6}}>
                <img src="https://images.unsplash.com/photo-1629909615184-74f495363b67?w=800&q=80" alt="Tratamento dental" />
                <div className="cl-cuidado-float">
                  <div className="cl-cuidado-float-icon"><Heart size={24}/></div>
                  <div>
                    <strong>2.000+</strong>
                    <span>Sorrisos Transformados</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── SERVIÇOS COM IMAGENS ── */}
        <section id="servicos" className="cl-section">
          <div className="cl-section-inner">
            <div className="cl-section-header">
              <p className="cl-section-pre">O que oferecemos</p>
              <h2 className="font-display">Os Nossos Serviços</h2>
              <p className="cl-section-sub">
                Tratamentos dentários completos com tecnologia de ponta e profissionais especializados.
              </p>
            </div>

            <div className="cl-services-grid">
              {services.map((s, i) => (
                <motion.div key={s.title} className="cl-service-card"
                  initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}}
                  viewport={{once:true}} transition={{delay:i*.08}}>
                  <div className="cl-service-img-wrap">
                    <img src={s.img} alt={s.title} className="cl-service-img" />
                    <div className="cl-service-img-overlay" />
                  </div>
                  <div className="cl-service-body">
                    <div className="cl-service-icon"><s.icon size={22}/></div>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SOBRE ── */}
        <section id="sobre" className="cl-section cl-sobre">
          <div className="cl-section-inner">
            <div className="cl-sobre-grid">
              <div>
                <p className="cl-section-pre">Quem somos</p>
                <h2 className="font-display">Sobre a SSorrisos</h2>
                <p className="cl-sobre-desc">
                  A Clínica SSorrisos é referência em medicina dentária em Angola.
                  Com mais de 15 anos de experiência, oferecemos atendimento de excelência
                  com uma equipa de especialistas altamente qualificados.
                </p>
                {highlights.map(h => (
                  <div key={h} className="cl-highlight">
                    <CheckCircle2 size={18} className="cl-check"/> <span>{h}</span>
                  </div>
                ))}
                <button className="cl-btn-primary" style={{marginTop:24}} onClick={handleMarcarConsulta}>
                  Marcar Consulta <ArrowRight size={16}/>
                </button>
              </div>

              <div className="cl-stats-grid">
                {stats.map(s => (
                  <div key={s.label} className="cl-stat-card">
                    <strong>{s.number}</strong>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTEMUNHOS ── */}
        <section className="cl-section cl-testimonials-section">
          <div className="cl-section-inner">
            <div className="cl-section-header">
              <p className="cl-section-pre">Depoimentos</p>
              <h2 className="font-display">O que dizem os nossos pacientes</h2>
            </div>
            <div className="cl-testimonials-grid">
              {testimonials.map((t, i) => (
                <motion.div key={i} className="cl-testimonial-card"
                  initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}}
                  viewport={{once:true}} transition={{delay:i*.1}}>
                  <Quote size={24} className="cl-testimonial-quote" />
                  <p className="cl-testimonial-text">{t.text}</p>
                  <div className="cl-testimonial-author">
                    <div className="cl-testimonial-av">{t.name[0]}</div>
                    <div>
                      <strong>{t.name}</strong>
                      <span>{t.role}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── EQUIPA ── */}
        <section id="equipa" className="cl-section">
          <div className="cl-section-inner">
            <div className="cl-section-header">
              <p className="cl-section-pre">Profissionais</p>
              <h2 className="font-display">A Nossa Equipa</h2>
            </div>
            <div className="cl-team-grid">
              {team.map(m => (
                <motion.div key={m.name} className="cl-team-card"
                  initial={{opacity:0,scale:.96}} whileInView={{opacity:1,scale:1}}
                  viewport={{once:true}}>
                  <div className="cl-team-av" style={{background:m.color}}>{m.initials}</div>
                  <h3>{m.name}</h3>
                  <p>{m.role}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BAND ── */}
        <div className="cl-cta-band">
          <div className="cl-cta-inner">
            <div>
              <h3 className="font-display">Pronto para cuidar do seu sorriso?</h3>
              <p>Agende a sua consulta hoje mesmo. Rápido, fácil e sem complicações.</p>
            </div>
            <button className="cl-btn-cta" onClick={handleMarcarConsulta}>
              <Calendar size={17}/> Marcar Consulta Agora
            </button>
          </div>
        </div>

        {/* ── CONTACTO ── */}
        <section id="contacto" className="cl-section cl-sobre">
          <div className="cl-section-inner">
            <div className="cl-section-header">
              <p className="cl-section-pre">Fale connosco</p>
              <h2 className="font-display">Contacto</h2>
            </div>
            <div className="cl-contact-grid">
              <div>
                {contactInfo.map(c => (
                  <div key={c.label} className="cl-contact-row">
                    <div className="cl-contact-icon"><c.icon size={18}/></div>
                    <div>
                      <p className="cl-contact-label">{c.label}</p>
                      <p className="cl-contact-val">{c.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cl-contact-form">
                <h3>Envie uma mensagem</h3>
                <input className="cl-input" placeholder="O seu nome"/>
                <input className="cl-input" placeholder="Email ou telefone"/>
                <textarea className="cl-input" rows={4} placeholder="A sua mensagem..."/>
                <button className="cl-btn-primary">Enviar Mensagem</button>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="cl-footer">
          <div className="cl-footer-inner">
            <div>
              <p className="cl-footer-brand">🦷 SSorrisos</p>
              <p className="cl-footer-copy">© {new Date().getFullYear()} Clínica SSorrisos. Todos os direitos reservados.</p>
            </div>
            <div className="cl-footer-links">
              <a href="/termos">Termos</a>
              <a href="/privacidade">Privacidade</a>
              <Link href="/login">Área Restrita</Link>
            </div>
          </div>
        </footer>

        {/* ══════════════════════════════════════
            MODAL DE AGENDAMENTO
        ══════════════════════════════════════ */}
        <AnimatePresence>
          {showAgModal && (
            <motion.div className="cl-overlay"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>{ setShowAgModal(false); }}>
              <motion.div className="cl-modal"
                initial={{opacity:0,y:32}} animate={{opacity:1,y:0}} exit={{opacity:0,y:32}}
                onClick={e=>e.stopPropagation()}>

                <div className="cl-modal-header">
                  <div>
                    <p className="cl-modal-pre">Clínica SSorrisos</p>
                    <h3 className="cl-modal-title">
                      {agendado ? "Consulta Agendada!" :
                       agStep==="medico" ? "Escolha o Médico" :
                       agStep==="data-hora" ? "Data e Horário" :
                       agStep==="motivo" ? "Dados e Motivo" : "Confirmar Agendamento"}
                    </h3>
                  </div>
                  <button className="cl-modal-close" onClick={()=>setShowAgModal(false)}><X size={17}/></button>
                </div>

                {!agendado && (
                  <div className="cl-stepper">
                    {STEP_LABELS.map((l,i)=>{
                      const isDone = i < agStepIdx;
                      const isActive = i === agStepIdx;
                      return (
                        <div key={l} className="cl-stepper-item">
                          <div className={`cl-sdot ${isDone?"done":isActive?"active":""}`}>
                            {isDone ? <CheckCircle size={13}/> : i+1}
                          </div>
                          <span className={`cl-slbl ${isActive?"active":""}`}>{l}</span>
                          {i < 3 && <div className={`cl-sline ${isDone?"done":""}`}/>}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="cl-modal-body">
                  <AnimatePresence mode="wait">
                    <motion.div key={agendado?"success":agStep}
                      initial={{opacity:0,x:14}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-14}}
                      transition={{duration:.18}}>

                      {agendado && (
                        <div className="cl-success">
                          <CheckCircle size={56} className="cl-success-icon"/>
                          <h3>Consulta agendada com sucesso!</h3>
                          <p>A sua consulta com <strong>Dr(a). {medicoSel?.nome}</strong> está marcada para <strong>{new Date(dataSel).toLocaleDateString("pt-BR")} às {horaSel}</strong>.</p>
                          {!getStoredToken() && <p className="cl-success-note">Receberá uma confirmação em breve.</p>}
                          <div style={{display:"flex",gap:12,marginTop:20,justifyContent:"center",flexWrap:"wrap"}}>
                            {!!getStoredToken() && userTipo === "paciente" ? (
                              <button className="cl-btn-primary" onClick={() => router.push("/dashboard-paciente")}>
                                Ir para o meu painel
                              </button>
                            ) : (
                              <button className="cl-btn-primary" onClick={() => setShowAgModal(false)}>Fechar</button>
                            )}
                            <button className="cl-btn-outline-sm" onClick={resetAg}>Agendar outra</button>
                          </div>
                        </div>
                      )}

                      {!agendado && agStep === "medico" && (
                        <div>
                          <div style={{
                            padding: "9px 12px", marginBottom: 12,
                            background: "rgba(201,168,76,.08)",
                            border: "1px solid rgba(201,168,76,.15)",
                            borderRadius: 6, fontSize: 12, color: "#A89880",
                            display: "flex", alignItems: "center", gap: 7,
                          }}>
                            <AlertCircle size={13} style={{flexShrink:0}}/>
                            Opcional — pode avançar sem seleccionar. A clínica atribuirá um médico disponível.
                          </div>

                          <div className="cl-search">
                            <Search size={15}/>
                            <input placeholder="Buscar por nome ou especialidade..."
                              value={buscaMed} onChange={e => setBuscaMed(e.target.value)}/>
                          </div>

                          <div className="cl-medico-list">
                            {medicosFiltrados.length === 0 && (
                              <p className="cl-empty-sm">Nenhum médico encontrado</p>
                            )}
                            {medicosFiltrados.map(m => (
                              <button key={m.id}
                                className={`cl-medico-row ${medicoSel?.id === m.id ? "sel" : ""}`}
                                onClick={() => setMedicoSel(prev => prev?.id === m.id ? null : m)}>
                                <div className="cl-med-av">{m.nome[0]}</div>
                                <div className="cl-med-info">
                                  <strong>Dr(a). {m.nome}</strong>
                                  <span>{m.especialidade || "Geral"}</span>
                                </div>
                                {medicoSel?.id === m.id && <CheckCircle size={17} className="cl-sel-chk"/>}
                              </button>
                            ))}
                          </div>

                          {medicoSel && (
                            <button onClick={() => setMedicoSel(null)}
                              style={{fontSize:12,color:"#A89880",marginTop:8,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
                              ✕ Limpar selecção
                            </button>
                          )}
                        </div>
                      )}

                      {!agendado && agStep==="data-hora" && (
                        <div>
                          <div className="cl-info-pill"><Stethoscope size={13}/> Dr(a). {medicoSel?.nome} — {medicoSel?.especialidade||"Geral"}</div>
                          <div className="cl-field">
                            <label>Data da consulta *</label>
                            <input type="date" min={new Date().toISOString().split("T")[0]}
                              value={dataSel}
                              onChange={e=>{ setDataSel(e.target.value); setHoraSel(""); if(medicoSel) fetchHorarios(medicoSel.id,e.target.value); }}/>
                          </div>
                          {dataSel && (
                            <div className="cl-field">
                              <label>Horário disponível *</label>
                              {loadingHorarios ? (
                                <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 0",fontSize:13,color:"#A89880"}}>
                                  <Loader2 size={16} className="spin"/> Buscando horários...
                                </div>
                              ) : HORARIOS.length === 0 ? (
                                <p style={{fontSize:13,color:"#A89880",padding:"8px 0"}}>Nenhum horário disponível</p>
                              ) : (
                                <div className="cl-horarios">
                                  {HORARIOS.map(h=>{
                                    const isSel = horaSel===h;
                                    const isBusy = horarioOcup.includes(h);
                                    return (
                                      <button key={h}
                                        className={`cl-hora-btn ${isSel?"sel":""} ${isBusy?"busy":""}`}
                                        disabled={isBusy}
                                        onClick={()=>setHoraSel(h)}>
                                        <Clock size={11}/>{h}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {!agendado && agStep==="motivo" && (
                        <div>
                          {!getStoredToken() && (
                            <div>
                              <div className="cl-field-row">
                                <div className="cl-field">
                                  <label>Nome completo *</label>
                                  <input placeholder="Ex: João Silva" value={pacNome} onChange={e=>setPacNome(e.target.value)}/>
                                </div>
                                <div className="cl-field">
                                  <label>Telefone *</label>
                                  <input placeholder="+244 9XX XXX XXX" value={pacTel} onChange={e=>setPacTel(e.target.value)}/>
                                </div>
                              </div>
                              <div className="cl-field">
                                <label>Email <span className="cl-opt">(opcional)</span></label>
                                <input type="email" placeholder="seu@email.com" value={pacEmail} onChange={e=>setPacEmail(e.target.value)}/>
                              </div>
                            </div>
                          )}
                          <div className="cl-field">
                            <label>Motivo da consulta <span className="cl-opt">(opcional)</span></label>
                            <textarea rows={3} placeholder="Ex: Dor de dente, limpeza, revisão..." value={motivo} onChange={e=>setMotivo(e.target.value)}/>
                          </div>
                        </div>
                      )}

                      {!agendado && agStep==="confirmar" && (
                        <div>
                          {agError && <div className="cl-error"><AlertCircle size={14}/> {agError}</div>}
                          <div className="cl-confirm-box">
                            <h4>Resumo do agendamento</h4>
                            {[
                              ["Clínica",       "Clínica SSorrisos"],
                              ["Médico",        `Dr(a). ${medicoSel?.nome}`],
                              ["Especialidade", medicoSel?.especialidade||"Geral"],
                              ["Data",          new Date(dataSel).toLocaleDateString("pt-BR")],
                              ["Horário",       horaSel],
                              ...(!getStoredToken() ? [
                                ["Paciente", pacNome],
                                ["Telefone", pacTel],
                                ...(pacEmail ? [["Email", pacEmail]] : []),
                              ] : []),
                              ...(motivo ? [["Motivo", motivo]] : []),
                            ].map(([l,v])=>{
                              if (!v) return null;
                              return (
                                <div key={l} className="cl-confirm-row">
                                  <span>{l}</span><strong>{v}</strong>
                                </div>
                              );
                            })}
                          </div>
                          <p className="cl-confirm-note">
                            Ao confirmar, a consulta será registada e a clínica será notificada.
                          </p>
                        </div>
                      )}

                    </motion.div>
                  </AnimatePresence>
                </div>

                {!agendado && (
                  <div className="cl-modal-footer">
                    {agStepIdx>0 && (
                      <button className="cl-btn-back" onClick={()=>setAgStep(AG_STEPS[agStepIdx-1])}>
                        <ArrowLeft size={14}/> Voltar
                      </button>
                    )}
                    {agStep!=="confirmar" ? (
                      <button className="cl-btn-primary" disabled={!podeAvancar()}
                        onClick={()=>setAgStep(AG_STEPS[agStepIdx+1])}>
                        Avançar <ArrowRight size={14}/>
                      </button>
                    ) : (
                      <button className="cl-btn-confirm" disabled={submitting} onClick={confirmarAgendamento}>
                        {submitting
                          ? <><Loader2 size={14} className="spin"/> Agendando...</>
                          : <><CheckCircle size={14}/> Confirmar Agendamento</>}
                      </button>
                    )}
                  </div>
                )}

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root{
  /* Black & Gold — SSorrisos (baseado na logo real) */
  --bg: #0A0908;
  --bg2: #12100E;
  --bg3: #1A1714;
  --surface: #161412;
  --surface-hover: #1E1B17;
  --gold: #C9A84C;
  --gold-light: #D4B85A;
  --gold-deep: #A68A3A;
  --gold-muted: #8B7A4A;
  --gold-glow: rgba(201,168,76,.15);
  --cream: #F5F0E8;
  --cream-dim: #E8E0D4;
  --cream-muted: #B8A88C;
  --border: rgba(201,168,76,.1);
  --border-hover: rgba(201,168,76,.2);
  --text: #F5F0E8;
  --text2: #D4C8B8;
  --text3: #A89880;
  --text4: #6B6050;
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  font-family: 'Inter Tight', ui-sans-serif, system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

::selection { background: var(--gold); color: var(--bg); }

a{text-decoration:none;color:inherit;}
button{cursor:pointer;font-family:inherit;border:none;background:none;}
img{max-width:100%;}

.font-display {
  font-family: 'Fraunces', ui-serif, Georgia, serif;
  font-optical-sizing: auto;
  font-variation-settings: "SOFT" 50, "WONK" 0;
}

.cl-root{min-height:100vh;background:var(--bg);position:relative;}

/* ── Navbar ── */
.cl-nav{position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(10,9,8,.9);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);}
.cl-nav-inner{max-width:1200px;margin:0 auto;padding:0 24px;height:68px;display:flex;align-items:center;gap:28px;}
.cl-logo{font-size:20px;font-weight:800;color:var(--gold);letter-spacing:-.02em;flex-shrink:0;font-family:'Fraunces',serif;}
.cl-logo-tooth{margin-right:4px;}
.cl-nav-links{flex:1;display:flex;gap:28px;}
.cl-nav-link{font-size:13px;font-weight:500;color:var(--text2);transition:color .13s;letter-spacing:.02em;text-transform:uppercase;}
.cl-nav-link:hover{color:var(--gold);}
.cl-nav-actions{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.cl-hamburger{display:none;color:var(--text2);}
.cl-mobile-menu{background:var(--surface);border-top:1px solid var(--border);padding:16px 24px;display:flex;flex-direction:column;gap:8px;}
.cl-mobile-link{padding:10px 0;font-size:15px;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border);}

/* ── Buttons ── */
.cl-btn-primary{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;background:var(--gold);color:var(--bg);border-radius:var(--radius-sm);font-size:13px;font-weight:700;transition:all .14s;letter-spacing:.02em;}
.cl-btn-primary:hover:not(:disabled){background:var(--gold-light);transform:translateY(-1px);box-shadow:0 4px 20px rgba(201,168,76,.3);}
.cl-btn-primary:disabled{opacity:.5;cursor:not-allowed;}
.cl-btn-outline{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border:1.5px solid var(--border);background:transparent;color:var(--text2);border-radius:var(--radius-sm);font-size:13px;font-weight:600;transition:all .14s;}
.cl-btn-outline:hover{border-color:var(--gold);color:var(--gold);}
.cl-btn-outline-sm{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:1.5px solid var(--border);background:transparent;color:var(--text2);border-radius:var(--radius-sm);font-size:13px;font-weight:600;}
.cl-btn-outline-sm:hover{border-color:var(--gold);color:var(--gold);}
.cl-btn-back{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;color:var(--text2);transition:all .13s;}
.cl-btn-back:hover{background:var(--surface);}
.cl-btn-confirm{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;background:var(--gold);color:var(--bg);border-radius:var(--radius-sm);font-size:13px;font-weight:700;margin-left:auto;transition:all .13s;}
.cl-btn-confirm:hover:not(:disabled){background:var(--gold-light);transform:translateY(-1px);}
.cl-btn-confirm:disabled{opacity:.5;cursor:not-allowed;}
.w-full{width:100%;}

/* ── Hero ── */
.cl-hero{position:relative;min-height:100vh;display:flex;align-items:center;padding-top:68px;overflow:hidden;}
.cl-hero-logo-bg{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80vw;height:80vw;max-width:900px;max-height:900px;background:url('https://images.unsplash.com/photo-1629909615184-74f495363b67?w=800&q=80') center/contain no-repeat;opacity:.04;z-index:1;pointer-events:none;filter:brightness(0) invert(1);}
.cl-hero-overlay{position:absolute;inset:0;background:linear-gradient(105deg,rgba(10,9,8,.92) 0%,rgba(10,9,8,.6) 50%,rgba(10,9,8,.3) 100%);z-index:2;}
.cl-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.5) saturate(.7);z-index:0;}
.cl-hero-content{position:relative;z-index:3;max-width:1200px;margin:0 auto;padding:0 32px;}
.cl-hero-badge{display:inline-flex;align-items:center;gap:7px;padding:6px 14px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);backdrop-filter:blur(8px);border-radius:99px;font-size:11px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.08em;margin-bottom:20px;}
.cl-hero-title{font-size:58px;font-weight:800;line-height:1.08;color:var(--cream);margin-bottom:20px;max-width:640px;}
.cl-hero-title span{color:var(--gold);}
.cl-hero-desc{font-size:17px;color:var(--text2);line-height:1.7;max-width:500px;margin-bottom:36px;}
.cl-hero-btns{display:flex;gap:14px;flex-wrap:wrap;}
.cl-btn-hero-primary{display:inline-flex;align-items:center;gap:9px;padding:15px 30px;background:var(--gold);color:var(--bg);border-radius:var(--radius-sm);font-size:15px;font-weight:700;box-shadow:0 6px 24px rgba(201,168,76,.25);transition:all .15s;}
.cl-btn-hero-primary:hover{background:var(--gold-light);transform:translateY(-2px);box-shadow:0 8px 32px rgba(201,168,76,.35);}
.cl-btn-hero-ghost{display:inline-flex;align-items:center;gap:9px;padding:15px 28px;background:rgba(201,168,76,.08);border:1.5px solid rgba(201,168,76,.25);color:var(--cream);border-radius:var(--radius-sm);font-size:15px;font-weight:600;transition:all .15s;}
.cl-btn-hero-ghost:hover{background:rgba(201,168,76,.15);border-color:rgba(201,168,76,.4);}

/* ── Stats bar ── */
.cl-stats-bar{background:var(--surface);display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--border);border-top:1px solid var(--border);}
.cl-stat{display:flex;flex-direction:column;align-items:center;padding:28px;border-right:1px solid var(--border);}
.cl-stat:last-child{border-right:none;}
.cl-stat strong{font-size:28px;font-weight:800;color:var(--gold);font-family:'Fraunces',serif;}
.cl-stat span{font-size:12px;color:var(--text3);letter-spacing:.04em;text-transform:uppercase;}

/* ── Sections ── */
.cl-section{padding:100px 0;}
.cl-sobre{background:var(--bg2);}
.cl-section-inner{max-width:1200px;margin:0 auto;padding:0 32px;}
.cl-section-header{text-align:center;margin-bottom:60px;}
.cl-section-pre{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--gold);margin-bottom:12px;}
.cl-section-header h2{font-size:40px;font-weight:800;margin-bottom:16px;color:var(--cream);}
.cl-section-sub{font-size:15px;color:var(--text3);max-width:540px;margin:0 auto;line-height:1.7;}

/* ── Carousel ── */
.cl-carousel-section{background:var(--bg);padding:80px 0;}
.cl-carousel{position:relative;width:100%;height:500px;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--border);}
.cl-carousel-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.cl-carousel-dots{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:8px;z-index:10;}
.cl-carousel-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.3);border:none;cursor:pointer;transition:all .2s;}
.cl-carousel-dot.active{background:var(--gold);width:24px;border-radius:4px;}
.cl-carousel-arrow{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;background:rgba(10,9,8,.7);border:1px solid var(--border);color:var(--cream);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;z-index:10;}
.cl-carousel-arrow:hover{background:var(--gold);color:var(--bg);border-color:var(--gold);}
.cl-carousel-prev{left:16px;}
.cl-carousel-next{right:16px;}

/* ── Cuidado Section ── */
.cl-cuidado-section{background:var(--bg2);}
.cl-cuidado-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;}
.cl-cuidado-text h2{font-size:42px;font-weight:800;color:var(--cream);line-height:1.1;margin-bottom:20px;}
.cl-cuidado-text h2 span{color:var(--gold);}
.cl-cuidado-desc{font-size:15px;color:var(--text3);line-height:1.8;margin-bottom:32px;}
.cl-cuidado-features{display:flex;flex-direction:column;gap:16px;}
.cl-cuidado-feature{display:flex;align-items:flex-start;gap:14px;padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);transition:all .2s;}
.cl-cuidado-feature:hover{border-color:var(--border-hover);}
.cl-cuidado-icon{width:40px;height:40px;border-radius:var(--radius-sm);background:rgba(201,168,76,.1);color:var(--gold);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cl-cuidado-feature strong{display:block;font-size:14px;font-weight:700;color:var(--cream);margin-bottom:2px;}
.cl-cuidado-feature span{font-size:13px;color:var(--text3);}
.cl-cuidado-image{position:relative;}
.cl-cuidado-image img{width:100%;height:500px;object-fit:cover;border-radius:var(--radius-lg);border:1px solid var(--border);}
.cl-cuidado-float{position:absolute;bottom:24px;left:24px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.4);}
.cl-cuidado-float-icon{width:44px;height:44px;border-radius:50%;background:var(--gold);color:var(--bg);display:flex;align-items:center;justify-content:center;}
.cl-cuidado-float strong{display:block;font-size:18px;font-weight:800;color:var(--cream);}
.cl-cuidado-float span{font-size:12px;color:var(--text3);}

/* ── Services ── */
.cl-services-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
.cl-service-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:all .25s cubic-bezier(.2,.7,.2,1);}
.cl-service-card:hover{border-color:var(--border-hover);box-shadow:0 8px 40px rgba(201,168,76,.08);transform:translateY(-4px);}
.cl-service-img-wrap{position:relative;height:180px;overflow:hidden;}
.cl-service-img{width:100%;height:100%;object-fit:cover;transition:transform .4s;}
.cl-service-card:hover .cl-service-img{transform:scale(1.05);}
.cl-service-img-overlay{position:absolute;inset:0;background:linear-gradient(to top,var(--surface) 0%,transparent 60%);}
.cl-service-body{padding:24px;}
.cl-service-icon{width:44px;height:44px;background:rgba(201,168,76,.1);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;color:var(--gold);margin-bottom:14px;margin-top:-46px;position:relative;z-index:2;border:2px solid var(--surface);}
.cl-service-card h3{font-size:16px;font-weight:700;margin-bottom:8px;color:var(--cream);}
.cl-service-card p{font-size:14px;color:var(--text3);line-height:1.7;}

/* ── Sobre ── */
.cl-sobre-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;}
.cl-sobre-grid h2{font-size:36px;font-weight:800;margin-bottom:14px;color:var(--cream);}
.cl-sobre-desc{font-size:15px;color:var(--text3);line-height:1.8;margin-bottom:20px;}
.cl-highlight{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;margin-bottom:10px;color:var(--text2);}
.cl-check{color:var(--gold);flex-shrink:0;}
.cl-stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.cl-stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;text-align:center;transition:all .2s;}
.cl-stat-card:hover{border-color:var(--border-hover);}
.cl-stat-card strong{display:block;font-size:32px;font-weight:800;color:var(--gold);margin-bottom:4px;font-family:'Fraunces',serif;}
.cl-stat-card span{font-size:13px;color:var(--text3);}

/* ── Testimonials ── */
.cl-testimonials-section{background:var(--bg);}
.cl-testimonials-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
.cl-testimonial-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;transition:all .2s;position:relative;}
.cl-testimonial-card:hover{border-color:var(--border-hover);}
.cl-testimonial-quote{color:var(--gold);opacity:.3;margin-bottom:12px;}
.cl-testimonial-text{font-size:14px;color:var(--text2);line-height:1.7;margin-bottom:20px;font-style:italic;}
.cl-testimonial-author{display:flex;align-items:center;gap:12px;}
.cl-testimonial-av{width:40px;height:40px;border-radius:50%;background:var(--gold);color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;}
.cl-testimonial-author strong{display:block;font-size:14px;font-weight:700;color:var(--cream);}
.cl-testimonial-author span{font-size:12px;color:var(--text3);}

/* ── Team ── */
.cl-team-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;}
.cl-team-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px 20px;text-align:center;transition:all .25s cubic-bezier(.2,.7,.2,1);}
.cl-team-card:hover{border-color:var(--border-hover);transform:translateY(-4px);box-shadow:0 8px 40px rgba(201,168,76,.08);}
.cl-team-av{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--bg);font-size:22px;font-weight:800;margin:0 auto 14px;}
.cl-team-card h3{font-size:15px;font-weight:700;margin-bottom:4px;color:var(--cream);}
.cl-team-card p{font-size:13px;color:var(--text3);}

/* ── CTA Band ── */
.cl-cta-band{background:var(--surface);padding:60px 32px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);}
.cl-cta-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap;}
.cl-cta-inner h3{font-size:28px;font-weight:800;color:var(--cream);margin-bottom:6px;}
.cl-cta-inner p{font-size:15px;color:var(--text3);}
.cl-btn-cta{display:inline-flex;align-items:center;gap:9px;padding:14px 28px;background:var(--gold);color:var(--bg);border-radius:var(--radius-sm);font-size:15px;font-weight:800;flex-shrink:0;transition:all .15s;}
.cl-btn-cta:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(201,168,76,.25);}

/* ── Contact ── */
.cl-contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:start;}
.cl-contact-row{display:flex;align-items:flex-start;gap:14px;margin-bottom:20px;}
.cl-contact-icon{width:40px;height:40px;border-radius:var(--radius-sm);background:rgba(201,168,76,.1);color:var(--gold);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cl-contact-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text4);margin-bottom:2px;}
.cl-contact-val{font-size:14px;font-weight:600;color:var(--text2);}
.cl-contact-form{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;}
.cl-contact-form h3{font-size:18px;font-weight:700;margin-bottom:20px;color:var(--cream);}
.cl-input{width:100%;padding:10px 13px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;color:var(--cream);background:var(--bg);margin-bottom:12px;outline:none;transition:all .13s;display:block;resize:vertical;}
.cl-input::placeholder{color:var(--text4);}
.cl-input:focus{border-color:var(--gold);background:var(--bg2);}

/* ── Footer ── */
.cl-footer{background:var(--bg);padding:32px;border-top:1px solid var(--border);}
.cl-footer-inner{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;}
.cl-footer-brand{font-size:18px;font-weight:800;color:var(--cream);margin-bottom:4px;font-family:'Fraunces',serif;}
.cl-footer-copy{font-size:12px;color:var(--text4);}
.cl-footer-links{display:flex;gap:20px;}
.cl-footer-links a{font-size:13px;color:var(--text4);transition:color .13s;}
.cl-footer-links a:hover{color:var(--gold);}

/* ── Modal ── */
.cl-overlay{position:fixed;inset:0;background:rgba(10,9,8,.7);backdrop-filter:blur(8px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;}
.cl-modal{background:var(--surface);border-radius:var(--radius-lg);width:100%;max-width:560px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.5);border:1px solid var(--border);}
.cl-modal-header{display:flex;align-items:flex-start;justify-content:space-between;padding:20px 22px 14px;border-bottom:1px solid var(--border);}
.cl-modal-pre{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--gold);margin-bottom:2px;}
.cl-modal-title{font-size:17px;font-weight:700;color:var(--cream);}
.cl-modal-close{width:30px;height:30px;border-radius:var(--radius-sm);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text3);transition:all .13s;flex-shrink:0;background:transparent;}
.cl-modal-close:hover{background:var(--bg);color:var(--cream);}

/* Stepper */
.cl-stepper{display:flex;align-items:center;padding:12px 22px;background:var(--bg);border-bottom:1px solid var(--border);gap:0;overflow-x:auto;}
.cl-stepper-item{display:flex;align-items:center;gap:5px;flex-shrink:0;}
.cl-sdot{width:24px;height:24px;border-radius:50%;border:2px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--text4);transition:all .2s;flex-shrink:0;}
.cl-sdot.active{border-color:var(--gold);background:var(--gold);color:var(--bg);}
.cl-sdot.done{border-color:var(--gold);background:var(--gold);color:var(--bg);}
.cl-slbl{font-size:10px;font-weight:600;color:var(--text4);white-space:nowrap;}
.cl-slbl.active{color:var(--gold);}
.cl-sline{flex:1;min-width:18px;height:2px;background:var(--border);margin:0 5px;transition:background .2s;}
.cl-sline.done{background:var(--gold);}

.cl-modal-body{flex:1;overflow-y:auto;padding:18px 22px;}

/* Search */
.cl-search{display:flex;align-items:center;gap:9px;padding:9px 13px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:13px;}
.cl-search input{flex:1;border:none;background:transparent;outline:none;font-size:13px;color:var(--cream);font-family:inherit;}
.cl-search input::placeholder{color:var(--text4);}
.cl-search svg{color:var(--text4);}

/* Médico list */
.cl-medico-list{display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;}
.cl-medico-row{display:flex;align-items:center;gap:12px;padding:12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);text-align:left;transition:all .14s;width:100%;background:transparent;}
.cl-medico-row:hover{border-color:var(--border-hover);}
.cl-medico-row.sel{border-color:var(--gold);background:rgba(201,168,76,.06);}
.cl-med-av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--gold-muted),var(--gold-deep));color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0;}
.cl-med-info{flex:1;}
.cl-med-info strong{font-size:13px;font-weight:700;display:block;margin-bottom:2px;color:var(--cream);}
.cl-med-info span{font-size:11px;color:var(--text4);}
.cl-sel-chk{color:var(--gold);flex-shrink:0;}

/* Info pill */
.cl-info-pill{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;background:rgba(201,168,76,.08);border-radius:var(--radius-sm);font-size:12px;font-weight:600;color:var(--gold);margin-bottom:14px;}

/* Field */
.cl-field{display:flex;flex-direction:column;gap:5px;margin-bottom:13px;}
.cl-field label{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;}
.cl-field input,.cl-field textarea{padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;font-family:inherit;color:var(--cream);background:var(--bg);outline:none;transition:all .13s;resize:vertical;}
.cl-field input::placeholder,.cl-field textarea::placeholder{color:var(--text4);}
.cl-field input:focus,.cl-field textarea:focus{border-color:var(--gold);background:var(--bg2);}
.cl-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.cl-opt{font-size:10px;color:var(--text4);text-transform:none;font-weight:400;letter-spacing:0;}

/* Horários */
.cl-horarios{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:6px;}
.cl-hora-btn{display:flex;align-items:center;justify-content:center;gap:4px;padding:9px 5px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:11px;font-weight:600;transition:all .13s;font-family:inherit;background:transparent;color:var(--text2);}
.cl-hora-btn:hover:not(:disabled){border-color:var(--gold);color:var(--gold);}
.cl-hora-btn.sel{background:var(--gold);border-color:var(--gold);color:var(--bg);}
.cl-hora-btn.busy{opacity:.25;cursor:not-allowed;text-decoration:line-through;color:var(--text4);}

/* Confirm */
.cl-confirm-box{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;margin-bottom:12px;}
.cl-confirm-box h4{font-size:13px;font-weight:700;margin-bottom:12px;color:var(--cream);}
.cl-confirm-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);}
.cl-confirm-row:last-child{border-bottom:none;}
.cl-confirm-row span{font-size:12px;color:var(--text3);}
.cl-confirm-row strong{font-size:12px;font-weight:600;color:var(--text2);}
.cl-confirm-note{font-size:12px;color:var(--text4);line-height:1.6;}
.cl-error{display:flex;align-items:center;gap:8px;padding:10px 13px;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.2);border-radius:var(--radius-sm);color:#EF4444;font-size:13px;margin-bottom:14px;}

/* Success */
.cl-success{display:flex;flex-direction:column;align-items:center;text-align:center;padding:24px 0;gap:12px;}
.cl-success-icon{color:var(--gold);}
.cl-success h3{font-size:20px;font-weight:800;color:var(--cream);}
.cl-success p{font-size:14px;color:var(--text3);max-width:380px;line-height:1.7;}
.cl-success-note{font-size:12px;color:var(--text4);}

/* Modal footer */
.cl-modal-footer{display:flex;align-items:center;padding:14px 22px;border-top:1px solid var(--border);gap:10px;}
.cl-modal-footer .cl-btn-primary{margin-left:auto;}

/* Empty */
.cl-empty-sm{padding:20px;text-align:center;font-size:13px;color:var(--text4);}

.spin{animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}

/* Grain overlay */
.cl-root::before {
  content: "";
  position: fixed; inset: 0; pointer-events: none; z-index: 9999;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/></svg>");
  mix-blend-mode: multiply;
  opacity: .06;
}

/* Responsive */
@media(max-width:900px){
  .cl-nav-links,.cl-nav-actions{display:none;}
  .cl-hamburger{display:flex;}
  .cl-hero-title{font-size:36px;}
  .cl-services-grid{grid-template-columns:1fr 1fr;}
  .cl-sobre-grid{grid-template-columns:1fr;}
  .cl-cuidado-grid{grid-template-columns:1fr;}
  .cl-team-grid{grid-template-columns:repeat(2,1fr);}
  .cl-contact-grid{grid-template-columns:1fr;}
  .cl-stats-bar{grid-template-columns:repeat(2,1fr);}
  .cl-field-row{grid-template-columns:1fr;}
  .cl-horarios{grid-template-columns:repeat(3,1fr);}
  .cl-cta-inner{flex-direction:column;text-align:center;}
  .cl-testimonials-grid{grid-template-columns:1fr;}
  .cl-carousel{height:350px;}
}
@media(max-width:600px){
  .cl-services-grid{grid-template-columns:1fr;}
  .cl-team-grid{grid-template-columns:1fr 1fr;}
  .cl-hero-title{font-size:28px;}
  .cl-stats-bar{grid-template-columns:1fr 1fr;}
  .cl-carousel{height:250px;}
}
`;