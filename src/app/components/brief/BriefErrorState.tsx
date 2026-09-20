import { ErrorState } from "../StateBlocks";
import { briefErrorToUserMessage } from "../../utils/brief-labels";
import type { PersistenceError } from "../../../infrastructure/persistence/v3/errors";

/** Message utilisateur déterministe — jamais PersistenceError.message brut
 * (§2 de la gate). */
export function BriefErrorState({ error, onRetry }: { error: PersistenceError; onRetry: () => void }) {
  return <ErrorState description={briefErrorToUserMessage(error)} onRetry={onRetry} />;
}
