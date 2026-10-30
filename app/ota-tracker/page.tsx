"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
const GDPR_URL = "https://eur-lex.europa.eu/eli/reg/2016/679/oj";
const EPRIVACY_URL = "https://eur-lex.europa.eu/eli/dir/2002/58/oj";
type Purpose = "Safety function" | "AI model training";
type Priority = "High" | "Medium";
type DataCategory =
  | "Driver-attention scores"
  | "Vehicle location"
  | "Raw cabin video";
// Each recipient is named by what it does with the data, not by its legal label.
const SERVICE_PROVIDER = "Service provider acting on the manufacturer's instructions";
const OTHER_COMPANY = "Other company using the data for its own purposes";
type Recipient =
  | "Vehicle only"
  | "Manufacturer"
  | typeof SERVICE_PROVIDER
  | typeof OTHER_COMPANY;
// "EU-approved" = the EU has found the country's data protection adequate (Art. 45). Check what the approval covers.
const APPROVED = "Outside EEA, EU-approved country (check scope)";
const NOT_APPROVED = "Outside EEA, no EU approval identified";
type Location = "EEA" | typeof APPROVED | typeof NOT_APPROVED;
type Retention = "Not stored" | "30 days" | "1 year";
const CONSENT = "Consent (people agree)";
const LEGITIMATE = "Legitimate interests (balanced against people's rights)";
const LEGAL_OBLIGATION = "Legal obligation (required by law)";
const NOT_DECIDED = "Not yet decided";
type LegalBasis =
  | typeof CONSENT
  | typeof LEGITIMATE
  | typeof LEGAL_OBLIGATION
  | typeof NOT_DECIDED;
type PrivacyNotice = "Up to date" | "Out of date";
type ProcessingState = {
  data: DataCategory;
  purpose: Purpose[];
  recipient: Recipient;
  location: Location;
  retention: Retention;
  // One legal basis per purpose; only the selected purposes are used.
  legalBasis: Record<Purpose, LegalBasis>;
  privacyNotice: PrivacyNotice;
};
// "state" rules look only at the proposed settings.
// "change" rules also compare the proposed settings with the baseline.
type Rule = {
  id: string;
  mode: "state" | "change";
  priority: Priority;
  title: string;
  trigger: string;
  issue: string;
  action: string;
  provisions: string[];
  guidance: string;
  when: (p: ProcessingState, b: ProcessingState) => boolean;
};
type Validation = {
  id: string;
  title: string;
  message: string;
  action: string;
  provisions?: string[];
};
type Change = {
  key: keyof ProcessingState;
  label: string;
  before: string;
  after: string;
};
const FIELDS: { key: keyof ProcessingState; label: string }[] = [
  { key: "data", label: "Data" },
  { key: "purpose", label: "Purpose(s)" },
  { key: "recipient", label: "Who receives the data" },
  { key: "location", label: "Data location" },
  { key: "retention", label: "Storage period" },
  { key: "legalBasis", label: "Legal basis" },
  { key: "privacyNotice", label: "Privacy notice" },
];
const PURPOSES: Purpose[] = ["Safety function", "AI model training"];
const DATA_OPTIONS: DataCategory[] = [
  "Driver-attention scores",
  "Vehicle location",
  "Raw cabin video",
];
const RECIPIENTS: Recipient[] = [
  "Vehicle only",
  "Manufacturer",
  SERVICE_PROVIDER,
  OTHER_COMPANY,
];
const LOCATIONS: Location[] = ["EEA", APPROVED, NOT_APPROVED];
const RETENTION: Retention[] = ["Not stored", "30 days", "1 year"];
const LEGAL_BASES: LegalBasis[] = [
  CONSENT,
  LEGITIMATE,
  LEGAL_OBLIGATION,
  NOT_DECIDED,
];
const PRIVACY_NOTICE: PrivacyNotice[] = ["Up to date", "Out of date"];
const retentionRank: Record<Retention, number> = {
  "Not stored": 0,
  "30 days": 1,
  "1 year": 2,
};
const priorityRank: Record<Priority, number> = { High: 0, Medium: 1 };
// The baseline must not trigger any rule, so the tracker starts with no checks.
const baseline: ProcessingState = {
  data: "Vehicle location",
  purpose: ["Safety function"],
  recipient: "Vehicle only",
  location: "EEA",
  retention: "Not stored",
  legalBasis: { "Safety function": LEGITIMATE, "AI model training": NOT_DECIDED },
  privacyNotice: "Up to date",
};
function copyState(s: ProcessingState): ProcessingState {
  return { ...s, purpose: [...s.purpose], legalBasis: { ...s.legalBasis } };
}
const scenario = (changes: Partial<ProcessingState>) =>
  copyState({ ...baseline, ...changes });
