export type Programme = 'A' | 'B' | 'C' | 'D'
export type Direction = 'Extension' | 'Flexion' | 'Lateral' | 'None'
export type OdiScores = Array<number | null>

export type DraftExercise = {
  id: string
  name: string
  instructions: string
  dose: string
  optional?: boolean
  sessionKind?: 'aerobic' | 'strength'
  isActivity?: boolean
}

export type DraftProgramme = {
  id: Programme
  name: string
  category: string
  odiRange: string
  focus: string
  schedule: string
  equipment: string
  preferenceDose: string
  preference: Partial<Record<Exclude<Direction, 'None'>, { id: string; name: string; instructions: string }>>
  exercises: DraftExercise[]
}

export const DIRECTIONS: Direction[] = ['Extension', 'Flexion', 'Lateral', 'None']

export const PROGRAMMES: DraftProgramme[] = [
  {
    id: 'A',
    name: 'Relief and gentle movement',
    category: 'Crippled',
    odiRange: '61–80',
    focus: 'Pain relief, gentle movement, short walks',
    schedule: '2 sessions a day (morning and evening), 7 days a week · minimum 2 weeks',
    equipment: 'IRR lamp or ice pack (choose one); TENS optional; mat or firm bed; flat walking route.',
    preferenceDose: '2 sets of 10',
    preference: {
      Extension: { id: 'EXT-A', name: 'Prone on elbows', instructions: 'Lie face down and prop yourself on your forearms.' },
      Flexion: { id: 'FLX-A', name: 'Single knee-to-chest', instructions: 'Lying down, bring one knee toward the chest; repeat on each leg.' },
      Lateral: { id: 'LAT-A', name: 'Standing side-bend near a wall', instructions: 'Stand near a wall and side-bend through a small range, 10 each side.' },
    },
    exercises: [
      { id: 'A1', name: 'IRR or ice (choose one)', instructions: 'Apply to the lower back before the exercises. Follow the modality setup and precautions shown below.', dose: '10–15 min each session', optional: true },
      { id: 'A2', name: 'TENS', instructions: 'Optional comfort aid; use only according to the supplied draft parameters and exclusions.', dose: '20 min, up to 2 times a day', optional: true },
      { id: 'A3', name: 'Diaphragmatic breathing', instructions: 'Lie on your back with knees bent and one hand on the belly. Breathe in through the nose so the belly rises, then breathe out slowly through pursed lips.', dose: '10 breaths' },
      { id: 'A4', name: 'Pelvic tilt', instructions: 'Lie with knees bent. Gently tighten the lower belly to flatten the lower back against the surface, hold, then release.', dose: '10 reps, 3 s hold' },
      { id: 'A5', name: 'Knee rock', instructions: 'Lie with knees bent and together. Slowly roll the knees to one side in a small, comfortable range and back to the middle, then the other side.', dose: '10 each side' },
      { id: 'A6', name: 'Short walk', instructions: 'Walk on a flat surface at your own pace; stop if pain rises.', dose: '5 min' },
    ],
  },
  {
    id: 'B',
    name: 'Mobilise and activate',
    category: 'Severe',
    odiRange: '41–60',
    focus: 'Mobility, light core activation, walking',
    schedule: '1 session a day, 6 days a week, plus a second 10-minute walk later in the day · minimum 2 weeks',
    equipment: 'IRR lamp or ice pack optional; mat; strap or towel; flat walking route.',
    preferenceDose: '2 sets of 10',
    preference: {
      Extension: { id: 'EXT-B', name: 'Prone press-up', instructions: 'Lie face down with hands under shoulders and press up while hips stay down.' },
      Flexion: { id: 'FLX-B', name: 'Double knee-to-chest', instructions: 'Lying down, bring both knees toward the chest.' },
      Lateral: { id: 'LAT-B', name: 'Standing side-bend', instructions: 'As in Programme A, through a larger range.' },
    },
    exercises: [
      { id: 'B1', name: 'IRR or ice', instructions: 'Optional. Apply before the session if the back feels stiff or sore; follow the modality setup and precautions.', dose: '10–15 min, up to once a day', optional: true },
      { id: 'B2', name: 'Cat-camel', instructions: 'On hands and knees, slowly round the back up, then let it dip gently, within a comfortable range.', dose: '10 reps' },
      { id: 'B3', name: 'Abdominal bracing', instructions: 'Lie with knees bent. Gently draw the lower belly in (about a third of full effort) and keep breathing normally.', dose: '10 reps, 5 s hold' },
      { id: 'B4', name: 'Partial glute bridge', instructions: 'Lie with knees bent. Squeeze the buttocks and lift the hips as far as comfortable, hold, and lower slowly.', dose: '2 sets of 8, 3 s hold' },
      { id: 'B5', name: 'Hamstring stretch', instructions: 'Lie on your back, loop a strap or towel around one foot and straighten the knee until you feel a stretch behind the thigh.', dose: '3 × 30 s each leg' },
      { id: 'B6', name: 'Walking', instructions: 'Walk on a flat surface at a comfortable pace.', dose: '10–15 min' },
      { id: 'B-extra-walk', name: 'Second walk later in the day', instructions: 'Complete a separate walk later after the main session.', dose: '10 min', isActivity: true },
    ],
  },
  {
    id: 'C',
    name: 'Strengthen',
    category: 'Moderate',
    odiRange: '21–40',
    focus: 'Trunk and hip strengthening, longer walks',
    schedule: '1 session a day, 5 days a week · minimum 2 weeks',
    equipment: 'Mat; chair; flat walking route. IRR or ice optional if the therapist advises.',
    preferenceDose: '1 set of 10',
    preference: {
      Extension: { id: 'EXT-C', name: 'Prone press-up with hold', instructions: 'Prone press-up with a 2 s hold at the top.' },
      Flexion: { id: 'FLX-C', name: 'Seated flexion', instructions: 'Seated, slide hands towards the floor.' },
      Lateral: { id: 'LAT-C', name: 'Standing side-bend', instructions: 'As in Programme A, through the full comfortable range.' },
    },
    exercises: [
      { id: 'C1', name: 'Glute bridge', instructions: 'Lie with knees bent, lift the hips until the body is in a straight line, hold, and lower slowly.', dose: '3 sets of 10, 5 s hold' },
      { id: 'C2', name: 'Bird-dog', instructions: 'On hands and knees, reach one arm and the opposite leg out, keeping the back still. Return and switch sides.', dose: '3 sets of 8 each side, 5 s hold' },
      { id: 'C3', name: 'Side plank (from knees)', instructions: 'Lie on your side with the elbow under the shoulder and knees bent; lift the hips and hold.', dose: '3 holds of 15–20 s each side' },
      { id: 'C4', name: 'Curl-up', instructions: 'Lie with knees bent and hands under the lower back. Lift the head and shoulders slightly, hold, and lower.', dose: '3 sets of 8, 5 s hold' },
      { id: 'C5', name: 'Sit-to-stand', instructions: 'From a chair, stand up with a straight back and sit down slowly.', dose: '3 sets of 10' },
      { id: 'C6', name: 'Walking', instructions: 'Walk at a brisk but comfortable pace.', dose: '20–30 min' },
    ],
  },
  {
    id: 'D',
    name: 'Function and endurance',
    category: 'Minimal',
    odiRange: '0–20',
    focus: 'Endurance, strength, return to activity',
    schedule: 'Strength 3 days a week; aerobic activity 5 days a week (app counts one session per day) · stay until week 12',
    equipment: 'Mat; light weight (e.g. water bottle or dumbbell); walking route, bicycle or pool.',
    preferenceDose: '1 set of 10',
    preference: {
      Extension: { id: 'EXT-D', name: 'Standing extension', instructions: 'Stand with hands on hips and lean back.' },
      Flexion: { id: 'FLX-D', name: 'Standing flexion', instructions: 'Standing, slide hands down the thighs.' },
      Lateral: { id: 'LAT-D', name: 'Standing side-bend with light weight', instructions: 'As in Programme A, with a light weight in one hand if comfortable.' },
    },
    exercises: [
      { id: 'D1', name: 'Aerobic activity', instructions: 'Walking, cycling or swimming at a pace where you can still talk.', dose: '30 min, 5 days a week (build to 150 min a week)', sessionKind: 'aerobic' },
      { id: 'D2', name: 'Single-leg bridge', instructions: 'Lie with knees bent, extend one leg and lift the hips with the other; keep the pelvis level.', dose: '3 sets of 10 each side', sessionKind: 'strength' },
      { id: 'D3', name: 'Bird-dog with hold', instructions: 'As in C2 with a longer hold.', dose: '3 sets of 8 each side, 10 s hold', sessionKind: 'strength' },
      { id: 'D4', name: 'Side plank', instructions: 'On the side, elbow under the shoulder, legs straight; lift the hips and hold.', dose: '3 holds of 20–30 s each side', sessionKind: 'strength' },
      { id: 'D5', name: 'Squat or hip hinge with light load', instructions: 'Keep the back straight, bend at the hips and knees, and return to standing while holding a light weight.', dose: '3 sets of 10–12', sessionKind: 'strength' },
      { id: 'D6', name: 'Hamstring and hip flexor stretches', instructions: 'Hold each stretch gently without bouncing.', dose: '3 × 30 s each side', sessionKind: 'strength' },
      { id: 'D7', name: 'Graded activity task', instructions: 'Practise a task you avoid (e.g. lifting a box or bending to the floor). Start light and add a little each week.', dose: '3 sets of 5–8, 2–3 days a week', sessionKind: 'strength' },
      { id: 'D8', name: 'Preference exercise (optional)', instructions: 'Use the selected direction if symptoms flare.', dose: '1 set of 10', optional: true },
    ],
  },
]

