import { useState } from 'react'
import {
  DIRECTIONS,
  CONTACT_CLINICIAN_GUIDANCE,
  MODALITY_GUIDANCE,
  PROGRAMMES,
  URGENT_SYMPTOMS,
  getProgrammeForOdi,
  type Direction,
  type OdiScores,
  type Programme,
} from './protocol'
import './App.css'

type Session = {
  id: string
  date: string
  programme: Programme
  direction: Direction | null
  slot: string
  kind: 'standard' | 'aerobic' | 'strength'
  completedExerciseIds: string[]
  painBefore: number
  painAfter: number
  stopFlags: string[]
  status: 'completed' | 'partial' | 'stopped' | 'missed'
}

type Participant = {
  id: string
  baselineOdi: OdiScores | null
  finalOdi: OdiScores | null
  direction: Direction | null
  programme: Programme | null
  clinicalNote: string
  programmeStartedAt: string | null
  startedAt: string | null
  sessions: Session[]
}

type StudyState = { participants: Participant[]; selectedId: string }
type View = 'patient' | 'physiotherapist' | 'research'
type SessionDraft = {
  completedExerciseIds: string[]
  painBefore: number
  painAfter: number
  urgentFlags: string[]
  stopFlags: string[]
}

const STORAGE_KEY = 'backtrack-protocol-demo-v3'
const PRACTICE_FIRST_WEEK_DAYS = 7
const MINIMUM_PROGRAMME_DAYS = 14
const DAILY_STOP_FLAGS = [
  'Pain rises by 2 or more points, or goes above 7/10',
  'Pain spreads further down the buttock or leg',
  'New pins and needles, numbness, or leg weakness',
  'Dizziness, chest pain, or unusual breathlessness',
  'Skin burning or irritation from a modality',
]