const basisFor = (purpose: Purpose, basis: LegalBasis) => ({
  ...baseline.legalBasis,
  [purpose]: basis,
});
const SCENARIOS = [
  {
    name: "Add AI model training",
    state: scenario({
      purpose: ["Safety function", "AI model training"],
      legalBasis: basisFor("AI model training", CONSENT),
      privacyNotice: "Out of date",
    }),
  },
  {
    name: "Send location data to a non-EEA service provider",
    state: scenario({
      recipient: SERVICE_PROVIDER,
      location: NOT_APPROVED,
      retention: "30 days",
    }),
  },
  { name: "Keep data for 1 year", state: scenario({ retention: "1 year" }) },
  {
    name: "Collect raw cabin video",
    state: scenario({
      data: "Raw cabin video",
      recipient: "Manufacturer",
      retention: "30 days",
    }),
  },
  {
    name: "Train AI on shared raw video (full example)",
    state: scenario({
      data: "Raw cabin video",
      purpose: ["Safety function", "AI model training"],
      recipient: SERVICE_PROVIDER,
      location: NOT_APPROVED,
      retention: "1 year",
      legalBasis: basisFor("AI model training", LEGITIMATE),
      privacyNotice: "Out of date",
    }),
  },
];
function isExternalRecipient(recipient: Recipient) {
  return recipient !== "Vehicle only";
}
function value(key: keyof ProcessingState, s: ProcessingState) {
  if (key === "purpose") return s.purpose.join(", ") || "None selected";
  if (key === "legalBasis") {
    return s.purpose.map((x) => `${x}: ${s.legalBasis[x]}`).join("; ") || "None selected";
  }
  return String(s[key]);
}
function changed(key: keyof ProcessingState, p: ProcessingState) {
  return value(key, p) !== value(key, baseline);
}
function differs(keys: (keyof ProcessingState)[], p: ProcessingState, b: ProcessingState) {
  return keys.some((key) => value(key, p) !== value(key, b));
}
// Any processing field other than the privacy notice differs from the baseline.
function materialChange(p: ProcessingState, b: ProcessingState) {
  return differs(["data", "purpose", "recipient", "location", "retention", "legalBasis"], p, b);
}
// A new purpose, a new external recipient, or a new non-EEA location.
function escalatingChange(p: ProcessingState, b: ProcessingState) {
  return (
    p.purpose.some((x) => !b.purpose.includes(x)) ||
    (isExternalRecipient(p.recipient) && p.recipient !== b.recipient) ||
    (p.location !== "EEA" && b.location === "EEA")
  );
}
function getChanges(p: ProcessingState): Change[] {
  return FIELDS.filter(({ key }) => changed(key, p)).map(({ key, label }) => ({
    key,
    label,
    before: value(key, baseline),
    after: value(key, p),
  }));
}
function validate(p: ProcessingState): Validation[] {
  const results: Validation[] = [];
  if (p.recipient === "Vehicle only" && p.location !== "EEA") {
    results.push({
      id: "V1",
      title: "Recipient and location conflict",
      message:
        "The data stays in the vehicle, but the data location is outside the EEA.",
      action:
        "Change the recipient if data leaves the vehicle. Otherwise set the data location to EEA.",
    });
  }
  if (p.purpose.length === 0) {
    results.push({
      id: "V2",
      title: "Purpose missing",
      message: "No purpose is selected.",
      action: "Select at least one purpose.",
      provisions: ["Arts. 5(1)(b), 6"],
    });
  }
  if (
    p.retention === "Not stored" &&
    (isExternalRecipient(p.recipient) || p.purpose.includes("AI model training"))
  ) {
    results.push({
      id: "V3",
      title: "Check whether data is stored",
      message:
        "Storage period is Not stored, but data leaves the vehicle or is used for AI training. Copies, logs or training data may still exist.",
      action:
        "Check logs, copies and training data. Correct the storage period if personal data is kept.",
      provisions: ["Art. 5(1)(e)"],
    });
  }
  if (
    p.purpose.includes("AI model training") &&
    p.legalBasis["AI model training"] === LEGAL_OBLIGATION
  ) {
    results.push({
      id: "V4",
      title: "Legal obligation needs a specific law",
      message:
        "AI model training is set to Legal obligation. This needs a specific EU or national law, and AI training is rarely required by law.",
      action: "Name the law, or choose another legal basis.",
      provisions: ["Art. 6(1)(c), 6(3)"],
    });
  }
  return results;
}
const EDPB_VEHICLES = "EDPB Guidelines 01/2020 (connected vehicles)";
const EDPB_AI = "EDPB Opinion 28/2024 (AI models)";
const EDPB_TRANSFERS = "EDPB Guidelines 05/2021 (international transfers)";
const EDPB_SAFEGUARDS = "EDPB Guidelines 05/2021; EDPB Recommendations 01/2020 (supplementary measures); CJEU Schrems II (C-311/18)";
const EDPB_ROLES = "EDPB Guidelines 07/2020 (controllers and processors)";
const EDPB_CONSENT = "EDPB Guidelines 05/2020 (consent)";
const EDPB_EPRIVACY = "EDPB Guidelines 2/2023 (Art. 5(3) ePrivacy)";
const WP_PURPOSE = "WP29 Opinion 03/2013 (purpose limitation; pre-GDPR)";
const WP_NOTICE = "WP29 Guidelines on transparency (WP260)";
const WP_DPIA = "WP29 Guidelines on DPIA (WP248)";
const rules: Rule[] = [
  {
    id: "R1",
    mode: "state",
    priority: "High",
    title: "Raw cabin video",
    trigger: "Data is Raw cabin video.",
    issue: "Raw video shows more about people than the purpose may need.",
    action: "Explain why raw video is needed. Limit who can see it and delete it early.",
    provisions: ["Art. 5(1)(b)–(c), 5(1)(e)", "Art. 25", "Art. 35 (if high risk)"],
    guidance: EDPB_VEHICLES,
    when: (p) => p.data === "Raw cabin video",
  },
  {
    id: "R2",
    mode: "state",
    priority: "High",
    title: "AI model training",
    trigger: "Purpose includes AI model training.",
    issue: "Training is often a new use of the data.",
    action:
      "Check the legal basis. Consent must be specific and easy to withdraw. A business interest must be necessary and balanced against people's rights, and people may be able to object.",
    provisions: ["Arts. 5(1)(b), 6, 7, 21, 25"],
    guidance: EDPB_AI,
    when: (p) => p.purpose.includes("AI model training"),
  },
  {
    id: "R3",
    mode: "state",
    priority: "High",
    title: "Raw video used for AI training",
    trigger: "Data is Raw cabin video and purpose includes AI model training.",
    issue: "Training on raw video carries higher privacy risk.",
    action:
      "Explain why anonymised or less detailed data is not enough. Check whether a privacy risk assessment (DPIA) is needed.",
    provisions: ["Arts. 5(1)(c), 25", "Art. 35 (if high risk)"],
    guidance: EDPB_AI,
    when: (p) =>
      p.data === "Raw cabin video" && p.purpose.includes("AI model training"),
  },
  {
    id: "R4",
    mode: "state",
    priority: "High",
    title: "Transfer to a country without EU approval",
    trigger:
      "Data location is outside the EEA with no EU approval identified, and someone outside the vehicle receives the data.",
    issue:
      "If this is a transfer, it needs a safeguard that works in practice. Remote access from there can count; collecting data directly from the person does not.",
    action:
      "Check who sends and who receives the data. Check the destination country's laws before relying on a safeguard such as standard contract clauses (Art. 46), and add extra protection if needed. Use a narrow exception (Art. 49) only if its conditions are met. Name the safeguard in the privacy notice.",
    provisions: ["Arts. 13(1)(f), 44, 46–49"],
    guidance: EDPB_SAFEGUARDS,
    when: (p) => p.location === NOT_APPROVED && isExternalRecipient(p.recipient),
  },
  {
    id: "R5",
    mode: "state",
    priority: "Medium",
    title: "Service provider contract",
    trigger: "Recipient is a service provider acting on the manufacturer's instructions.",
    issue: "A service provider may only use the data as instructed.",
    action: "Check the contract with the provider meets Art. 28. Check security and deletion.",
    provisions: ["Art. 28", "Art. 32"],
    guidance: EDPB_ROLES,
    when: (p) => p.recipient === SERVICE_PROVIDER,
  },
  {
    id: "R6",
    mode: "change",
    priority: "Medium",
    title: "Longer storage",
    trigger: "Storage period is longer than the baseline.",
    issue: "Longer storage needs a reason and an end date.",
    action:
      "Justify the period and set deletion. Consider a shorter period or less detailed data.",
    provisions: ["Art. 5(1)(c), 5(1)(e)", "Arts. 13(2)(a), 25"],
    guidance: EDPB_VEHICLES,
    when: (p, b) => retentionRank[p.retention] > retentionRank[b.retention],
  },
  {
    id: "R7",
    mode: "state",
    priority: "High",
    title: "Legal basis missing",
    trigger: "A purpose has the legal basis Not yet decided.",
    issue: "Every purpose needs a legal basis before data is used.",
    action: "Choose a legal basis for each purpose and record why.",
    provisions: ["Arts. 5(2), 6"],
    guidance: EDPB_VEHICLES,
    when: (p) => p.purpose.some((x) => p.legalBasis[x] === NOT_DECIDED),
  },
  {
    id: "R8",
    mode: "change",
    priority: "Medium",
    title: "Legal basis changed",
    trigger: "A purpose has a different legal basis than in the baseline.",
    issue: "Switching the basis for data you already hold is generally not allowed.",
    action: "Treat it as new processing, or keep the original basis. Record why and update the privacy notice if needed.",
    provisions: ["Arts. 5(1)(a), 6, 24"],
    guidance: EDPB_CONSENT,
    when: (p, b) =>
      p.purpose.some(
        (x) =>
          b.purpose.includes(x) &&
          p.legalBasis[x] !== b.legalBasis[x] &&
          p.legalBasis[x] !== NOT_DECIDED
      ),
  },
  {
    id: "R9",
    mode: "change",
    priority: "Medium",
    title: "New purpose",
    trigger: "A purpose is added to the baseline.",
    issue: "A new purpose needs its own legal check.",
    action:
      "Data you already hold: check the new purpose fits the old one, or is covered by consent or a specific law. New data: the purpose needs its own legal basis. Tell people first.",
    provisions: ["Arts. 5(1)(b), 6(1), 6(4)", "Arts. 13–14"],
    guidance: WP_PURPOSE,
    when: (p, b) => p.purpose.some((x) => !b.purpose.includes(x)),
  },
  {
    id: "R10",
    mode: "state",
    priority: "High",
    title: "Location data shared",
    trigger: "Data is Vehicle location and someone outside the vehicle receives it.",
    issue: "Precise or frequent location data can reveal routines and sensitive visits.",
    action:
      "Check how precise and frequent it is, who sees it and how long it is kept. Consider rougher location or processing in the vehicle. Check whether a privacy risk assessment (DPIA) is needed.",
    provisions: ["Arts. 5(1)(c), 25, 32", "Art. 35 (if high risk)"],
    guidance: EDPB_VEHICLES,
    when: (p) => p.data === "Vehicle location" && isExternalRecipient(p.recipient),
  },
  {
    id: "R11",
    mode: "state",
    priority: "High",
    title: "Raw video shared",
    trigger: "Data is Raw cabin video and someone outside the vehicle receives it.",
    issue: "More people can access and reuse the video.",
    action: "Justify sharing. Restrict access and further use. Check security and deletion.",
    provisions: ["Arts. 5(1)(c), 25, 32", "Art. 28 (if service provider)"],
    guidance: EDPB_VEHICLES,
    when: (p) => p.data === "Raw cabin video" && isExternalRecipient(p.recipient),
  },
  {
    id: "R12",
    mode: "state",
    priority: "Medium",
    title: "Privacy notice out of date",
    trigger: "Privacy notice is Out of date.",
    issue: "People may not know how their data is used.",
    action: "Compare the privacy notice with the processing and update it.",
    provisions: ["Arts. 5(1)(a), 12–14"],
    guidance: WP_NOTICE,
    when: (p) => p.privacyNotice !== "Up to date",
  },
  {
    id: "R13",
    mode: "state",
    priority: "Medium",
    title: "Check for sensitive data",
    trigger:
      "Data is Driver-attention scores or Raw cabin video, or Vehicle location is shared outside the vehicle.",
    issue:
      "Location data can reveal sensitive visits, such as to hospitals or places of worship, but is not automatically sensitive data (Art. 9). Video is special-category biometric data only if processed to identify a person uniquely.",
    action:
      "Check whether the data reveals or is used to infer sensitive information, such as health. If so, you also need an Art. 9 condition, in addition to a legal basis.",
    provisions: ["Arts. 6, 9", "Art. 35 (if high risk)"],
    guidance: EDPB_VEHICLES,
    // Location data triggers this rule only when shared, so the baseline stays quiet.
    when: (p) => p.data !== "Vehicle location" || isExternalRecipient(p.recipient),
  },
  {
    id: "R14",
    mode: "state",
    priority: "Medium",
    title: "Check device-access rules (ePrivacy)",
    trigger: "Someone outside the vehicle receives the data.",
    issue:
      "Article 5(3) may apply if information is stored in, or read from, the vehicle. Whether it does depends on the operation and any exception.",
    action:
      "Check whether Article 5(3) applies. If it does, check for consent or an exception, separately from the GDPR legal basis.",
    provisions: ["ePrivacy Art. 5(3)", "GDPR Art. 6"],
    guidance: EDPB_EPRIVACY,
    when: (p) => isExternalRecipient(p.recipient),
  },
  {
    id: "R15",
    mode: "change",
    priority: "Medium",
    title: "Check the privacy risk assessment (DPIA)",
    trigger: "Data, purpose, recipient, location or storage period changed.",
    issue: "The change may affect an existing risk assessment.",
    action:
      "Check that the DPIA covers the change. If none exists, check whether one is needed.",
    provisions: ["Art. 35(1), 35(11)"],
    guidance: WP_DPIA,
    when: (p, b) =>
      differs(["data", "purpose", "recipient", "location", "retention"], p, b),
  },
  {
    id: "R16",
    mode: "change",
    priority: "Medium",
    title: "Verify privacy notice",
    trigger: "Processing changed and the privacy notice is Up to date.",
    issue: "This tool cannot check that the notice covers the change.",
    action:
      "Compare the privacy notice with the change. Update the records of processing.",
    provisions: ["Arts. 5(1)(a), 12–14", "Art. 30"],
    guidance: WP_NOTICE,
    when: (p, b) => p.privacyNotice === "Up to date" && materialChange(p, b),
  },
  {
    id: "R17",
    mode: "change",
    priority: "High",
    title: "Tell people before new use",
    trigger:
      "Privacy notice is Out of date, and there is a new purpose, a new recipient or a new non-EEA location.",
    issue: "People must be told before the new use starts.",
    action: "Update the privacy notice before the change goes live.",
    provisions: ["Arts. 5(1)(a), 12", "Arts. 13(1)(e)–(f), 13(3), 14(4)"],
    guidance: WP_NOTICE,
    when: (p, b) => p.privacyNotice !== "Up to date" && escalatingChange(p, b),
  },
  {
    id: "R18",
    mode: "state",
    priority: "Medium",
    title: "Transfer to an EU-approved country",
    trigger:
      "Data location is outside the EEA with EU approval, and someone outside the vehicle receives the data.",
    issue: "An approval may cover only certain sectors or companies.",
    action:
      "Check the approval covers this transfer and recipient. Name the country in the privacy notice.",
    provisions: ["Art. 45", "Art. 13(1)(f)"],
    guidance: EDPB_TRANSFERS,
    when: (p) => p.location === APPROVED && isExternalRecipient(p.recipient),
  },
  {
    id: "R19",
    mode: "state",
    priority: "Medium",
    title: "Another company uses the data",
    trigger: "Recipient is another company using the data for its own purposes.",
    issue:
      "Sharing data with a company that uses it for its own purposes needs its own legal basis.",
    action:
      "Check the legal basis for sharing and name the recipient in the privacy notice. If you decide together why and how the data is used, agree who is responsible for what (Art. 26).",
    provisions: ["Arts. 6, 13(1)(e)", "Art. 26 (if deciding together)"],
    guidance: EDPB_ROLES,
    when: (p) => p.recipient === OTHER_COMPANY,
  },
  {
    id: "R20",
    mode: "state",
    priority: "Medium",
    title: "Data leaves the vehicle",
    trigger: "Someone outside the vehicle receives the data.",
    issue: "Sending data out may expose it to more recipients, access routes or transfer risks.",
    action:
      "Explain why the data must leave the vehicle. Consider processing it in the vehicle.",
    provisions: ["Arts. 5(1)(c), 25"],
    guidance: EDPB_VEHICLES,
    when: (p) => isExternalRecipient(p.recipient),
  },
];
// Rules that apply to the proposed state, sorted by priority.
function evaluate(p: ProcessingState): Rule[] {
  return rules
    .filter((rule) => rule.when(p, baseline))
    .sort(
      (a, b) =>
        priorityRank[a.priority] - priorityRank[b.priority] ||
        a.id.localeCompare(b.id, undefined, { numeric: true })
    );
}
const REVIEW_TOPICS = [
  {
    id: "raw-video",
    title: "Raw cabin video",
    description: "Need · training · sharing",
    ruleIds: ["R1", "R3", "R11"],
  },
  {
    id: "purpose-basis",
    title: "Purpose and legal basis",
    description: "AI training · new purposes · legal basis",
    ruleIds: ["R2", "R7", "R8", "R9"],
  },
  {
    id: "leaving-vehicle",
    title: "Data leaving the vehicle",
    description: "Recipients · transfers · location data · device access",
    ruleIds: ["R4", "R5", "R10", "R14", "R18", "R19", "R20"],
  },
  {
    id: "sensitive-storage",
    title: "Sensitive data and storage",
    description: "Storage period · sensitive data",
    ruleIds: ["R6", "R13"],
  },
  {
    id: "privacy-notice",
    title: "Privacy notice and risk assessment",
    description: "Privacy notice · DPIA",
    ruleIds: ["R12", "R15", "R16", "R17"],
  },
];
// Groups triggered rules into topics; topics with the highest priority come first.
function groupFlags(flags: Rule[]) {
  return REVIEW_TOPICS.map((topic) => ({
    ...topic,
    flags: flags.filter((flag) => topic.ruleIds.includes(flag.id)),
  }))
    .filter((topic) => topic.flags.length > 0)
    .sort(
      (a, b) =>
        priorityRank[a.flags[0].priority] - priorityRank[b.flags[0].priority]
    );
}
function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-[#d9ded7] bg-[#fffefa] lg:h-full lg:min-h-0">
      <div className="shrink-0 border-b border-[#e5e8e1] px-4 py-3">
        <h2 className="font-semibold text-[#163d37]">{title}</h2>
        <p className="mt-1 text-sm text-[#66746e]">{description}</p>
      </div>
      <div className="min-h-0 flex-1 p-4 lg:overflow-y-auto">{children}</div>
    </section>
  );
}
function Field({
  label,
  id,
  children,
  isChanged,
}: {
  label: string;
  id?: string;
  children: ReactNode;
  isChanged?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        isChanged
          ? "border-[#c58b43] bg-[#fff7e8]"
          : "border-[#e2e6df] bg-white"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {id ? (
          <label htmlFor={id} className="text-sm font-medium text-[#314a43]">
            {label}
          </label>
        ) : (
          <span className="text-sm font-medium text-[#314a43]">{label}</span>
        )}
        {isChanged && (
          <span className="text-xs font-semibold text-[#875a1d]">Changed</span>
        )}
      </div>
      {children}
    </div>
  );
}
function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs leading-5 text-[#718078]">{children}</p>;
}
function SelectField<T extends string>({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-lg border border-[#d7ded7] bg-white px-3 py-2 text-sm text-[#203d36] focus:border-[#27695c] focus:outline-none focus:ring-2 focus:ring-[#27695c]/15"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
function PriorityBadge({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    High: "bg-[#fff0eb] text-[#8d3925]",
    Medium: "bg-[#fff7df] text-[#805d14]",
  };
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}
function ProvisionPills({ provisions }: { provisions: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {provisions.map((provision) => {
        const isEPrivacy = provision.startsWith("ePrivacy");
        return (
          <a
            key={provision}
            href={isEPrivacy ? EPRIVACY_URL : GDPR_URL}
            target="_blank"
            rel="noreferrer"
            title={
              isEPrivacy
                ? "Open the official ePrivacy Directive text"
                : "Open the official GDPR text"
            }
            className="rounded-md border border-[#d9e2d8] bg-[#f5f8f1] px-2 py-1 text-xs font-medium text-[#315b4e] underline decoration-[#a5b9a8] underline-offset-2"
          >
            {provision}
          </a>
        );
      })}
    </div>
  );
}
function LegalReferences({ provisions }: { provisions: string[] }) {
  return (
    <div className="mt-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#748177]">
        Provisions to review
      </p>
      <ProvisionPills provisions={provisions} />
    </div>
  );
}
function RuleLibrary({ onBack }: { onBack: () => void }) {
  const headings = ["ID", "Rule", "Priority", "Trigger", "Issue to consider", "Review action", "Legal references & guidance"];
  const cell = "border-b border-r border-[#e5e9e2] px-2.5 py-2 align-top leading-[1.45]";
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#d9ded7] bg-[#fffefa]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#e5e8e1] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-[#163d37]">Rule library ({rules.length})</h2>
          <p className="mt-1 text-xs text-[#64746b]">
            Written from the manufacturer&apos;s point of view. A flag prompts review; it does not establish non-compliance.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-lg border border-[#cfd8cf] px-3 py-1.5 text-xs font-semibold text-[#31564b] hover:bg-[#edf2eb]"
        >
          Back to tracker
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[1100px] table-fixed border-collapse text-left text-xs">
          <colgroup>
            <col className="w-[4%]" />
            <col className="w-[14%]" />
            <col className="w-[7%]" />
            <col className="w-[19%]" />
            <col className="w-[19%]" />
            <col className="w-[22%]" />
            <col className="w-[15%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-[#eef2eb] text-[10px] font-bold uppercase tracking-wide text-[#53685c]">
            <tr>
              {headings.map((heading) => (
                <th key={heading} className="border-b border-r border-[#dce3d9] px-2.5 py-2.5 align-bottom last:border-r-0">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, index) => (
              <tr key={rule.id} className={index % 2 === 0 ? "bg-white" : "bg-[#f8f9f5]"}>
                <td className={`${cell} font-semibold text-[#64776b]`}>{rule.id}</td>
                <td className={cell}>
                  <p className="font-semibold leading-4 text-[#294a40]">{rule.title}</p>
                  <p className="mt-1 text-[10px] text-[#78857c]">{rule.mode === "change" ? "Change-based" : "Settings-based"}</p>
                </td>
                <td className={cell}>
                  <PriorityBadge priority={rule.priority} />
                </td>
                <td className={`${cell} text-[#52655b]`}>{rule.trigger}</td>
                <td className={`${cell} text-[#52655b]`}>{rule.issue}</td>
                <td className={`${cell} text-[#294a40]`}>{rule.action}</td>
                <td className="border-b border-[#e5e9e2] px-2.5 py-2 align-top leading-[1.45]">
                  <p className="text-[#52655b]">{rule.provisions.join(", ")}</p>
                  <p className="mt-1.5 border-t border-[#e5e9e2] pt-1.5 text-[11px] text-[#78857c]">{rule.guidance}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function FlowArrow() {
  return (
    <div className="flex items-center justify-center text-xl text-[#8aa094]" aria-hidden="true">
      <span className="xl:hidden">↓</span>
      <svg viewBox="0 0 44 120" className="hidden h-full w-full xl:block">
        <path d="M3 60 H35" stroke="#9db8a6" strokeWidth="2" strokeLinecap="round" />
        <path d="M28 52 L36 60 L28 68" fill="none" stroke="#56836b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="4" cy="60" r="3" fill="#56836b" />
      </svg>
    </div>
  );
}
function HowItWorks({
  onBack,
  proposed,
  changes,
  validations,
  flags,
}: {
  onBack: () => void;
  proposed: ProcessingState;
  changes: Change[];
  validations: Validation[];
  flags: Rule[];
}) {
  const changedKeys = new Set(changes.map((item) => item.key));
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#d9ded7] bg-[#fffefa]">
      <div className="flex items-center justify-between gap-4 border-b border-[#e5e8e1] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#648176]">Live system map</p>
          <h2 className="mt-1 text-lg font-semibold text-[#163d37]">How a scenario is processed</h2>
          <p className="mt-1 text-sm text-[#5d6d65]">Settings → three checks → review report</p>
        </div>
        <button type="button" onClick={onBack} className="shrink-0 rounded-xl border border-[#cfd8cf] bg-white px-3 py-2 text-sm font-semibold text-[#31564b] hover:bg-[#edf2eb]">
          Back to tracker
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#64756b]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d9e2d8] bg-[#f5f8f1] px-2.5 py-1"><span className="h-2 w-2 rounded-full bg-[#47836b]" /> Current value</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e8d5ad] bg-[#fff6e4] px-2.5 py-1"><span className="h-2 w-2 rounded-full bg-[#c28a2c]" /> Changed from baseline</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d6dfef] bg-[#f3f6fc] px-2.5 py-1"><span className="h-2 w-2 rounded-full bg-[#5779ad]" /> Triggered rule</span>
        </div>
        <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(235px,0.95fr)_44px_minmax(370px,1.45fr)_44px_minmax(230px,0.9fr)]">
          {/* 1. Input */}
          <div className="rounded-2xl border border-[#b9d0c2] bg-[#f4f8f2] p-3.5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5c806c]">1 · Input</p>
                <h3 className="text-sm font-bold text-[#234c3d]">Proposed settings</h3>
              </div>
              <span className="rounded-full border border-[#cbdccf] bg-white px-2 py-1 text-xs font-bold text-[#4b6e59]">{FIELDS.length} fields</span>
            </div>
            <div className="space-y-1.5">
              {FIELDS.map(({ key, label }) => {
                const isChanged = changedKeys.has(key);
                return (
                  <div key={key} className={`rounded-lg border px-2.5 py-2 ${isChanged ? "border-[#e3c78f] bg-[#fff5df]" : "border-[#e0e8df] bg-white"}`}>
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#738279]">{label}</span>
                    <p className={`break-words text-sm leading-5 ${isChanged ? "font-semibold text-[#76551f]" : "text-[#3f5c4d]"}`}>{value(key, proposed)}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <FlowArrow />
          {/* 2. Three separate checks */}
          <div className="rounded-2xl border border-[#d9ded7] bg-[#f8f9f5] p-3.5">
            <div className="mb-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#74847a]">2 · Checks</p>
              <h3 className="text-sm font-bold text-[#294a40]">Three separate checks</h3>
            </div>
            <div className="space-y-2.5">
              <div className="rounded-xl border border-[#e7d5b3] bg-white p-3">
                <p className="text-sm font-bold text-[#755722]">Changes from baseline</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {changes.length ? changes.map((item) => <span key={item.key} className="rounded-md border border-[#ead7af] bg-[#fff8e9] px-1.5 py-1 text-xs font-semibold text-[#805d23]">{item.label}</span>) : <span className="rounded-md bg-[#f1f5ef] px-1.5 py-1 text-xs text-[#617566]">No differences</span>}
                </div>
              </div>
              <div className="rounded-xl border border-[#e7c4b8] bg-white p-3">
                <p className="text-sm font-bold text-[#843d2c]">Configuration warnings</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {validations.length ? validations.map((item) => <span key={item.id} title={item.title} className="rounded-md border border-[#e7c4b8] bg-[#fff8f5] px-1.5 py-1 text-xs font-semibold text-[#843d2c]">{item.id}</span>) : <span className="rounded-md bg-[#f1f5ef] px-1.5 py-1 text-xs text-[#617566]">No warnings</span>}
                </div>
              </div>
              <div className="rounded-xl border border-[#cdd9ed] bg-white p-3">
                <p className="text-sm font-bold text-[#3e5e8e]">Rules ({rules.length} tested)</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {flags.length ? flags.map((flag) => <span key={flag.id} title={flag.title} className="rounded-md border border-[#d4def0] bg-[#f3f6fc] px-1.5 py-1 text-xs font-semibold text-[#456287]">{flag.id}</span>) : <span className="rounded-md bg-[#f1f5ef] px-1.5 py-1 text-xs text-[#617566]">No rules triggered</span>}
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-xs leading-4 text-[#7b887e]">Warnings and rules are separate. One does not cause the other.</p>
          </div>
          <FlowArrow />
          {/* 3. Output */}
          <div className="rounded-2xl border border-[#cbd6e9] bg-[#f4f7fc] p-3.5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6b7fa0]">3 · Output</p>
                <h3 className="text-sm font-bold text-[#35537e]">Review report</h3>
              </div>
              <span className="rounded-full border border-[#d4def0] bg-white px-2 py-1 text-xs font-bold text-[#456287]">{flags.length} checks</span>
            </div>
            <div className="space-y-1.5">
              {flags.length ? flags.slice(0, 6).map((flag) => (
                <div key={flag.id} className="flex items-start gap-2 rounded-lg border border-[#dce4f0] bg-white p-2">
                  <span className="mt-0.5 rounded bg-[#e8eef8] px-1.5 py-0.5 text-xs font-bold text-[#456287]">{flag.id}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-4 text-[#3c526c]">{flag.title}</p>
                    <p className="mt-0.5 text-xs text-[#718096]">{flag.priority} priority</p>
                  </div>
                </div>
              )) : <div className="rounded-lg border border-[#dce4f0] bg-white p-3 text-sm text-[#63758c]">No rules triggered.</div>}
              {flags.length > 6 && <p className="px-1 text-xs text-[#718096]">+ {flags.length - 6} more in the tracker</p>}
            </div>
            <div className="mt-3 rounded-lg border border-[#d8e3d8] bg-[#f3f8f0] p-2.5">
              <p className="text-sm font-bold text-[#315d43]">Human legal review</p>
              <p className="mt-1 text-xs leading-4 text-[#617566]">Confirm the facts and assess each check. Checks are prompts, not legal conclusions.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
export default function OTAPrivacyTrackerPage() {
  const [proposed, setProposed] = useState<ProcessingState>(() => copyState(baseline));
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showRuleLibrary, setShowRuleLibrary] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const changes = useMemo(() => getChanges(proposed), [proposed]);
  const validations = useMemo(() => validate(proposed), [proposed]);
  const flags = useMemo(() => evaluate(proposed), [proposed]);
  const reviewTopics = useMemo(() => groupFlags(flags), [flags]);
  function update<K extends keyof ProcessingState>(key: K, next: ProcessingState[K]) {
    setProposed((current) => ({ ...current, [key]: next }));
  }
  function updateBasis(purpose: Purpose, basis: LegalBasis) {
    setProposed((current) => ({
      ...current,
      legalBasis: { ...current.legalBasis, [purpose]: basis },
    }));
  }
  function togglePurpose(purpose: Purpose, checked: boolean) {
    setProposed((current) => {
      const next = checked
        ? [...current.purpose, purpose]
        : current.purpose.filter((p) => p !== purpose);
      return { ...current, purpose: PURPOSES.filter((p) => next.includes(p)) };
    });
  }
  function toggleTopic(id: string) {
    setExpanded((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }
  function loadScenario(name: string) {
    const selected = SCENARIOS.find((s) => s.name === name);
    if (selected) setProposed(copyState(selected.state));
    setExpanded([]);
  }
  function reset() {
    setProposed(copyState(baseline));
    setExpanded([]);
  }
  return (
    <main className="min-h-screen bg-[#f5f4ed] px-4 py-5 text-[#203d36] sm:px-6 lg:h-screen lg:overflow-hidden lg:px-8 lg:py-4">
      <div className="mx-auto max-w-[1600px] lg:flex lg:h-full lg:min-h-0 lg:flex-col">
        <header className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between lg:shrink-0">
          <div>
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[#648176] hover:text-[#163d37]">
              WorkFlow
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#163d37] sm:text-3xl">
              OTA Privacy Tracker
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5d6d65]">
              Compare vehicle software changes, identify potential GDPR and ePrivacy issues for review.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setShowRuleLibrary((current) => !current); setShowHowItWorks(false); }}
              className="rounded-xl border border-[#cfd8cf] bg-[#fffefa] px-4 py-2.5 text-sm font-semibold text-[#31564b] hover:bg-[#edf2eb]"
            >
              {showRuleLibrary ? "Back to tracker" : `Rule library (${rules.length})`}
            </button>
            <button
              type="button"
              onClick={() => { setShowHowItWorks((current) => !current); setShowRuleLibrary(false); }}
              className="rounded-xl border border-[#cfd8cf] bg-[#fffefa] px-4 py-2.5 text-sm font-semibold text-[#31564b] hover:bg-[#edf2eb]"
            >
              {showHowItWorks ? "Back to tracker" : "How it works"}
            </button>
            <select
              aria-label="Load the example to see how it works."
              value=""
              onChange={(e) => loadScenario(e.target.value)}
              className="rounded-xl bg-[#1c5147] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#153f37]"
            >
              <option value="" disabled>Load the example to see how it works.</option>
              {SCENARIOS.map((s) => (
                <option key={s.name} value={s.name} className="text-[#203d36]">{s.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-[#cfd8cf] bg-[#fffefa] px-4 py-2.5 text-sm font-semibold text-[#31564b] hover:bg-[#edf2eb]"
            >
              Reset
            </button>
          </div>
        </header>
        <div className="mb-3 flex flex-wrap gap-4 rounded-xl border border-[#e0e4db] bg-[#fffefa] px-4 py-2 text-xs text-[#65746c] lg:shrink-0">
          <span>Changed fields are highlighted</span>
          <span>GDPR / ePrivacy checks</span>
          <span>Written from the manufacturer&apos;s point of view</span>
          <span>Screening tool—not legal advice</span>
        </div>
        {showRuleLibrary ? (
          <RuleLibrary onBack={() => setShowRuleLibrary(false)} />
        ) : showHowItWorks ? (
          <HowItWorks
            onBack={() => setShowHowItWorks(false)}
            proposed={proposed}
            changes={changes}
            validations={validations}
            flags={flags}
          />
        ) : (
        <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:grid-rows-1">
          <Panel title="1. Baseline" description="Fixed demonstration baseline.">
            <div className="space-y-3">
              {FIELDS.map(({ key, label }) => (
                <Field key={key} label={label} isChanged={changed(key, proposed)}>
                  <p className="text-sm">{value(key, baseline)}</p>
                </Field>
              ))}
            </div>
          </Panel>
          <Panel title="2. Proposed update" description="Set the proposed processing.">
            <div className="space-y-3">
              <Field id="data" label="Data" isChanged={changed("data", proposed)}>
                <SelectField id="data" value={proposed.data} options={DATA_OPTIONS} onChange={(v) => update("data", v)} />
              </Field>
              <Field label="Purpose(s)" isChanged={changed("purpose", proposed)}>
                <fieldset>
                  <legend className="sr-only">Processing purposes</legend>
                  <div className="space-y-2">
                    {PURPOSES.map((purpose, i) => (
                      <label key={purpose} className="flex items-center gap-2 text-sm">
                        <input
                          id={`purpose-${i}`}
                          type="checkbox"
                          checked={proposed.purpose.includes(purpose)}
                          onChange={(e) => togglePurpose(purpose, e.target.checked)}
                          className="h-4 w-4 accent-[#1c5147]"
                        />
                        <span>
                          <span className="block">{purpose}</span>
                          <span className="block text-xs leading-5 text-[#718078]">
                            {purpose === "Safety function"
                              ? "Support safety functions, such as driver-attention warnings."
                              : "Train or improve an AI model."}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </Field>
              <Field id="recipient" label="Who receives the data" isChanged={changed("recipient", proposed)}>
                <SelectField id="recipient" value={proposed.recipient} options={RECIPIENTS} onChange={(v) => update("recipient", v)} />
              </Field>
              <Field id="location" label="Data location" isChanged={changed("location", proposed)}>
                <SelectField id="location" value={proposed.location} options={LOCATIONS} onChange={(v) => update("location", v)} />
                <Hint>
                  Where data is stored or accessed. EEA = EU plus Iceland, Liechtenstein and Norway. EU-approved = the EU has found the country&apos;s data protection adequate (Art. 45); check what the approval covers.
                </Hint>
              </Field>
              <Field id="retention" label="Storage period" isChanged={changed("retention", proposed)}>
                <SelectField id="retention" value={proposed.retention} options={RETENTION} onChange={(v) => update("retention", v)} />
              </Field>
              <Field label="Legal basis (per purpose)" isChanged={changed("legalBasis", proposed)}>
                <div className="space-y-2">
                  {proposed.purpose.map((purpose, i) => (
                    <div key={purpose}>
                      <label htmlFor={`legalBasis-${i}`} className="mb-1 block text-xs font-medium text-[#52655b]">{purpose}</label>
                      <SelectField id={`legalBasis-${i}`} value={proposed.legalBasis[purpose]} options={LEGAL_BASES} onChange={(v) => updateBasis(purpose, v)} />
                    </div>
                  ))}
                </div>
                <Hint>
                  {proposed.purpose.length === 0 ? "Select a purpose first. " : ""}
                  The legal reason for using the data. Each purpose needs its own (Art. 6).
                </Hint>
              </Field>
              <Field id="privacyNotice" label="Privacy notice" isChanged={changed("privacyNotice", proposed)}>
                <SelectField id="privacyNotice" value={proposed.privacyNotice} options={PRIVACY_NOTICE} onChange={(v) => update("privacyNotice", v)} />
                <Hint>What people are told about how their data is used.</Hint>
              </Field>
            </div>
          </Panel>
          <Panel title="3. Review report" description="Changes and applicable legal checks.">
            <div className="mb-5 rounded-xl border border-[#dce5da] bg-[#f5f8f1] p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#254b3f]">Changes from baseline</h3>
                <span className="text-sm font-semibold">{changes.length}</span>
              </div>
              {changes.length === 0 ? (
                <p className="mt-2 text-sm text-[#68786e]">No changes detected.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {changes.map((c) => (
                    <div key={c.key} className="border-t border-[#dce5da] pt-2 first:border-0">
                      <p className="text-xs font-semibold text-[#718078]">{c.label}</p>
                      <p className="mt-1 break-words text-sm">
                        <span className="text-[#7c8980]">{c.before}</span>
                        <span className="px-2 text-[#a17a3b]">→</span>
                        <span className="font-medium">{c.after}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <section className="mb-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#843d2c]">Configuration warnings</h3>
                <span className="text-xs">{validations.length}</span>
              </div>
              {validations.length === 0 ? (
                <p className="rounded-xl border border-[#e0e5dd] bg-white p-3 text-sm text-[#6b7b71]">
                  No configuration warnings.
                </p>
              ) : (
                <div className="space-y-3">
                  {validations.map((v) => (
                    <div key={v.id} className="rounded-xl border border-[#e7c4b8] bg-[#fff8f5] p-3">
                      <h4 className="text-sm font-semibold text-[#843d2c]">{v.title}</h4>
                      <p className="mt-1 text-sm leading-5 text-[#6d554d]">{v.message}</p>
                      <p className="mt-2 text-sm leading-5 text-[#6d554d]">{v.action}</p>
                      {v.provisions && <LegalReferences provisions={v.provisions} />}
                    </div>
                  ))}
                </div>
              )}
            </section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#254b3f]">Privacy-review topics</h3>
              <span className="text-xs">{flags.length} checks in {reviewTopics.length} topics</span>
            </div>
            {flags.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#d5ddd3] p-4 text-sm leading-5 text-[#6b7b71]">
                No checks triggered. This does not prove compliance.
              </p>
            ) : (
              <div className="space-y-3">
                {reviewTopics.map((topic) => {
                  const isOpen = expanded.includes(topic.id);
                  return (
                    <article key={topic.id} className="overflow-hidden rounded-xl border border-[#e0e5dd] bg-white">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => toggleTopic(topic.id)}
                        className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-[#fafbf7]"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-[#294a40]">{topic.title}</span>
                          <span className="mt-1 block text-xs leading-5 text-[#718078]">{topic.description}</span>
                          <span className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-[#52655b]">{topic.flags.length} {topic.flags.length === 1 ? "check" : "checks"}</span>
                            <PriorityBadge priority={topic.flags[0].priority} />
                          </span>
                        </span>
                        <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
                      </button>
                      {isOpen && (
                        <div className="space-y-3 border-t border-[#e7ebe4] p-3">
                          {topic.flags.map((flag) => (
                            <div key={flag.id} className="rounded-lg border border-[#e7ebe4] p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h5 className="text-sm font-semibold text-[#294a40]">{flag.title}</h5>
                                <PriorityBadge priority={flag.priority} />
                              </div>
                              <p className="mt-2 text-sm leading-5 text-[#52655b]">{flag.issue}</p>
                              <p className="mt-2 text-sm leading-5 text-[#294a40]">
                                <strong>Next step:</strong> {flag.action}
                              </p>
                              <LegalReferences provisions={flag.provisions} />
                              <p className="mt-2 text-xs leading-5 text-[#718078]">Guidance: {flag.guidance}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
        )}
      </div>
    </main>
  );
}
