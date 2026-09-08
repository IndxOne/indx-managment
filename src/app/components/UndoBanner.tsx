import type { CSSProperties } from "react";

export function UndoBanner({
  message,
  onUndo,
  style,
}: {
  message: string;
  onUndo: () => void;
  style?: CSSProperties;
}) {
  return (
    <div className="undo-banner" role="status" style={style}>
      <span>{message}</span>
      <button type="button" className="btn tap-target" onClick={onUndo}>
        Annuler
      </button>
    </div>
  );
}
