import { useEffect, useState } from 'react'
import './App.css'

type Exercise = {
  id: string
  name: string
  sets: number
  amount: number
  unit: 'reps' | 'seconds'
}

type Protocol = {
  days: number[]
  exercises: Exercise[]
}

type CheckIn = {
  date: string
  status: 'completed' | 'missed'
  dose: Record<string, number>
  plannedDose: Record<string, number>
  effort?: number
  reason?: string
}

type Participant = {
  id: string
  protocol: Protocol
  logs: CheckIn[]
}

type View = 'patient' | 'research'

const STORAGE_KEY = 'backtrack-study-prototype-v1'
const WEEKDAYS = [
  { label: 'Mon', day: 1 },
  { label: 'Tue', day: 2 },
  { label: 'Wed', day: 3 },
  { label: 'Thu', day: 4 },
  { label: 'Fri', day: 5 },
  { label: 'Sat', day: 6 },
  { label: 'Sun', day: 0 },
]

function dateAtOffset(offset: number, baseDate: Date) {
  const date = new Date(baseDate)
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return date
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateLabel(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en', options).format(date)
}

function plannedDoseFor(protocol: Protocol) {
  return Object.fromEntries(
    protocol.exercises.map((exercise) => [
      exercise.id,
      exercise.sets * exercise.amount,
    ]),
  )
}

function createDemoParticipant(
  id: string,
  days: number[],
  exercises: Exercise[],
  seed: number,
  baseDate: Date,
): Participant {
  const protocol = { days, exercises }
  const plannedDose = plannedDoseFor(protocol)
  const logs: CheckIn[] = []

  for (let offset = -41; offset < 0; offset += 1) {
    const date = dateAtOffset(offset, baseDate)
    if (!days.includes(date.getDay())) continue

    const completed = (date.getDate() + seed) % 5 !== 0
    const dose = Object.fromEntries(
      exercises.map((exercise) => {
        const target = plannedDose[exercise.id]
        const completion = completed
          ? (date.getDate() + seed) % 4 === 0
            ? 0.75
            : 1
          : 0
        return [exercise.id, Math.round(target * completion)]
      }),
    )

    logs.push({
      date: dateKey(date),
      status: completed ? 'completed' : 'missed',
      dose,
      plannedDose,
      effort: completed ? 2 + ((date.getDate() + seed) % 3) : undefined,
      reason: completed ? undefined : 'Schedule conflict',
    })
  }

  return { id, protocol, logs }
}

function createDemoParticipants(): Participant[] {
  const baseDate = new Date()
  return [
    createDemoParticipant(
      'P-014',
      [1, 3, 5],
      [
        { id: 'ex-bridge', name: 'Glute bridge', sets: 3, amount: 10, unit: 'reps' },
        { id: 'ex-bird-dog', name: 'Bird dog', sets: 2, amount: 8, unit: 'reps' },
        { id: 'ex-mobility', name: 'Knee-to-chest', sets: 2, amount: 20, unit: 'seconds' },
      ],
      2,
      baseDate,
    ),
    createDemoParticipant(
      'P-021',
      [2, 4, 6],
      [
        { id: 'ex-hinge', name: 'Hip hinge', sets: 3, amount: 8, unit: 'reps' },
        { id: 'ex-bird-dog-2', name: 'Bird dog', sets: 2, amount: 8, unit: 'reps' },
      ],
      4,
      baseDate,
    ),
    createDemoParticipant(
      'P-027',
      [1, 4],
      [
        { id: 'ex-rotation', name: 'Open book rotation', sets: 2, amount: 8, unit: 'reps' },
        { id: 'ex-mobility-2', name: 'Knee-to-chest', sets: 2, amount: 20, unit: 'seconds' },
      ],
      1,
      baseDate,
    ),
  ]
}

function readParticipants(): Participant[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as Participant[]
    }
  } catch {
    // Fall back to the non-identifiable demo cohort if storage is unavailable.
  }
  return createDemoParticipants()
}

