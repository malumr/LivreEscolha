import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Substitua pelo seu Google Client ID ─────────────────────────────────────
const GOOGLE_CLIENT_ID = "SEU_CLIENT_ID_AQUI.apps.googleusercontent.com";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function api(method, path, body, sessionId) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `${res.status}`);
  }
  return res.json();
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20 }) => {
  const icons = {
    compass: <><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    route: <><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></>,
    plane: <><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4c-1 0-1.5.2-3.5 2L12 7.9l-8.2-1.8c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L6 10l-2 3H2l-1 1 3 2 2 3 1-1v-2l3-2 .8 3.7c.3.4.8.6 1.3.4l.5-.2c.4-.2.6-.6.5-1.1z"/></>,
    code: <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
    heart: <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></>,
    palette: <><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></>,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
    microscope: <><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></>,
    "graduation-cap": <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>,
    wrench: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></>,
    "trending-up": <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    "arrow-left": <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    "arrow-right": <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    star: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    "trending-up2": <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    "check-square": <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    sparkles: <><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></>,
    "x": <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    "book-open": <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
    "dollar-sign": <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    "arrow-up": <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    "alert-triangle": <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    "map-pin": <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
    book: <><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    leaf: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></>,
    calculator: <><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="8" y1="18" x2="8" y2="18"/><line x1="12" y1="18" x2="12" y2="18"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    "chevron-down": <><polyline points="6 9 12 15 18 9"/></>,
    filter: <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || null}
    </svg>
  );
};

const CAREER_ICONS = {
  "Desenvolvedor de Software": "code",
  "Psicólogo": "heart",
  "Designer Gráfico": "palette",
  "Gestor de Negócios": "briefcase",
  "Pesquisador Científico": "microscope",
  "Professor": "graduation-cap",
  "Engenheiro": "wrench",
  "Analista de Marketing": "trending-up",
};

// ─── MODAL DE CONFIRMAÇÃO ────────────────────────────────────────────────────
function ConfirmModal({ title, body, warning, confirmLabel = "Confirmar e avançar", onConfirm, onCancel }) {
  // Fecha ao clicar fora
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, padding: "2rem 1.75rem",
          maxWidth: 420, width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          animation: "fadeUp 0.18s ease",
        }}
      >
        {/* Ícone de aviso */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "#fef9c3", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="alert-triangle" size={26} style={{ color: "#ca8a04" }} />
          </div>
        </div>

        <h2 style={{ textAlign: "center", fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.625rem" }}>
          {title}
        </h2>
        <p style={{ textAlign: "center", color: "#475569", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 1rem" }}>
          {body}
        </p>

        {/* Aviso de não volta */}
        <div style={{
          background: "#fff7ed", border: "1.5px solid #fed7aa",
          borderRadius: 12, padding: "0.75rem 1rem",
          marginBottom: "1.5rem",
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <div style={{ color: "#ea580c", flexShrink: 0, marginTop: 1 }}>
            <Icon name="alert-triangle" size={16} />
          </div>
          <p style={{ margin: 0, fontSize: "0.83rem", color: "#9a3412", lineHeight: 1.55 }}>
            {warning}
          </p>
        </div>

        {/* Botões */}
        <div style={{ display: "flex", gap: "0.625rem" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "0.8rem",
              border: "1.5px solid #e2e8f0", borderRadius: 12,
              background: "#fff", color: "#475569",
              fontSize: "0.9rem", fontWeight: 500, cursor: "pointer",
              fontFamily: font, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 2, padding: "0.8rem",
              border: "none", borderRadius: 12,
              background: "#0f172a", color: "#fff",
              fontSize: "0.9rem", fontWeight: 600, cursor: "pointer",
              fontFamily: font, transition: "opacity 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  );
}

// ─── BASE STYLES ─────────────────────────────────────────────────────────────
const bg = "linear-gradient(160deg, #eef2ff 0%, #f0f4ff 50%, #e8eeff 100%)";
const font = "'DM Sans', system-ui, sans-serif";
const cardStyle = {
  background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
};

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0" }}>
      <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
      <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500 }}>ou</span>
      <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
    </div>
  );
}

function GoogleSignInButton({ onCredential }) {
  const containerRef = useRef(null);
  const cb = useCallback((res) => onCredential(res.credential), [onCredential]);

  useEffect(() => {
    function init() {
      if (!window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: cb });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline", size: "large", width: 370,
        text: "continue_with", locale: "pt-BR", shape: "rectangular",
      });
    }

    if (window.google) {
      init();
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi"]');
      if (script) { script.addEventListener("load", init); return () => script.removeEventListener("load", init); }
    }
  }, [cb]);

  return <div ref={containerRef} style={{ display: "flex", justifyContent: "center", minHeight: 44 }} />;
}

function Btn({ children, onClick, variant = "primary", disabled, style = {} }) {
  const styles = {
    primary: { background: disabled ? "#cbd5e1" : "#0f172a", color: "#fff", border: "none" },
    outline: { background: "#fff", color: "#0f172a", border: "1.5px solid #e2e8f0" },
    ghost: { background: "none", color: "#64748b", border: "none" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "0.8rem 1.5rem", borderRadius: "12px", fontSize: "0.95rem",
        fontWeight: "600", cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: font, transition: "opacity 0.2s, transform 0.1s",
        ...styles[variant], ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.85"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
    >
      {children}
    </button>
  );
}

function BackBtn({ onClick, label }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      background: "none", border: "none", color: "#64748b",
      fontSize: "0.9rem", cursor: "pointer", padding: 0,
      fontFamily: font, marginBottom: "1.5rem",
    }}>
      <Icon name="arrow-left" size={18} /> {label}
    </button>
  );
}

function ModuleNav({ onBack, onHome }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
      <button onClick={onBack} style={{
        display: "flex", alignItems: "center",
        background: "none", border: "none", color: "#64748b",
        cursor: "pointer", padding: "4px 8px 4px 0",
      }}>
        <Icon name="arrow-left" size={22} />
      </button>
      <button onClick={onHome} style={{
        display: "flex", alignItems: "center", gap: 5,
        background: "none", border: "1.5px solid #e2e8f0", borderRadius: 10,
        color: "#64748b", cursor: "pointer", padding: "5px 14px",
        fontFamily: font, fontSize: "0.82rem", fontWeight: 500, transition: "all 0.15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
      >
        <Icon name="arrow-left" size={14} /> Jornada
      </button>
    </div>
  );
}

function Page({ children, center }) {
  return (
    <div style={{
      minHeight: "100vh", background: bg, fontFamily: font,
      display: "flex", flexDirection: "column",
      alignItems: center ? "center" : undefined,
      justifyContent: center ? "center" : undefined,
      padding: "2rem 1rem",
    }}>
      {children}
    </div>
  );
}

// ─── CAMPO DE INPUT REUTILIZÁVEL ─────────────────────────────────────────────
function InputField({ label, type = "text", value, onChange, placeholder, onKeyDown }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ fontSize: "0.85rem", fontWeight: "500", color: "#374151", display: "block", marginBottom: 6 }}>{label}</label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
        style={{
          width: "100%", height: 44, borderRadius: 10, border: "1.5px solid #e2e8f0",
          background: "#f8fafc", padding: "0 14px", fontSize: "0.95rem",
          fontFamily: font, outline: "none", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

// ─── SCREEN: LOGIN ───────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onRegister, onForgotPassword, successMsg }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !senha) { setErro("Preencha email e senha."); return; }
    setLoading(true); setErro("");
    try {
      const data = await api("POST", "/auth/login", { email, password: senha });
      onLogin({ email: data.email, name: data.name, sessionId: data.session_id });
    } catch (e) {
      setErro(e.message || "Erro ao entrar. Verifique seus dados.");
    } finally { setLoading(false); }
  }

  async function handleGoogleCredential(credential) {
    setLoading(true); setErro("");
    try {
      const data = await api("POST", "/auth/google", { token: credential });
      onLogin({ email: data.email, name: data.name, sessionId: data.session_id });
    } catch (e) {
      setErro(e.message || "Erro ao entrar com Google.");
    } finally { setLoading(false); }
  }

  return (
    <Page center>
      <div style={{ ...cardStyle, width: "100%", maxWidth: "420px", padding: "2.5rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: "700", color: "#0f172a", margin: "0 0 6px", textAlign: "center" }}>
          Programa Próximo Destino
        </h1>
        <p style={{ color: "#64748b", textAlign: "center", margin: "0 0 2rem", fontSize: "0.9rem" }}>
          Encontre o caminho ideal para sua carreira
        </p>

        {successMsg && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem" }}>
            <p style={{ color: "#15803d", fontSize: "0.85rem", margin: 0, fontWeight: 500 }}>{successMsg}</p>
          </div>
        )}

        <GoogleSignInButton onCredential={handleGoogleCredential} />
        <Divider />

        <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
        <InputField label="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />

        <div style={{ textAlign: "right", margin: "-0.5rem 0 1rem" }}>
          <span onClick={onForgotPassword} style={{ fontSize: "0.8rem", color: "#6366f1", cursor: "pointer", fontWeight: 500 }}>
            Esqueci minha senha
          </span>
        </div>

        {erro && <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: "0 0 0.75rem" }}>{erro}</p>}
        <Btn onClick={handleLogin} disabled={loading} style={{ width: "100%", marginBottom: "1rem" }}>
          {loading ? "Entrando..." : "Entrar"}
        </Btn>
        <p onClick={onRegister} style={{ textAlign: "center", fontSize: "0.875rem", color: "#6366f1", cursor: "pointer", margin: 0, fontWeight: 500 }}>
          Ainda não tenho conta
        </p>
      </div>
    </Page>
  );
}

