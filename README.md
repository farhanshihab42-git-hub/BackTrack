# BackTrack

BackTrack is a mobile-first proposal demo for a 12-week low back pain home-exercise study. The supplied `BackTrack_LBP_Severity_Protocol.docx` is a v0.3 draft, not a clinically approved protocol. See [REQUIREMENTS.md](REQUIREMENTS.md) for the target application scope and prototype boundaries.

## Run locally

Requirements: Node.js and npm.

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local address printed by Vite. To run the production checks:

```powershell
npm.cmd run build
npm.cmd run lint
```

To preview on a phone over a trusted local Wi-Fi network, start Vite with:

```powershell
npm.cmd run dev -- --host 0.0.0.0
```

Open `http://<computer-ip>:5173` on the phone. The computer and phone must be on the same network. Use synthetic data only.

## Demo features

- Three simulated views: patient, physiotherapist, and developer/researcher.
- Synthetic participants with baseline ODI entry and a physiotherapist demo workspace to choose a severity programme, assign the matching directional preference, review logs, and save a demo note.
- ODI percentage calculation from 10 section scores, allowing exactly one unanswered/not-applicable section using the draft's denominator rule. The score is displayed as a reference; in this prototype the physiotherapist view assigns the programme.
- Preset draft assignment bands: 61–80% Programme A; 41–60% B; 21–40% C; 0–20% D; 81–100% not enrolled.
- Physiotherapist-selected direction (extension, flexion, lateral, or none), shown read-only with its matching exercise in the patient view.
- Exercise checklists, before/after pain scores, a safety check, session status, adherence summary, and a draft progression preview.
- A synthetic cohort summary and CSV download for proposal presentation only.
- Data stored in the current browser's `localStorage`; it is not shared or synchronized.

## Clinical protocol limitations

The UI reflects the supplied draft's exercise names, descriptions, doses, schedule, ODI bands, safety language, and progression conditions. The progression calculation requires at least two weeks in the current programme, complete exercise ticks for the latest three completed sessions, the draft pain-improvement condition, and no 2-point-or-greater post-session pain increase in those three sessions. When met, the next programme is assigned for the following session in this demo.

This is an implementation of a draft for a proposal demonstration, not validation of its clinical appropriateness. The document itself requests review by a licensed physiotherapist before patient use. The app does not reproduce ODI questionnaire wording, include exercise videos/images, provide therapist assessment, or offer medical advice. Media keys are placeholders only. Safety prompts are not a diagnostic tool and must not be relied on for triage or care.

## Data and security

All included records are synthetic. Do not enter names, contact details, real health information, or real participant data. The three role switches only change the displayed demo view. This client-only application has no authentication, backend, shared database, server-enforced authorization, clinician verification, audited clinical workflow, or production safeguards. The developer/researcher view is not restricted to a developer ID; the CSV contains synthetic records only. View switching is not access control. Obtain appropriate ethics, privacy, security, and clinical approvals before any real-world use.
