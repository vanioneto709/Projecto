"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar, Clock, Users, LogOut, User, CheckCircle,
  AlertCircle, ChevronRight, Stethoscope, RefreshCw,
  X, FileText, Home, Save, Mail, History, Bell,
  TrendingUp, Edit3
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ConsultaM {
  id: number;
  paciente: string;
  pacienteId: number;
  data: string;
  hora: string;
  status: "agendada"|"confirmada"|"cancelada"|"concluida";
  motivo: string;
}

interface Paciente {
  id: number;
  nome: string;
  email: string;
  ultimaConsulta: string|null;
  totalConsultas: number;
}

interface HorariosData {
  data: string;
  ocupados: string[];
  disponiveis: string[];
}

interface Me {
  id: number;
  username: string;
  email: string;
  tipo: string;
}

type Secao = "inicio"|"agenda"|"pacientes"|"perfil";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
function authH(t:string){ return {Authorization:`Bearer ${t}`}; }

export default function DashboardMedico() {
  const [token, setToken]         = useState<string|null>(null);
  const [me, setMe]               = useState<Me|null>(null);
  const [secao, setSecao]         = useState<Secao>("inicio");
  const [consultas, setConsultas] = useState<ConsultaM[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [horarios, setHorarios]   = useState<HorariosData|null>(null);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<{msg:string;type:"ok"|"err"}|null>(null);

  // Filtro de data para agenda
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split("T")[0]);

  // Anotação em consulta
  const [editando, setEditando]     = useState<number|null>(null);
  const [descricao, setDescricao]   = useState("");
  const [salvando, setSalvando]     = useState(false);

  const showToast = (msg:string,type:"ok"|"err"="ok") => {
    setToast({msg,type}); setTimeout(()=>setToast(null),3500);
  };

  useEffect(()=>{
    const t = localStorage.getItem("access");
    if(!t){ window.location.href="/login"; return; }
    setToken(t);
    fetch(`${API}/api/me/`,{headers:authH(t)}).then(r=>r.json()).then(setMe).catch(()=>{});
  },[]);

  useEffect(()=>{ if(token){ fetchConsultas(); fetchPacientes(); } },[token]);
  useEffect(()=>{ if(token){ fetchAgenda(); fetchHorarios(); } },[token,dataFiltro]);

  const fetchConsultas = async () => {
    if(!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/medico/agenda/`,{headers:authH(token)});
      if(r.ok) setConsultas(await r.json());
    } catch {} finally { setLoading(false); }
  };

  const fetchAgenda = async () => {
    if(!token) return;
    try {
      const r = await fetch(`${API}/api/medico/agenda/?data=${dataFiltro}`,{headers:authH(token)});
      if(r.ok) setConsultas(await r.json());
    } catch {}
  };

  const fetchPacientes = async () => {
    if(!token) return;
    try {
      const r = await fetch(`${API}/api/medico/pacientes/`,{headers:authH(token)});
      if(r.ok) setPacientes(await r.json());
    } catch {}
  };

  const fetchHorarios = async () => {
    if(!token) return;
    try {
      const r = await fetch(`${API}/api/medico/horarios/?data=${dataFiltro}`,{headers:authH(token)});
      if(r.ok) setHorarios(await r.json());
    } catch {}
  };

  const salvarDescricao = async (id:number) => {
    if(!token) return;
    setSalvando(true);
    try {
      const r = await fetch(`${API}/api/medico/consulta/${id}/descricao/`,{
        method:"PATCH",
        headers:{"Content-Type":"application/json",...authH(token)},
        body:JSON.stringify({descricao}),
      });
      if(r.ok){ showToast("Anotação salva!"); setEditando(null); }
      else showToast("Erro ao salvar","err");
    } catch { showToast("Erro ao salvar","err"); }
    finally { setSalvando(false); }
  };

const logout = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  // Apagar o cookie que o middleware lê
  document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
  window.location.replace("/login");
};
  const fmt = (d:string) => { try{ return new Date(d).toLocaleDateString("pt-BR"); }catch{ return d; } };

  const hoje = new Date().toISOString().split("T")[0];
  const consultasHoje = consultas.filter(c=>c.data===hoje);
  const consultasFuturas = consultas.filter(c=>c.data>=hoje&&c.status!=="cancelada");
  const consultasDoDia = consultas.filter(c=>c.data===dataFiltro);

  const statusColor: Record<string,string> = {
    agendada:"#D97706", confirmada:"#2563EB", concluida:"#16A34A", cancelada:"#DC2626",
  };
  const statusLabel: Record<string,string> = {
    agendada:"Agendada", confirmada:"Confirmada", concluida:"Concluída", cancelada:"Cancelada",
  };

  if(!token) return null;

  return (
    <>
      <style>{css}</style>
      <div className="dm-root">
        {toast && (
          <div className={`dm-toast ${toast.type}`}>
            {toast.type==="ok"?<CheckCircle size={15}/>:<AlertCircle size={15}/>}{toast.msg}
          </div>
        )}

        {/* ── Sidebar ── */}
        <aside className="dm-sidebar">
          <div className="dm-brand">
            <div className="dm-brand-icon"><Stethoscope size={18}/></div>
            <div>
              <p className="dm-brand-name">OdontoSystem</p>
              <p className="dm-brand-sub">Área do Médico</p>
            </div>
          </div>

          <nav className="dm-nav">
            {([
              ["inicio",    Home,      "Início"],
              ["agenda",    Calendar,  "Minha Agenda"],
              ["pacientes", Users,     "Pacientes"],
              ["perfil",    User,      "Perfil"],
            ] as [Secao,any,string][]).map(([id,Icon,label])=>(
              <button key={id} className={`dm-nav-btn ${secao===id?"active":""}`}
                onClick={()=>setSecao(id)}>
                <Icon size={17}/><span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="dm-sidebar-footer">
            <div className="dm-user-row">
              <div className="dm-avatar">{me?.username?.[0]?.toUpperCase()||"M"}</div>
              <div>
                <p className="dm-uname">Dr(a). {me?.username||"Médico"}</p>
                <p className="dm-urole">Odontologista</p>
              </div>
            </div>
            <button className="dm-logout" onClick={logout}><LogOut size={14}/> Sair</button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="dm-main">

          {/* ════ INÍCIO ════ */}
          {secao==="inicio" && (
            <div className="dm-section">
              <div className="dm-page-header">
                <div>
                  <h2>Bom dia, Dr(a). {me?.username} 🩺</h2>
                  <p className="dm-page-sub">{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"})}</p>
                </div>
                <button className="dm-icon-btn" onClick={()=>{ fetchConsultas(); fetchPacientes(); }}>
                  <RefreshCw size={15} className={loading?"spinning":""}/>
                </button>
              </div>

              <div className="dm-kpi-row">
                <div className="dm-kpi">
                  <div className="dm-kpi-icon teal"><Calendar size={20}/></div>
                  <div><p className="dm-kpi-val">{consultasHoje.length}</p><p className="dm-kpi-lbl">Consultas hoje</p></div>
                </div>
                <div className="dm-kpi">
                  <div className="dm-kpi-icon blue"><TrendingUp size={20}/></div>
                  <div><p className="dm-kpi-val">{consultasFuturas.length}</p><p className="dm-kpi-lbl">Pendentes</p></div>
                </div>
                <div className="dm-kpi">
                  <div className="dm-kpi-icon green"><Users size={20}/></div>
                  <div><p className="dm-kpi-val">{pacientes.length}</p><p className="dm-kpi-lbl">Pacientes</p></div>
                </div>
                <div className="dm-kpi">
                  <div className="dm-kpi-icon purple"><CheckCircle size={20}/></div>
                  <div><p className="dm-kpi-val">{consultas.filter(c=>c.status==="concluida").length}</p><p className="dm-kpi-lbl">Realizadas</p></div>
                </div>
              </div>

              {/* Agenda de hoje */}
              <div className="dm-card">
                <div className="dm-card-header">
                  <span><Calendar size={15}/> Agenda de Hoje</span>
                  <button className="dm-link-btn" onClick={()=>setSecao("agenda")}>Ver tudo <ChevronRight size={12}/></button>
                </div>
                {consultasHoje.length===0 ? (
                  <div className="dm-empty">
                    <Calendar size={32}/><p>Nenhuma consulta hoje</p>
                  </div>
                ) : consultasHoje.sort((a,b)=>a.hora.localeCompare(b.hora)).map(c=>(
                  <div key={c.id} className="dm-consulta-row">
                    <div className="dm-hora-badge">{c.hora}</div>
                    <div className="dm-c-info">
                      <strong>{c.paciente}</strong>
                      <span>{c.motivo||"Sem motivo especificado"}</span>
                    </div>
                    <span className="dm-status-pill" style={{background:statusColor[c.status]+"22",color:statusColor[c.status]}}>
                      {statusLabel[c.status]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Horários livres hoje */}
              {horarios && (
                <div className="dm-card">
                  <div className="dm-card-header">
                    <span><Clock size={15}/> Horários Livres — Hoje</span>
                  </div>
                  <div className="dm-horarios-display">
                    {horarios.disponiveis.length===0 ? (
                      <p className="dm-empty-sm">Agenda completa!</p>
                    ) : horarios.disponiveis.map(h=>(
                      <span key={h} className="dm-hora-chip free">{h}</span>
                    ))}
                    {horarios.ocupados.map(h=>(
                      <span key={h} className="dm-hora-chip busy">{h}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ AGENDA ════ */}
          {secao==="agenda" && (
            <div className="dm-section">
              <div className="dm-page-header">
                <h2>Minha Agenda</h2>
                <div className="dm-date-picker">
                  <Calendar size={15}/>
                  <input type="date" value={dataFiltro} onChange={e=>setDataFiltro(e.target.value)}/>
                </div>
              </div>

              <div className="dm-agenda-split">
                {/* Lista de consultas do dia */}
                <div>
                  <p className="dm-subsec-title">{fmt(dataFiltro)} — {consultasDoDia.length} consultas</p>
                  {consultasDoDia.length===0 ? (
                    <div className="dm-empty-sm">Sem consultas neste dia</div>
                  ) : consultasDoDia.sort((a,b)=>a.hora.localeCompare(b.hora)).map(c=>(
                    <div key={c.id} className="dm-agenda-card">
                      <div className="dm-ac-time">
                        <span className="dm-ac-hour">{c.hora.split(":")[0]}</span>
                        <span className="dm-ac-min">{c.hora.split(":")[1]}</span>
                      </div>
                      <div className="dm-ac-body">
                        <div className="dm-ac-top">
                          <strong>{c.paciente}</strong>
                          <span className="dm-status-pill" style={{background:statusColor[c.status]+"22",color:statusColor[c.status]}}>{statusLabel[c.status]}</span>
                        </div>
                        <p className="dm-ac-motivo">{c.motivo||"—"}</p>

                        {/* Anotação */}
                        {editando===c.id ? (
                          <div className="dm-anotacao-edit">
                            <textarea rows={3} value={descricao}
                              onChange={e=>setDescricao(e.target.value)}
                              placeholder="Anotações sobre a consulta..."/>
                            <div className="dm-anotacao-btns">
                              <button className="dm-btn-ghost sm" onClick={()=>setEditando(null)}>Cancelar</button>
                              <button className="dm-btn-primary sm" disabled={salvando} onClick={()=>salvarDescricao(c.id)}>
                                <Save size={13}/>{salvando?"Salvando...":"Salvar"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button className="dm-anotacao-btn" onClick={()=>{ setEditando(c.id); setDescricao(""); }}>
                            <Edit3 size={12}/> Adicionar anotação
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mapa de horários */}
                <div>
                  <p className="dm-subsec-title">Mapa do Dia</p>
                  {horarios && (
                    <div className="dm-card" style={{padding:16}}>
                      <div className="dm-horarios-display">
                        {horarios.disponiveis.map(h=>(
                          <span key={h} className="dm-hora-chip free">{h}</span>
                        ))}
                        {horarios.ocupados.map(h=>(
                          <span key={h} className="dm-hora-chip busy">{h}</span>
                        ))}
                      </div>
                      <div className="dm-legenda">
                        <span><span className="dm-leg-dot free"/>Disponível</span>
                        <span><span className="dm-leg-dot busy"/>Ocupado</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════ PACIENTES ════ */}
          {secao==="pacientes" && (
            <div className="dm-section">
              <div className="dm-page-header">
                <h2>Meus Pacientes</h2>
                <span className="dm-count-badge">{pacientes.length} pacientes</span>
              </div>

              {pacientes.length===0 ? (
                <div className="dm-empty"><Users size={36}/><p>Nenhum paciente ainda</p></div>
              ) : (
                <div className="dm-pacientes-grid">
                  {pacientes.map(p=>(
                    <div key={p.id} className="dm-paciente-card">
                      <div className="dm-pac-av">{p.nome[0]?.toUpperCase()||"?"}</div>
                      <div className="dm-pac-info">
                        <strong>{p.nome}</strong>
                        <span><Mail size={11}/> {p.email||"—"}</span>
                        <span><History size={11}/> Última: {p.ultimaConsulta?fmt(p.ultimaConsulta):"—"}</span>
                      </div>
                      <div className="dm-pac-count">
                        <span>{p.totalConsultas}</span>
                        <small>consultas</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════ PERFIL ════ */}
          {secao==="perfil" && (
            <div className="dm-section">
              <div className="dm-page-header"><h2>Meu Perfil</h2></div>
              <div className="dm-card" style={{maxWidth:480}}>
                <div className="dm-perfil-header">
                  <div className="dm-perfil-av">{me?.username?.[0]?.toUpperCase()||"M"}</div>
                  <div>
                    <p className="dm-perfil-name">Dr(a). {me?.username}</p>
                    <span className="dm-perfil-tag">Médico / Dentista</span>
                  </div>
                </div>
                <div className="dm-perfil-rows">
                  <div className="dm-perfil-row"><User size={14}/><span>{me?.username||"—"}</span></div>
                  <div className="dm-perfil-row"><Mail size={14}/><span>{me?.email||"—"}</span></div>
                  <div className="dm-perfil-row"><Stethoscope size={14}/><span>Odontologia Geral</span></div>
                </div>
                <div className="dm-perfil-stats">
                  <div className="dm-pstat"><span>{consultas.length}</span><small>Total consultas</small></div>
                  <div className="dm-pstat"><span>{pacientes.length}</span><small>Pacientes</small></div>
                  <div className="dm-pstat"><span>{consultasHoje.length}</span><small>Hoje</small></div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#F0F6FF;--surface:#fff;--surface-2:#F7F9FC;
  --border:#E4ECF5;--border2:#EEF3F9;
  --teal:#0D9488;--blue:#2563EB;--green:#16A34A;--red:#DC2626;--purple:#7C3AED;
  --text:#0F2137;--text2:#4B5563;--text3:#9CA3AF;
  --radius:10px;--radius-sm:6px;
  --shadow:0 1px 3px rgba(15,33,55,.06),0 4px 16px rgba(15,33,55,.05);
  font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);
}
button{cursor:pointer;font-family:inherit;border:none;background:none;}

/* Toast */
.dm-toast{position:fixed;top:20px;right:20px;z-index:9999;display:flex;align-items:center;gap:9px;padding:11px 16px;border-radius:var(--radius);font-size:13px;font-weight:500;box-shadow:0 6px 24px rgba(0,0,0,.15);animation:fadeIn .2s ease;}
.dm-toast.ok{background:#DCFCE7;color:#15803D;border:1px solid #86EFAC;}
.dm-toast.err{background:#FEE2E2;color:#B91C1C;border:1px solid #FCA5A5;}
@keyframes fadeIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}

/* Layout */
.dm-root{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}

/* Sidebar */
.dm-sidebar{background:#0B1E32;display:flex;flex-direction:column;height:100vh;position:sticky;top:0;padding:20px 14px;}
.dm-brand{display:flex;align-items:center;gap:10px;margin-bottom:28px;padding:0 4px;}
.dm-brand-icon{width:34px;height:34px;border-radius:var(--radius-sm);background:var(--teal);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.dm-brand-name{font-size:14px;font-weight:700;color:#fff;}
.dm-brand-sub{font-size:10px;color:#38BDF8;font-weight:600;}
.dm-nav{flex:1;display:flex;flex-direction:column;gap:2px;}
.dm-nav-btn{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;color:rgba(255,255,255,.5);transition:all .13s;text-align:left;}
.dm-nav-btn:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.85);}
.dm-nav-btn.active{background:rgba(13,148,136,.2);color:#2DD4BF;}
.dm-sidebar-footer{padding-top:14px;border-top:1px solid rgba(255,255,255,.08);}
.dm-user-row{display:flex;align-items:center;gap:9px;margin-bottom:10px;}
.dm-avatar{width:30px;height:30px;border-radius:50%;background:var(--teal);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;}
.dm-uname{font-size:13px;font-weight:600;color:#fff;}
.dm-urole{font-size:10px;color:rgba(255,255,255,.4);}
.dm-logout{display:flex;align-items:center;gap:7px;width:100%;padding:8px 10px;border-radius:var(--radius-sm);font-size:12px;font-weight:600;color:rgba(255,255,255,.4);transition:all .13s;}
.dm-logout:hover{background:rgba(220,38,38,.12);color:#FCA5A5;}

/* Main */
.dm-main{padding:28px;display:flex;flex-direction:column;}
.dm-section{display:flex;flex-direction:column;gap:20px;}
.dm-page-header{display:flex;align-items:center;justify-content:space-between;}
.dm-page-header h2{font-size:22px;font-weight:700;}
.dm-page-sub{font-size:13px;color:var(--text3);margin-top:2px;text-transform:capitalize;}
.dm-icon-btn{padding:8px;border-radius:var(--radius-sm);border:1px solid var(--border);color:var(--text2);transition:all .13s;}
.dm-icon-btn:hover{background:var(--surface-2);}
.dm-count-badge{padding:5px 12px;border-radius:99px;background:#EFF6FF;color:var(--blue);font-size:12px;font-weight:700;}

/* KPI */
.dm-kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.dm-kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;display:flex;align-items:center;gap:13px;box-shadow:var(--shadow);}
.dm-kpi-icon{width:40px;height:40px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.dm-kpi-icon.teal{background:#F0FDFA;color:var(--teal);}
.dm-kpi-icon.blue{background:#EFF6FF;color:var(--blue);}
.dm-kpi-icon.green{background:#F0FDF4;color:var(--green);}
.dm-kpi-icon.purple{background:#F5F3FF;color:var(--purple);}
.dm-kpi-val{font-size:22px;font-weight:700;}
.dm-kpi-lbl{font-size:12px;color:var(--text3);}

/* Card */
.dm-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;}
.dm-card-header{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--border2);font-size:12px;font-weight:700;color:var(--text2);gap:6px;}
.dm-card-header>span{display:flex;align-items:center;gap:6px;}
.dm-link-btn{display:flex;align-items:center;gap:3px;font-size:11px;font-weight:600;color:var(--teal);}

/* Consulta row */
.dm-consulta-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border2);}
.dm-consulta-row:last-child{border-bottom:none;}
.dm-hora-badge{font-family:'DM Mono',monospace;font-size:12px;font-weight:600;padding:4px 8px;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;color:var(--text2);white-space:nowrap;flex-shrink:0;}
.dm-c-info{flex:1;}
.dm-c-info strong{font-size:13px;font-weight:700;display:block;margin-bottom:2px;}
.dm-c-info span{font-size:11px;color:var(--text3);}
.dm-status-pill{padding:3px 9px;border-radius:99px;font-size:10px;font-weight:700;white-space:nowrap;flex-shrink:0;}

/* Horários display */
.dm-horarios-display{display:flex;flex-wrap:wrap;gap:7px;padding:14px 16px;}
.dm-hora-chip{font-family:'DM Mono',monospace;font-size:11px;font-weight:600;padding:4px 9px;border-radius:6px;}
.dm-hora-chip.free{background:#F0FDFA;color:var(--teal);border:1px solid rgba(13,148,136,.2);}
.dm-hora-chip.busy{background:#FEF2F2;color:var(--red);border:1px solid rgba(220,38,38,.2);text-decoration:line-through;opacity:.7;}
.dm-legenda{display:flex;gap:16px;padding:0 16px 12px;font-size:11px;color:var(--text2);}
.dm-leg-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;}
.dm-leg-dot.free{background:var(--teal);}
.dm-leg-dot.busy{background:var(--red);}

/* Agenda */
.dm-date-picker{display:flex;align-items:center;gap:8px;padding:8px 13px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;color:var(--text2);}
.dm-date-picker input{border:none;outline:none;font-size:13px;font-family:inherit;color:var(--text);background:transparent;}
.dm-agenda-split{display:grid;grid-template-columns:1fr 280px;gap:16px;align-items:start;}
.dm-subsec-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);margin-bottom:10px;}

.dm-agenda-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:10px;display:flex;gap:14px;box-shadow:var(--shadow);}
.dm-ac-time{display:flex;flex-direction:column;align-items:center;background:var(--teal);color:#fff;border-radius:var(--radius-sm);padding:8px 10px;flex-shrink:0;min-width:46px;}
.dm-ac-hour{font-size:20px;font-weight:800;line-height:1;font-family:'DM Mono',monospace;}
.dm-ac-min{font-size:11px;font-weight:600;opacity:.8;font-family:'DM Mono',monospace;}
.dm-ac-body{flex:1;}
.dm-ac-top{display:flex;align-items:center;gap:10px;margin-bottom:4px;}
.dm-ac-top strong{font-size:14px;font-weight:700;}
.dm-ac-motivo{font-size:12px;color:var(--text3);margin-bottom:8px;}
.dm-anotacao-btn{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--blue);padding:4px 8px;border-radius:var(--radius-sm);border:1px dashed var(--border);transition:all .13s;}
.dm-anotacao-btn:hover{background:#EFF6FF;border-color:var(--blue);}
.dm-anotacao-edit{display:flex;flex-direction:column;gap:8px;}
.dm-anotacao-edit textarea{padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:12px;font-family:inherit;color:var(--text);resize:vertical;outline:none;transition:border-color .13s;}
.dm-anotacao-edit textarea:focus{border-color:var(--teal);}
.dm-anotacao-btns{display:flex;gap:8px;}

/* Pacientes */
.dm-pacientes-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
.dm-paciente-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;display:flex;align-items:center;gap:13px;box-shadow:var(--shadow);transition:border-color .13s;}
.dm-paciente-card:hover{border-color:var(--teal);}
.dm-pac-av{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#F0FDFA,#CCFBF1);color:var(--teal);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;flex-shrink:0;}
.dm-pac-info{flex:1;display:flex;flex-direction:column;gap:3px;}
.dm-pac-info strong{font-size:13px;font-weight:700;}
.dm-pac-info span{font-size:11px;color:var(--text3);display:flex;align-items:center;gap:4px;}
.dm-pac-count{display:flex;flex-direction:column;align-items:center;}
.dm-pac-count span{font-size:18px;font-weight:800;color:var(--teal);}
.dm-pac-count small{font-size:9px;color:var(--text3);text-transform:uppercase;}

/* Perfil */
.dm-perfil-header{display:flex;align-items:center;gap:14px;padding:20px;}
.dm-perfil-av{width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,var(--teal),#0369A1);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;}
.dm-perfil-name{font-size:17px;font-weight:700;margin-bottom:4px;}
.dm-perfil-tag{font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:#F0FDFA;color:var(--teal);}
.dm-perfil-rows{padding:0 20px 16px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid var(--border);}
.dm-perfil-row{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text2);}
.dm-perfil-row svg{color:var(--text3);}
.dm-perfil-stats{display:grid;grid-template-columns:repeat(3,1fr);padding:16px 20px;}
.dm-pstat{display:flex;flex-direction:column;align-items:center;gap:3px;}
.dm-pstat span{font-size:20px;font-weight:700;}
.dm-pstat small{font-size:10px;color:var(--text3);text-transform:uppercase;}

/* Buttons */
.dm-btn-primary{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:var(--teal);color:#fff;border-radius:var(--radius-sm);font-size:12px;font-weight:700;transition:all .13s;}
.dm-btn-primary.sm{padding:6px 12px;font-size:11px;}
.dm-btn-primary:disabled{opacity:.5;cursor:not-allowed;}
.dm-btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:12px;font-weight:600;color:var(--text2);transition:all .13s;}
.dm-btn-ghost.sm{padding:6px 10px;font-size:11px;}
.dm-btn-ghost:hover{background:var(--surface-2);}

/* Empty */
.dm-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:36px;color:var(--text3);}
.dm-empty-sm{padding:20px;text-align:center;font-size:13px;color:var(--text3);}

.spinning{animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}

@media(max-width:1024px){.dm-agenda-split{grid-template-columns:1fr;}.dm-kpi-row{grid-template-columns:repeat(2,1fr);}}
@media(max-width:768px){.dm-root{grid-template-columns:1fr;}.dm-sidebar{display:none;}.dm-pacientes-grid{grid-template-columns:1fr;}}
`;