// ─── SCREEN: ESQUECI MINHA SENHA ─────────────────────────────────────────────
function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit() {
    if (!email) { setErro("Informe seu email."); return; }
    setLoading(true); setErro("");
    try {
      await api("POST", "/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setErro("Erro ao processar. Tente novamente.");
    } finally { setLoading(false); }
  }

  return (
    <Page center>
      <div style={{ ...cardStyle, width: "100%", maxWidth: "420px", padding: "2.5rem" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", marginBottom: "1.25rem", padding: 0 }}>
          <Icon name="arrow-left" size={20} />
        </button>
        <h1 style={{ fontSize: "1.4rem", fontWeight: "700", color: "#0f172a", margin: "0 0 6px" }}>Recuperar senha</h1>
        <p style={{ color: "#64748b", margin: "0 0 1.75rem", fontSize: "0.875rem" }}>
          Informe seu email e enviaremos um link para redefinir a senha.
        </p>

        {sent ? (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "1.25rem", textAlign: "center" }}>
            <p style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>📬</p>
            <p style={{ color: "#15803d", fontWeight: 600, margin: "0 0 4px" }}>Email enviado!</p>
            <p style={{ color: "#166534", fontSize: "0.85rem", margin: 0 }}>
              Verifique sua caixa de entrada e clique no link para redefinir sua senha.
            </p>
          </div>
        ) : (
          <>
            <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            {erro && <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: "0 0 0.75rem" }}>{erro}</p>}
            <Btn onClick={handleSubmit} disabled={loading} style={{ width: "100%" }}>
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </Btn>
          </>
        )}
      </div>
    </Page>
  );
}

// ─── SCREEN: REDEFINIR SENHA ──────────────────────────────────────────────────
function ResetPasswordScreen({ token, onSuccess }) {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [done, setDone] = useState(false);

  async function handleReset() {
    if (!senha || !confirmar) { setErro("Preencha os dois campos."); return; }
    if (senha !== confirmar) { setErro("As senhas não coincidem."); return; }
    if (senha.length < 6) { setErro("A senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true); setErro("");
    try {
      await api("POST", "/auth/reset-password", { token, password: senha });
      setDone(true);
      // Limpa o token da URL sem recarregar a página
      window.history.replaceState({}, "", window.location.pathname);
    } catch (e) {
      setErro(e.message || "Link inválido ou expirado.");
    } finally { setLoading(false); }
  }

  return (
    <Page center>
      <div style={{ ...cardStyle, width: "100%", maxWidth: "420px", padding: "2.5rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: "700", color: "#0f172a", margin: "0 0 6px" }}>Nova senha</h1>
        <p style={{ color: "#64748b", margin: "0 0 1.75rem", fontSize: "0.875rem" }}>
          Escolha uma nova senha para sua conta.
        </p>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "1.25rem", marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>✅</p>
              <p style={{ color: "#15803d", fontWeight: 600, margin: "0 0 4px" }}>Senha redefinida!</p>
              <p style={{ color: "#166534", fontSize: "0.85rem", margin: 0 }}>Você já pode entrar com a nova senha.</p>
            </div>
            <Btn onClick={onSuccess} style={{ width: "100%" }}>Ir para o login</Btn>
          </div>
        ) : (
          <>
            <InputField label="Nova senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
            <InputField label="Confirmar nova senha" type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="Repita a nova senha" onKeyDown={e => e.key === "Enter" && handleReset()} />
            {erro && <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: "0 0 0.75rem" }}>{erro}</p>}
            <Btn onClick={handleReset} disabled={loading} style={{ width: "100%" }}>
              {loading ? "Salvando..." : <><Icon name="lock" size={18} /> Salvar nova senha</>}
            </Btn>
          </>
        )}
      </div>
    </Page>
  );
}

// ─── SCREEN: CADASTRO ────────────────────────────────────────────────────────
function RegisterScreen({ onBack, onSuccess, onLogin }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!nome.trim() || !email || !senha || !confirmar) { setErro("Preencha todos os campos."); return; }
    if (senha !== confirmar) { setErro("As senhas não coincidem."); return; }
    if (senha.length < 6) { setErro("A senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true); setErro("");
    try {
      await api("POST", "/auth/register", { name: nome.trim(), email, password: senha });
      onSuccess("Conta criada com sucesso! Faça login para continuar.");
    } catch (e) {
      setErro(e.message || "Erro ao criar conta. Tente novamente.");
    } finally { setLoading(false); }
  }

  async function handleGoogleCredential(credential) {
    setLoading(true); setErro("");
    try {
      const data = await api("POST", "/auth/google", { token: credential });
      onLogin({ email: data.email, name: data.name, sessionId: data.session_id });
    } catch (e) {
      setErro(e.message || "Erro ao entrar com Google.");
    } finally { setLoading(false); }
  }

  return (
    <Page center>
      <div style={{ ...cardStyle, width: "100%", maxWidth: "420px", padding: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", padding: 0 }}>
            <Icon name="arrow-left" size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Criar conta</h1>
            <p style={{ color: "#64748b", margin: 0, fontSize: "0.85rem" }}>Comece sua jornada profissional</p>
          </div>
        </div>

        <GoogleSignInButton onCredential={handleGoogleCredential} />
        <Divider />

        <InputField label="Nome completo" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
        <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
        <InputField label="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
        <InputField label="Confirmar senha" type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="Repita sua senha" onKeyDown={e => e.key === "Enter" && handleRegister()} />

        {erro && <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: "0 0 0.75rem" }}>{erro}</p>}
        <Btn onClick={handleRegister} disabled={loading} style={{ width: "100%", marginBottom: "1rem" }}>
          {loading ? "Criando conta..." : <><Icon name="user" size={18} /> Criar conta</>}
        </Btn>
        <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#64748b", margin: 0 }}>
          Já tenho conta?{" "}
          <span onClick={onBack} style={{ color: "#6366f1", cursor: "pointer", fontWeight: 500 }}>Entrar</span>
        </p>
      </div>
    </Page>
  );
}

