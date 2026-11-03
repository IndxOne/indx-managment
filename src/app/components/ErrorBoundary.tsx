import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Filet de sécurité global : une erreur de rendu inattendue affiche un écran
 * clair avec une action ("Recharger") au lieu d'une page blanche.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erreur d'affichage non gérée", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="app-main fatal-error" role="alert">
        <h1>Oups, un souci d&apos;affichage.</h1>
        <p>Vos données ne sont pas perdues. Rechargez l&apos;app pour reprendre.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Recharger
        </button>
      </div>
    );
  }
}