function getWeekSummary(participant: Participant, today: Date) {
  const dates = Array.from({ length: 7 }, (_, index) => dateAtOffset(index - 6, today))
    .filter((date) => participant.protocol.days.includes(date.getDay()))
  const scheduled = dates.length
  const logs = new Map(participant.logs.map((log) => [log.date, log]))
  const completed = dates.filter((date) => logs.get(dateKey(date))?.status === 'completed').length
  const plannedExerciseSessions = scheduled * participant.protocol.exercises.length
  const actual = dates.reduce((total, date) => {
    const log = logs.get(dateKey(date))
    if (!log || log.status !== 'completed') return total
    return total + participant.protocol.exercises.reduce((sessionTotal, exercise) => {
      const target = exercise.sets * exercise.amount
      if (target <= 0) return sessionTotal
      const reported = Math.min(Math.max(log.dose[exercise.id] ?? 0, 0), target)
      return sessionTotal + reported / target
    }, 0)
  }, 0)

  return {
    scheduled,
    completed,
    sessionRate: scheduled === 0 ? null : Math.round((completed / scheduled) * 100),
    doseRate: plannedExerciseSessions === 0
      ? null
      : Math.round((actual / plannedExerciseSessions) * 100),
  }
}

function getTrend(participant: Participant, today: Date) {
  const currentWeek = new Date(today)
  currentWeek.setHours(12, 0, 0, 0)
  currentWeek.setDate(currentWeek.getDate() - ((currentWeek.getDay() + 6) % 7))
  const logs = new Map(participant.logs.map((log) => [log.date, log]))

  return Array.from({ length: 6 }, (_, index) => {
    const start = new Date(currentWeek)
    start.setDate(start.getDate() - (5 - index) * 7)
    const dates = Array.from({ length: 7 }, (_, day) => {
      const date = new Date(start)
      date.setDate(start.getDate() + day)
      return date
    }).filter(
      (date) =>
        date <= today && participant.protocol.days.includes(date.getDay()),
    )
    const completed = dates.filter((date) => logs.get(dateKey(date))?.status === 'completed').length
    return {
      label: dateLabel(start, { month: 'short', day: 'numeric' }),
      rate: dates.length === 0 ? null : Math.round((completed / dates.length) * 100),
      count: completed,
      total: dates.length,
    }
  })
}

