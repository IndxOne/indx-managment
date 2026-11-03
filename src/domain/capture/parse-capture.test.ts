import { describe, expect, it } from "vitest";
import { matchSpace, parseCapture } from "./parse-capture";

// Mardi 3 novembre 2026, semaine ISO 45.
const TODAY = "2026-11-03";
const parse = (input: string) => parseCapture(input, TODAY);
const dayOf = (input: string) => {
  const s = parse(input).schedule;
  return s?.granularity === "day" ? s.value : s;
};

describe("parseCapture — dates relatives", () => {
  it("aujourd'hui, auj, ce soir → aujourd'hui", () => {
    expect(parse("Payer facture aujourd'hui")).toMatchObject({
      title: "Payer facture",
      schedule: { granularity: "day", value: TODAY },
      tokens: [{ kind: "date", label: "Aujourd'hui" }],
    });
    expect(dayOf("Payer auj")).toBe(TODAY);
    expect(dayOf("Appeler ce soir")).toBe(TODAY);
    expect(dayOf("Payer aujourd’hui")).toBe(TODAY); // apostrophe typographique
  });

  it("demain, avec libellé « Demain »", () => {
    const r = parse("Appeler demain");
    expect(r.schedule).toEqual({ granularity: "day", value: "2026-11-04" });
    expect(r.tokens).toEqual([{ kind: "date", label: "Demain" }]);
  });

  it("après-demain avec ou sans accent/tiret", () => {
    expect(dayOf("Relancer après-demain")).toBe("2026-11-05");
    expect(dayOf("Relancer apres demain")).toBe("2026-11-05");
    expect(dayOf("Relancer APRES-DEMAIN")).toBe("2026-11-05");
  });

  it("jour de la semaine → prochaine occurrence, libellé court", () => {
    const r = parse("Réunion lundi");
    expect(r.schedule).toEqual({ granularity: "day", value: "2026-11-09" });
    expect(r.tokens[0]?.label).toBe("Lun. 9 nov.");
    expect(dayOf("Réunion ce vendredi")).toBe("2026-11-06");
    expect(dayOf("Réunion jeudi prochain")).toBe("2026-11-05");
  });

  it("même jour de la semaine → semaine suivante", () => {
    expect(dayOf("Point mardi")).toBe("2026-11-10");
  });

  it("dans N jours / j / semaines", () => {
    expect(dayOf("Relance dans 3 jours")).toBe("2026-11-06");
    expect(dayOf("Relance dans 10 j")).toBe("2026-11-13");
    expect(dayOf("Relance dans 2 semaines")).toBe("2026-11-17");
  });

  it("semaines et mois", () => {
    expect(parse("Bilan cette semaine").schedule).toEqual({ granularity: "week", value: "2026-W45" });
    expect(parse("Bilan semaine prochaine")).toMatchObject({
      title: "Bilan",
      schedule: { granularity: "week", value: "2026-W46" },
      tokens: [{ kind: "date", label: "Semaine prochaine" }],
    });
    expect(parse("Budget ce mois-ci").schedule).toEqual({ granularity: "month", value: "2026-11" });
    expect(parse("Budget ce mois").schedule).toEqual({ granularity: "month", value: "2026-11" });
    expect(parse("Budget mois prochain").schedule).toEqual({ granularity: "month", value: "2026-12" });
  });

  it("mois prochain en décembre → janvier suivant", () => {
    expect(parseCapture("Budget mois prochain", "2026-12-15").schedule).toEqual({
      granularity: "month",
      value: "2027-01",
    });
  });
});

describe("parseCapture — dates explicites", () => {
  it("12/11 et 12/11/2026", () => {
    expect(dayOf("Livrer 12/11")).toBe("2026-11-12");
    expect(dayOf("Livrer 12/11/2027")).toBe("2027-11-12");
  });

  it("date passée sans année → année suivante", () => {
    expect(dayOf("Vœux 02/01")).toBe("2027-01-02");
    expect(dayOf("Archiver 01/11/2026")).toBe("2026-11-01"); // année explicite conservée
  });

  it("12 nov, 12 novembre, 1er décembre 2027", () => {
    expect(dayOf("Livrer 12 nov")).toBe("2026-11-12");
    expect(dayOf("Livrer 12 novembre")).toBe("2026-11-12");
    expect(dayOf("Livrer 1er décembre 2027")).toBe("2027-12-01");
    expect(dayOf("Livrer 15 mars")).toBe("2027-03-15");
  });

  it("date inexistante ignorée et laissée dans le titre", () => {
    const r = parse("Payer 31/02");
    expect(r.schedule).toBeUndefined();
    expect(r.title).toBe("Payer 31/02");
  });

  it("seule la première date compte", () => {
    const r = parse("Préparer demain la réunion de lundi");
    expect(r.schedule).toEqual({ granularity: "day", value: "2026-11-04" });
    expect(r.title).toBe("Préparer la réunion de lundi");
  });
});

