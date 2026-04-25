import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";

const CONFIG = {
  WEBHOOK_URL: "https://g4bn4t-n8n.duckdns.org/webhook/3dfef37d-d21b-4eec-af3d-1a79f1c26dc8",
  GREETING:
    "¡Hola! 👋 Soy el asistente de JugueteAR.\n¿En qué te puedo ayudar? Podés preguntarme sobre juguetes, precios o pedir una cotización.",
};

const genId = () => "sid_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);

const FloatingChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(genId());
  const [messages, setMessages] = useState<{ id: string; role: "user" | "bot" | "sys"; text: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [flowDone, setFlowDone] = useState(false);
  const [flowPayload, setFlowPayload] = useState<any>(null);
  const [downloaded, setDownloaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, flowDone]);

  // Foco en el input y saludo inicial al abrir
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addMessage("bot", CONFIG.GREETING);
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const addMessage = (role: "user" | "bot" | "sys", text: string) => {
    setMessages((prev) => [...prev, { id: genId(), role, text }]);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || flowDone) return;

    addMessage("user", text);
    setInputValue("");
    setIsTyping(true);

    try {
      const res = await fetch(CONFIG.WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: text,
          timestamp: new Date().toISOString(),
        }),
      });
      const data = await res.json();

      if (data.reply) addMessage("bot", data.reply);
      if (data.done === true) {
        setFlowDone(true);
        setFlowPayload(data.payload ?? null);
      }
    } catch (error) {
      addMessage("bot", "No pude conectar con el servidor. ¿Intentás de nuevo?");
    } finally {
      setIsTyping(false);
      if (!flowDone) inputRef.current?.focus();
    }
  };

  const handleAction = async (action: "download" | "email") => {
    if (downloaded) return;
    setDownloaded(true);
    setIsTyping(true);

    try {
      if (action === "download") {
        const cotizacionId = flowPayload?.cotizacion_id;
        if (!cotizacionId) {
          addMessage("bot", "No es posible descarga la cotización en este momento. Intenta más tarde.");
          setIsTyping(false);
          return;
        }

        const res = await fetch(`https://g4bn4t-n8n.duckdns.org/webhook/descargar_cotizacion?id=${cotizacionId}`, {
          method: "GET",
          //headers: { "Content-Type": "application/json" },
          //body: JSON.stringify({ cotizacion_id: cotizacionId }),
        });

        if (!res.ok) throw new Error("Error al generar el PDF");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cotizacion_${cotizacionId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }

      setFlowDone(true);
      addMessage(
        "bot",
        action === "download"
          ? "✅ Tu cotización se está descargando. ¡Gracias por elegirnos! 🎉"
          : "✅ ¡Listo! Enviamos la cotización a tu correo. Revisá tu bandeja 📬",
      );

      // Cierre automático y reseteo después de 3 segundos
      setTimeout(() => {
        setIsOpen(false);
        setTimeout(() => {
          setMessages([]);
          setFlowDone(false);
          setFlowPayload(null);
          setSessionId(genId());
          setDownloaded(false);
        }, 1000);
      }, 3000);
    } catch (error) {
      addMessage("bot", "Hubo un error. Por favor intentá de nuevo.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes pulse-btn {
          0%, 100% { box-shadow: 0 4px 18px rgba(21,101,192,0.45); }
          50% { box-shadow: 0 4px 28px rgba(21,101,192,0.75); transform: scale(1.04); }
        }
        @keyframes bounce-dots {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        .animate-pulse-btn { animation: pulse-btn 2.5s ease-in-out infinite; }
        .typing-dot { animation: bounce-dots 1.2s ease-in-out infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      {/* Botón Flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="¡Cotizá por chat!"
        className={`fixed bottom-7 right-7 z-[9999] w-[60px] h-[60px] rounded-full bg-[#1565C0] border-none cursor-pointer flex items-center justify-center text-white transition-transform hover:scale-110 ${!isOpen ? "animate-pulse-btn" : ""}`}
      >
        {flowDone && !isOpen && (
          <span className="absolute -top-1 -right-1 bg-[#e53935] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            1
          </span>
        )}
        {isOpen ? <X size={26} strokeWidth={2.5} /> : <MessageCircle size={26} strokeWidth={2} />}
      </button>

      {/* Panel del Chatbot */}
      {isOpen && (
        <div className="fixed bottom-[100px] right-7 z-[9998] w-[370px] max-h-[590px] h-[80vh] rounded-[18px] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-[#1565C0] text-white px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">🧸</div>
            <div className="flex-1">
              <div className="text-sm font-bold">Asistente JugueteAR</div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white p-1">
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2.5 bg-[#F5F7FA]">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[#1565C0] text-white rounded-tr-sm"
                      : "bg-white text-[#1a1a1a] border border-[#e0e0e0] rounded-tl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#e0e0e0] rounded-2xl rounded-tl-sm px-3.5 py-3">
                  <div className="flex gap-1">
                    <span className="typing-dot w-2 h-2 rounded-full bg-[#90A4AE]"></span>
                    <span className="typing-dot w-2 h-2 rounded-full bg-[#90A4AE]"></span>
                    <span className="typing-dot w-2 h-2 rounded-full bg-[#90A4AE]"></span>
                  </div>
                </div>
              </div>
            )}

            {flowDone && !isTyping && flowPayload?.cotizacion_id && (
              <div className="flex justify-start mt-2">
                <div className="bg-white border border-[#e0e0e0] rounded-2xl rounded-tl-sm p-3.5 max-w-[88%]">
                  <p className="text-[13px] text-[#555] mb-3">
                    ¡Tu cotización está lista! En breve se enviará por correo. Si lo deseas puedes descargarla aquí
                    abajo:
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleAction("download")}
                      disabled={downloaded || isTyping}
                      className="bg-[#1565C0] text-white py-2.5 px-4 rounded-xl text-[13.5px] font-bold transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 disabled:bg-[#B0BEC5] disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:opacity-100"
                    >
                      {downloaded ? "✅ Descargado" : "⬇ Descargar cotización"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="flex gap-2 p-2.5 bg-white border-t border-[#e8e8e8] shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escribí tu consulta..."
              disabled={flowDone || isTyping}
              className="flex-1 border-[1.5px] border-[#e0e0e0] rounded-full px-4 py-2 text-[13.5px] outline-none bg-[#F5F7FA] focus:border-[#1565C0] focus:bg-white transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || flowDone || isTyping}
              className="w-10 h-10 rounded-full bg-[#1565C0] text-white flex items-center justify-center shrink-0 transition-colors hover:bg-[#0D47A1] disabled:bg-[#B0BEC5] disabled:cursor-not-allowed"
            >
              <Send size={18} strokeWidth={2} className="ml-[-2px] mt-[2px]" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChatButton;
