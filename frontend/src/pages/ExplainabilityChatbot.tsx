import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Bot, Send, UserRound } from "lucide-react";
import type { GroupedExplanation, ModelInfo, PredictionRow } from "../types";

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

const PROMPTS = [
  "Why this prediction?",
  "What increased the score?",
  "What lowered the score?",
  "What does baseline mean?",
  "Can this diagnose PD?",
];

function formatPrecisePercent(value?: number | null) {
  return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "--";
}

function formatContribution(value?: number | null) {
  if (typeof value !== "number") return "--";
  const points = Math.abs(value) * 100;
  const digits = points >= 10 ? 1 : 2;
  return `${value >= 0 ? "+" : "-"}${points.toFixed(digits)} percentage points`;
}

function methodLabel(method?: string) {
  if (method === "native") return "Native SHAP";
  if (method === "kernel-grouped") return "Grouped Kernel SHAP";
  return "SHAP";
}

function groupList(groups: GroupedExplanation[], emptyText: string) {
  if (!groups.length) return emptyText;
  return groups
    .slice(0, 3)
    .map((group) => `${group.name} (${formatContribution(group.value)}, ${group.featureCount} features)`)
    .join("; ");
}

function predictionSignature(prediction: PredictionRow | null) {
  if (!prediction) return "empty";
  return [
    prediction.model_key,
    prediction.row_index,
    prediction.source,
    prediction.probability.toFixed(6),
  ].join("|");
}

function buildAnswer(question: string, prediction: PredictionRow, selectedModel: ModelInfo | null) {
  const normalized = question.toLowerCase();
  const explanation = prediction.explanation;
  const groups = explanation?.groups ?? [];
  const increased = groups.filter((group) => group.value > 0).sort((a, b) => b.absValue - a.absValue);
  const decreased = groups.filter((group) => group.value < 0).sort((a, b) => b.absValue - a.absValue);
  const baseValue = typeof explanation?.base_value === "number" ? explanation.base_value : null;
  const groupedShift = baseValue !== null ? prediction.probability - baseValue : null;
  const modelName =
    selectedModel?.model_key === prediction.model_key
      ? selectedModel.model_name
      : prediction.model_key.split("_").pop() ?? prediction.model_key;
  const method = methodLabel(explanation?.method);
  const probability = formatPrecisePercent(prediction.probability);
  const confidence = formatPrecisePercent(prediction.confidence);
  const baseline = formatPrecisePercent(baseValue);
  const shift = formatContribution(groupedShift);

  if (/(diagnos|doctor|clinical|medical|disease|safe|trust|can this)/i.test(normalized)) {
    return "No. This is research-support output only. It can explain how the model reached this score for the uploaded sample, but it cannot diagnose Parkinson's disease or replace clinical review.";
  }

  if (/(baseline|base value|base_value|grouped shift|shift)/i.test(normalized)) {
    if (baseValue === null) {
      return `The model did not return a baseline value for this explanation. The displayed probability is ${probability}, and the available grouped SHAP drivers show the direction of influence.`;
    }
    return `Baseline is the model's starting Parkinson's-positive probability before this sample's grouped voice-signal changes are added. Here the baseline is ${baseline}, the grouped shift is ${shift}, and the final displayed probability is ${probability}.`;
  }

  if (/(probability|confidence|risk|prediction|why|result|label)/i.test(normalized)) {
    const topUp = groupList(increased, "no upward grouped driver");
    const topDown = groupList(decreased, "no downward grouped driver");
    return `The ${modelName} model predicted ${prediction.predicted_label} with ${probability} probability and ${confidence} confidence. The final probability comes from the baseline ${baseline}, plus a grouped shift of ${shift}. Main upward drivers: ${topUp}. Main downward drivers: ${topDown}.`;
  }

  if (/(increase|raised|higher|positive|red|pushed up|score up)/i.test(normalized)) {
    return `The strongest groups that increased the Parkinson's-positive probability were: ${groupList(increased, "none of the grouped drivers increased the score")}. Red bars in the chart show these upward contributions.`;
  }

  if (/(decrease|lower|lowered|green|reduced|softened|score down)/i.test(normalized)) {
    return `The strongest groups that lowered the Parkinson's-positive probability were: ${groupList(decreased, "none of the grouped drivers lowered the score")}. Green bars in the chart show these downward contributions.`;
  }

  if (/(shap|method|kernel|native|explain|xai)/i.test(normalized)) {
    return `This explanation uses ${method} on the ${explanation?.output_scale ?? "probability"} scale. The groups summarize many raw voice features into readable signal families, so the chart shows grouped percentage-point movements rather than a raw 753-feature table.`;
  }

  return "I can answer questions about this prediction's probability, confidence, baseline, grouped shift, SHAP method, and which grouped voice-signal families increased or lowered the score. Try one of the prompt chips above.";
}

export function ExplainabilityChatbot({
  prediction,
  selectedModel,
}: {
  prediction: PredictionRow | null;
  selectedModel: ModelInfo | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const signature = useMemo(() => predictionSignature(prediction), [prediction]);
  const disabled = !prediction?.explanation;

  useEffect(() => {
    if (!prediction?.explanation) {
      setMessages([]);
      setDraft("");
      return;
    }

    setMessages([
      {
        role: "assistant",
        text: "Ask me about this prediction's probability, baseline, grouped SHAP drivers, or what the red and green bars mean.",
      },
    ]);
    setDraft("");
  }, [signature, prediction]);

  function ask(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || disabled || !prediction) return;

    const answer = buildAnswer(cleanQuestion, prediction, selectedModel);
    setMessages((existing) => [
      ...existing,
      { role: "user", text: cleanQuestion },
      { role: "assistant", text: answer },
    ]);
    setDraft("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(draft);
  }

  return (
    <div className={`xai-chatbot ${disabled ? "disabled" : ""}`}>
      <div className="xai-chatbot-header">
        <div>
          <span>XAI Chat</span>
          <h3>Ask about this explanation</h3>
        </div>
        <Bot size={22} />
      </div>

      <div className="chat-prompts" aria-label="Suggested XAI questions">
        {PROMPTS.map((prompt) => (
          <button key={prompt} type="button" onClick={() => ask(prompt)} disabled={disabled}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="chat-thread" aria-live="polite">
        {disabled ? (
          <div className="chat-message assistant">
            <Bot size={16} />
            <p>Run a prediction first to chat about its explanation.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
              {message.role === "assistant" ? <Bot size={16} /> : <UserRound size={16} />}
              <p>{message.text}</p>
            </div>
          ))
        )}
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          value={draft}
          disabled={disabled}
          placeholder={disabled ? "Run a prediction first" : "Ask about this prediction"}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" disabled={disabled || !draft.trim()} aria-label="Send chat message">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