function App() {
  const [participants, setParticipants] = useState(readParticipants)
  const [selectedId, setSelectedId] = useState('P-014')
  const [view, setView] = useState<View>('patient')
  const selected = participants.find((participant) => participant.id === selectedId) ?? participants[0]
  const [today] = useState(() => new Date())
  const todayKey = dateKey(today)
  const todayLog = selected.logs.find((log) => log.date === todayKey)
  const [doseDraft, setDoseDraft] = useState<Record<string, number>>(() =>
    todayLog?.dose ?? Object.fromEntries(selected.protocol.exercises.map((exercise) => [exercise.id, 0])),
  )
  const [effort, setEffort] = useState(todayLog?.effort ?? 3)
  const [missReason, setMissReason] = useState(todayLog?.reason ?? 'Schedule conflict')
  const [editingCheckIn, setEditingCheckIn] = useState(false)
  const summary = getWeekSummary(selected, today)
  const trend = getTrend(selected, today)
  const todayScheduled = selected.protocol.days.includes(today.getDay())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(participants))
    } catch {
      // The prototype remains usable for this session if storage is unavailable.
    }
  }, [participants])

  function selectParticipant(id: string) {
    const participant = participants.find((item) => item.id === id)
    if (!participant) return
    const checkIn = participant.logs.find((log) => log.date === todayKey)
    setDoseDraft(checkIn?.dose ?? Object.fromEntries(
      participant.protocol.exercises.map((exercise) => [exercise.id, 0]),
    ))
    setEffort(checkIn?.effort ?? 3)
    setMissReason(checkIn?.reason ?? 'Schedule conflict')
    setEditingCheckIn(false)
    setSelectedId(id)
  }

  function updateSelected(update: (participant: Participant) => Participant) {
    setParticipants((current) =>
      current.map((participant) =>
        participant.id === selectedId ? update(participant) : participant,
      ),
    )
  }

  function saveCheckIn(status: CheckIn['status']) {
    const plannedDose = plannedDoseFor(selected.protocol)
    const dose = status === 'completed'
      ? Object.fromEntries(
          Object.entries(plannedDose).map(([id, target]) => [
            id,
            Math.min(Math.max(doseDraft[id] ?? 0, 0), target),
          ]),
        )
      : Object.fromEntries(Object.keys(plannedDose).map((id) => [id, 0]))
    const log: CheckIn = {
      date: todayKey,
      status,
      dose,
      plannedDose,
      effort: status === 'completed' ? effort : undefined,
      reason: status === 'missed' ? missReason : undefined,
    }

    updateSelected((participant) => ({
      ...participant,
      logs: [...participant.logs.filter((item) => item.date !== todayKey), log],
    }))
    setEditingCheckIn(false)
  }

  function updateProtocol(patch: Partial<Protocol>) {
    updateSelected((participant) => ({
      ...participant,
      protocol: { ...participant.protocol, ...patch },
    }))
  }

  function updateExercise(exerciseId: string, patch: Partial<Exercise>) {
    updateProtocol({
      exercises: selected.protocol.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, ...patch } : exercise,
      ),
    })
  }

  function addExercise() {
    const id = `exercise-${Date.now()}`
    updateProtocol({
      exercises: [
        ...selected.protocol.exercises,
        { id, name: '', sets: 2, amount: 8, unit: 'reps' },
      ],
    })
  }

  function addParticipant() {
    const nextNumber = participants.reduce((max, participant) => {
      const number = Number(participant.id.replace('P-', ''))
      return Math.max(max, number)
    }, 0) + 1
    const participant: Participant = {
      id: `P-${String(nextNumber).padStart(3, '0')}`,
      protocol: {
        days: [1, 3, 5],
        exercises: [{ id: `exercise-${Date.now()}`, name: '', sets: 2, amount: 8, unit: 'reps' }],
      },
      logs: [],
    }
    setParticipants((current) => [...current, participant])
    setDoseDraft(Object.fromEntries(participant.protocol.exercises.map((exercise) => [exercise.id, 0])))
    setEffort(3)
    setMissReason('Schedule conflict')
    setEditingCheckIn(false)
    setSelectedId(participant.id)
    setView('research')
  }

  const nextDay = WEEKDAYS.find((day) => day.day > today.getDay() && selected.protocol.days.includes(day.day))
    ?? WEEKDAYS.find((day) => selected.protocol.days.includes(day.day))

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#today" aria-label="BackTrack home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>backtrack</span>
        </a>
        <div className="study-tag"><span className="status-dot" />LOW BACK PAIN STUDY</div>
        <nav className="view-switch" aria-label="Application view">
          <button type="button" className={view === 'patient' ? 'active' : ''} onClick={() => setView('patient')}>Patient</button>
          <button type="button" className={view === 'research' ? 'active' : ''} onClick={() => setView('research')}>Researcher</button>
        </nav>
        <label className="participant-select">
          <span>Participant</span>
          <select value={selectedId} onChange={(event) => selectParticipant(event.target.value)} aria-label="Selected participant">
            {participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.id}</option>)}
          </select>
        </label>
      </header>

      <main>
        <div className="page-heading">
          <div>
            <p className="eyebrow">HOME EXERCISE PROGRAM</p>
            <h1>{view === 'patient' ? 'Your movement log' : 'Study overview'}</h1>
          </div>
          <p className="date-stamp">{dateLabel(today, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>

        {view === 'patient' ? (
          <div className="patient-layout">
            <section className="panel today-panel" id="today">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">TODAY · {dateLabel(today, { month: 'short', day: 'numeric' }).toUpperCase()}</p>
                  <h2>{todayScheduled ? 'Prescribed session' : 'A pause in the plan'}</h2>
                </div>
                {todayScheduled && <span className={`session-state ${todayLog?.status ?? 'pending'}`}>{todayLog?.status === 'completed' ? 'Logged' : todayLog?.status === 'missed' ? 'Missed' : 'Due today'}</span>}
              </div>

              {!todayScheduled ? (
                <div className="rest-day">
                  <span className="rest-mark" aria-hidden="true">↗</span>
                  <div>
                    <h3>No session planned today</h3>
                    <p>{nextDay ? `Next planned day: ${nextDay.label}` : 'No days are scheduled in this protocol yet.'}</p>
                  </div>
                </div>
              ) : todayLog && !editingCheckIn ? (
                <div className="saved-checkin" aria-live="polite">
                  <span className={`saved-mark ${todayLog.status}`} aria-hidden="true">{todayLog.status === 'completed' ? '✓' : '–'}</span>
                  <div className="saved-copy">
                    <h3>{todayLog.status === 'completed' ? 'Session recorded' : 'Missed session recorded'}</h3>
                    <p>{todayLog.status === 'completed'
                      ? `${selected.protocol.exercises.filter((exercise) => (todayLog.dose[exercise.id] ?? 0) > 0).length} exercises with dose recorded · effort ${todayLog.effort ?? 'not recorded'}/5`
                      : todayLog.reason}</p>
                  </div>
                  <button className="text-button" type="button" onClick={() => setEditingCheckIn(true)}>Edit check-in</button>
                </div>
              ) : (
                <form className="checkin-form" onSubmit={(event) => { event.preventDefault(); saveCheckIn('completed') }}>
                  <div className="exercise-head"><span>EXERCISE</span><span>PRESCRIBED</span><span>DONE</span></div>
                  {selected.protocol.exercises.length === 0 ? (
                    <p className="empty-state">No exercises have been added to this protocol.</p>
                  ) : selected.protocol.exercises.map((exercise) => {
                    const target = exercise.sets * exercise.amount
                    return (
                      <div className="exercise-row" key={exercise.id}>
                        <div className="exercise-name"><strong>{exercise.name || 'Unnamed exercise'}</strong><span>{exercise.sets} sets × {exercise.amount} {exercise.unit} / set</span></div>
                        <span className="prescribed-dose">{target} {exercise.unit}</span>
                        <label className="dose-entry"><span className="sr-only">{exercise.name || 'Exercise'} {exercise.unit} completed</span><input type="number" min="0" max={target} step="1" inputMode="numeric" value={doseDraft[exercise.id] ?? 0} onChange={(event) => setDoseDraft((current) => ({ ...current, [exercise.id]: Math.min(Math.max(Number(event.target.value), 0), target) }))} /><span>{exercise.unit}</span></label>
                      </div>
                    )
                  })}
                  <div className="effort-row">
                    <div><strong>How did the session feel?</strong><span>Perceived effort</span></div>
                    <div className="effort-scale" role="group" aria-label="Perceived effort from 1 to 5">
                      {[1, 2, 3, 4, 5].map((level) => <button type="button" key={level} className={effort === level ? 'selected' : ''} aria-pressed={effort === level} onClick={() => setEffort(level)}>{level}</button>)}
                    </div>
                  </div>
                  <div className="checkin-actions">
                    <button className="primary-button" type="submit">Save completed session</button>
                    <label className="missed-reason"><span>Reason if missed</span><select value={missReason} onChange={(event) => setMissReason(event.target.value)}><option>Schedule conflict</option><option>Forgot</option><option>Not feeling well</option><option>Other</option></select></label>
                    <button className="text-button missed-button" type="button" onClick={() => saveCheckIn('missed')}>Mark missed</button>
                  </div>
                  <p className="form-note">Completion and exercise amounts are self-reported.</p>
                </form>
              )}
            </section>

            <aside className="patient-aside">
              <section className="panel adherence-panel">
                <div className="panel-heading compact-heading"><div><p className="eyebrow">LAST 7 DAYS</p><h2>Adherence snapshot</h2></div></div>
                <div className="metric-pair">
                  <div className="metric"><span>Sessions</span><strong>{summary.sessionRate === null ? '—' : `${summary.sessionRate}%`}</strong><small>{summary.completed} of {summary.scheduled} scheduled</small></div>
                  <div className="metric dose-metric"><span>Exercise dose</span><strong>{summary.doseRate === null ? '—' : `${summary.doseRate}%`}</strong><small>mean reported dose per exercise</small></div>
                </div>
                <div className="week-strip" aria-label="Prescribed days in the last seven days">
                  {Array.from({ length: 7 }, (_, index) => dateAtOffset(index - 6, today)).map((date) => {
                    const log = selected.logs.find((item) => item.date === dateKey(date))
                    const scheduled = selected.protocol.days.includes(date.getDay())
                    return <div className="week-day" key={dateKey(date)}><span>{dateLabel(date, { weekday: 'narrow' })}</span><i className={`${scheduled ? 'scheduled' : ''} ${log?.status ?? ''}`} aria-label={scheduled ? log?.status ?? 'scheduled, not logged' : 'not scheduled'} /></div>
                  })}
                </div>
                <p className="metric-footnote">Sessions count a saved completion. Dose is the mean of each reported exercise amount ÷ its prescribed amount; missing sessions count as 0%.</p>
              </section>
              <section className="protocol-summary">
                <p className="eyebrow">YOUR SCHEDULE</p>
                <div className="schedule-pills">{WEEKDAYS.filter((day) => selected.protocol.days.includes(day.day)).map((day) => <span key={day.day}>{day.label}</span>)}{selected.protocol.days.length === 0 && <span className="muted">No days set</span>}</div>
                <p>{selected.protocol.exercises.length} prescribed {selected.protocol.exercises.length === 1 ? 'exercise' : 'exercises'}</p>
              </section>
            </aside>
          </div>
        ) : (
          <div className="research-layout">
            <aside className="participant-list panel">
              <div className="panel-heading list-heading"><div><p className="eyebrow">COHORT</p><h2>Participants <span className="count-badge">{participants.length}</span></h2></div></div>
              <div className="participant-rows">
                {participants.map((participant) => {
                  const participantSummary = getWeekSummary(participant, today)
                  return <button type="button" key={participant.id} className={`participant-row ${participant.id === selectedId ? 'selected' : ''}`} onClick={() => selectParticipant(participant.id)}><span className="participant-avatar">{participant.id.slice(-2)}</span><span className="participant-meta"><strong>{participant.id}</strong><small>{participant.protocol.exercises.length} exercises · {participant.protocol.days.length} days / week</small></span><span className="participant-rate">{participantSummary.sessionRate === null ? '—' : `${participantSummary.sessionRate}%`}</span></button>
                })}
              </div>
              <button className="add-participant" type="button" onClick={addParticipant}><span aria-hidden="true">+</span> Add participant</button>
              <p className="sample-note">Demo participants use pseudonymous sample data.</p>
            </aside>

            <div className="research-main">
              <section className="metrics-section">
                <div className="section-title"><div><p className="eyebrow">{selected.id} · ROLLING 7 DAYS</p><h2>Adherence at a glance</h2></div><span className="self-report-tag">SELF-REPORTED</span></div>
                <div className="research-metrics">
                  <div className="research-metric session-card"><span>Sessions completed</span><strong>{summary.sessionRate === null ? '—' : `${summary.sessionRate}%`}</strong><small>{summary.completed} completed / {summary.scheduled} scheduled sessions</small><div className="metric-track"><i style={{ width: `${summary.sessionRate ?? 0}%` }} /></div></div>
                  <div className="research-metric dose-card"><span>Mean exercise dose completed</span><strong>{summary.doseRate === null ? '—' : `${summary.doseRate}%`}</strong><small>mean reported amount / prescribed target per exercise</small><div className="metric-track"><i style={{ width: `${summary.doseRate ?? 0}%` }} /></div></div>
                </div>
                <div className="trend-panel">
                  <div className="trend-heading"><div><h3>Session completion trend</h3><p>Completed sessions ÷ scheduled sessions by week</p></div><span>6 WEEKS</span></div>
                  <div className="trend-chart" role="img" aria-label="Six week session completion trend">
                    {trend.map((week) => <div className="trend-column" key={week.label}><div className="bar-track"><i style={{ height: `${week.rate ?? 0}%` }} /></div><strong>{week.rate === null ? '—' : `${week.rate}%`}</strong><span>{week.label}</span></div>)}
                  </div>
                </div>
              </section>

              <section className="protocol-editor panel">
                <div className="panel-heading editor-heading"><div><p className="eyebrow">PARTICIPANT PROTOCOL</p><h2>Prescribed plan</h2></div><span className="autosave-label"><i />Saved on this device</span></div>
                <fieldset className="schedule-editor"><legend>Scheduled days</legend><div className="day-toggles">{WEEKDAYS.map((day) => <label key={day.day} className={selected.protocol.days.includes(day.day) ? 'checked' : ''}><input type="checkbox" checked={selected.protocol.days.includes(day.day)} onChange={() => updateProtocol({ days: selected.protocol.days.includes(day.day) ? selected.protocol.days.filter((item) => item !== day.day) : [...selected.protocol.days, day.day] })} /><span>{day.label}</span></label>)}</div></fieldset>
                <div className="editor-exercises">
                  <div className="editor-label-row"><span>EXERCISE</span><span>SETS</span><span>AMOUNT / SET</span><span>UNIT</span><span /></div>
                  {selected.protocol.exercises.map((exercise) => <div className="editor-exercise" key={exercise.id}><label><span className="sr-only">Exercise name</span><input value={exercise.name} placeholder="Exercise name" onChange={(event) => updateExercise(exercise.id, { name: event.target.value })} /></label><label><span className="sr-only">Sets</span><input type="number" min="1" max="20" value={exercise.sets} onChange={(event) => updateExercise(exercise.id, { sets: Math.max(1, Number(event.target.value)) })} /></label><label><span className="sr-only">Amount per set</span><input type="number" min="1" max="999" value={exercise.amount} onChange={(event) => updateExercise(exercise.id, { amount: Math.max(1, Number(event.target.value)) })} /></label><label><span className="sr-only">Unit</span><select value={exercise.unit} onChange={(event) => updateExercise(exercise.id, { unit: event.target.value as Exercise['unit'] })}><option value="reps">reps</option><option value="seconds">seconds</option></select></label><button className="remove-exercise" type="button" aria-label={`Remove ${exercise.name || 'exercise'}`} onClick={() => updateProtocol({ exercises: selected.protocol.exercises.filter((item) => item.id !== exercise.id) })}>Remove</button></div>)}
                </div>
                <button className="add-exercise" type="button" onClick={addExercise}>+ Add exercise</button>
                <p className="protocol-note">Protocol edits affect this participant only. Research use should define how protocol changes are handled before data collection.</p>
              </section>
            </div>
          </div>
        )}

        <footer className="disclaimer"><span className="disclaimer-mark" aria-hidden="true">i</span><p><strong>Study prototype.</strong> Entries are self-reported and stored only in this browser. This tool is not for clinical decision-making; do not enter identifiable patient information.</p></footer>
      </main>
    </div>
  )
}

export default App
