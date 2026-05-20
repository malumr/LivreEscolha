import { useState } from "react";

const API = "http://localhost:8000";

export default function AdminPainel() {
  const [sessionId, setSessionId] = useState("");
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);

  async function buscarRespostas() {
    if (!sessionId) return;

    setLoading(true);

    try {
      const res = await fetch(
        `${API}/sessions/${sessionId}/answers`
      );

      const data = await res.json();
      setAnswers(data);
    } catch {
      alert("Erro ao buscar respostas");
    } finally {
      setLoading(false);
    }
  }

  async function apagarRespostas() {
    if (!sessionId) return;

    const confirmar = confirm(
      "Deseja realmente apagar as respostas?"
    );

    if (!confirmar) return;

    try {
      await fetch(
        `${API}/sessions/${sessionId}/answers`,
        {
          method: "DELETE",
        }
      );

      alert("Respostas apagadas!");

      setAnswers([]);
    } catch {
      alert("Erro ao apagar respostas");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
        padding: "40px 20px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: "white",
            borderRadius: "24px",
            padding: "30px",
            marginBottom: "24px",
            boxShadow: "0 10px 35px rgba(0,0,0,0.08)",
            border: "1px solid #e2e8f0",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "2rem",
              color: "#0f172a",
              fontWeight: "800",
            }}
          >
            Painel Administrativo
          </h1>

          <p
            style={{
              color: "#64748b",
              marginTop: "10px",
              fontSize: "1rem",
            }}
          >
            Gerencie sessões, visualize respostas e controle o sistema.
          </p>
        </div>

        {/* CARD */}
        <div
          style={{
            background: "white",
            borderRadius: "24px",
            padding: "30px",
            boxShadow: "0 10px 35px rgba(0,0,0,0.08)",
            border: "1px solid #e2e8f0",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#1e293b",
            }}
          >
            Buscar sessão
          </h2>

          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "20px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              placeholder="Digite o Session ID"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              style={{
                flex: 1,
                minWidth: "300px",
                padding: "14px",
                borderRadius: "14px",
                border: "1px solid #cbd5e1",
                fontSize: "0.95rem",
                outline: "none",
              }}
            />

            <button
              onClick={buscarRespostas}
              style={{
                background:
                  "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white",
                border: "none",
                padding: "14px 22px",
                borderRadius: "14px",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "0.95rem",
              }}
            >
              Buscar
            </button>

            <button
              onClick={apagarRespostas}
              style={{
                background:
                  "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "white",
                border: "none",
                padding: "14px 22px",
                borderRadius: "14px",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "0.95rem",
              }}
            >
              Apagar
            </button>
          </div>

          {/* RESULTADOS */}
          <div style={{ marginTop: "30px" }}>
            {loading ? (
              <p style={{ color: "#64748b" }}>
                Carregando respostas...
              </p>
            ) : answers.length === 0 ? (
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "16px",
                  padding: "30px",
                  textAlign: "center",
                  color: "#64748b",
                  border: "1px dashed #cbd5e1",
                }}
              >
                Nenhuma resposta encontrada.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "18px",
                }}
              >
                {answers.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      background: "#f8fafc",
                      borderRadius: "18px",
                      padding: "22px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          background: "#6366f1",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "999px",
                          fontSize: "0.8rem",
                          fontWeight: "700",
                        }}
                      >
                        Pergunta #{item.question_id}
                      </span>

                      <span
                        style={{
                          color: "#64748b",
                          fontSize: "0.8rem",
                        }}
                      >
                        {item.created_at}
                      </span>
                    </div>

                    <h3
                      style={{
                        margin: "0 0 10px",
                        color: "#0f172a",
                        fontSize: "1.1rem",
                      }}
                    >
                      {item.question}
                    </h3>

                    <div
                      style={{
                        background: "#eef2ff",
                        padding: "14px",
                        borderRadius: "12px",
                        color: "#4338ca",
                        fontWeight: "600",
                        border: "1px solid #c7d2fe",
                      }}
                    >
                      {item.answer}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}