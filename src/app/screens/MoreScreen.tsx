const STUB_LINKS = ["Rappels", "Carnet", "Hub", "Réglages"];

/**
 * Cadrage §8 : "Rappels, Carnet, Hub et réglages restent dans Plus ou
 * contexte espace." Leur intégration réelle est hors périmètre du Lot 2
 * (Carnet/Hub = Lot 5). Stub de navigation uniquement.
 */
export function MoreScreen() {
  return (
    <div>
      <div className="top-bar">
        <h1>Plus</h1>
      </div>
      <div className="app-main">
        <ul className="list action-card-list">
          {STUB_LINKS.map((label) => (
            <li key={label} className="action-card" style={{ opacity: 0.6 }}>
              <span className="card-title">{label}</span>
              <div className="card-meta">À venir</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
