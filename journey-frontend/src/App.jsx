import { useState, useEffect } from "react";
import AdminPainel from "./AdminPainel";

const API = "http://localhost:8000";

function getSessionId() {
  let id = localStorage.getItem("journeySession");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("journeySession", id);
  }
  return id;
}

const SESSION_ID = getSessionId();

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// ─── ICONS ───────────────────────────────────────────────────────────────────

const ICONS = {
  compass: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  route: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>
    </svg>
  ),
  plane: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4c-1 0-1.5.2-3.5 2L12 7.9l-8.2-1.8c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L6 10l-2 3H2l-1 1 3 2 2 3 1-1v-2l3-2 .8 3.7c.3.4.8.6 1.3.4l.5-.2c.4-.2.6-.6.5-1.1z"/>
    </svg>
  ),
  code: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  palette: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  microscope: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>
    </svg>
  ),
  "graduation-cap": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  wrench: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  "trending-up": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  arrow_left: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  arrow_right: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
};

// ─── STYLES ──────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #eef2ff 0%, #f0f4ff 50%, #e8eeff 100%)",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    padding: "0",
  },
  center: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", minHeight: "100vh", padding: "2rem 1rem",
  },
  heading: {
    fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
    fontWeight: "700", color: "#0f172a", margin: "0 0 0.5rem", letterSpacing: "-0.03em",
  },
  sub: { fontSize: "1rem", color: "#64748b", margin: "0 0 2.5rem" },
  grid2: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1rem", width: "100%", maxWidth: "860px",
  },
  moduleCard: {
    background: "#fff", borderRadius: "16px", padding: "1.5rem",
    border: "1px solid #e2e8f0", cursor: "pointer",
    transition: "all 0.2s ease", position: "relative", overflow: "hidden",
  },
  moduleCardLocked: {
    background: "#fff", borderRadius: "16px", padding: "1.5rem",
    border: "1px solid #e2e8f0", opacity: 0.6, cursor: "not-allowed",
    position: "relative", overflow: "hidden",
  },
  moduleCardDone: {
    background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
    borderRadius: "16px", padding: "1.5rem",
    border: "1px solid #bbf7d0", cursor: "default",
    position: "relative", overflow: "hidden",
  },
  iconBox: {
    width: "44px", height: "44px", borderRadius: "12px",
    background: "#eff6ff", color: "#3b82f6",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: "1rem",
  },
  iconBoxDone: {
    width: "44px", height: "44px", borderRadius: "12px",
    background: "#dcfce7", color: "#16a34a",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: "1rem",
  },
  cardTitle: { fontSize: "1.05rem", fontWeight: "600", color: "#0f172a", margin: "0 0 4px" },
  cardDesc: { fontSize: "0.875rem", color: "#64748b", margin: "0 0 1rem" },
  badge: (done, started) => ({
    display: "inline-block", fontSize: "0.75rem", fontWeight: "500",
    padding: "3px 10px", borderRadius: "99px",
    background: done ? "#dcfce7" : started ? "#fef3c7" : "#f1f5f9",
    color: done ? "#15803d" : started ? "#92400e" : "#64748b",
  }),
  questionCard: {
    background: "#fff", borderRadius: "20px", padding: "2rem",
    border: "1px solid #e2e8f0", width: "100%", maxWidth: "560px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
  },
  progressBar: {
    height: "4px", background: "#e2e8f0", borderRadius: "99px",
    marginBottom: "1.5rem", overflow: "hidden",
  },
  progressFill: (pct) => ({
    height: "100%", width: `${pct}%`,
    background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
    borderRadius: "99px", transition: "width 0.4s ease",
  }),
  qLabel: { fontSize: "0.75rem", color: "#94a3b8", fontWeight: "500", marginBottom: "0.25rem" },
  qText: { fontSize: "1.1rem", fontWeight: "600", color: "#0f172a", margin: "0 0 1.5rem", lineHeight: 1.4 },
  optionBtn: (selected) => ({
    display: "block", width: "100%", textAlign: "left",
    padding: "0.875rem 1.1rem", marginBottom: "0.625rem",
    borderRadius: "12px", border: selected ? "2px solid #6366f1" : "1.5px solid #e2e8f0",
    background: selected ? "#eef2ff" : "#fff",
    color: selected ? "#4338ca" : "#1e293b",
    fontSize: "0.95rem", cursor: "pointer", fontWeight: selected ? "500" : "400",
    transition: "all 0.15s ease",
  }),
  btnPrimary: (disabled) => ({
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    width: "100%", padding: "0.875rem",
    background: disabled ? "#cbd5e1" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff", border: "none", borderRadius: "12px",
    fontSize: "0.95rem", fontWeight: "600", cursor: disabled ? "not-allowed" : "pointer",
    marginTop: "0.5rem", transition: "opacity 0.2s",
  }),
  backBtn: {
    display: "flex", alignItems: "center", gap: "6px",
    background: "none", border: "none", color: "#64748b",
    fontSize: "0.9rem", cursor: "pointer", padding: "0", marginBottom: "1.5rem",
    fontFamily: "inherit",
  },
  careerGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "1rem", width: "100%", maxWidth: "960px",
  },
  careerCard: {
    background: "#fff", borderRadius: "16px", padding: "1.5rem",
    border: "1px solid #e2e8f0", transition: "transform 0.2s, box-shadow 0.2s",
  },
  matchBar: (score) => ({
    height: "3px", background: "#e2e8f0", borderRadius: "99px",
    margin: "1rem 0 0.75rem", overflow: "hidden",
    position: "relative",
  }),
  matchFill: (score) => ({
    height: "100%", width: `${Math.round(score * 100)}%`,
    background: score > 0.6 ? "#22c55e" : score > 0.3 ? "#f59e0b" : "#94a3b8",
    borderRadius: "99px", transition: "width 0.6s ease",
  }),
  knowMoreBtn: {
    display: "block", width: "100%", padding: "0.6rem",
    background: "none", border: "1.5px solid #e2e8f0", borderRadius: "10px",
    color: "#475569", fontSize: "0.85rem", cursor: "pointer", fontWeight: "500",
    transition: "all 0.15s", marginTop: "0.75rem", fontFamily: "inherit",
  },
  linksRow: {
    display: "flex", gap: "1.5rem", marginTop: "2rem",
    justifyContent: "center",
  },
  link: {
    color: "#6366f1", fontSize: "0.9rem", cursor: "pointer",
    textDecoration: "none", fontWeight: "500",
  },
};

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function IconBox({ name, done, color }) {
  return (
    <div style={done ? S.iconBoxDone : { ...S.iconBox, color: color || "#3b82f6" }}>
      <span style={{ width: 22, height: 22, display: "block" }}>
        {done ? ICONS.check : (ICONS[name] || ICONS.compass)}
      </span>
    </div>
  );
}

