export function UndoBanner({ message, onUndo }: { message: string; onUndo: () => void }) {
  return (
    <div className="undo-banner" role="status">
      <span>{message}</span>
      <button type="button" className="btn tap-target" onClick={onUndo}>
        Annuler
      </button>
    </div>
  );
}