export function getProgrammeForOdi(scores: OdiScores): Programme | null {
  const answered = scores.filter((score): score is number => score !== null)
  if (answered.length < 9) return null
  const percentage = (answered.reduce((sum, score) => sum + score, 0) / (answered.length * 5)) * 100
  if (percentage > 80) return null
  if (percentage >= 61) return 'A'
  if (percentage >= 41) return 'B'
  if (percentage >= 21) return 'C'
  return 'D'
}

export const URGENT_SYMPTOMS = [
  'Numbness around the saddle area (groin, inner thighs, or genitals)',
  'New difficulty passing urine or controlling bladder or bowel',
  'New or worsening leg weakness, or trouble walking',
  'Severe back pain after a fall or injury',
  'Fever or feeling unwell with back pain',
  'Unexplained weight loss, constant night pain, or known cancer',
  'Suspected fracture, infection, or tumour of the spine',
]

export const MODALITY_GUIDANCE = [
  'IRR/heat: lamp about 45–60 cm from lower back; check skin every few minutes; no direct contact. Draft exclusions include reduced skin sensation, poor circulation, open wound/rash, suspected tumour or infection, and recent bleeding.',
  'Ice: wrap the pack in a damp towel, never place directly on skin, and check after 5 minutes. Draft exclusions include cold sensitivity/Raynaud’s, reduced sensation, poor circulation, or an open wound.',
  'TENS: draft describes pads on clean intact skin and 80–100 Hz; optional comfort aid only. Draft exclusions include pacemaker/implanted device, pregnancy, epilepsy, broken/numb skin, or front of neck.',
  'The supplied draft notes NICE (2016) and WHO (2023) advise against routine TENS for low back pain; TENS is not a core treatment.',
]

export const CONTACT_CLINICIAN_GUIDANCE = [
  'Pain after a session remains 2 or more points above usual for more than 48 hours.',
  'No improvement after 2 weeks in a programme, or an exercise cannot be done.',
  'Skin redness, blistering, or irritation after IRR, ice, or TENS.',
  'New tingling in a leg or pain spreading further into the leg.',
]