// ─── SCREEN: JORNADA ─────────────────────────────────────────────────────────

function JornadaScreen({ onStart, progress }) {
  const SLUGS = ["mapa-interior", "horizonte-ampliado", "rota-definida", "plano-de-voo"];
  const ICONS_MAP = { "mapa-interior": "compass", "horizonte-ampliado": "eye", "rota-definida": "route", "plano-de-voo": "plane" };
  const COLORS = { "mapa-interior": "#3b82f6", "horizonte-ampliado": "#8b5cf6", "rota-definida": "#06b6d4", "plano-de-voo": "#f59e0b" };

  const isDone = (slug) => progress.find(p => p.slug === slug)?.completed;
  const isUnlocked = (slug) => {
    const idx = SLUGS.indexOf(slug);
    if (idx === 0) return true;
    return isDone(SLUGS[idx - 1]);
  };

  return (
    <div style={S.center}>
      <h1 style={S.heading}>Sua jornada</h1>
      <p style={S.sub}>Acompanhe as etapas do seu desenvolvimento</p>
      <div style={S.grid2}>
        {progress.map(mod => {
          const done = mod.completed;
          const unlocked = isUnlocked(mod.slug);
          const style = done ? S.moduleCardDone : unlocked ? S.moduleCard : S.moduleCardLocked;
          return (
            <div
              key={mod.module_id}
              style={style}
              onClick={() => unlocked && !done && onStart(mod)}
              onMouseEnter={e => { if (unlocked && !done) e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
            >
              <IconBox name={ICONS_MAP[mod.slug]} done={done} color={COLORS[mod.slug]} />
              <p style={S.cardTitle}>{mod.module_title}</p>
              <p style={S.cardDesc}>
                {mod.slug === "mapa-interior" && "Descubra mais sobre você"}
                {mod.slug === "horizonte-ampliado" && "Explore possibilidades de carreira"}
                {mod.slug === "rota-definida" && "Identifique caminhos ideais"}
                {mod.slug === "plano-de-voo" && "Planeje seus próximos passos"}
              </p>
              <span style={S.badge(done, false)}>
                {done ? "Concluído" : unlocked ? "Não iniciado" : "Bloqueado"}
              </span>
            </div>
          );
        })}
      </div>
      <div style={S.linksRow}>
  
  <span style={S.link}>Ver Dashboard</span>

  <span style={S.link}>Ver Progresso</span>

  {window.location.hash === "#admin" && (
  <button
    style={{
      background: "#6366f1",
      color: "white",
      border: "none",
      padding: "8px 16px",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: "600"
    }}
    onClick={() => {
      const senha = prompt("Senha admin");

      if (senha === "admin123") {
        onStart({ slug: "admin" });
      } else {
        alert("Acesso negado");
      }
    }}
  >
    Admin
  </button>
)}

</div>
    </div>
  );
}

// ─── SCREEN: MAPA INTERIOR ───────────────────────────────────────────────────

function MapaInteriorScreen({ onBack, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("GET", "/modules/1/questions")
      .then(setQuestions)
      .catch(() => alert("Erro ao carregar perguntas. Verifique se o servidor está rodando."))
      .finally(() => setLoading(false));
  }, []);

  const q = questions[current];
  const total = questions.length;
  const pct = total ? Math.round(((current + 1) / total) * 100) : 0;
  const isLast = current === total - 1;

  async function handleNext() {
    if (!selected[q.id]) return;
    setSaving(true);
    try {
      await api("POST", `/sessions/${SESSION_ID}/answers`, {
        question_id: q.id,
        option_id: selected[q.id],
      });
      if (isLast) {
        await api("POST", `/sessions/${SESSION_ID}/complete-module/1`);
        onComplete();
      } else {
        setCurrent(c => c + 1);
      }
    } catch {
      alert("Erro ao salvar resposta.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={S.center}>
      <p style={{ color: "#94a3b8" }}>Carregando...</p>
    </div>
  );

  return (
    <div style={S.center}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <button style={S.backBtn} onClick={onBack}>
          <span style={{ width: 18, height: 18 }}>{ICONS.arrow_left}</span> Mapa Interior
        </button>
        <div style={S.questionCard}>
          <div style={S.progressBar}>
            <div style={S.progressFill(pct)} />
          </div>
          <p style={S.qLabel}>Pergunta {current + 1} de {total} <span style={{ float: "right" }}>{pct}%</span></p>
          <p style={S.qText}>{q?.text}</p>
          {q?.options.map(opt => (
            <button
              key={opt.id}
              style={S.optionBtn(selected[q.id] === opt.id)}
              onClick={() => setSelected(s => ({ ...s, [q.id]: opt.id }))}
            >
              {opt.text}
            </button>
          ))}
          <button
            style={S.btnPrimary(!selected[q?.id] || saving)}
            disabled={!selected[q?.id] || saving}
            onClick={handleNext}
          >
            {saving ? "Salvando..." : isLast ? "Concluir" : "Próximo"}
            {!saving && <span style={{ width: 18, height: 18 }}>{ICONS.arrow_right}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN: HORIZONTE AMPLIADO ──────────────────────────────────────────────

function HorizonteScreen({ onBack }) {
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("GET", `/sessions/${SESSION_ID}/careers`)
      .then(setCareers)
      .catch(() => api("GET", "/careers").then(setCareers))
      .finally(() => setLoading(false));
  }, []);

  const ICON_NAMES = {
    "Desenvolvedor de Software": "code",
    "Psicólogo": "heart",
    "Designer Gráfico": "palette",
    "Gestor de Negócios": "briefcase",
    "Pesquisador Científico": "microscope",
    "Professor": "graduation-cap",
    "Engenheiro": "wrench",
    "Analista de Marketing": "trending-up",
  };

  return (
    <div style={{ ...S.center, justifyContent: "flex-start", paddingTop: "3rem" }}>
      <div style={{ width: "100%", maxWidth: "960px" }}>
        <button style={S.backBtn} onClick={onBack}>
          <span style={{ width: 18, height: 18 }}>{ICONS.arrow_left}</span> Voltar
        </button>
        <h1 style={{ ...S.heading, marginBottom: "0.4rem" }}>Horizonte Ampliado</h1>
        <p style={{ ...S.sub, marginBottom: "2rem" }}>Explore diferentes possibilidades de carreira que combinam com seu perfil</p>

        {loading ? (
          <p style={{ color: "#94a3b8", textAlign: "center" }}>Carregando carreiras...</p>
        ) : (
          <div style={S.careerGrid}>
            {careers.map(c => {
              const score = c.match_score || 0;
              const iconName = ICON_NAMES[c.title] || "briefcase";
              return (
                <div
                  key={c.id}
                  style={S.careerCard}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  <div style={{ ...S.iconBox, background: `${c.icon_color}18`, color: c.icon_color, marginBottom: "0.75rem" }}>
                    <span style={{ width: 22, height: 22, display: "block" }}>{ICONS[iconName]}</span>
                  </div>
                  <p style={S.cardTitle}>{c.title}</p>
                  <p style={{ ...S.cardDesc, margin: "4px 0 0" }}>{c.description}</p>
                  {score > 0 && (
                    <>
                      <div style={S.matchBar(score)}>
                        <div style={S.matchFill(score)} />
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
                        {Math.round(score * 100)}% de compatibilidade
                      </p>
                    </>
                  )}
                  <button style={S.knowMoreBtn}>Saber mais</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("jornada");
  const [progress, setProgress] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(true);

  function loadProgress() {
    api("GET", `/sessions/${SESSION_ID}/progress`)
      .then(setProgress)
      .catch(() => setProgress([
        { module_id: 1, module_title: "Mapa Interior", slug: "mapa-interior", completed: false },
        { module_id: 2, module_title: "Horizonte Ampliado", slug: "horizonte-ampliado", completed: false },
        { module_id: 3, module_title: "Rota Definida", slug: "rota-definida", completed: false },
        { module_id: 4, module_title: "Plano de Voo", slug: "plano-de-voo", completed: false },
      ]))
      .finally(() => setLoadingProgress(false));
  }

  useEffect(() => { loadProgress(); }, []);

  function handleStart(mod) {
    if (mod.slug === "mapa-interior") setScreen("mapa");
    if (mod.slug === "horizonte-ampliado") setScreen("horizonte");
    if (mod.slug === "admin") setScreen("admin");
  }

  if (loadingProgress) return (
    <div style={{ ...S.page, ...S.center }}>
      <p style={{ color: "#94a3b8" }}>Carregando sua jornada...</p>
    </div>
  );

 return (
  <div style={S.page}>
    
    {screen === "jornada" && (
      <JornadaScreen onStart={handleStart} progress={progress} />
    )}

    {screen === "mapa" && (
      <MapaInteriorScreen
        onBack={() => setScreen("jornada")}
        onComplete={() => {
          loadProgress();
          setScreen("jornada");
        }}
      />
    )}

    {screen === "horizonte" && (
      <HorizonteScreen onBack={() => setScreen("jornada")} />
    )}

    {screen === "admin" && (
      <AdminPainel />
    )}

  </div>
);
}
