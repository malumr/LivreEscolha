import { useState, useEffect } from "react";

const API = "http://localhost:8000";

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

const font = "'DM Sans', system-ui, sans-serif";

function Badge({ children, color = "gray" }) {
  const colors = {
    gray:   { bg: "#f1f5f9", text: "#475569" },
    green:  { bg: "#dcfce7", text: "#15803d" },
    blue:   { bg: "#dbeafe", text: "#1d4ed8" },
    yellow: { bg: "#fef9c3", text: "#854d0e" },
    red:    { bg: "#fee2e2", text: "#b91c1c" },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{
      display: "inline-block", fontSize: "0.72rem", fontWeight: 600,
      padding: "3px 10px", borderRadius: 99,
      background: c.bg, color: c.text,
    }}>{children}</span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
      padding: "1.25rem 1.5rem", ...style,
    }}>{children}</div>
  );
}

function Stat({ label, value, color = "#6366f1" }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "1.25rem 1.5rem", flex: 1 }}>
      <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>{label}</p>
      <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700, color }}>{value}</p>
    </div>
  );
}

// ─── MODAL CONFIRMAÇÃO ────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>Confirmar ação</h3>
        <p style={{ margin: "0 0 1.5rem", color: "#64748b", fontSize: "0.9rem" }}>{message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "0.6rem 1.2rem", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", cursor: "pointer", fontFamily: font, fontSize: "0.875rem" }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding: "0.6rem 1.2rem", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontFamily: font, fontSize: "0.875rem", fontWeight: 600 }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ─── ABA: SESSÕES ─────────────────────────────────────────────────────────────
function SessionsTab({ sessions, onSelectSession, onDeleteSession }) {
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = sessions.filter(s =>
    s.session_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: "1.25rem", alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por session ID..."
          style={{ flex: 1, height: 38, borderRadius: 10, border: "1.5px solid #e2e8f0", padding: "0 12px", fontFamily: font, fontSize: "0.875rem", outline: "none" }}
        />
        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{filtered.length} sessão(ões)</span>
      </div>

      {filtered.length === 0 ? (
        <Card><p style={{ color: "#94a3b8", textAlign: "center", margin: 0 }}>Nenhuma sessão encontrada.</p></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(s => (
            <div key={s.session_id} style={{
              background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0",
              padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 4px", fontFamily: "monospace", fontSize: "0.8rem", color: "#0f172a", wordBreak: "break-all" }}>{s.session_id}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Badge color={s.answers_count > 0 ? "blue" : "gray"}>{s.answers_count} respostas</Badge>
                  <Badge color={s.modules_completed > 0 ? "green" : "gray"}>{s.modules_completed} módulos concluídos</Badge>
                  {s.created_at && <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{new Date(s.created_at).toLocaleDateString("pt-BR")}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => onSelectSession(s.session_id)} style={{
                  padding: "0.5rem 1rem", borderRadius: 8, border: "1.5px solid #e2e8f0",
                  background: "#fff", cursor: "pointer", fontFamily: font, fontSize: "0.8rem", fontWeight: 500,
                }}>Ver respostas</button>
                <button onClick={() => setConfirm(s.session_id)} style={{
                  padding: "0.5rem 1rem", borderRadius: 8, border: "none",
                  background: "#fee2e2", color: "#b91c1c", cursor: "pointer", fontFamily: font, fontSize: "0.8rem", fontWeight: 600,
                }}>Apagar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <ConfirmModal
          message={`Apagar todas as respostas da sessão ${confirm.slice(0, 8)}...? Esta ação não pode ser desfeita.`}
          onConfirm={() => { onDeleteSession(confirm); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── ABA: RESPOSTAS DE UMA SESSÃO ────────────────────────────────────────────
function SessionAnswersTab({ sessionId, onBack, onDeleteAnswer, allCareers }) {
  const [answers, setAnswers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedCareers, setSelectedCareers] = useState([]);
  const [careersSource, setCareersSource] = useState("chosen");
  const [definitiveCareer, setDefinitiveCareer] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [recCareerId, setRecCareerId] = useState("");
  const [recNote, setRecNote] = useState("");
  const [savingRec, setSavingRec] = useState(false);
  const [horizonteConcluido, setHorizonteConcluido] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    Promise.all([
      api("GET", `/sessions/${sessionId}/answers`),
      api("GET", "/modules/1/questions"),
      api("GET", `/sessions/${sessionId}/career-selections`).catch(() => []),
      api("GET", `/sessions/${sessionId}/careers`).catch(() => []),
      api("GET", `/sessions/${sessionId}/definitive-career`).catch(() => null),
      api("GET", `/sessions/${sessionId}/recommendation`).catch(() => null),
      api("GET", `/sessions/${sessionId}/progress`).catch(() => []),
    ]).then(([ans, qs, chosen, recommended, definitive, rec, prog]) => {
      setAnswers(ans);
      setQuestions(qs);
      setDefinitiveCareer(definitive);
      const horizonte = prog.find(p => p.slug === "horizonte-ampliado");
      setHorizonteConcluido(horizonte?.completed === true);
      if (rec) {
        setRecommendation(rec);
        setRecCareerId(String(rec.id));
        setRecNote(rec.note || "");
      }
      if (chosen.length > 0) {
        setSelectedCareers(chosen);
        setCareersSource("chosen");
      } else {
        const top = [...recommended]
          .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
          .slice(0, 3);
        setSelectedCareers(top);
        setCareersSource("recommended");
      }
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  async function handleSaveRecommendation() {
    if (!recCareerId) return;
    setSavingRec(true);
    try {
      await api("POST", `/admin/sessions/${sessionId}/recommend-career`, {
        career_id: parseInt(recCareerId),
        note: recNote.trim() || null,
      });
      const career = allCareers.find(c => c.id === parseInt(recCareerId));
      setRecommendation(career ? { ...career, note: recNote.trim() || null } : null);
    } catch { alert("Erro ao salvar recomendação."); }
    finally { setSavingRec(false); }
  }

  async function handleRemoveRecommendation() {
    setSavingRec(true);
    try {
      await api("DELETE", `/admin/sessions/${sessionId}/recommend-career`);
      setRecommendation(null);
      setRecCareerId("");
      setRecNote("");
    } catch { alert("Erro ao remover recomendação."); }
    finally { setSavingRec(false); }
  }

  function getQuestionText(qid) {
    return questions.find(q => q.id === qid)?.text || `Pergunta #${qid}`;
  }
  function getOptionText(qid, oid) {
    const q = questions.find(q => q.id === qid);
    return q?.options?.find(o => o.id === oid)?.text || `Opção #${oid}`;
  }

  if (loading) return <p style={{ color: "#94a3b8" }}>Carregando...</p>;

  return (
    <div>
      <button onClick={onBack} style={{
        display: "flex", alignItems: "center", gap: 6, background: "none",
        border: "none", color: "#64748b", fontSize: "0.875rem", cursor: "pointer",
        fontFamily: font, marginBottom: "1.25rem", padding: 0,
      }}>← Voltar para sessões</button>

      <Card style={{ marginBottom: "1rem", background: "#f8fafc" }}>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>Session ID</p>
        <p style={{ margin: "2px 0 0", fontFamily: "monospace", fontSize: "0.85rem", color: "#0f172a", wordBreak: "break-all" }}>{sessionId}</p>
      </Card>

      {definitiveCareer && (
        <Card style={{ marginBottom: "1rem", borderLeft: "3px solid #10b981", background: "#f0fdf4" }}>
          <p style={{ margin: "0 0 0.625rem", fontSize: "0.75rem", fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            ✓ Carreira Definitiva — Rota Definida
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: definitiveCareer.icon_color || "#10b981", flexShrink: 0 }} />
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "#065f46" }}>{definitiveCareer.title}</span>
          </div>
          {definitiveCareer.description && (
            <p style={{ margin: "0.375rem 0 0 22px", fontSize: "0.82rem", color: "#047857" }}>{definitiveCareer.description}</p>
          )}
        </Card>
      )}

      {/* Card de Recomendação do Admin — só exibe enquanto Horizonte Ampliado não foi concluído */}
      {!horizonteConcluido && <Card style={{ marginBottom: "1rem", borderLeft: "3px solid #8b5cf6", background: "#faf5ff" }}>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          💡 Recomendar carreira ao usuário
        </p>
        {recommendation && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.75rem", padding: "0.625rem 0.875rem", background: "#ede9fe", borderRadius: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: recommendation.icon_color || "#8b5cf6", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#4c1d95" }}>{recommendation.title}</span>
              {recommendation.note && (
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#6d28d9", fontStyle: "italic" }}>"{recommendation.note}"</p>
              )}
            </div>
            <span style={{ fontSize: "0.7rem", background: "#8b5cf6", color: "#fff", padding: "2px 8px", borderRadius: 99, fontWeight: 600, whiteSpace: "nowrap" }}>Ativa</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: "0.625rem" }}>
          <select
            value={recCareerId}
            onChange={e => setRecCareerId(e.target.value)}
            style={{
              flex: 1, height: 38, borderRadius: 8, border: "1.5px solid #ddd6fe",
              padding: "0 10px", fontFamily: font, fontSize: "0.875rem",
              background: "#fff", color: "#0f172a", outline: "none",
            }}
          >
            <option value="">Selecionar carreira...</option>
            {allCareers.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
        <textarea
          value={recNote}
          onChange={e => setRecNote(e.target.value)}
          placeholder="Mensagem opcional para o usuário (ex: Esta carreira combina muito com seu perfil!)"
          rows={2}
          style={{
            width: "100%", borderRadius: 8, border: "1.5px solid #ddd6fe",
            padding: "8px 10px", fontFamily: font, fontSize: "0.85rem",
            resize: "none", outline: "none", boxSizing: "border-box",
            marginBottom: "0.625rem", background: "#fff",
          }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSaveRecommendation}
            disabled={!recCareerId || savingRec}
            style={{
              padding: "0.5rem 1.25rem", borderRadius: 8, border: "none",
              background: !recCareerId || savingRec ? "#c4b5fd" : "#7c3aed",
              color: "#fff", cursor: !recCareerId || savingRec ? "not-allowed" : "pointer",
              fontFamily: font, fontSize: "0.85rem", fontWeight: 600, transition: "background 0.15s",
            }}
          >
            {savingRec ? "Salvando..." : recommendation ? "Atualizar recomendação" : "Enviar recomendação"}
          </button>
          {recommendation && (
            <button
              onClick={handleRemoveRecommendation}
              disabled={savingRec}
              style={{
                padding: "0.5rem 1rem", borderRadius: 8, border: "none",
                background: "#fee2e2", color: "#b91c1c", cursor: "pointer",
                fontFamily: font, fontSize: "0.85rem", fontWeight: 500,
              }}
            >
              Remover
            </button>
          )}
        </div>
      </Card>}

      {selectedCareers.length > 0 && (
        <Card style={{ marginBottom: "1rem", borderLeft: `3px solid ${careersSource === "chosen" ? "#6366f1" : "#f59e0b"}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: careersSource === "chosen" ? "#6366f1" : "#b45309", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {careersSource === "chosen" ? "Carreiras escolhidas — Horizonte Ampliado" : "Carreiras mais compatíveis com o perfil"}
            </p>
            {careersSource === "recommended" && (
              <span style={{ fontSize: "0.7rem", background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>
                Baseado nas respostas
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {selectedCareers.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: c.icon_color || "#6366f1",
                }} />
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f172a" }}>{c.title}</span>
                {careersSource === "recommended" && c.match_score > 0 && (
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{Math.round(c.match_score * 100)}% compatível</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {answers.length === 0 ? (
        <Card><p style={{ color: "#94a3b8", textAlign: "center", margin: 0 }}>Nenhuma resposta encontrada para esta sessão.</p></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {answers.map(a => (
            <div key={a.id} style={{
              background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0",
              padding: "1rem 1.25rem", display: "flex", gap: "1rem", alignItems: "flex-start",
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 4px", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>Pergunta</p>
                <p style={{ margin: "0 0 8px", fontSize: "0.9rem", color: "#0f172a", fontWeight: 500 }}>{getQuestionText(a.question_id)}</p>
                <p style={{ margin: "0 0 4px", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>Resposta</p>
                <Badge color="blue">{getOptionText(a.question_id, a.option_id)}</Badge>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                {a.created_at && <p style={{ margin: "0 0 8px", fontSize: "0.72rem", color: "#94a3b8" }}>{new Date(a.created_at).toLocaleString("pt-BR")}</p>}
                <button onClick={() => setConfirm(a.id)} style={{
                  padding: "0.4rem 0.875rem", borderRadius: 8, border: "none",
                  background: "#fee2e2", color: "#b91c1c", cursor: "pointer",
                  fontFamily: font, fontSize: "0.78rem", fontWeight: 600,
                }}>Apagar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <ConfirmModal
          message="Apagar esta resposta? Esta ação não pode ser desfeita."
          onConfirm={() => {
            onDeleteAnswer(confirm);
            setAnswers(prev => prev.filter(a => a.id !== confirm));
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── ABA: USUÁRIOS ───────────────────────────────────────────────────────────
function UsersTab({ users }) {
  const [search, setSearch] = useState("");
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: "1.25rem", alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email..."
          style={{ flex: 1, height: 38, borderRadius: 10, border: "1.5px solid #e2e8f0", padding: "0 12px", fontFamily: font, fontSize: "0.875rem", outline: "none" }}
        />
        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{filtered.length} usuário(s)</span>
      </div>

      {filtered.length === 0 ? (
        <Card><p style={{ color: "#94a3b8", textAlign: "center", margin: 0 }}>Nenhum usuário encontrado.</p></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(u => (
            <div key={u.id} style={{
              background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0",
              padding: "1rem 1.25rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: "#eef2ff", color: "#6366f1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: "1rem",
                }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 3px", fontWeight: 600, fontSize: "0.925rem", color: "#0f172a" }}>{u.name}</p>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>{u.email}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
                  <Badge color={u.login_type === "google" ? "blue" : "gray"}>
                    {u.login_type === "google" ? "Google" : "Email/Senha"}
                  </Badge>
                  <Badge color={u.modules_completed > 0 ? "green" : "gray"}>
                    {u.modules_completed} módulo(s)
                  </Badge>
                  {u.created_at && (
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              </div>

              {u.definitive_career && (
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
                  <p style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Carreira Definitiva
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: u.definitive_career.icon_color || "#6366f1", flexShrink: 0 }} />
                    <span style={{
                      fontSize: "0.875rem", fontWeight: 700, color: "#0f172a",
                      padding: "4px 14px", borderRadius: 99,
                      background: `${u.definitive_career.icon_color || "#6366f1"}18`,
                      border: `1.5px solid ${u.definitive_career.icon_color || "#6366f1"}40`,
                    }}>{u.definitive_career.title}</span>
                  </div>
                </div>
              )}

              {!u.definitive_career && u.selected_careers && u.selected_careers.length > 0 && (
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
                  <p style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Carreiras em análise
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {u.selected_careers.map((title, i) => (
                      <span key={i} style={{
                        fontSize: "0.78rem", padding: "3px 10px", borderRadius: 99,
                        background: "#eff6ff", color: "#1d4ed8", fontWeight: 500,
                        border: "1px solid #bfdbfe",
                      }}>{title}</span>
                    ))}
                  </div>
                </div>
              )}

              {u.admin_recommendation && (
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
                  <p style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    💡 Recomendação do orientador
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: u.admin_recommendation.icon_color || "#8b5cf6", flexShrink: 0 }} />
                    <span style={{
                      fontSize: "0.875rem", fontWeight: 700, color: "#4c1d95",
                      padding: "4px 14px", borderRadius: 99,
                      background: "#ede9fe", border: "1.5px solid #c4b5fd",
                    }}>{u.admin_recommendation.title}</span>
                  </div>
                  {u.admin_recommendation.note && (
                    <p style={{ margin: "0.375rem 0 0", fontSize: "0.8rem", color: "#6d28d9", fontStyle: "italic" }}>
                      "{u.admin_recommendation.note}"
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ABA: CARREIRAS ───────────────────────────────────────────────────────────
function CareersTab({ careers }) {
  return (
    <div>
      <p style={{ margin: "0 0 1rem", fontSize: "0.8rem", color: "#64748b" }}>{careers.length} carreira(s) cadastrada(s)</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
        {careers.map(c => (
          <Card key={c.id}>
            <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: "0.9rem", color: "#0f172a" }}>{c.title}</p>
            <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.4 }}>{c.description}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {(c.tags || "").split(",").filter(Boolean).map((t, i) => (
                <span key={i} style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 99, background: "#f1f5f9", color: "#475569" }}>{t.trim()}</span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN APP ────────────────────────────────────────────────────────────────
export default function Admin() {
  const [tab, setTab] = useState("users");
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [careers, setCareers] = useState([]);
  const [stats, setStats] = useState({ sessions: 0, answers: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [progressData, careersData, usersData] = await Promise.all([
        api("GET", "/admin/sessions"),
        api("GET", "/careers"),
        api("GET", "/admin/users"),
      ]);
      setSessions(progressData.sessions || []);
      setStats(progressData.stats || {});
      setCareers(careersData);
      setUsers(usersData.users || []);
    } catch (e) {
      setError("Não foi possível conectar ao backend. Verifique se o servidor está rodando.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleDeleteSession(sessionId) {
    try {
      await api("DELETE", `/admin/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      setStats(prev => ({ ...prev, sessions: prev.sessions - 1 }));
      // Zera os dados do usuário correspondente na aba Usuários
      setUsers(prev => prev.map(u =>
        u.email === sessionId
          ? { ...u, modules_completed: 0, selected_careers: [], definitive_career: null }
          : u
      ));
    } catch { alert("Erro ao apagar sessão."); }
  }

  async function handleDeleteAnswer(answerId) {
    try {
      await api("DELETE", `/admin/answers/${answerId}`);
    } catch { alert("Erro ao apagar resposta."); }
  }

  const TABS = [
    { key: "users", label: "Usuários" },
    { key: "sessions", label: "Sessões" },
    { key: "careers", label: "Carreiras" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: font }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 16 }}>⚙️</span>
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>Painel Admin</p>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8" }}>Próximo Destino</p>
            </div>
          </div>
          <button onClick={loadData} style={{
            padding: "0.5rem 1rem", borderRadius: 8, border: "1.5px solid #e2e8f0",
            background: "#fff", cursor: "pointer", fontFamily: font, fontSize: "0.8rem",
          }}>↺ Atualizar</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem", color: "#b91c1c", fontSize: "0.875rem" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <Stat label="Usuários cadastrados" value={loading ? "..." : users.length} color="#6366f1" />
          <Stat label="Total de respostas" value={loading ? "..." : stats.answers || 0} color="#0ea5e9" />
          <Stat label="Módulos concluídos" value={loading ? "..." : stats.completed || 0} color="#10b981" />
          <Stat label="Carreiras cadastradas" value={loading ? "..." : careers.length} color="#f59e0b" />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: "1.25rem", background: "#f1f5f9", padding: 4, borderRadius: 10, width: "fit-content" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSelectedSession(null); }} style={{
              padding: "0.5rem 1.25rem", borderRadius: 8, border: "none",
              background: tab === t.key ? "#fff" : "transparent",
              color: tab === t.key ? "#0f172a" : "#64748b",
              fontWeight: tab === t.key ? 600 : 400,
              cursor: "pointer", fontFamily: font, fontSize: "0.875rem",
              boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <p style={{ color: "#94a3b8" }}>Carregando dados...</p>
        ) : tab === "users" ? (
          <UsersTab users={users} />
        ) : tab === "sessions" ? (
          selectedSession ? (
            <SessionAnswersTab
              sessionId={selectedSession}
              onBack={() => setSelectedSession(null)}
              onDeleteAnswer={handleDeleteAnswer}
              allCareers={careers}
            />
          ) : (
            <SessionsTab
              sessions={sessions}
              onSelectSession={setSelectedSession}
              onDeleteSession={handleDeleteSession}
            />
          )
        ) : (
          <CareersTab careers={careers} />
        )}
      </div>
    </div>
  );
}
