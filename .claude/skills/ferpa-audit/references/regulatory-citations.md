# FERPA regulatory hooks (34 CFR Part 99)

Use this file as the **only** authoritative list of section citations for FERPA-audit findings. Each finding in `docs/ferpa-audit-<date>.md` must reference **at least one** anchor below. Prefer the narrowest hook that matches the risk.

Citations refer to the **Family Educational Rights and Privacy Act** regulations at 34 CFR Part 99 (commonly cited as “FERPA” in higher-education practice). This is a plain-English index for audit narratives; it is not legal advice.

---

## §99.3 — Definitions

| Anchor | What it covers | Typical audit use |
|--------|----------------|-------------------|
| **§99.3 — “Personally identifiable information” (PII)** | Information that, alone or in combination, would let a reasonable person identify a student with reasonable certainty — including direct identifiers and many indirect linkages. | Flagging direct identifiers (e.g. institution-issued student IDs/GUIDs), linkable keys, or combinations that re-identify individuals in outputs, logs, or vendor payloads. |
| **§99.3 — “Education records”** | Records directly related to a student and maintained by an educational agency or institution (with stated exceptions). | Explaining why student academic/demographic datasets, predictions, and course rows are not “just analytics data” — they are protected education records unless an exception clearly applies. |
| **§99.3 — “Directory information”** | Limited categories an institution may disclose without consent if public notice and opt-out requirements are met. | Warning when “directory information” arguments are misapplied to non-directory fields (grades, risk flags, detailed demographics, etc.). |

---

## §99.7 — Policy and rights awareness

| Anchor | Typical audit use |
|--------|-------------------|
| **§99.7 — annual notification / rights awareness** | Institution must inform parents/eligible students of rights under FERPA. | **Note**-level reminders when new technical surfaces (AI, external APIs) change how records are processed, so policy notices and transparency artifacts stay aligned with reality. |

---

## §99.30 — Basis for disclosure

| Anchor | Typical audit use |
|--------|-------------------|
| **§99.30 — general rule on consent** | Disclosure of PII from education records generally requires prior written consent unless a specific exception applies. | Framing **why** a new outbound data path (vendor API, third-party host) is sensitive even if “no SSN is sent.” |

---

## §99.31 — Conditions for disclosure

| Anchor | Typical audit use |
|--------|-------------------|
| **§99.31(a)(1) — studies exception (statutory)** | Permits disclosure to researchers under defined conditions. | Rare in routine dashboard audits; use only when the system is actually operating under this exception. |
| **§99.31(a)(1)(i) — “school officials” / legitimate educational interest** | Institutions may disclose to school officials with legitimate educational interest in the information. | **Primary hook** for internal analytics: staff may access student data only when their role and task justify it — motivates **RBAC**, access logging, and least-privilege API design. |
| **§99.31(a)(1)(ii)(A)(B) — contractors / “school officials” vendors** | Vendors performing institutional services may receive disclosures only under direct control and consistent use/re-disclosure rules. | **Primary hook** for **cloud LLM APIs**, hosted analytics, or third-party data hosts: the institution remains responsible for whether the disclosure is permitted and properly constrained. |

---

## §99.32 — Recordkeeping and transparency to parents/students

| Anchor | Typical audit use |
|--------|-------------------|
| **§99.32 — record of requests and disclosures** | Institutions must maintain a record of certain disclosures (with defined exceptions). | **Note**/**Warning** when read paths touch sensitive tables but no auditable trail exists (future linkage to institutional audit-log requirements). |

---

## §99.33 — Limits on redisclosure

| Anchor | Typical audit use |
|--------|-------------------|
| **§99.33 — redisclosure rules** | Third parties receiving education records generally may not redisclose except under specific circumstances. | Explaining risk when data is sent to vendors, partner hosts, or embedded in client-side logs that leave the institution’s control. |

---

## §99.35 — Disclosure for research / statistical purposes

| Anchor | Typical audit use |
|--------|-------------------|
| **§99.35 — de-identified / statistical disclosures** | Additional conditions when disclosing for research or statistical purposes. | Supporting findings on **small-cell suppression**, aggregation, and k-anonymity-style thresholds so subgroup statistics cannot identify individuals. |

---

## §99.37 — Directory information

| Anchor | Typical audit use |
|--------|-------------------|
| **§99.37 — directory information disclosures** | Conditions under which directory information may be released without consent. | Use when reviewing whether a field is truly directory information before treating it as low sensitivity. |

---

## How to cite in a finding

1. Pick **one** primary anchor (e.g. `§99.31(a)(1)(i) — legitimate educational interest`).
2. Add a **short** plain-English “why” tying the technical fact to that hook (vendor disclosure, missing access control, identifier in export, etc.).
3. Do **not** stack unrelated sections; add a second citation only when two distinct legal bases are genuinely implicated.
