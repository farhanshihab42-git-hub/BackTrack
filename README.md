# BackTrack

BackTrack is a mobile-first thesis prototype for recording self-reported adherence to participant-specific home exercise programs for people with low back pain. It includes a patient check-in and a researcher view for configuring schedules and reviewing adherence summaries.

## Run locally

Requirements: Node.js and npm.

```powershell
npm install
npm run dev
```

Open the local address printed by Vite. To run the production checks:

```powershell
npm run build
npm run lint
```

## Prototype workflow

- Use the view switch to move between the patient and researcher screens.
- Select a pseudonymous participant from the header or cohort list.
- In the researcher view, configure that participant's scheduled days and prescribed exercises, sets, amount per set, and unit.
- In the patient view, enter the amount completed for each exercise, select perceived effort, and save a completed or missed-session check-in.
- Add participants from the cohort list. New participants start with an empty, editable protocol.

The starter cohort contains generated demo data. Protocol entries and check-ins persist in browser `localStorage` on that device; there is no account, backend, or synchronization.

## Measurement definitions

- **Session adherence:** completed check-ins divided by prescribed sessions during the rolling seven-day window. Scheduled sessions without a completed check-in count as incomplete.
- **Exercise dose adherence:** mean of each reported exercise amount divided by that exercise's prescribed total for every scheduled exercise instance in the same window. Each fraction is capped at 100%; missing sessions contribute zero. Exercise units such as repetitions and seconds are not added together.

These are self-reported prototype measures. Define and validate the final protocol, scoring rules, and handling of protocol changes with your thesis supervisor before collecting study data.

## Data and safety

This prototype stores data only in the current browser and is not designed for identifiable or real patient data. Use only demo or appropriately approved study data. It does not prescribe exercises, verify performance, provide medical advice, or support clinical decision-making. Study deployment requires appropriate ethics, consent, privacy, and data-management review.
