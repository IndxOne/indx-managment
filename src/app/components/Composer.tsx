import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { todayInTimeZone } from "../../calendar/calendar-engine";
import { matchSpace, parseCapture } from "../../domain/capture/parse-capture";
import { useStore } from "../adapters/temporary-store";
import { IconArrowRight, IconMic } from "./Icons";
import { useToast } from "./Toast";

const LAST_SPACE_KEY = "indxone-last-space";
const DEFAULT_SPACE_NAME = "Mes actions";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Web Speech API (préfixée sur Chrome/Safari) : dictée sans serveur ni coût. */
type Recognition = { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null };
function speechRecognition(): (new () => Recognition) | undefined {
  const scope = window as unknown as Record<string, new () => Recognition>;
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

/**
 * Compositeur universel : on écrit (ou on dicte) comme on parle —
 * "Appeler Paul demain ! #mariage" — et l'app comprend la date, la
 * priorité et l'espace en direct. Aucun formulaire, aucun espace à créer
 * d'abord : sans espace existant, "Mes actions" est créé à la volée.
 */
export function Composer({ timezone }: { timezone: string }) {
  const { state, createAction, createWorkspaceAction } = useStore();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const Speech = useMemo(() => (typeof window === "undefined" ? undefined : speechRecognition()), []);

  const parsed = useMemo(() => parseCapture(text, todayInTimeZone(timezone)), [text, timezone]);
  const target = useMemo(() => {
    if (parsed.spaceQuery) return matchSpace(parsed.spaceQuery, state.workspaces);
    let last: string | null = null;
    try {
      last = localStorage.getItem(LAST_SPACE_KEY);
    } catch {
      // Stockage indisponible : on retombe sur le premier espace.
    }
    return state.workspaces.find((workspace) => workspace.id === last) ?? state.workspaces.find((w) => w.kind === "run") ?? state.workspaces[0];
  }, [parsed.spaceQuery, state.workspaces]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    // #mot inconnu → l'espace est créé à la volée ; aucun espace → "Mes actions".
    const workspace = target ?? createWorkspaceAction({ name: newSpaceName ?? DEFAULT_SPACE_NAME, kind: "run" });
    createAction({
      workspaceId: workspace.id,
      title: parsed.title,
      itemType: "task",
      priority: parsed.priority ?? "normal",
      status: parsed.waiting ? "waiting" : undefined,
      schedule: parsed.schedule,
    });
    try {
      localStorage.setItem(LAST_SPACE_KEY, workspace.id);
    } catch {
      // Sans stockage : pas de mémoire du dernier espace, rien de bloquant.
    }
    navigator.vibrate?.(8);
    const when = parsed.tokens.find((token) => token.kind === "date")?.label;
    showToast(`Ajoutée à ${workspace.name}${when ? ` · ${when}` : ""}`);
    setText("");
  }

  function dictate() {
    if (!Speech) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new Speech();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.onresult = (event) => setText((current) => `${current} ${event.results[0]?.[0]?.transcript ?? ""}`.trim());
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  const newSpaceName = parsed.spaceQuery && !target ? capitalize(parsed.spaceQuery) : undefined;
  return (
    <form className="composer" onSubmit={submit} role="search" aria-label="Ajouter une action">
      {text.trim() && (
        <div className="composer-preview" aria-live="polite">
          <span className="composer-chip composer-chip-space">
            {newSpaceName ? `Nouvel espace : ${newSpaceName}` : (target?.name ?? DEFAULT_SPACE_NAME)}
          </span>
          {parsed.tokens
            .filter((token) => token.kind !== "space")
            .map((token) => (
              <span key={token.kind} className="composer-chip">
                {token.label}
              </span>
            ))}
        </div>
      )}
      <div className="composer-field">
        <input
          className="composer-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Écrire ou dicter une action…"
          aria-label="Créer une action"
          enterKeyHint="send"
          autoComplete="off"
        />
        {Speech && (
          <button
            type="button"
            className="composer-mic"
            aria-pressed={listening}
            aria-label={listening ? "Arrêter la dictée" : "Dicter une action"}
            onClick={dictate}
          >
            <IconMic width={20} height={20} />
          </button>
        )}
        <button type="submit" className="composer-send" aria-label="Envoyer" disabled={!text.trim()}>
          <IconArrowRight width={20} height={20} strokeWidth={2.2} />
        </button>
      </div>
    </form>
  );
}