// ─── SCREEN: BEM-VINDO ───────────────────────────────────────────────────────
function BemVindoScreen({ onStart }) {
  return (
    <Page center>
      <div style={{ maxWidth: 620, textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)", fontWeight: "700", color: "#0f172a", margin: "0 0 1.25rem", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
          Bem-vindo ao Próximo Destino
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#475569", lineHeight: 1.7, margin: "0 0 2.5rem" }}>
          Estamos aqui para ajudá-lo a descobrir seu potencial e encontrar o caminho ideal para sua carreira. Através de uma jornada guiada, você conhecerá melhor suas habilidades, explorará possibilidades e traçará um plano concreto para seu futuro profissional.
        </p>
        <Btn onClick={onStart} style={{ padding: "1rem 2.5rem", fontSize: "1rem", borderRadius: 14 }}>
          Começar jornada <Icon name="arrow-right" size={18} />
        </Btn>
      </div>
    </Page>
  );
}

// ─── SCREEN: SUA JORNADA ─────────────────────────────────────────────────────
function JornadaScreen({ onStart, progress, onDashboard, onProgress, adminRecommendation }) {
  const SLUGS = ["mapa-interior", "horizonte-ampliado", "rota-definida", "plano-de-voo"];
  const ICONS_MAP = { "mapa-interior": "compass", "horizonte-ampliado": "eye", "rota-definida": "route", "plano-de-voo": "plane" };
  const DESCS = { "mapa-interior": "Descubra mais sobre você", "horizonte-ampliado": "Explore possibilidades de carreira", "rota-definida": "Identifique caminhos ideais", "plano-de-voo": "Planeje seus próximos passos" };

  const isDone = (slug) => progress.find(p => p.slug === slug)?.completed;
  const isUnlocked = (slug) => {
    const idx = SLUGS.indexOf(slug);
    if (idx === 0) return true;
    return isDone(SLUGS[idx - 1]);
  };

  return (
    <Page center>
      <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", fontWeight: "700", color: "#0f172a", margin: "0 0 0.5rem", letterSpacing: "-0.03em" }}>
        Sua jornada
      </h1>
      <p style={{ color: "#64748b", margin: "0 0 2rem" }}>Acompanhe as etapas do seu desenvolvimento</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", width: "100%", maxWidth: 860 }}>
        {progress.map(mod => {
          const done = mod.completed;
          const unlocked = isUnlocked(mod.slug);
          const iconName = ICONS_MAP[mod.slug];
          return (
            <div
              key={mod.module_id}
              onClick={() => unlocked && !done && onStart(mod)}
              style={{
                ...cardStyle,
                padding: "1.5rem",
                opacity: !unlocked ? 0.5 : 1,
                cursor: done ? "default" : unlocked ? "pointer" : "not-allowed",
                background: done ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : "#fff",
                border: done ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (unlocked && !done) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.1)"; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: done ? "#dcfce7" : "#eff6ff", color: done ? "#16a34a" : "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                <Icon name={done ? "check" : iconName} size={22} />
              </div>
              <p style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a", margin: "0 0 4px" }}>{mod.module_title}</p>
              <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "0 0 1rem" }}>{DESCS[mod.slug]}</p>
              <span style={{
                display: "inline-block", fontSize: "0.75rem", fontWeight: "500",
                padding: "3px 10px", borderRadius: 99,
                background: done ? "#dcfce7" : "#f1f5f9",
                color: done ? "#15803d" : "#64748b",
              }}>
                {done ? "Concluído" : unlocked ? "Não iniciado" : "Bloqueado"}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "1.5rem", marginTop: "2rem" }}>
        <span onClick={onDashboard} style={{ color: "#6366f1", fontSize: "0.9rem", cursor: "pointer", fontWeight: 500 }}>Ver Dashboard</span>
        <span onClick={onProgress} style={{ color: "#6366f1", fontSize: "0.9rem", cursor: "pointer", fontWeight: 500 }}>Ver Progresso</span>
      </div>
    </Page>
  );
}

// ─── SCREEN: PROGRESSO DA JORNADA ────────────────────────────────────────────
function ProgressoScreen({ onBack, progress, onDashboard }) {
  const SLUGS = ["mapa-interior", "horizonte-ampliado", "rota-definida", "plano-de-voo"];

  function getStatus(mod) {
    if (mod.completed) return "completed";
    const idx = SLUGS.indexOf(mod.slug);
    if (idx === 0) return "in_progress";
    const prevCompleted = progress.find(p => p.slug === SLUGS[idx - 1])?.completed;
    return prevCompleted ? "in_progress" : "not_started";
  }

  const StatusIcon = ({ status }) => {
    if (status === "completed") return (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2"/>
        <polyline points="8 12 11 15 16 9" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
    if (status === "in_progress") return (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#e2e8f0" strokeWidth="2"/>
        <path d="M12 2 A10 10 0 0 1 22 12" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
    return (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#cbd5e1" strokeWidth="2"/>
      </svg>
    );
  };

  const Badge = ({ status }) => {
    if (status === "completed") return (
      <span style={{ background: "#0f172a", color: "#fff", fontSize: "0.78rem", fontWeight: 600, padding: "4px 14px", borderRadius: 99, whiteSpace: "nowrap" }}>Concluído</span>
    );
    if (status === "in_progress") return (
      <span style={{ background: "#f1f5f9", color: "#475569", fontSize: "0.78rem", fontWeight: 500, padding: "4px 14px", borderRadius: 99, border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>Em andamento</span>
    );
    return (
      <span style={{ background: "#f1f5f9", color: "#94a3b8", fontSize: "0.78rem", fontWeight: 500, padding: "4px 14px", borderRadius: 99, border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>Não iniciado</span>
    );
  };

  return (
    <Page>
      <div style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", padding: 0 }}>
            <Icon name="arrow-left" size={22} />
          </button>
          <h1 style={{ fontSize: "1.9rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Progresso da Jornada</h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
          {progress.map(mod => {
            const status = getStatus(mod);
            return (
              <div key={mod.module_id} style={{
                ...cardStyle, padding: "1.25rem 1.5rem",
                display: "flex", alignItems: "center", gap: "1rem",
              }}>
                <StatusIcon status={status} />
                <span style={{ flex: 1, fontSize: "1rem", fontWeight: "600", color: status === "not_started" ? "#94a3b8" : "#0f172a" }}>
                  {mod.module_title}
                </span>
                <Badge status={status} />
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "center", paddingBottom: "2rem" }}>
          <Btn onClick={onDashboard} style={{ padding: "1rem 2.5rem" }}>Ver Dashboard Completo</Btn>
        </div>
      </div>
    </Page>
  );
}

// ─── SCREEN: DASHBOARD ───────────────────────────────────────────────────────
function DashboardScreen({ onBack, progress, userName, onLogout, onContinue, sessionId, onDeleted }) {
  const completed = progress.filter(m => m.completed).length;
  const total = progress.length || 4;
  const pct = Math.round((completed / total) * 100);
  const nextModule = progress.find(m => !m.completed);

  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function openDelete() { setShowDelete(true); setDeletePassword(""); setDeleteError(""); }
  function closeDelete() { setShowDelete(false); setDeletePassword(""); setDeleteError(""); }

  async function handleConfirmDelete() {
    if (!deletePassword) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await api("DELETE", "/auth/account", { session_id: sessionId, password: deletePassword });
      onDeleted();
    } catch (e) {
      setDeleteError(e.message || "Erro ao excluir conta. Tente novamente.");
      setDeleteLoading(false);
    }
  }

  const ACHIEVEMENTS = [
    { label: "Perfil de autoconhecimento completo", slug: "mapa-interior" },
    { label: "Exploração de carreiras", slug: "horizonte-ampliado" },
    { label: "Rota de carreira definida", slug: "rota-definida" },
    { label: "Plano de voo traçado", slug: "plano-de-voo" },
  ];

  return (
    <Page>
      <div style={{ maxWidth: 800, margin: "0 auto", width: "100%" }}>

        {/* Header: seta + título + usuário + sair */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", padding: 0 }}>
              <Icon name="arrow-left" size={22} />
            </button>
            <h1 style={{ fontSize: "1.9rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Dashboard</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>{userName}</span>
            <button onClick={onLogout} style={{
              background: "none", border: "1.5px solid #e2e8f0", borderRadius: 8,
              color: "#64748b", fontSize: "0.8rem", padding: "5px 12px",
              cursor: "pointer", fontFamily: font, fontWeight: 500, transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "#fecaca"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
            >Sair</button>
          </div>
        </div>

        {/* Card Progresso Geral */}
        <div style={{ ...cardStyle, padding: "1.75rem", marginBottom: "1rem" }}>
          <p style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a", margin: "0 0 2px" }}>Progresso Geral</p>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 1.25rem" }}>Acompanhe seu desenvolvimento no programa</p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "1.6rem", fontWeight: "700", color: "#3b82f6" }}>{pct}%</span>
            <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{completed} de {total} módulos</span>
          </div>
          <div style={{ height: 8, background: "#e2e8f0", borderRadius: 99, marginBottom: "1.25rem", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "#0f172a", borderRadius: 99, transition: "width 0.6s ease" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ color: "#16a34a" }}><Icon name="check-square" size={18} /></span>
                <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "#15803d" }}>Módulos Concluídos</span>
              </div>
              <span style={{ fontSize: "1.6rem", fontWeight: "700", color: "#15803d" }}>{completed}</span>
            </div>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ color: "#3b82f6" }}><Icon name="clock" size={18} /></span>
                <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "#1d4ed8" }}>Próximos Passos</span>
              </div>
              <span style={{ fontSize: "0.9rem", color: "#1e40af", fontWeight: 500 }}>
                {nextModule?.module_title || "Jornada concluída!"}
              </span>
            </div>
          </div>
        </div>

        {/* Card Suas Conquistas */}
        <div style={{ ...cardStyle, padding: "1.75rem", marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a", margin: "0 0 1rem" }}>Suas Conquistas</p>
          {ACHIEVEMENTS.map((ach, i) => {
            const done = progress.find(m => m.slug === ach.slug)?.completed;
            return (
              <div key={ach.slug} style={{
                display: "flex", alignItems: "center", gap: "0.875rem",
                padding: "0.875rem 0",
                borderBottom: i < ACHIEVEMENTS.length - 1 ? "1px solid #f1f5f9" : "none",
              }}>
                <span style={{ color: done ? "#16a34a" : "#cbd5e1", flexShrink: 0 }}>
                  <Icon name={done ? "check-square" : "clock"} size={20} />
                </span>
                <span style={{ fontSize: "0.95rem", color: done ? "#0f172a" : "#94a3b8", fontWeight: done ? 500 : 400 }}>
                  {ach.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Botão Continuar */}
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: "1.5rem" }}>
          <Btn onClick={onContinue} style={{ padding: "1rem 2.5rem" }}>
            Continuar Jornada
          </Btn>
        </div>

        {/* Zona de perigo */}
        <div style={{ borderTop: "1px solid #fee2e2", paddingTop: "1.5rem", paddingBottom: "2.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase", margin: "0 0 0.75rem" }}>Zona de perigo</p>
          <button onClick={openDelete} style={{
            background: "none", border: "1.5px solid #fecaca", borderRadius: 10,
            color: "#ef4444", padding: "0.6rem 1.5rem", cursor: "pointer",
            fontFamily: font, fontSize: "0.875rem", fontWeight: 500, transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
          >
            Excluir minha conta
          </button>
        </div>
      </div>

      {/* Modal de confirmação */}
      {showDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: "2rem", maxWidth: 420, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
            {/* Ícone de aviso */}
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>

            <h3 style={{ margin: "0 0 0.625rem", fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
              Excluir conta permanentemente
            </h3>
            <p style={{ margin: "0 0 1.5rem", color: "#64748b", fontSize: "0.875rem", lineHeight: 1.6 }}>
              Esta ação <strong>não pode ser desfeita</strong>. Todas as suas respostas, progresso e dados serão removidos. Se criar uma nova conta com este email, começará do zero.
            </p>

            <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Digite sua senha para confirmar
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConfirmDelete()}
              placeholder="••••••••"
              autoFocus
              style={{
                width: "100%", height: 44, borderRadius: 10,
                border: deleteError ? "1.5px solid #fca5a5" : "1.5px solid #e2e8f0",
                background: "#f8fafc", padding: "0 14px", fontSize: "0.9rem",
                fontFamily: font, outline: "none", boxSizing: "border-box", marginBottom: "0.75rem",
              }}
            />
            {deleteError && (
              <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: "0 0 1rem", lineHeight: 1.4 }}>{deleteError}</p>
            )}

            <div style={{ display: "flex", gap: "0.625rem" }}>
              <button onClick={closeDelete} style={{
                flex: 1, padding: "0.75rem", borderRadius: 10,
                border: "1.5px solid #e2e8f0", background: "#fff",
                cursor: "pointer", fontFamily: font, fontSize: "0.875rem", fontWeight: 500,
              }}>Cancelar</button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading || !deletePassword}
                style={{
                  flex: 1, padding: "0.75rem", borderRadius: 10, border: "none",
                  background: deleteLoading || !deletePassword ? "#fca5a5" : "#ef4444",
                  color: "#fff", cursor: deleteLoading || !deletePassword ? "not-allowed" : "pointer",
                  fontFamily: font, fontSize: "0.875rem", fontWeight: 700, transition: "background 0.15s",
                }}
              >
                {deleteLoading ? "Excluindo..." : "Excluir permanentemente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

// ─── SCREEN: MAPA INTERIOR ───────────────────────────────────────────────────
function MapaInteriorScreen({ onBack, onComplete, sessionId, onHome }) {
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
  const sid = encodeURIComponent(sessionId);

  async function handleNext() {
    if (!selected[q.id]) return;
    setSaving(true);
    try {
      await api("POST", `/sessions/${sid}/answers`, { question_id: q.id, option_id: selected[q.id] });
      if (isLast) {
        await api("POST", `/sessions/${sid}/complete-module/1`);
        onComplete();
      } else {
        setCurrent(c => c + 1);
      }
    } catch { alert("Erro ao salvar resposta."); }
    finally { setSaving(false); }
  }

  if (loading) return <Page center><p style={{ color: "#94a3b8" }}>Carregando...</p></Page>;

  return (
    <Page center>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <ModuleNav onBack={onBack} onHome={onHome} />
        <div style={{ ...cardStyle, padding: "2rem" }}>
          <div style={{ height: 4, background: "#e2e8f0", borderRadius: 99, marginBottom: "1.5rem", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99, transition: "width 0.4s ease" }} />
          </div>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500, margin: "0 0 4px" }}>
            Pergunta {current + 1} de {total} <span style={{ float: "right" }}>{pct}%</span>
          </p>
          <p style={{ fontSize: "1.1rem", fontWeight: "600", color: "#0f172a", margin: "0 0 1.5rem", lineHeight: 1.4 }}>{q?.text}</p>
          {q?.options.map(opt => (
            <button key={opt.id} onClick={() => setSelected(s => ({ ...s, [q.id]: opt.id }))}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "0.875rem 1.1rem", marginBottom: "0.625rem",
                borderRadius: 12, border: selected[q.id] === opt.id ? "2px solid #6366f1" : "1.5px solid #e2e8f0",
                background: selected[q.id] === opt.id ? "#eef2ff" : "#fff",
                color: selected[q.id] === opt.id ? "#4338ca" : "#1e293b",
                fontSize: "0.95rem", cursor: "pointer", fontWeight: selected[q.id] === opt.id ? 500 : 400,
                fontFamily: font, transition: "all 0.15s",
              }}
            >{opt.text}</button>
          ))}
          <Btn onClick={handleNext} disabled={!selected[q?.id] || saving} style={{ width: "100%", marginTop: "0.5rem" }}>
            {saving ? "Salvando..." : isLast ? "Concluir" : "Próximo"}
            {!saving && <Icon name="arrow-right" size={18} />}
          </Btn>
        </div>
      </div>
    </Page>
  );
}

// ─── SCREEN: HORIZONTE AMPLIADO ──────────────────────────────────────────────
const PAGE_SIZE = 8; // quantos cards mostrar por vez

function HorizonteScreen({ onBack, onCareerDetail, onContinue, selectedCareers, sessionId, onHome, adminRecommendation }) {
  const [careers, setCareers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filterField, setFilterField] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [confirming, setConfirming]   = useState(false);

  useEffect(() => {
    const sid = encodeURIComponent(sessionId);
    api("GET", `/sessions/${sid}/careers`)
      .then(setCareers)
      .catch(() => api("GET", "/careers").then(setCareers))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Ao mudar busca ou filtro, volta para a primeira "página"
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, filterField]);

  // Lista de campos únicos
  const campos = useMemo(() => {
    const seen = new Set();
    return careers.map(c => c.campo_conhecimento).filter(v => v && !seen.has(v) && seen.add(v)).sort();
  }, [careers]);

  // Carreiras filtradas
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return careers.filter(c => {
      const matchField = !filterField || c.campo_conhecimento === filterField;
      const matchSearch = !q ||
        c.title.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q) ||
        (c.campo_conhecimento || "").toLowerCase().includes(q);
      return matchField && matchSearch;
    });
  }, [careers, search, filterField]);

  // Separa selecionadas das demais (selecionadas ficam sempre visíveis no topo)
  const selectedSet         = new Set(selectedCareers.map(sc => sc.id));
  const selectedInFiltered  = filtered.filter(c =>  selectedSet.has(c.id));
  const unselectedInFiltered = filtered.filter(c => !selectedSet.has(c.id));
  const visibleUnselected   = unselectedInFiltered.slice(0, visibleCount);
  const remaining           = unselectedInFiltered.length - visibleCount;
  const hasFilters          = !!(search || filterField);

  const chipBtn = (label, active, onClickFn) => (
    <button key={label} onClick={onClickFn} style={{
      padding: "5px 14px", borderRadius: 99, fontSize: "0.8rem",
      border: `1.5px solid ${active ? "#0f172a" : "#e2e8f0"}`,
      cursor: "pointer", fontFamily: font, fontWeight: active ? 600 : 400,
      background: active ? "#0f172a" : "#fff",
      color: active ? "#fff" : "#64748b",
      transition: "all 0.15s", whiteSpace: "nowrap",
    }}>{label}</button>
  );

  const renderCard = (c) => {
    const isChosen = selectedSet.has(c.id);
    return (
      <div key={c.id} style={{
        ...cardStyle, padding: "1.25rem",
        border: isChosen ? "2px solid #6366f1" : "1px solid #e2e8f0",
        background: isChosen ? "#fafaff" : "#fff",
        transition: "all 0.2s",
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.09)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)"; }}
      >
        {/* Badge "Selecionada" no topo do card */}
        {isChosen && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: "#6366f1", color: "#fff",
              fontSize: "0.68rem", fontWeight: 700,
              borderRadius: 99, padding: "2px 8px",
            }}>
              <Icon name="check" size={10} /> Selecionada
            </span>
          </div>
        )}
        <div style={{ width: 40, height: 40, borderRadius: 11, background: `${c.icon_color || "#6366f1"}18`, color: c.icon_color || "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.6rem" }}>
          <Icon name={CAREER_ICONS[c.title] || c.icon || "briefcase"} size={20} />
        </div>
        <p style={{ fontSize: "0.95rem", fontWeight: "600", color: "#0f172a", margin: "0 0 4px", lineHeight: 1.3 }}>{c.title}</p>
        {c.campo_conhecimento && (
          <span style={{ display: "inline-block", padding: "2px 8px", background: `${c.icon_color || "#6366f1"}18`, color: c.icon_color || "#6366f1", borderRadius: 99, fontSize: "0.7rem", fontWeight: 600, marginBottom: 6 }}>
            {c.campo_conhecimento}
          </span>
        )}
        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 0.875rem", lineHeight: 1.5 }}>
          {c.description ? (c.description.length > 100 ? c.description.slice(0, 97) + "…" : c.description) : ""}
        </p>
        {c.match_score > 0 && (
          <div style={{ marginBottom: "0.6rem" }}>
            <div style={{ height: 3, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round(c.match_score * 100)}%`, background: c.match_score > 0.6 ? "#22c55e" : c.match_score > 0.3 ? "#f59e0b" : "#94a3b8", borderRadius: 99 }} />
            </div>
            <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: "3px 0 0" }}>{Math.round(c.match_score * 100)}% compatibilidade</p>
          </div>
        )}
        <button onClick={() => onCareerDetail(c)} style={{
          display: "block", width: "100%", padding: "0.55rem",
          background: "none",
          border: `1.5px solid ${isChosen ? "#c7d2fe" : "#e2e8f0"}`,
          borderRadius: 9,
          color: isChosen ? "#4338ca" : "#475569",
          fontSize: "0.82rem", cursor: "pointer", fontWeight: 500,
          fontFamily: font, transition: "all 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = isChosen ? "#eef2ff" : "#f8fafc"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
        >Saber mais</button>
      </div>
    );
  };

  return (
    <Page>
      <div style={{ maxWidth: 960, margin: "0 auto", width: "100%" }}>
        <ModuleNav onBack={onBack} onHome={onHome} />
        <h1 style={{ fontSize: "1.8rem", fontWeight: "700", color: "#0f172a", margin: "0 0 0.4rem", letterSpacing: "-0.02em" }}>Horizonte Ampliado</h1>
        <p style={{ color: "#64748b", margin: "0 0 1.25rem" }}>Explore diferentes possibilidades de carreira que combinam com seu perfil</p>

        {/* ── Recomendação do orientador ── */}
        {adminRecommendation && (
          <div style={{
            marginBottom: "1.25rem",
            background: "linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)",
            border: "1.5px solid #c4b5fd",
            borderRadius: 16,
            padding: "1.1rem 1.375rem",
            display: "flex", gap: "1rem", alignItems: "flex-start",
          }}>
            {/* Ícone do orientador */}
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: `${adminRecommendation.icon_color || "#8b5cf6"}22`,
              color: adminRecommendation.icon_color || "#8b5cf6",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="sparkles" size={22} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: "0 0 3px", fontSize: "0.7rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Recomendação do orientador
              </p>
              <p style={{ margin: adminRecommendation.note ? "0 0 5px" : "0", fontSize: "1rem", fontWeight: 700, color: "#4c1d95" }}>
                {adminRecommendation.title}
              </p>
              {adminRecommendation.note && (
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#6d28d9", lineHeight: 1.55, fontStyle: "italic" }}>
                  "{adminRecommendation.note}"
                </p>
              )}
            </div>

            {/* Botão para abrir detalhes */}
            <button
              onClick={() => onCareerDetail(adminRecommendation)}
              style={{
                flexShrink: 0, padding: "6px 14px",
                border: "1.5px solid #c4b5fd", borderRadius: 99,
                background: "#fff", color: "#6d28d9",
                fontSize: "0.78rem", fontWeight: 600,
                cursor: "pointer", fontFamily: font,
                whiteSpace: "nowrap",
              }}
            >
              Saber mais
            </button>
          </div>
        )}

        {/* ── Barra de ferramentas: busca + botão filtros ── */}
        {!loading && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* Campo de busca */}
              <div style={{ position: "relative", flex: 1 }}>
                <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }}>
                  <Icon name="search" size={15} />
                </div>
                <input
                  type="text"
                  placeholder="Buscar profissão ou palavra-chave…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: "100%", padding: "0.7rem 2.4rem 0.7rem 2.4rem",
                    border: "1.5px solid #e2e8f0", borderRadius: 12,
                    fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
                    fontFamily: font, color: "#0f172a", background: "#fff",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#6366f1")}
                  onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{
                    position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 3,
                  }}>
                    <Icon name="x" size={13} />
                  </button>
                )}
              </div>

              {/* Botão Filtrar — mostra badge quando filtro ativo */}
              <button
                onClick={() => setShowFilters(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "0.7rem 1rem", borderRadius: 12, cursor: "pointer",
                  fontFamily: font, fontSize: "0.88rem", fontWeight: 500,
                  border: `1.5px solid ${showFilters || filterField ? "#6366f1" : "#e2e8f0"}`,
                  background: showFilters || filterField ? "#eef2ff" : "#fff",
                  color: showFilters || filterField ? "#4338ca" : "#475569",
                  transition: "all 0.15s", whiteSpace: "nowrap", position: "relative",
                }}
              >
                <Icon name="filter" size={15} />
                Filtrar
                {filterField && (
                  <span style={{
                    position: "absolute", top: -6, right: -6,
                    width: 16, height: 16, borderRadius: "50%",
                    background: "#6366f1", color: "#fff",
                    fontSize: "0.65rem", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 0 0 2px #fff",
                  }}>1</span>
                )}
              </button>
            </div>

            {/* Painel de filtros — só aparece quando showFilters = true */}
            {showFilters && (
              <div style={{
                marginTop: "0.6rem", padding: "0.875rem 1rem",
                background: "#f8fafc", borderRadius: 12,
                border: "1.5px solid #e2e8f0",
              }}>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>Área de conhecimento</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {chipBtn("Todas as áreas", filterField === "", () => setFilterField(""))}
                  {campos.map(c => chipBtn(c, filterField === c, () => setFilterField(f => f === c ? "" : c)))}
                </div>
                {filterField && (
                  <button onClick={() => setFilterField("")} style={{
                    marginTop: "0.5rem", background: "none", border: "none",
                    cursor: "pointer", fontSize: "0.78rem", color: "#6366f1",
                    fontFamily: font, padding: 0, fontWeight: 500,
                  }}>
                    Limpar filtro ×
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Contador de resultados — só aparece com filtro ativo */}
        {!loading && hasFilters && (
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0 0 0.75rem" }}>
            {filtered.length === 0
              ? "Nenhuma profissão encontrada"
              : `${filtered.length} profissão${filtered.length !== 1 ? "ões" : ""} encontrada${filtered.length !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* ── Grade de cards ── */}
        {loading ? (
          <p style={{ color: "#94a3b8" }}>Carregando carreiras…</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
            <p style={{ fontWeight: 600, color: "#475569", margin: "0 0 0.25rem" }}>Nenhuma profissão encontrada</p>
            <p style={{ fontSize: "0.85rem", margin: 0 }}>Tente outros termos ou limpe os filtros</p>
            <button onClick={() => { setSearch(""); setFilterField(""); }} style={{
              marginTop: "0.875rem", padding: "0.45rem 1.1rem", border: "1.5px solid #e2e8f0",
              borderRadius: 99, background: "#fff", cursor: "pointer", fontFamily: font,
              fontSize: "0.83rem", color: "#475569",
            }}>Limpar filtros</button>
          </div>
        ) : (
          <>
            {/* ── Seção: selecionadas (sempre visíveis no topo) ── */}
            {selectedInFiltered.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 0.6rem" }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                    background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name="check" size={11} />
                  </div>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#6366f1" }}>
                    Suas seleções ({selectedInFiltered.length})
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "0.875rem", marginBottom: "1rem" }}>
                  {selectedInFiltered.map(renderCard)}
                </div>
                {unselectedInFiltered.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "0.1rem 0 0.875rem" }}>
                    <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500, whiteSpace: "nowrap" }}>Outras profissões</span>
                    <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                  </div>
                )}
              </>
            )}

            {/* ── Seção: não selecionadas (com paginação) ── */}
            {visibleUnselected.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "0.875rem", marginBottom: "1rem" }}>
                {visibleUnselected.map(renderCard)}
              </div>
            )}

            {/* Botão Ver mais */}
            {remaining > 0 && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                <button
                  onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "0.7rem 1.75rem", borderRadius: 12,
                    border: "1.5px solid #e2e8f0", background: "#fff",
                    cursor: "pointer", fontFamily: font, fontSize: "0.88rem",
                    fontWeight: 500, color: "#475569", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#4338ca"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}
                >
                  <Icon name="chevron-down" size={16} />
                  Ver mais {remaining} profissão{remaining !== 1 ? "ões" : ""}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Botão continuar ── */}
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: "2rem" }}>
          <Btn onClick={() => selectedCareers.length > 0 && setConfirming(true)} disabled={selectedCareers.length === 0} style={{ padding: "1rem 2.5rem" }}>
            Continuar para Rota Definida <Icon name="arrow-right" size={18} />
          </Btn>
        </div>
        {selectedCareers.length === 0 && (
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.82rem", marginTop: "-1rem", paddingBottom: "0.5rem" }}>
            Escolha pelo menos uma carreira para continuar
          </p>
        )}
      </div>

      {/* Modal de confirmação */}
      {confirming && (
        <ConfirmModal
          title="Avançar para Rota Definida?"
          body={`Você selecionou ${selectedCareers.length} carreira${selectedCareers.length !== 1 ? "s" : ""} no Horizonte Ampliado. Ao confirmar, seu módulo será concluído e você avançará para a próxima etapa.`}
          warning="Esta ação não pode ser desfeita. Após confirmar, não será possível voltar e alterar as carreiras escolhidas neste módulo."
          confirmLabel="Confirmar e avançar"
          onConfirm={() => { setConfirming(false); onContinue(); }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Page>
  );
}

// ─── SCREEN: DETALHE DA CARREIRA ─────────────────────────────────────────────

/** Divide um texto em lista de itens (por vírgula, ponto-e-vírgula, newline ou numeração) */
function splitList(text) {
  if (!text) return [];
  // Remove numeração tipo "1. ", "1) ", "• "
  const clean = text.replace(/^\s*[\d]+[.)]\s*/gm, "").replace(/^\s*[•\-–]\s*/gm, "");
  return clean
    .split(/\n|;/)
    .map(s => s.trim())
    .filter(Boolean);
}

