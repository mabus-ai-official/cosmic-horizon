import { useState, useRef, useEffect } from "react";
import { askAI } from "../services/api";

interface Message {
  role: "user" | "aria";
  text: string;
}

interface Props {
  bare?: boolean;
}

const QUICK_QUESTIONS = [
  "How do I make money?",
  "What are planet classes?",
  "How does combat work?",
  "What should I do first?",
  "How do trade routes work?",
];

export default function AriaPanel({ bare }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "aria",
      text: "I'm ARIA, your ship's AI assistant. Ask me anything about the galaxy — trading, combat, planets, missions, or just what to do next.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const { data } = await askAI(q);
      setMessages((prev) => [...prev, { role: "aria", text: data.answer }]);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "I'm unavailable right now.";
      setMessages((prev) => [...prev, { role: "aria", text: msg }]);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="aria-panel">
      <div className="aria-messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`aria-msg aria-msg--${m.role}`}>
            <span className="aria-msg__label">
              {m.role === "aria" ? "ARIA" : "YOU"}
            </span>
            <span className="aria-msg__text">{m.text}</span>
          </div>
        ))}
        {loading && (
          <div className="aria-msg aria-msg--aria">
            <span className="aria-msg__label">ARIA</span>
            <span className="aria-msg__text aria-thinking">thinking...</span>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="aria-quick">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              className="aria-quick__btn"
              onClick={() => sendMessage(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="aria-input-row">
        <input
          className="aria-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          placeholder="Ask ARIA..."
          disabled={loading}
        />
        <button
          className="aria-send"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
        >
          ASK
        </button>
      </div>
    </div>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return content;
}
