import type { Member } from "../../domain/member";
import { BottomSheet } from "./BottomSheet";

/**
 * Sélection du/des responsable(s) d'une action (Lot 8B §D). Un membre
 * inactif déjà assigné reste affiché (coché, non décochable individuellement
 * n'est pas nécessaire : le décocher retire simplement l'assignation) mais
 * n'apparaît jamais comme choix pour une NOUVELLE assignation.
 */
export function MemberAssignSheet({
  members,
  assigneeIds,
  onClose,
  onChangeAssignees,
}: {
  members: Member[];
  assigneeIds: string[];
  onClose: () => void;
  onChangeAssignees: (assigneeIds: string[]) => void;
}) {
  const alreadyAssignedInactive = members.filter(
    (member) => !member.active && assigneeIds.includes(member.id)
  );
  const selectable = [...members.filter((member) => member.active), ...alreadyAssignedInactive];

  function toggle(memberId: string) {
    const next = assigneeIds.includes(memberId)
      ? assigneeIds.filter((id) => id !== memberId)
      : [...assigneeIds, memberId];
    onChangeAssignees(next);
  }

  return (
    <BottomSheet title="Responsable" onClose={onClose}>
      <div className="choice-group" style={{ marginBottom: 8 }}>
        <label className="choice-option">
          <input type="checkbox" checked={assigneeIds.length === 0} onChange={() => onChangeAssignees([])} />
          Non assigné
        </label>
        {selectable.map((member) => (
          <label key={member.id} className="choice-option">
            <input type="checkbox" checked={assigneeIds.includes(member.id)} onChange={() => toggle(member.id)} />
            {member.displayName}
            {!member.active && <span className="action-sub"> · Inactif</span>}
          </label>
        ))}
      </div>
      <div className="choice-group">
        <button type="button" className="action-menu-item" style={{ justifyContent: "center", fontWeight: 600 }} onClick={onClose}>
          Fermer
        </button>
      </div>
    </BottomSheet>
  );
}