describe("parseCapture — bornes de mots", () => {
  it("pas de faux positif dans les mots", () => {
    for (const input of ["Joindre le demandeur", "Les lundis matin", "Ajuster le budget", "Courrier importantissime"]) {
      const r = parse(input);
      expect(r.tokens).toEqual([]);
      expect(r.title).toBe(input);
    }
  });

  it("« ! » collé à un mot n'est pas une priorité", () => {
    expect(parse("Super!").priority).toBeUndefined();
  });
});

describe("parseCapture — priorité, attente, espace", () => {
  it("!, !!, urgent, important, prioritaire → high", () => {
    for (const input of ["Rapport !", "Rapport !!", "Rapport urgent", "Rapport IMPORTANT", "Rapport prioritaire"]) {
      expect(parse(input)).toMatchObject({
        title: "Rapport",
        priority: "high",
        tokens: [{ kind: "priority", label: "Prioritaire" }],
      });
    }
  });

  it("@attente et en attente", () => {
    expect(parse("Devis @attente")).toMatchObject({ title: "Devis", waiting: true, tokens: [{ label: "En attente" }] });
    expect(parse("Devis en attente").waiting).toBe(true);
  });

  it("#espace unicode, casse et accents conservés", () => {
    expect(parse("Commander fleurs #Mariage-été")).toMatchObject({
      title: "Commander fleurs",
      spaceQuery: "Mariage-été",
      tokens: [{ kind: "space", label: "#Mariage-été" }],
    });
  });

  it("mot-clé collé à # reste dans l'espace", () => {
    const r = parse("Tâche #urgent");
    expect(r.spaceQuery).toBe("urgent");
    expect(r.priority).toBeUndefined();
  });
});

describe("parseCapture — combinaisons et titre", () => {
  it("Appeler Paul demain ! #mariage", () => {
    expect(parse("Appeler Paul demain ! #mariage")).toEqual({
      title: "Appeler Paul",
      schedule: { granularity: "day", value: "2026-11-04" },
      priority: "high",
      spaceQuery: "mariage",
      tokens: [
        { kind: "date", label: "Demain" },
        { kind: "priority", label: "Prioritaire" },
        { kind: "space", label: "#mariage" },
      ],
    });
  });

  it("jetons dans l'ordre d'apparition", () => {
    expect(parse("#perso urgent en attente lundi").tokens.map((t) => t.kind)).toEqual([
      "space",
      "priority",
      "waiting",
      "date",
    ]);
  });

  it("titre : espaces fusionnés et majuscule initiale", () => {
    expect(parse("  envoyer   demain   le  devis ").title).toBe("Envoyer le devis");
  });

  it("titre jamais vide : saisie d'origine si tout est reconnu", () => {
    const r = parse(" demain ");
    expect(r.title).toBe("Demain");
    expect(r.schedule).toEqual({ granularity: "day", value: "2026-11-04" });
  });

  it("saisie sans jeton", () => {
    expect(parse("")).toEqual({ title: "", tokens: [] });
    expect(parse("faire les courses")).toEqual({ title: "Faire les courses", tokens: [] });
  });
});

describe("matchSpace", () => {
  const spaces = [{ name: "Site mariage" }, { name: "Mariage" }, { name: "Été perso" }, { name: "Boulot" }];

  it("exact > commence par > contient, sans casse ni accents", () => {
    expect(matchSpace("mariage", spaces)).toBe(spaces[1]);
    expect(matchSpace("ete", spaces)).toBe(spaces[2]);
    expect(matchSpace("BOU", spaces)).toBe(spaces[3]);
    expect(matchSpace("mari", spaces)).toBe(spaces[1]);
    expect(matchSpace("site-m", spaces)).toBeUndefined();
    expect(matchSpace("perso", spaces)).toBe(spaces[2]);
  });

  it("requête vide ou inconnue → undefined", () => {
    expect(matchSpace("  ", spaces)).toBeUndefined();
    expect(matchSpace("xyz", spaces)).toBeUndefined();
  });
});
