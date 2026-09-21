import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";

/**
 * Le Data API PostgREST plafonne toute réponse à 1000 lignes (`supabase/config.toml`,
 * `max_rows`) — silencieusement, sans erreur. Un reader dont le contrat est
 * "toutes les lignes accessibles" doit donc paginer explicitement dès qu'un
 * volume réel peut dépasser ce cap, plutôt que de risquer une troncature
 * muette (trouvé en review, PR #65).
 */
const PAGE_SIZE = 1000;

interface RawQueryResult<Row> {
  data: Row[] | null;
  error: { code?: string | null; message: string } | null;
}

/**
 * Récupère toutes les lignes d'une requête en la rejouant page par page via
 * `.range(from, to)`, jusqu'à ce qu'une page retourne moins de `PAGE_SIZE`
 * lignes (fin de résultat). `queryPage` doit appliquer un ordre stable
 * (colonne(s) déterministes) : sans lui, `.range()` n'a aucune garantie de
 * cohérence entre deux pages sur PostgREST.
 */
export async function fetchAllRows<Row>(
  queryPage: (from: number, to: number) => PromiseLike<RawQueryResult<Row>>
): Promise<PersistenceResult<Row[]>> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryPage(from, from + PAGE_SIZE - 1);
    if (error) return failResult(fromPostgrestError(error));
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return okResult(rows);
}