const SECTION_LABELS = Array.from({ length: 10 }, (_, index) => `Section ${index + 1}`)

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`)
}

function daysBetween(start: string, end: string) {
  return Math.floor((parseDate(end).getTime() - parseDate(start).getTime()) / 86_400_000)
}

function dateLabel(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en', options).format(date)
}

function demoScores(sum: number): OdiScores {
  const values = Array.from({ length: 10 }, () => 0)
  for (let index = 0; index < values.length && sum > 0; index += 1) {
    const value = Math.min(5, sum)
    values[index] = value
    sum -= value
  }
  return values
}

function createParticipant(
  id: string,
  score: number | null = null,
  programme: Programme | null = null,
  direction: Direction | null = null,
): Participant {
  const today = dateKey(new Date())
  const scores = score === null ? null : demoScores(score)
  return {
    id,
    baselineOdi: scores,
    finalOdi: null,
    direction,
    programme,
    clinicalNote: '',
    programmeStartedAt: programme ? today : null,
    startedAt: programme ? today : null,
    sessions: [],
  }
}

function createInitialState(): StudyState {
  return {
    participants: [
      createParticipant('P-014', 26, 'B', 'Extension'),
      createParticipant('P-021', 16, 'C', 'Flexion'),
      createParticipant('P-027', 6, 'D', 'Lateral'),
    ],
    selectedId: 'P-014',
  }
}

function readState(): StudyState {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const parsed: unknown = JSON.parse(saved)
    if (
      parsed &&
      typeof parsed === 'object' &&
      'participants' in parsed &&
      Array.isArray(parsed.participants) &&
      parsed.participants.length > 0 &&
      'selectedId' in parsed &&
      typeof parsed.selectedId === 'string'
    ) {
      return parsed as StudyState
    }
  }
  return createInitialState()
}

function getOdiResult(scores: OdiScores | null) {
  if (!scores) return null
  const answered = scores.filter((score): score is number => score !== null)
  if (answered.length < 9) return null
  const percentage = Math.round((answered.reduce((sum, score) => sum + score, 0) / (answered.length * 5)) * 100)
  return { percentage, programme: getProgrammeForOdi(scores), answered: answered.length }
}

function programmeNumber(programme: Programme) {
  return PROGRAMMES.findIndex((item) => item.id === programme)
}

function sessionTarget(programme: Programme) {
  return programme === 'A' ? 14 : programme === 'B' ? 6 : programme === 'C' ? 5 : 5
}

function exercisesForSession(
  programme: Programme,
  direction: Direction | null,
  kind: Session['kind'],
) {
  const program = PROGRAMMES[programmeNumber(programme)]
  const exercises = program.exercises.filter((exercise) => {
    if (exercise.id === 'D8') return false
    if (!exercise.sessionKind) return true
    return kind === 'strength' || exercise.sessionKind === 'aerobic'
  })
  if (direction && direction !== 'None') {
    const preference = program.preference[direction]
    if (preference) {
      exercises.push({
        id: preference.id,
        name: preference.name,
        instructions: preference.instructions,
        dose: program.preferenceDose,
        optional: programme === 'D',
      })
    }
  }
  return exercises
}

function getProgression(participant: Participant, sessions: Session[], today: string) {
  if (!participant.programme || !participant.programmeStartedAt) return null
  const currentIndex = programmeNumber(participant.programme)
  if (currentIndex < 0 || currentIndex >= PROGRAMMES.length - 1) return null
  if (daysBetween(participant.programmeStartedAt, today) < MINIMUM_PROGRAMME_DAYS) return null

  const currentSessions = sessions
    .filter((session) => session.programme === participant.programme && session.status === 'completed')
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  const latestThree = currentSessions.slice(-3)
  if (latestThree.length < 3 || latestThree.some((session) => session.stopFlags.length > 0)) return null
  const programmeExercises = PROGRAMMES[currentIndex].exercises.filter((exercise) => !exercise.optional)
  if (latestThree.some((session) => {
    const preferenceId = session.direction && session.direction !== 'None'
      ? PROGRAMMES[currentIndex].preference[session.direction]?.id
      : undefined
    const requiredExerciseIds = [
      ...programmeExercises.map((exercise) => exercise.id),
      ...(preferenceId && participant.programme !== 'D' ? [preferenceId] : []),
    ]
    return requiredExerciseIds.some((id) => !session.completedExerciseIds.includes(id))
  })) return null

  const start = participant.programmeStartedAt
  const firstWeek = currentSessions.filter((session) =>
    daysBetween(start, session.date) >= 0 && daysBetween(start, session.date) < PRACTICE_FIRST_WEEK_DAYS,
  )
  if (firstWeek.length === 0) return null
  const firstWeekAverage = firstWeek.reduce((sum, session) => sum + session.painBefore, 0) / firstWeek.length
  const recentAverage = latestThree.reduce((sum, session) => sum + session.painBefore, 0) / latestThree.length
  const painImproved = recentAverage <= firstWeekAverage - 2 || recentAverage <= 3
  const noSignificantPostPainRise = latestThree.every((session) => session.painAfter < session.painBefore + 2)
  return painImproved && noSignificantPostPainRise ? PROGRAMMES[currentIndex + 1].id : null
}

function CheckList({
  title,
  items,
  values,
  onChange,
}: {
  title: string
  items: string[]
  values: string[]
  onChange: (values: string[]) => void
}) {
  return (
    <fieldset className="check-list">
      <legend>{title}</legend>
      {items.map((item) => (
        <label className="check-item" key={item}>
          <input
            type="checkbox"
            checked={values.includes(item)}
            onChange={(event) => onChange(
              event.target.checked ? [...values, item] : values.filter((value) => value !== item),
            )}
          />
          <span>{item}</span>
        </label>
      ))}
    </fieldset>
  )
}

function App() {
  const [state, setState] = useState(readState)
  const [view, setView] = useState<View>('patient')
  const [programmeDraft, setProgrammeDraft] = useState<Programme>('B')
  const [directionDraft, setDirectionDraft] = useState<Direction>('Extension')
  const [clinicalNoteDraft, setClinicalNoteDraft] = useState('')
  const [odiDraft, setOdiDraft] = useState<OdiScores>(Array(10).fill(null))
  const [finalOdiDraft, setFinalOdiDraft] = useState<OdiScores>(Array(10).fill(null))
  const [showFinalOdi, setShowFinalOdi] = useState(false)
  const [sessionDrafts, setSessionDrafts] = useState<Record<string, SessionDraft>>({})
  const [slot, setSlot] = useState('Morning')
  const [sessionKind, setSessionKind] = useState<'aerobic' | 'strength'>('strength')
  const [notice, setNotice] = useState('')
  const [today] = useState(() => new Date())
  const todayKey = dateKey(today)
  const selected = state.participants.find((participant) => participant.id === state.selectedId) ?? state.participants[0]
  const odiResult = getOdiResult(odiDraft)
  const finalOdiResult = getOdiResult(finalOdiDraft)
  const currentProgramme = selected.programme
    ? PROGRAMMES[programmeNumber(selected.programme)]
    : null
  const eligibleNextProgramme = getProgression(selected, selected.sessions, todayKey)
  const selectedSession = selected.sessions.find((session) => session.date === todayKey && session.slot === slot)
  const sessionDraftKey = `${selected.id}-${slot}`
  const sessionDraft = sessionDrafts[sessionDraftKey] ?? {
    completedExerciseIds: selectedSession?.completedExerciseIds ?? [],
    painBefore: selectedSession?.painBefore ?? 0,
    painAfter: selectedSession?.painAfter ?? 0,
    urgentFlags: [],
    stopFlags: selectedSession?.stopFlags ?? [],
  }
  const activeExercises = currentProgramme
    ? exercisesForSession(currentProgramme.id, selected.direction, selected.programme === 'D' ? sessionKind : 'standard')
    : []
  const selectedPreference = selected.direction && selected.direction !== 'None'
    ? currentProgramme?.preference[selected.direction]
    : undefined
  const lastSevenDays = selected.sessions.filter((session) =>
    daysBetween(session.date, todayKey) >= 0 && daysBetween(session.date, todayKey) < 7,
  )
  const adherenceCount = lastSevenDays.filter((session) => session.status === 'completed').length
  const adherenceTarget = currentProgramme ? sessionTarget(currentProgramme.id) : 0
  const adherenceRate = adherenceTarget ? Math.min(100, Math.round((adherenceCount / adherenceTarget) * 100)) : 0
  const metricExercises = selectedSession
    ? exercisesForSession(selectedSession.programme, selectedSession.direction, selectedSession.kind)
    : activeExercises
  const requiredExerciseCount = metricExercises.filter((exercise) => !exercise.optional).length
  const recordedExerciseIds = selectedSession?.completedExerciseIds ?? sessionDraft.completedExerciseIds
  const exerciseTickCount = metricExercises.filter((exercise) =>
    !exercise.optional && recordedExerciseIds.includes(exercise.id),
  ).length
  const exerciseTickRate = requiredExerciseCount
    ? Math.round((Math.min(exerciseTickCount, requiredExerciseCount) / requiredExerciseCount) * 100)
    : 0

  function commitState(nextState: StudyState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
    } catch (error) {
      console.error('Unable to persist BackTrack demo data in browser storage.', error)
      setNotice('Could not save this demo data in browser storage.')
    }
    setState(nextState)
  }

  function updateSessionDraft(patch: Partial<SessionDraft>) {
    setSessionDrafts((current) => ({
      ...current,
      [sessionDraftKey]: { ...sessionDraft, ...patch },
    }))
  }

  function updateSelected(update: (participant: Participant) => Participant) {
    commitState({
      ...state,
      participants: state.participants.map((participant) =>
        participant.id === selected.id ? update(participant) : participant,
      ),
    })
  }

  function selectParticipant(id: string) {
    commitState({ ...state, selectedId: id })
    const participant = state.participants.find((item) => item.id === id)
    if (participant) {
      setOdiDraft(participant.baselineOdi ?? Array(10).fill(null))
      setFinalOdiDraft(participant.finalOdi ?? Array(10).fill(null))
      setShowFinalOdi(false)
      setProgrammeDraft(participant.programme ?? 'B')
      setDirectionDraft(participant.direction ?? 'Extension')
      setClinicalNoteDraft(participant.clinicalNote)
    }
    setNotice('')
  }

  function switchView(nextView: View) {
    setView(nextView)
    if (nextView === 'patient') {
      selectParticipant('P-014')
    }
  }

  function previewPatient(selectedId: string) {
    selectParticipant(selectedId)
    setView('patient')
  }

  function updateOdiScore(
    setter: (scores: OdiScores) => void,
    scores: OdiScores,
    index: number,
    value: string,
  ) {
    const score = value === '' ? null : Number(value)
    setter(scores.map((current, itemIndex) => itemIndex === index ? score : current))
  }

  function saveBaseline() {
    if (!odiResult) {
      setNotice('Enter scores for at least 9 of 10 ODI sections. Use only the ODI form approved for your study.')
      return
    }
    updateSelected((participant) => ({ ...participant, baselineOdi: odiDraft }))
    setNotice(odiResult.percentage > 80
      ? 'Baseline ODI saved. The protocol draft marks 81–100% as outside enrollment; the physiotherapist demo cannot override study eligibility.'
      : `Baseline ODI ${odiResult.percentage}% saved. A physiotherapist must assign the demonstration programme and direction.`)
  }

  function assignPlan() {
    const result = getOdiResult(selected.baselineOdi)
    if (result && result.percentage > 80) {
      setNotice('This synthetic participant is outside the draft enrollment range (ODI 81–100%); no programme can be assigned.')
      return
    }
    updateSelected((participant) => ({
      ...participant,
      programme: programmeDraft,
      direction: directionDraft,
      clinicalNote: clinicalNoteDraft,
      programmeStartedAt: participant.programme === programmeDraft && participant.programmeStartedAt
        ? participant.programmeStartedAt
        : todayKey,
      startedAt: participant.startedAt ?? todayKey,
    }))
    setNotice(`Demo plan assigned: Programme ${programmeDraft}, ${directionDraft} preference. This action is not clinically approved or audited.`)
  }

  function saveSession(status: Session['status']) {
    if (sessionDraft.urgentFlags.length > 0) {
      setNotice('Do not exercise. The draft protocol says to seek urgent care for any checked warning sign.')
      return
    }
    if (status === 'completed' && !selected.direction) {
      setNotice('No physiotherapist-assigned direction is available for this participant.')
      return
    }
    const id = `${todayKey}-${slot}`
    const session: Session = {
      id,
      date: todayKey,
      programme: selected.programme!,
      direction: selected.direction,
      slot,
      kind: selected.programme === 'D' ? sessionKind : 'standard',
      completedExerciseIds: status === 'completed' || status === 'partial' ? sessionDraft.completedExerciseIds : [],
      painBefore: sessionDraft.painBefore,
      painAfter: sessionDraft.painAfter,
      stopFlags: sessionDraft.stopFlags,
      status: sessionDraft.stopFlags.length > 0 ? 'stopped' : status,
    }
    const sessions = [...selected.sessions.filter((item) => item.id !== id), session]
    const nextProgramme = getProgression(selected, sessions, todayKey)
    updateSelected((participant) => ({
      ...participant,
      sessions,
      ...(nextProgramme ? { programme: nextProgramme, programmeStartedAt: todayKey } : {}),
    }))
    if (sessionDraft.stopFlags.length > 0) {
      setNotice('Session flagged as stopped. The draft protocol says to stop for these symptoms and contact a clinician or seek care as appropriate.')
      return
    }
    setNotice(status === 'missed'
      ? 'Missed session saved on this device.'
      : nextProgramme
        ? `Draft criteria met. Programme ${nextProgramme} is assigned for the next session automatically in this demo; this is not clinical approval.`
        : status === 'partial'
          ? 'Partial session saved. Exercise ticks and session completion are tracked separately.'
          : 'Session saved on this device. Completion is self-reported.')
  }

  function saveFinalOdi() {
    if (!finalOdiResult) {
      setNotice('Enter scores for at least 9 of 10 ODI sections.')
      return
    }
    updateSelected((participant) => ({ ...participant, finalOdi: finalOdiDraft }))
    setShowFinalOdi(false)
    setNotice('End-of-course ODI saved. The comparison is a demo calculation only.')
  }

  function addSyntheticParticipant() {
    const nextId = `P-${String(Math.max(0, ...state.participants.map((item) => Number(item.id.slice(2)) || 0)) + 1).padStart(3, '0')}`
    const participant = createParticipant(nextId)
    commitState({
      participants: [...state.participants, participant],
      selectedId: nextId,
    })
    setOdiDraft(Array(10).fill(null))
    setSessionDrafts({})
    setView('patient')
    setNotice('Synthetic participant created. Enter baseline ODI and use the physiotherapist demo view to assign a plan.')
  }

  function exportSyntheticCsv() {
    const header = ['participant_id', 'baseline_odi_percent', 'final_odi_percent', 'programme', 'direction', 'sessions_completed', 'sessions_partial_or_stopped', 'sessions_missed', 'latest_pain_before', 'latest_pain_after']
    const rows = state.participants.map((participant) => {
      const sessions = participant.sessions
      const latest = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0]
      return [
        participant.id,
        getOdiResult(participant.baselineOdi)?.percentage ?? '',
        getOdiResult(participant.finalOdi)?.percentage ?? '',
        participant.programme ?? '',
        participant.direction ?? '',
        sessions.filter((session) => session.status === 'completed').length,
        sessions.filter((session) => session.status === 'partial' || session.status === 'stopped').length,
        sessions.filter((session) => session.status === 'missed').length,
        latest?.painBefore ?? '',
        latest?.painAfter ?? '',
      ]
    })
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'backtrack-synthetic-demo.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function resetDemo() {
    if (!window.confirm('Reset this browser demo to its synthetic sample data?')) return
    const initial = createInitialState()
    commitState(initial)
    setOdiDraft(Array(10).fill(null))
    setFinalOdiDraft(Array(10).fill(null))
    setSessionDrafts({})
    setNotice('Demo reset to synthetic sample data.')
  }

  const baselineResult = getOdiResult(selected.baselineOdi)
  const finalResult = getOdiResult(selected.finalOdi)
  const courseDays = selected.startedAt ? daysBetween(selected.startedAt, todayKey) : 0
  const endOdiAvailable = courseDays >= 84

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#today" aria-label="BackTrack home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>backtrack</span>
        </a>
        <div className="study-tag"><span className="status-dot" />LOW BACK PAIN STUDY · DEMO</div>
        <nav className="view-switch" aria-label="Demo view">
          <button type="button" className={view === 'patient' ? 'active' : ''} onClick={() => switchView('patient')}>Patient</button>
          <button type="button" className={view === 'physiotherapist' ? 'active' : ''} onClick={() => switchView('physiotherapist')}>Physiotherapist</button>
          <button type="button" className={view === 'research' ? 'active' : ''} onClick={() => switchView('research')}>Developer/Researcher</button>
        </nav>
        {view === 'patient'
          ? <span className="participant-select patient-id">Patient demo · {selected.id}</span>
          : <label className="participant-select">
            <span>Sample ID</span>
            <select value={selected.id} onChange={(event) => selectParticipant(event.target.value)} aria-label="Selected synthetic participant">
              {state.participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.id}</option>)}
            </select>
          </label>}
      </header>

      <main>
        <div className="draft-banner"><strong>PROPOSAL DEMO · DRAFT v0.3</strong><span>Not approved for patient care. Review by a licensed physiotherapist is required before use with patients.</span></div>
        <div className="page-heading">
          <div><p className="eyebrow">HOME EXERCISE PROGRAM</p><h1>{view === 'patient' ? 'Your movement log' : view === 'physiotherapist' ? 'Physiotherapist workspace' : 'Developer/research overview'}</h1></div>
          <p className="date-stamp">{dateLabel(today, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        {notice && <div className="notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}

        {view === 'patient' ? (
          <div className="patient-layout">
            <section className="panel today-panel" id="today">
              {!selected.baselineOdi ? (
                <section className="onboarding">
                  <div className="panel-heading"><div><p className="eyebrow">STEP 1 · BASELINE</p><h2>Enter ODI section scores</h2></div></div>
                  <p className="muted-copy">Use the study-approved ODI form separately. This demo records section scores only; it does not reproduce questionnaire wording.</p>
                  <div className="odi-grid">
                    {SECTION_LABELS.map((label, index) => (
                      <label key={label}>{label}<select value={odiDraft[index] ?? ''} onChange={(event) => updateOdiScore(setOdiDraft, odiDraft, index, event.target.value)}><option value="">Not entered</option>{[0, 1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}</select></label>
                    ))}
                  </div>
                  <p className="form-note">Score = total ÷ (answered sections × 5) × 100. Exactly one missing/not-applicable section uses a denominator of 45; two or more missing sections cannot be scored. A physiotherapist selects the demo programme.</p>
                  {odiResult && <div className="result-card"><strong>ODI {odiResult.percentage}%</strong><span>{odiResult.programme ? `Draft reference category: ${PROGRAMMES[programmeNumber(odiResult.programme)].category}` : 'Outside the enrollment range (81–100%)'}</span></div>}
                  <button className="primary-button" type="button" onClick={saveBaseline}>Save baseline ODI</button>
                </section>
              ) : !selected.programme ? (
                <section className="onboarding">
                  <div className="panel-heading"><div><p className="eyebrow">PATIENT PLAN · {selected.id}</p><h2>Waiting for physiotherapist assignment</h2></div></div>
                  <p className="muted-copy">Your home-exercise plan will appear here after the physiotherapist demo assigns a severity programme and movement direction.</p>
                  {baselineResult && <div className="result-card"><strong>Baseline ODI {baselineResult.percentage}%</strong><span>Saved for this synthetic demo. The physiotherapist sets the plan in this version.</span></div>}
                  <p className="form-note">This screen is a simulated patient view. It cannot verify a user's identity or protect records.</p>
                </section>
              ) : (
                <>
                  {!selected.baselineOdi && <details className="baseline-details"><summary>Record baseline ODI section scores</summary><p className="form-note">Enter scores from the separately approved ODI form. This demo does not display questionnaire wording.</p><div className="odi-grid">{SECTION_LABELS.map((label, index) => <label key={label}>{label}<select value={odiDraft[index] ?? ''} onChange={(event) => updateOdiScore(setOdiDraft, odiDraft, index, event.target.value)}><option value="">Not entered</option>{[0, 1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}</select></label>)}</div><button className="primary-button" type="button" onClick={saveBaseline}>Save baseline ODI</button></details>}
                  <div className="panel-heading">
                    <div><p className="eyebrow">TODAY · {dateLabel(today, { month: 'short', day: 'numeric' }).toUpperCase()} · {selected.id}</p><h2>{currentProgramme?.name}</h2></div>
                    <span className="session-state pending">Programme {selected.programme}</span>
                  </div>
                  <div className="programme-meta">
                    <span>Baseline ODI {baselineResult?.percentage}%</span>
                    <span>{currentProgramme?.schedule}</span>
                    {selected.programme === 'A' && <span>Choose morning or evening session</span>}
                  </div>
                  {selected.programme === 'A' && <label className="inline-select">Session time<select value={slot} onChange={(event) => setSlot(event.target.value)}><option>Morning</option><option>Evening</option></select></label>}

                  <section className="direction-panel">
                    <div><p className="eyebrow">PHYSIOTHERAPIST-ASSIGNED MOVEMENT PREFERENCE</p><h3>{selected.direction ?? 'Not assigned'}</h3></div>
                    <p>The physiotherapist selects the direction and matching protocol for this demo. The patient view cannot edit the prescription.</p>
                    {selectedPreference && (
                      <div className="preference-card"><strong>{selectedPreference.id} · {selectedPreference.name}</strong><p>{selectedPreference.instructions}</p><span>{currentProgramme?.preferenceDose}</span></div>
                    )}
                  </section>

                  {selected.programme === 'D' && (
                    <label className="inline-select session-kind">Today’s session type<select value={sessionKind} onChange={(event) => setSessionKind(event.target.value as 'aerobic' | 'strength')}><option value="strength">Strength + aerobic</option><option value="aerobic">Aerobic only</option></select></label>
                  )}

                  {selected.programme === 'B' && <p className="schedule-callout">In addition to this session, the draft schedule includes a second 10-minute walk later in the day.</p>}
                  <div className="equipment-callout"><strong>Equipment / setup</strong><span>{currentProgramme?.equipment}</span></div>

                  {selectedSession ? (
                    <div className="saved-checkin"><span className="saved-mark completed">✓</span><div className="saved-copy"><h3>{selectedSession.status === 'completed' ? 'Session recorded' : selectedSession.status === 'partial' ? 'Partial session recorded' : selectedSession.status === 'stopped' ? 'Session stopped and flagged' : 'Session marked missed'}</h3><p>Pain {selectedSession.painBefore}/10 before · {selectedSession.painAfter}/10 after · {selectedSession.completedExerciseIds.length} exercises ticked</p></div><button className="text-button" type="button" onClick={() => updateSelected((participant) => ({ ...participant, sessions: participant.sessions.filter((session) => session.id !== selectedSession.id) }))}>Edit entry</button></div>
                  ) : (
                    <div className="session-entry">
                      <CheckList title="Before each session: safety check" items={URGENT_SYMPTOMS} values={sessionDraft.urgentFlags} onChange={(urgentFlags) => updateSessionDraft({ urgentFlags })} />
                      {sessionDraft.urgentFlags.length > 0 && <p className="alert-box" role="alert">Do not exercise. The draft protocol says to seek urgent care for any checked warning sign.</p>}
                      <label className="pain-field">Pain before session (0–10)<input type="number" min="0" max="10" value={sessionDraft.painBefore} onChange={(event) => updateSessionDraft({ painBefore: Math.min(10, Math.max(0, Number(event.target.value))) })} /></label>
                      <div className="exercise-list">
                        <div className="subheading"><div><p className="eyebrow">SESSION EXERCISES</p><h3>Mark each exercise completed</h3></div><span>{activeExercises.length} items</span></div>
                        {activeExercises.map((exercise) => (
                          <label className="exercise-card" key={exercise.id}>
                            <input type="checkbox" checked={sessionDraft.completedExerciseIds.includes(exercise.id)} onChange={(event) => updateSessionDraft({ completedExerciseIds: event.target.checked ? [...sessionDraft.completedExerciseIds, exercise.id] : sessionDraft.completedExerciseIds.filter((id) => id !== exercise.id) })} />
                            <span className="exercise-copy"><strong>{exercise.isActivity ? exercise.name : `${exercise.id} · ${exercise.name}`}</strong><span>{exercise.instructions}</span><small>Draft dose: {exercise.dose}{exercise.optional ? ' · optional' : ''}</small>{!exercise.isActivity && <em>Media placeholder · {exercise.id}</em>}</span>
                          </label>
                        ))}
                      </div>
                      <CheckList title="Stop-session flags" items={DAILY_STOP_FLAGS} values={sessionDraft.stopFlags} onChange={(stopFlags) => updateSessionDraft({ stopFlags })} />
                      <label className="pain-field">Pain after session (0–10)<input type="number" min="0" max="10" value={sessionDraft.painAfter} onChange={(event) => updateSessionDraft({ painAfter: Math.min(10, Math.max(0, Number(event.target.value))) })} /></label>
                      {sessionDraft.stopFlags.length > 0 && <p className="alert-box" role="alert">Stop the exercise. This is recorded as stopped, not completed. Follow the draft’s clinician/urgent-care guidance.</p>}
                      <div className="checkin-actions"><button className="primary-button" type="button" onClick={() => saveSession('completed')} disabled={sessionDraft.urgentFlags.length > 0}>Record completed session</button><button className="text-button" type="button" onClick={() => saveSession('partial')} disabled={sessionDraft.urgentFlags.length > 0}>Save partial session</button><button className="text-button missed-button" type="button" onClick={() => saveSession('missed')} disabled={sessionDraft.urgentFlags.length > 0}>Mark missed</button></div>
                      <p className="form-note">Ticks, pain scores, and adherence are self-reported synthetic demo data. Stop flags are not a diagnostic tool.</p>
                    </div>
                  )}

                  <details className="guidance-details"><summary>Draft modality precautions and clinician guidance</summary><ul>{MODALITY_GUIDANCE.map((item) => <li key={item}>{item}</li>)}</ul><p><strong>Contact a clinician (draft guidance):</strong></p><ul>{CONTACT_CLINICIAN_GUIDANCE.map((item) => <li key={item}>{item}</li>)}</ul><p>Draft precautions include pregnancy, heart or lung disease, reduced skin sensation, a known rigid/fused spine, or osteoporosis. A clinician should review these before exercise or modality use.</p></details>
                  {eligibleNextProgramme && <div className="progression-card"><div><strong>Draft progression criteria met</strong><span>Programme {eligibleNextProgramme} applies from your next session after the current entry is saved.</span></div></div>}
                  <div className="progression-note"><strong>Programme progression</strong><span>Minimum 2 weeks, all exercises in the last 3 sessions ticked, and the draft pain criteria met. Progression is a demo calculation, not clinical approval.</span></div>
                  {showFinalOdi ? (
                    <section className="onboarding final-odi">
                      <h3>End-of-course ODI scores</h3>
                      <div className="odi-grid">{SECTION_LABELS.map((label, index) => <label key={label}>{label}<select value={finalOdiDraft[index] ?? ''} onChange={(event) => updateOdiScore(setFinalOdiDraft, finalOdiDraft, index, event.target.value)}><option value="">Not entered</option>{[0, 1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}</select></label>)}</div>
                      <button className="primary-button" type="button" onClick={saveFinalOdi}>Save end ODI</button>
                    </section>
                  ) : endOdiAvailable && (
                    <button className="text-button final-odi-button" type="button" onClick={() => setShowFinalOdi(true)}>{finalResult ? `End ODI ${finalResult.percentage}% · change ${finalResult.percentage - (baselineResult?.percentage ?? 0)} points` : 'Complete end-of-course ODI'}</button>
                  )}
                </>
              )}
            </section>

            <aside className="patient-aside">
              <section className="panel adherence-panel">
                <div className="panel-heading compact-heading"><div><p className="eyebrow">LAST 7 DAYS</p><h2>Adherence snapshot</h2></div><span className="self-report-tag">DEMO</span></div>
                <div className="metric"><span>Completed sessions</span><strong>{adherenceRate}%</strong><small>{adherenceCount} logged / {adherenceTarget} target sessions this week</small></div>
                {selected.programme === 'D' && <div className="programme-adherence"><span>Strength sessions: {lastSevenDays.filter((session) => session.status === 'completed' && session.kind === 'strength').length}/3</span><span>Aerobic days: {lastSevenDays.filter((session) => session.status === 'completed').length}/5</span></div>}
                <div className="metric"><span>Exercise ticks in this entry</span><strong>{exerciseTickRate}%</strong><small>{exerciseTickCount} / {requiredExerciseCount} required items ticked</small></div>
                <div className="week-strip">{lastSevenDays.slice(-7).map((session) => <span className={`session-chip ${session.status}`} key={session.id} title={`${session.date}: ${session.status}`}>{dateLabel(parseDate(session.date), { weekday: 'short' }).slice(0, 1)}</span>)}</div>
                <p className="metric-footnote">Session adherence uses the draft weekly target: A 14, B 6, C 5, D 5. This rolling count is for demonstration only.</p>
              </section>
              <section className="panel programme-card">
                <p className="eyebrow">PHYSIOTHERAPIST-ASSIGNED PLAN</p>
                {currentProgramme ? <><h2>Programme {currentProgramme.id}</h2><p>{currentProgramme.category} · {currentProgramme.focus}</p></> : <><h2>Not enrolled</h2><p>ODI 81–100% is outside the draft enrollment range.</p></>}
                {baselineResult && <small>Baseline ODI {baselineResult.percentage}% · {baselineResult.answered}/10 sections scored</small>}
                {selected.direction && <small>Preferred direction: {selected.direction}</small>}
              </section>
              <section className="panel equipment-card"><p className="eyebrow">COURSE</p><h2>{courseDays} / 84 days</h2><div className="course-track"><i style={{ width: `${Math.min(100, Math.round((courseDays / 84) * 100))}%` }} /></div><small>12-week draft course · minimum 2 weeks in each programme</small></section>
              <button className="text-button reset-button" type="button" onClick={resetDemo}>Reset synthetic demo data</button>
            </aside>
          </div>
        ) : view === 'physiotherapist' ? (
          <div className="therapist-layout">
            <aside className="panel therapist-patients">
              <div className="panel-heading"><div><p className="eyebrow">AUTHORIZED DEMO LIST</p><h2>Sample patients</h2></div><span className="self-report-tag">SIMULATED</span></div>
              <p className="muted-copy">Synthetic records only. This list is not protected by therapist authentication or assignment checks.</p>
              <div className="participant-rows">{state.participants.map((participant) => <button type="button" key={participant.id} className={`participant-row ${participant.id === selected.id ? 'selected' : ''}`} onClick={() => selectParticipant(participant.id)}><span className="participant-avatar">{participant.id.slice(-2)}</span><span className="participant-meta"><strong>{participant.id}</strong><small>{participant.programme ? `Programme ${participant.programme} · ${participant.sessions.length} logs` : 'Awaiting plan'}</small></span></button>)}</div>
              <button className="add-participant" type="button" onClick={addSyntheticParticipant}><span aria-hidden="true">+</span> Add synthetic patient</button>
            </aside>
            <section className="panel therapist-workspace">
              <div className="panel-heading"><div><p className="eyebrow">PHYSIOTHERAPIST DEMO · PT-01</p><h2>Review and assign plan</h2></div><span className="session-state pending">{selected.id}</span></div>
              <div className="therapist-assessment">
                <div className="assessment-stat"><span>Baseline ODI</span><strong>{baselineResult ? `${baselineResult.percentage}%` : 'Not recorded'}</strong><small>{baselineResult ? `${baselineResult.answered}/10 sections` : 'Patient demo may enter a baseline score'}</small></div>
                <div className="assessment-stat"><span>Logged sessions</span><strong>{selected.sessions.length}</strong><small>{selected.sessions.filter((session) => session.status === 'stopped').length} stopped/flagged</small></div>
                <div className="assessment-stat"><span>Latest pain</span><strong>{selected.sessions.length ? `${[...selected.sessions].sort((a, b) => b.date.localeCompare(a.date))[0].painAfter}/10` : '—'}</strong><small>After-session self-report</small></div>
              </div>
              {baselineResult && baselineResult.percentage > 80 && <p className="alert-box">The supplied protocol draft excludes ODI 81–100%. Do not assign a plan in this demo.</p>}
              <div className="plan-controls">
                <label>Severity programme<select value={programmeDraft} onChange={(event) => setProgrammeDraft(event.target.value as Programme)}>{PROGRAMMES.map((programme) => <option key={programme.id} value={programme.id}>{programme.category} · Programme {programme.id} · ODI {programme.odiRange}%</option>)}</select></label>
                <label>McKenzie directional preference<select value={directionDraft} onChange={(event) => setDirectionDraft(event.target.value as Direction)}>{DIRECTIONS.map((direction) => <option key={direction} value={direction}>{direction === 'None' ? 'None / skip' : direction}</option>)}</select></label>
              </div>
              {programmeDraft !== 'D' && directionDraft !== 'None' && PROGRAMMES[programmeNumber(programmeDraft)].preference[directionDraft] && (
                <div className="preference-card therapist-preview"><strong>{PROGRAMMES[programmeNumber(programmeDraft)].preference[directionDraft]?.id} · {PROGRAMMES[programmeNumber(programmeDraft)].preference[directionDraft]?.name}</strong><p>{PROGRAMMES[programmeNumber(programmeDraft)].preference[directionDraft]?.instructions}</p><span>{PROGRAMMES[programmeNumber(programmeDraft)].preferenceDose}</span></div>
              )}
              <div className="protocol-reference"><h3>Preset protocol preview</h3><p><strong>{PROGRAMMES[programmeNumber(programmeDraft)].name}</strong> · {PROGRAMMES[programmeNumber(programmeDraft)].focus}</p><p>{PROGRAMMES[programmeNumber(programmeDraft)].schedule}</p><p>{PROGRAMMES[programmeNumber(programmeDraft)].exercises.length} protocol items · {PROGRAMMES[programmeNumber(programmeDraft)].equipment}</p></div>
              <label className="clinical-note-field">Clinical decision / demo note<textarea rows={3} value={clinicalNoteDraft} onChange={(event) => setClinicalNoteDraft(event.target.value)} placeholder="Synthetic example note only" /></label>
              <div className="study-actions"><button className="primary-button" type="button" onClick={assignPlan} disabled={Boolean(baselineResult && baselineResult.percentage > 80)}>Assign demo plan to patient view</button><span className="form-note">In this prototype, assignment is saved in this browser only and has no audit trail.</span></div>
              <div className="study-actions"><button className="text-button" type="button" onClick={() => previewPatient(selected.id)}>Preview this synthetic patient view</button></div>
              <div className="table-wrap"><table><thead><tr><th>Date</th><th>Programme</th><th>Status</th><th>Pain before</th><th>Pain after</th><th>Exercise ticks</th><th>Safety flags</th></tr></thead><tbody>
                {selected.sessions.length === 0 ? <tr><td colSpan={7}>No synthetic session records yet.</td></tr> : selected.sessions.map((session) => <tr key={session.id}><td>{session.date}</td><td>{session.programme}</td><td>{session.status}</td><td>{session.painBefore}</td><td>{session.painAfter}</td><td>{session.completedExerciseIds.length}</td><td>{session.stopFlags.length}</td></tr>)}
              </tbody></table></div>
            </section>
          </div>
        ) : (
          <div className="research-layout">
            <section className="panel study-panel">
              <div className="section-title"><div><p className="eyebrow">SYNTHETIC COHORT · DEVELOPER/RESEARCHER DEMO</p><h2>Proposal demonstration summary</h2></div><span className="self-report-tag">NOT PROTECTED</span></div>
              <p className="muted-copy">This simulated dashboard is not restricted to a developer ID. The local prototype has no login, backend, authorization, or audit trail; do not treat this view as a protected researcher role.</p>
              <div className="therapist-assessment research-summary">
                <div className="assessment-stat"><span>Synthetic participants</span><strong>{state.participants.length}</strong><small>IDs only</small></div>
                <div className="assessment-stat"><span>Sessions completed</span><strong>{state.participants.reduce((count, item) => count + item.sessions.filter((session) => session.status === 'completed').length, 0)}</strong><small>Self-reported logs</small></div>
                <div className="assessment-stat"><span>Missing baseline ODI</span><strong>{state.participants.filter((item) => !getOdiResult(item.baselineOdi)).length}</strong><small>Sample cohort</small></div>
              </div>
              <div className="table-wrap"><table><thead><tr><th>Sample ID</th><th>Baseline ODI</th><th>Draft programme</th><th>Direction</th><th>Logged sessions</th></tr></thead><tbody>
                {state.participants.map((participant) => {
                  const result = getOdiResult(participant.baselineOdi)
                  return <tr key={participant.id}><td><button className="text-button" type="button" onClick={() => { selectParticipant(participant.id); setView('physiotherapist') }}>{participant.id}</button></td><td>{result ? `${result.percentage}%` : 'Not assessed'}</td><td>{participant.programme ? `Programme ${participant.programme}` : 'Not assigned'}</td><td>{participant.direction ?? 'Not selected'}</td><td>{participant.sessions.filter((session) => session.status === 'completed').length}</td></tr>
                })}
              </tbody></table></div>
              <div className="study-actions"><button className="primary-button" type="button" onClick={exportSyntheticCsv}>Export synthetic demo CSV</button><button className="text-button" type="button" onClick={addSyntheticParticipant}>+ New synthetic participant</button><button className="text-button" type="button" onClick={resetDemo}>Reset sample cohort</button></div>
              <div className="protocol-reference"><h3>ODI category rules in the supplied draft</h3><ul>{PROGRAMMES.map((programme) => <li key={programme.id}><strong>{programme.odiRange}%</strong> · {programme.category} · Programme {programme.id}: {programme.name}</li>)}<li><strong>81–100%</strong> · Not enrolled by this draft</li></ul></div>
            </section>
          </div>
        )}

        <footer className="disclaimer"><span className="disclaimer-mark" aria-hidden="true">!</span><p><strong>Unapproved protocol draft for proposal demonstration.</strong> Use only synthetic data. It is not medical advice, a diagnostic tool, or for clinical decisions. ODI question wording and media are not included; use only approved materials. Therapist review is required before any patient use.</p></footer>
      </main>
    </div>
  )
}

export default App
