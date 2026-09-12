import { useState } from "react";
import type { Member } from "../../domain/member";
import { useInlineCreate } from "../hooks/useInlineCreate";
import { BottomSheet } from "./BottomSheet";
import { IconPencil, IconPlus } from "./Icons";

/**
 * Gestion minimale des membres d'un espace (Lot 8B §B) : étiquettes
 * d'organisation, pas des comptes — ajouter, renommer, désactiver.
 * Jamais de suppression physique (une action déjà assignée ne doit jamais
 * perdre silencieusement son responsable).
 */
export function MembersSheet({
  members,
  onClose,
  onAdd,
  onRename,
  onSetActive,
}: {
  members: Member[];
  onClose: () => void;
  onAdd: (displayName: string) => void;
  onRename: (memberId: string, displayName: string) => void;
  onSetActive: (memberId: string, active: boolean) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const { title, setTitle, submit, inputRef } = useInlineCreate(onAdd);

  return (
    <BottomSheet title="Membres" onClose={onClose}>
      <div className="choice-group" style={{ marginBottom: 8 }}>
        {members.length === 0 ? (
          <p className="action-sub" style={{ padding: "var(--space-3) var(--space-4)" }}>
            Aucun membre pour l'instant.
          </p>
        ) : (
          members.map((member) =>
            renamingId === member.id ? (
              <RenameRow
                key={member.id}
                member={member}
                onCancel={() => setRenamingId(null)}
                onConfirm={(displayName) => {
                  onRename(member.id, displayName);
                  setRenamingId(null);
                }}
              />
            ) : (
              <div key={member.id} className="action-menu-row">
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="action-menu-row-label">{member.displayName}</span>
                  {!member.active && <span className="action-menu-row-sub">Inactif</span>}
                </span>
                <button
                  type="button"
                  className="btn btn-icon tap-target"
                  onClick={() => setRenamingId(member.id)}
                  aria-label={`Renommer ${member.displayName}`}
                >
                  <IconPencil width={16} height={16} />
                </button>
                <button
                  type="button"
                  className="btn tap-target"
                  onClick={() => onSetActive(member.id, !member.active)}
                  aria-label={member.active ? `Désactiver ${member.displayName}` : `Réactiver ${member.displayName}`}
                >
                  {member.active ? "Désactiver" : "Réactiver"}
                </button>
              </div>
            )
          )
        )}
      </div>

      <div className="quick-add">
        <button type="button" className="quick-add-plus" disabled={!title.trim()} aria-label="Ajouter" onClick={() => submit()}>
          <IconPlus width={20} height={20} strokeWidth={2.4} />
        </button>
        <input
          ref={inputRef}
          type="text"
          className="quick-add-input"
          placeholder="Ajouter un membre…"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          aria-label="Nom du nouveau membre"
        />
      </div>
    </BottomSheet>
  );
}

function RenameRow({
  member,
  onCancel,
  onConfirm,
}: {
  member: Member;
  onCancel: () => void;
  onConfirm: (displayName: string) => void;
}) {
  const [value, setValue] = useState(member.displayName);

  function handleSubmit() {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
  }

  return (
    <div className="action-menu-row">
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleSubmit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        aria-label={`Nouveau nom pour ${member.displayName}`}
        style={{ flex: 1, minWidth: 0 }}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- champ révélé par un clic explicite sur "Renommer", focus attendu
        autoFocus
      />
      <button type="button" className="btn btn-primary tap-target" onClick={handleSubmit} disabled={!value.trim()}>
        OK
      </button>
      <button type="button" className="btn tap-target" onClick={onCancel}>
        Annuler
      </button>
    </div>
  );
}