/** Seção colapsável com seta */
function CollapsibleSection({ icon, iconColor, title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ ...cardStyle, marginBottom: "0.6rem", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "1rem 1.25rem",
          background: "none", border: "none", cursor: "pointer", fontFamily: font,
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ color: iconColor, flexShrink: 0 }}><Icon name={icon} size={18} /></div>
          <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#0f172a" }}>{title}</span>
        </div>
        <div style={{ color: "#94a3b8", flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <Icon name="chevron-down" size={18} />
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 1.25rem 1.1rem" }}>
          <div style={{ height: 1, background: "#f1f5f9", marginBottom: "0.875rem" }} />
          {children}
        </div>
      )}
    </div>
  );
}

function CareerDetailScreen({ career, onBack, onChoose, isChosen, onHome }) {
  const color = career.icon_color || "#6366f1";

  const areas    = splitList(career.areas_atuacao);
  const habilids = splitList(career.habilidades_essenciais);
  const formacao = splitList(career.requisitos_formacao);
  const passos   = splitList(career.proximos_passos);
  const desafios = splitList(career.desafios_desvantagens);

  return (
    <Page>
      <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
        <ModuleNav onBack={onBack} onHome={onHome} />

        {/* ── Header (sempre visível) ── */}
        <div style={{ ...cardStyle, padding: "1.5rem", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `${color}18`, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={CAREER_ICONS[career.title] || career.icon || "briefcase"} size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: "1.4rem", fontWeight: "700", color: "#0f172a", margin: "0 0 5px" }}>{career.title}</h1>
              {career.campo_conhecimento && (
                <span style={{ display: "inline-block", padding: "2px 10px", background: `${color}18`, color, borderRadius: 99, fontSize: "0.78rem", fontWeight: 600 }}>
                  {career.campo_conhecimento}
                </span>
              )}
            </div>
          </div>
          {career.description && (
            <p style={{ color: "#475569", margin: 0, fontSize: "0.92rem", lineHeight: 1.6 }}>{career.description}</p>
          )}
        </div>

        {/* ── Seções colapsáveis ── */}
        {career.descricao_campo && (
          <CollapsibleSection icon="book-open" iconColor="#6366f1" title="Sobre a área de conhecimento" defaultOpen={true}>
            <p style={{ margin: 0, color: "#374151", fontSize: "0.9rem", lineHeight: 1.65 }}>{career.descricao_campo}</p>
          </CollapsibleSection>
        )}

        {areas.length > 0 && (
          <CollapsibleSection icon="briefcase" iconColor="#10b981" title="Áreas de atuação" defaultOpen={true}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {areas.map((a, i) => (
                <span key={i} style={{ padding: "5px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: "0.82rem", color: "#374151" }}>{a}</span>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {habilids.length > 0 && (
          <CollapsibleSection icon="sparkles" iconColor="#8b5cf6" title="Habilidades essenciais" defaultOpen={true}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {habilids.map((s, i) => (
                <span key={i} style={{ padding: "5px 12px", background: "#f1f5f9", borderRadius: 99, fontSize: "0.82rem", color: "#475569", fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {career.tendencias_mercado && (
          <CollapsibleSection icon="trending-up" iconColor="#0ea5e9" title="Tendências de mercado">
            <p style={{ margin: 0, color: "#374151", fontSize: "0.9rem", lineHeight: 1.65 }}>{career.tendencias_mercado}</p>
          </CollapsibleSection>
        )}

        {career.potencial_renda && (
          <CollapsibleSection icon="dollar-sign" iconColor="#22c55e" title="Potencial de renda">
            <p style={{ margin: 0, color: "#374151", fontSize: "0.9rem", lineHeight: 1.65 }}>{career.potencial_renda}</p>
          </CollapsibleSection>
        )}

        {formacao.length > 0 && (
          <CollapsibleSection icon="graduation-cap" iconColor="#f59e0b" title="Formação necessária">
            <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: 5 }}>
              {formacao.map((item, i) => (
                <li key={i} style={{ color: "#374151", fontSize: "0.9rem", lineHeight: 1.5 }}>{item}</li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {career.ambiente_trabalho && (
          <CollapsibleSection icon="home" iconColor="#64748b" title="Ambiente de trabalho">
            <p style={{ margin: 0, color: "#374151", fontSize: "0.9rem", lineHeight: 1.65 }}>{career.ambiente_trabalho}</p>
          </CollapsibleSection>
        )}

        {career.possibilidades_crescimento && (
          <CollapsibleSection icon="arrow-up" iconColor="#ec4899" title="Possibilidades de crescimento">
            <p style={{ margin: 0, color: "#374151", fontSize: "0.9rem", lineHeight: 1.65 }}>{career.possibilidades_crescimento}</p>
          </CollapsibleSection>
        )}

        {desafios.length > 0 && (
          <CollapsibleSection icon="alert-triangle" iconColor="#f97316" title="Desafios e desvantagens">
            <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: 5 }}>
              {desafios.map((item, i) => (
                <li key={i} style={{ color: "#374151", fontSize: "0.9rem", lineHeight: 1.5 }}>{item}</li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {passos.length > 0 && (
          <CollapsibleSection icon="map-pin" iconColor="#6366f1" title="Próximos passos">
            <ol style={{ margin: 0, paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: 6 }}>
              {passos.map((item, i) => (
                <li key={i} style={{ color: "#374151", fontSize: "0.9rem", lineHeight: 1.5 }}>{item}</li>
              ))}
            </ol>
          </CollapsibleSection>
        )}

        {/* ── Botões ── */}
        <div style={{ display: "flex", gap: "0.75rem", paddingBottom: "2rem", marginTop: "0.75rem" }}>
          <Btn onClick={onBack} variant="outline" style={{ flex: 1 }}>
            <Icon name="arrow-left" size={18} /> Voltar
          </Btn>
          <Btn onClick={() => onChoose(career)} style={{ flex: 2, background: isChosen ? "#dc2626" : "#0f172a" }}>
            {isChosen ? <><Icon name="x" size={18} /> Remover carreira</> : <><Icon name="check" size={18} /> Escolher esta carreira</>}
          </Btn>
        </div>
      </div>
    </Page>
  );
}

// ─── SCREEN: ROTA DEFINIDA ───────────────────────────────────────────────────
const CAREER_WHY = {
  "Desenvolvedor de Software": "Você demonstrou preferência por resolver problemas de forma lógica, trabalhar de forma independente e criar soluções inovadoras.",
  "Psicólogo": "Você demonstrou interesse genuíno em ajudar pessoas, compreender comportamentos humanos e contribuir para o bem-estar emocional.",
  "Designer Gráfico": "Você mostrou inclinação para expressão criativa, comunicação visual e transformar ideias em experiências impactantes.",
  "Gestor de Negócios": "Você demonstrou habilidade para pensar estrategicamente, liderar pessoas e tomar decisões orientadas a resultados.",
  "Pesquisador Científico": "Você mostrou interesse por investigação aprofundada, análise criteriosa e contribuição para o avanço do conhecimento.",
  "Professor": "Você demonstrou vocação para compartilhar conhecimento, inspirar pessoas e transformar vidas através da educação.",
  "Engenheiro": "Você demonstrou aptidão para resolver problemas técnicos complexos, pensamento analítico e criação de soluções práticas.",
  "Analista de Marketing": "Você mostrou interesse por compreender comportamentos de consumo, tendências de mercado e estratégias de comunicação.",
};

const CAREER_OPPORTUNITIES = {
  "Desenvolvedor de Software": "A área de tecnologia está em constante crescimento, oferecendo oportunidades de trabalho remoto, salários competitivos e evolução profissional acelerada.",
  "Psicólogo": "A demanda por saúde mental cresce a cada ano, com oportunidades em clínicas, empresas, escolas e atendimento online.",
  "Designer Gráfico": "O mercado criativo está em expansão com agências, startups, trabalho freelancer e a crescente demanda por identidade visual digital.",
  "Gestor de Negócios": "Empresas de todos os setores precisam de gestores qualificados, com oportunidades de liderança, empreendedorismo e consultoria.",
  "Pesquisador Científico": "Universidades, institutos e empresas de inovação buscam pesquisadores para desenvolvimento de novas tecnologias e descobertas.",
  "Professor": "O setor educacional oferece estabilidade, com oportunidades em escolas, universidades e plataformas de ensino online em crescimento.",
  "Engenheiro": "Engenheiros são altamente demandados em construção, indústria, energia e tecnologia, com excelentes perspectivas salariais.",
  "Analista de Marketing": "O marketing digital impulsiona a demanda em empresas de todos os portes, com crescimento especial em e-commerce e redes sociais.",
};

function RotaDefinidaScreen({ onBack, selectedCareers, onCreatePlan, onHome }) {
  const best = selectedCareers.reduce(
    (top, c) => (c.match_score || 0) >= (top.match_score || 0) ? c : top,
    selectedCareers[0]
  );
  const [featured, setFeatured] = useState(best);
  const [confirming, setConfirming] = useState(false);
  const related = selectedCareers.filter(c => c.id !== featured?.id);

  if (selectedCareers.length === 0) {
    return (
      <Page center>
        <div style={{ maxWidth: 500, width: "100%" }}>
          <ModuleNav onBack={onBack} onHome={onHome} />
          <div style={{ textAlign: "center" }}>
          <div style={{ ...cardStyle, padding: "3rem 2rem" }}>
            <p style={{ fontSize: "2rem", marginBottom: "1rem" }}>🗺️</p>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "600", color: "#0f172a", margin: "0 0 0.75rem" }}>Nenhuma carreira escolhida</h2>
            <p style={{ color: "#64748b", margin: "0 0 1.5rem", fontSize: "0.9rem" }}>Volte para o Horizonte Ampliado e escolha pelo menos uma carreira.</p>
            <Btn onClick={onBack}>Voltar ao Horizonte Ampliado</Btn>
          </div>
          </div>
        </div>
      </Page>
    );
  }

  const why = CAREER_WHY[featured.title] || featured.description || "Seu perfil demonstra grande afinidade com esta área.";
  const opportunities = CAREER_OPPORTUNITIES[featured.title] || "Esta carreira oferece diversas oportunidades de crescimento e desenvolvimento profissional.";

  return (
    <Page>
      <div style={{ maxWidth: 680, margin: "0 auto", width: "100%" }}>

        {/* Header */}
        <ModuleNav onBack={onBack} onHome={onHome} />
        <h1 style={{ fontSize: "1.7rem", fontWeight: "700", color: "#0f172a", margin: "0 0 1.75rem", letterSpacing: "-0.02em" }}>Rota Definida</h1>

        {/* Card carreira em destaque */}
        <div style={{ ...cardStyle, padding: "2rem", marginBottom: "1rem" }}>
          {/* Ícone */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="sparkles" size={30} />
            </div>
          </div>

          {/* Título */}
          <p style={{ textAlign: "center", fontSize: "0.82rem", color: "#64748b", fontWeight: 500, margin: "0 0 0.25rem" }}>Carreira Sugerida</p>
          <h2 style={{ textAlign: "center", fontSize: "1.75rem", fontWeight: "700", color: "#3b82f6", margin: "0 0 1rem", letterSpacing: "-0.02em" }}>
            {featured.title}
          </h2>
          <p style={{ textAlign: "center", color: "#475569", lineHeight: 1.65, margin: "0 0 1.75rem", fontSize: "0.925rem" }}>
            Com base nas suas respostas e perfil, identificamos que você tem grande afinidade com a área de <strong>{featured.title.toLowerCase()}</strong>.
          </p>

          {/* Por que esta área + Oportunidades */}
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", gap: "0.875rem" }}>
              <span style={{ color: "#3b82f6", flexShrink: 0, marginTop: 1 }}><Icon name="target" size={19} /></span>
              <div>
                <p style={{ fontWeight: "600", color: "#0f172a", margin: "0 0 5px", fontSize: "0.95rem" }}>Por que esta área?</p>
                <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0, lineHeight: 1.6 }}>{why}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.875rem" }}>
              <span style={{ color: "#10b981", flexShrink: 0, marginTop: 1 }}><Icon name="trending-up" size={19} /></span>
              <div>
                <p style={{ fontWeight: "600", color: "#0f172a", margin: "0 0 5px", fontSize: "0.95rem" }}>Oportunidades</p>
                <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0, lineHeight: 1.6 }}>{opportunities}</p>
              </div>
            </div>
          </div>

          {/* Botão */}
          <button
            onClick={() => setConfirming(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", marginTop: "1.75rem", padding: "1rem",
              borderRadius: 12, border: "none", background: "#0f172a", color: "#fff",
              fontSize: "0.975rem", fontWeight: "600", cursor: "pointer",
              fontFamily: font, transition: "opacity 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            Criar meu Plano de Ação <Icon name="arrow-right" size={18} />
          </button>
        </div>

        {/* Carreiras Relacionadas */}
        {related.length > 0 && (
          <div style={{ ...cardStyle, padding: "1.5rem", marginBottom: "2rem" }}>
            <p style={{ fontWeight: "600", color: "#0f172a", margin: "0 0 3px", fontSize: "0.975rem" }}>Carreiras Relacionadas</p>
            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 1.25rem" }}>Outras opções que também combinam com seu perfil</p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {related.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => setFeatured(c)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.875rem",
                    padding: "0.875rem 0.625rem", borderRadius: 10, cursor: "pointer",
                    borderTop: i > 0 ? "1px solid #f1f5f9" : "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c.icon_color || "#6366f1"}18`, color: c.icon_color || "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name={CAREER_ICONS[c.title] || "briefcase"} size={19} />
                  </div>
                  <span style={{ flex: 1, fontWeight: "600", color: "#0f172a", fontSize: "0.925rem" }}>{c.title}</span>
                  <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Ver detalhes →</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmação */}
      {confirming && (
        <ConfirmModal
          title={`Escolher "${featured.title}"?`}
          body={`Você está prestes a definir "${featured.title}" como sua carreira escolhida e avançar para o Plano de Voo.`}
          warning="Esta ação não pode ser desfeita. Após confirmar, sua escolha de carreira ficará registrada e você não poderá retornar para alterar a Rota Definida."
          confirmLabel="Confirmar escolha e avançar"
          onConfirm={() => { setConfirming(false); onCreatePlan(featured); }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Page>
  );
}

// ─── SCREEN: MÓDULO CONCLUÍDO (genérico) ─────────────────────────────────────
function ModuleCompletedScreen({ title, onHome, onContinue, continueLabel }) {
  return (
    <Page center>
      <div style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#bbf7d0"/>
            <polyline points="8 12 11 15 16 9" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.5rem" }}>Módulo Concluído</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.75rem", letterSpacing: "-0.02em" }}>{title}</h1>
        <p style={{ color: "#64748b", margin: "0 0 2.5rem", fontSize: "0.95rem", lineHeight: 1.6 }}>
          Você já concluiu este módulo com sucesso. Continue sua jornada!
        </p>
        <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Btn onClick={onHome} variant="outline"><Icon name="arrow-left" size={18} /> Jornada</Btn>
          {onContinue && (
            <Btn onClick={onContinue}>{continueLabel} <Icon name="arrow-right" size={18} /></Btn>
          )}
        </div>
      </div>
    </Page>
  );
}

// ─── SCREEN: ROTA DEFINIDA CONCLUÍDA ─────────────────────────────────────────
function RotaCompletedScreen({ sessionId, onHome, onGoToPlan }) {
  const [career, setCareer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sid = encodeURIComponent(sessionId);
    api("GET", `/sessions/${sid}/definitive-career`)
      .then(async data => {
        if (data && data.id) {
          setCareer(data);
        } else {
          // Inferir e salvar retroativamente da seleção + scores
          try {
            const [selections, scored] = await Promise.all([
              api("GET", `/sessions/${sid}/career-selections`),
              api("GET", `/sessions/${sid}/careers`),
            ]);
            if (selections.length > 0) {
              const best = scored
                .filter(c => selections.some(s => s.id === c.id))
                .reduce((top, c) => (!top || (c.match_score || 0) >= (top.match_score || 0)) ? c : top, null);
              if (best) {
                setCareer(best);
                api("POST", `/sessions/${sid}/definitive-career`, { career_id: best.id }).catch(() => {});
              }
            }
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <Page center>
      <div style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#bbf7d0"/>
            <polyline points="8 12 11 15 16 9" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.5rem" }}>Módulo Concluído</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.75rem", letterSpacing: "-0.02em" }}>Rota Definida</h1>

        {loading ? (
          <p style={{ color: "#94a3b8", margin: "0 0 2rem" }}>Carregando...</p>
        ) : career ? (
          <div style={{ ...cardStyle, padding: "1.25rem 1.5rem", margin: "0 0 2rem", display: "flex", alignItems: "center", gap: "0.875rem", textAlign: "left" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${career.icon_color || "#6366f1"}20`, color: career.icon_color || "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={CAREER_ICONS[career.title] || "briefcase"} size={24} />
            </div>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Sua carreira escolhida</p>
              <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>{career.title}</p>
            </div>
          </div>
        ) : (
          <p style={{ color: "#64748b", margin: "0 0 2rem", fontSize: "0.95rem" }}>Sua rota já foi definida.</p>
        )}

        <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Btn onClick={onHome} variant="outline"><Icon name="arrow-left" size={18} /> Jornada</Btn>
          <Btn onClick={() => onGoToPlan(career)}>
            Ver Plano de Ação <Icon name="arrow-right" size={18} />
          </Btn>
        </div>
      </div>
    </Page>
  );
}

// ─── SCREEN: PLANO DE VOO ─────────────────────────────────────────────────────
function PlanoDeVooScreen({ onBack, career: careerProp, onHome, onFinish, sessionId }) {
  const steps = [
    { title: "Concluir ensino médio", desc: "Mantenha boas notas especialmente em matemática e lógica" },
    { title: "Escolher curso superior", desc: "Pesquise sobre Ciência da Computação, Sistemas de Informação ou cursos relacionados" },
    { title: "Desenvolver habilidades técnicas", desc: "Aprenda linguagens de programação e ferramentas através de cursos online" },
    { title: "Buscar estágio", desc: "Procure oportunidades de estágio em empresas de tecnologia" },
    { title: "Criar portfólio", desc: "Desenvolva projetos pessoais e compartilhe no GitHub" },
    { title: "Networking", desc: "Participe de eventos, meetups e comunidades de tecnologia" },
  ];

  const [career, setCareer] = useState(careerProp || null);
  const [checked, setChecked] = useState({});

  useEffect(() => {
    if (careerProp) {
      setCareer(careerProp);
    } else if (sessionId) {
      api("GET", `/sessions/${encodeURIComponent(sessionId)}/definitive-career`)
        .then(data => { if (data && data.id) setCareer(data); })
        .catch(() => {});
    }
  }, []);

  // Recarrega checkboxes sempre que a carreira for definida (pode vir de forma assíncrona)
  useEffect(() => {
    if (!career?.id) return;
    const key = `plano_${sessionId}_${career.id}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved) setChecked(saved);
    } catch {}
  }, [career?.id]);

  const storageKey = `plano_${sessionId}_${career?.id ?? "default"}`;

  function toggleStep(i) {
    setChecked(prev => {
      const next = { ...prev, [i]: !prev[i] };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const done = Object.values(checked).filter(Boolean).length;

  return (
    <Page>
      <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
        <ModuleNav onBack={onBack} onHome={onHome} />
        <h1 style={{ fontSize: "1.8rem", fontWeight: "700", color: "#0f172a", margin: "0 0 2rem", letterSpacing: "-0.02em" }}>Plano de Voo</h1>

        <div style={{ ...cardStyle, padding: "2rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a", margin: "0 0 4px" }}>Seus Próximos Passos</h2>
          <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0 0 1.5rem" }}>
            Siga este plano de ação para alcançar seus objetivos profissionais em <strong>{career?.title}</strong>
          </p>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {steps.map((step, i) => (
              <div key={i} onClick={() => toggleStep(i)}
                style={{
                  display: "flex", gap: "1rem", padding: "1rem 0",
                  borderBottom: i < steps.length - 1 ? "1px solid #f1f5f9" : "none",
                  cursor: "pointer", transition: "opacity 0.2s",
                  opacity: checked[i] ? 0.6 : 1,
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 6, border: checked[i] ? "none" : "2px solid #d1d5db",
                  background: checked[i] ? "#6366f1" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: 2, transition: "all 0.15s",
                  color: "#fff",
                }}>
                  {checked[i] && <Icon name="check" size={14} />}
                </div>
                <div>
                  <p style={{ fontSize: "0.95rem", fontWeight: "600", color: "#0f172a", margin: "0 0 3px", textDecoration: checked[i] ? "line-through" : "none" }}>{step.title}</p>
                  <p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "2rem" }}>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>{done} de {steps.length} etapas concluídas</p>
          <Btn onClick={onFinish} style={{ padding: "0.875rem 2rem" }}>
            Finalizar Jornada <Icon name="arrow-right" size={18} />
          </Btn>
        </div>
      </div>
    </Page>
  );
}

// ─── SCREEN: CONCLUSÃO ───────────────────────────────────────────────────────
function ConclusaoScreen({ career, onDashboard, onRevisar, onHome }) {
  return (
    <Page>
      <div style={{ maxWidth: 680, margin: "0 auto", width: "100%", paddingBottom: "3rem" }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: "center", padding: "2.5rem 1rem 2rem" }}>
          <div style={{
            width: 88, height: 88, borderRadius: "50%",
            background: "linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)",
            border: "3px solid #fbbf24",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.25rem",
            fontSize: "2.5rem",
            boxShadow: "0 8px 32px rgba(251,191,36,0.25)",
          }}>
            🏆
          </div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem", letterSpacing: "-0.03em" }}>
            Parabéns!
          </h1>
          <p style={{ color: "#64748b", fontSize: "1rem", margin: 0, lineHeight: 1.6 }}>
            Você completou sua jornada de autoconhecimento
          </p>
        </div>

        {/* ── Área Recomendada ── */}
        <div style={{
          ...cardStyle,
          padding: "2rem",
          marginBottom: "1.25rem",
          background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
          border: "1.5px solid #93c5fd",
        }}>
          <p style={{
            fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.09em",
            color: "#1d4ed8", margin: "0 0 0.5rem", textTransform: "uppercase",
          }}>
            Área Recomendada
          </p>
          <h2 style={{
            fontSize: "1.75rem", fontWeight: 800, color: "#1e40af",
            margin: "0 0 0.5rem", letterSpacing: "-0.02em", lineHeight: 1.2,
          }}>
            {career?.campo_conhecimento || career?.title || "Sua Área Profissional"}
          </h2>
          {career?.title && career?.campo_conhecimento && (
            <p style={{ color: "#1d4ed8", fontSize: "0.9rem", margin: 0, fontWeight: 500 }}>
              com foco em <strong>{career.title}</strong>
            </p>
          )}
        </div>

        {/* ── 3 mini cards ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.875rem", marginBottom: "1.25rem",
        }}>
          {[
            { icon: "sparkles", label: "Seu Potencial",    desc: "Identificado e mapeado", bg: "#f0fdf4", border: "#86efac", color: "#16a34a" },
            { icon: "target",   label: "Objetivos Claros", desc: "Metas bem definidas",    bg: "#eff6ff", border: "#93c5fd", color: "#2563eb" },
            { icon: "plane",    label: "Plano de Ação",    desc: "Pronto para decolar",    bg: "#fff7ed", border: "#fdba74", color: "#ea580c" },
          ].map(({ icon, label, desc, bg: cardBg, border, color }) => (
            <div key={label} style={{
              ...cardStyle,
              padding: "1.25rem 1rem",
              background: cardBg,
              border: `1.5px solid ${border}`,
              textAlign: "center",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 0.75rem",
                color,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}>
                <Icon name={icon} size={18} />
              </div>
              <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", margin: "0 0 2px" }}>{label}</p>
              <p style={{ fontSize: "0.72rem", color: "#64748b", margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* ── Mensagem motivacional ── */}
        <div style={{
          ...cardStyle,
          padding: "1.5rem",
          marginBottom: "2rem",
          background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
          border: "1.5px solid #86efac",
        }}>
          <div style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#dcfce7",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, color: "#16a34a",
            }}>
              <Icon name="star" size={16} />
            </div>
            <div>
              <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#166534", margin: "0 0 4px" }}>
                Sua jornada está apenas começando!
              </p>
              <p style={{ fontSize: "0.85rem", color: "#166534", margin: 0, lineHeight: 1.65, opacity: 0.85 }}>
                Você deu o primeiro e mais importante passo: se conhecer melhor.
                Agora use seu Plano de Voo para transformar seus objetivos em realidade — um passo de cada vez.
              </p>
            </div>
          </div>
        </div>

        {/* ── Botões ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Btn onClick={onDashboard} style={{ width: "100%", padding: "1rem" }}>
            <Icon name="home" size={18} /> Ver Dashboard
          </Btn>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <Btn variant="outline" onClick={onRevisar} style={{ padding: "0.9rem" }}>
              <Icon name="check-square" size={16} /> Revisar Plano de Ação
            </Btn>
            <Btn variant="outline" onClick={onHome} style={{ padding: "0.9rem" }}>
              <Icon name="arrow-left" size={16} /> Voltar ao Início
            </Btn>
          </div>
        </div>

      </div>
    </Page>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login");
  const [sessionId, setSessionId] = useState(null);
  const [userName, setUserName] = useState("");
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [selectedCareers, setSelectedCareers] = useState([]);
  const [adminRecommendation, setAdminRecommendation] = useState(null);
  const [careerDetail, setCareerDetail] = useState(null);
  const [planCareer, setPlanCareer] = useState(null);
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    // Prioridade 1: token de reset de senha na URL
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      setResetToken(urlToken);
      setScreen("reset-password");
      setInitializing(false);
      return;
    }
    // Prioridade 2: sessão salva no localStorage
    const saved = localStorage.getItem("journeyUser");
    if (!saved) { setInitializing(false); return; }
    try {
      const { name, sessionId: sid } = JSON.parse(saved);
      setSessionId(sid);
      setUserName(name);
      Promise.all([
        api("GET", `/sessions/${encodeURIComponent(sid)}/progress`),
        api("GET", `/sessions/${encodeURIComponent(sid)}/career-selections`).catch(() => []),
        api("GET", `/sessions/${encodeURIComponent(sid)}/recommendation`).catch(() => null),
      ]).then(([prog, careers, rec]) => {
          setProgress(prog);
          if (careers.length > 0) setSelectedCareers(careers);
          if (rec) setAdminRecommendation(rec);
          setScreen(prog.some(m => m.completed) ? "jornada" : "bemvindo");
        })
        .catch(() => { localStorage.removeItem("journeyUser"); })
        .finally(() => setInitializing(false));
    } catch {
      localStorage.removeItem("journeyUser");
      setInitializing(false);
    }
  }, []);

  function loadProgress(sid) {
    const id = sid || sessionId;
    Promise.all([
      api("GET", `/sessions/${encodeURIComponent(id)}/progress`),
      api("GET", `/sessions/${encodeURIComponent(id)}/career-selections`).catch(() => []),
      api("GET", `/sessions/${encodeURIComponent(id)}/recommendation`).catch(() => null),
    ]).then(([prog, careers, rec]) => {
      setProgress(prog);
      if (careers.length > 0) setSelectedCareers(careers);
      if (rec) setAdminRecommendation(rec); else setAdminRecommendation(null);
    }).catch(() => setProgress([
      { module_id: 1, module_title: "Mapa Interior", slug: "mapa-interior", completed: false },
      { module_id: 2, module_title: "Horizonte Ampliado", slug: "horizonte-ampliado", completed: false },
      { module_id: 3, module_title: "Rota Definida", slug: "rota-definida", completed: false },
      { module_id: 4, module_title: "Plano de Voo", slug: "plano-de-voo", completed: false },
    ])).finally(() => setLoading(false));
  }

  async function handleLogin({ email, name, sessionId: sid }) {
    setSessionId(sid);
    setUserName(name);
    localStorage.setItem("journeyUser", JSON.stringify({ email, name, sessionId: sid }));
    setLoading(true);
    try {
      const [prog, careers, rec] = await Promise.all([
        api("GET", `/sessions/${encodeURIComponent(sid)}/progress`),
        api("GET", `/sessions/${encodeURIComponent(sid)}/career-selections`).catch(() => []),
        api("GET", `/sessions/${encodeURIComponent(sid)}/recommendation`).catch(() => null),
      ]);
      setProgress(prog);
      if (careers.length > 0) setSelectedCareers(careers);
      if (rec) setAdminRecommendation(rec); else setAdminRecommendation(null);
      setScreen(prog.some(m => m.completed) ? "jornada" : "bemvindo");
    } catch {
      setScreen("bemvindo");
    } finally {
      setLoading(false);
    }
  }

  function handleStart(mod) {
    if (mod.slug === "mapa-interior") setScreen("mapa");
    else if (mod.slug === "horizonte-ampliado") setScreen("horizonte");
    else if (mod.slug === "rota-definida") setScreen("rota");
    else if (mod.slug === "plano-de-voo") setScreen("plano");
  }

  function handleLogout() {
    // Limpa dados do plano de voo salvos localmente
    const sid = sessionId;
    if (sid) {
      Object.keys(localStorage)
        .filter(k => k.startsWith(`plano_${sid}_`))
        .forEach(k => localStorage.removeItem(k));
    }
    localStorage.removeItem("journeyUser");
    setScreen("login");
    setSessionId(null);
    setUserName("");
    setProgress([]);
    setSelectedCareers([]);
    setAdminRecommendation(null);
    setCareerDetail(null);
    setPlanCareer(null);
    setRegisterSuccess("");
  }

  async function handleRotaCreatePlan(career) {
    setPlanCareer(career);
    const sid = encodeURIComponent(sessionId);
    try {
      await Promise.all([
        api("POST", `/sessions/${sid}/complete-module/3`),
        api("POST", `/sessions/${sid}/definitive-career`, { career_id: career.id }),
      ]);
      loadProgress(sessionId);
    } catch { /* ignora erro silencioso */ }
    setScreen("plano");
  }

  async function handleHorizonteContinue() {
    const sid = encodeURIComponent(sessionId);
    try {
      await Promise.all([
        api("POST", `/sessions/${sid}/complete-module/2`),
        api("POST", `/sessions/${sid}/career-selections`, { career_ids: selectedCareers.map(c => c.id) }),
      ]);
      loadProgress(sessionId);
    } catch { /* ignora erro silencioso */ }
    setScreen("rota");
  }

  function toggleCareer(career) {
    setSelectedCareers(prev =>
      prev.some(c => c.id === career.id)
        ? prev.filter(c => c.id !== career.id)
        : [...prev, career]
    );
  }

  if (initializing) return <Page center><p style={{ color: "#94a3b8" }}>Carregando...</p></Page>;

  if (screen === "register") return (
    <RegisterScreen
      onBack={() => { setRegisterSuccess(""); setScreen("login"); }}
      onSuccess={(msg) => { setRegisterSuccess(msg); setScreen("login"); }}
      onLogin={handleLogin}
    />
  );

  if (screen === "reset-password") return (
    <ResetPasswordScreen
      token={resetToken}
      onSuccess={() => { setResetToken(""); setScreen("login"); }}
    />
  );

  if (screen === "forgot-password") return (
    <ForgotPasswordScreen onBack={() => setScreen("login")} />
  );

  if (screen === "login") return (
    <LoginScreen
      onLogin={handleLogin}
      onRegister={() => setScreen("register")}
      onForgotPassword={() => setScreen("forgot-password")}
      successMsg={registerSuccess}
    />
  );

  if (screen === "bemvindo") return <BemVindoScreen onStart={() => {
    if (progress.length === 0) { setLoading(true); loadProgress(sessionId); }
    setScreen("jornada");
  }} />;

  if (loading) return <Page center><p style={{ color: "#94a3b8" }}>Carregando...</p></Page>;

  if (screen === "jornada") return (
    <JornadaScreen
      onStart={handleStart}
      progress={progress}
      onDashboard={() => setScreen("dashboard")}
      onProgress={() => setScreen("progresso")}
      adminRecommendation={adminRecommendation}
    />
  );

  if (screen === "progresso") return (
    <ProgressoScreen
      onBack={() => setScreen("jornada")}
      progress={progress}
      onDashboard={() => setScreen("dashboard")}
    />
  );

  if (screen === "dashboard") return (
    <DashboardScreen
      onBack={() => setScreen("jornada")}
      progress={progress}
      userName={userName}
      onLogout={handleLogout}
      onContinue={() => setScreen("jornada")}
      sessionId={sessionId}
      onDeleted={handleLogout}
    />
  );

  const isModuleDone = (slug) => progress.find(p => p.slug === slug)?.completed;

  if (screen === "mapa") {
    if (isModuleDone("mapa-interior")) return (
      <ModuleCompletedScreen
        title="Mapa Interior"
        onHome={() => setScreen("jornada")}
        onContinue={() => setScreen("horizonte")}
        continueLabel="Horizonte Ampliado"
      />
    );
    return (
      <MapaInteriorScreen
        onBack={() => setScreen("jornada")}
        onComplete={() => { loadProgress(sessionId); setScreen("jornada"); }}
        sessionId={sessionId}
        onHome={() => setScreen("jornada")}
      />
    );
  }

  if (screen === "horizonte") {
    if (isModuleDone("horizonte-ampliado") && !careerDetail) return (
      <ModuleCompletedScreen
        title="Horizonte Ampliado"
        onHome={() => setScreen("jornada")}
        onContinue={() => setScreen("rota")}
        continueLabel="Rota Definida"
      />
    );
    if (careerDetail) return (
      <CareerDetailScreen
        career={careerDetail}
        isChosen={selectedCareers.some(c => c.id === careerDetail.id)}
        onBack={() => setCareerDetail(null)}
        onChoose={(c) => { toggleCareer(c); setCareerDetail(null); }}
        onHome={() => setScreen("jornada")}
      />
    );
    return (
      <HorizonteScreen
        onBack={() => setScreen("jornada")}
        onCareerDetail={setCareerDetail}
        onContinue={handleHorizonteContinue}
        selectedCareers={selectedCareers}
        sessionId={sessionId}
        onHome={() => setScreen("jornada")}
        adminRecommendation={adminRecommendation}
      />
    );
  }

  if (screen === "rota") {
    if (isModuleDone("rota-definida")) return (
      <RotaCompletedScreen
        sessionId={sessionId}
        onHome={() => setScreen("jornada")}
        onGoToPlan={(c) => { if (c) setPlanCareer(c); setScreen("plano"); }}
      />
    );
    return (
      <RotaDefinidaScreen
        onBack={() => setScreen("horizonte")}
        selectedCareers={selectedCareers}
        onCreatePlan={handleRotaCreatePlan}
        onHome={() => setScreen("jornada")}
      />
    );
  }

  if (screen === "plano") return (
    <PlanoDeVooScreen
      onBack={() => setScreen("rota")}
      career={planCareer}
      onHome={() => setScreen("jornada")}
      onFinish={() => setScreen("conclusao")}
      sessionId={sessionId}
    />
  );

  if (screen === "conclusao") return (
    <ConclusaoScreen
      career={planCareer}
      onDashboard={() => setScreen("jornada")}
      onRevisar={() => setScreen("plano")}
      onHome={() => setScreen("jornada")}
    />
  );

  return null;
}
