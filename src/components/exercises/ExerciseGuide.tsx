import type { Exercise } from '../../types/training'
import { exerciseGuides, type Illustration } from '../../data/exerciseGuides'
import { getExerciseFamily, getExerciseVariant } from '../../data/exerciseVariants'

type Point = [number, number]
interface Pose { head: Point; shoulders: [Point, Point]; elbows: [Point, Point]; hands: [Point, Point]; hips: [Point, Point]; knees: [Point, Point]; feet: [Point, Point] }
const standing: Pose = { head: [80, 28], shoulders: [[62, 58], [98, 58]], elbows: [[51, 91], [109, 91]], hands: [[48, 122], [112, 122]], hips: [[68, 106], [92, 106]], knees: [[66, 140], [94, 140]], feet: [[62, 173], [98, 173]] }
const closeHands: Pose = { ...standing, elbows: [[59, 81], [101, 81]], hands: [[72, 76], [88, 76]] }
const hinge: Pose = { head: [121, 55], shoulders: [[92, 76], [106, 81]], elbows: [[94, 108], [109, 111]], hands: [[91, 137], [108, 139]], hips: [[66, 108], [82, 112]], knees: [[64, 140], [83, 142]], feet: [[60, 173], [86, 173]] }
const floor: Pose = { head: [31, 121], shoulders: [[55, 115], [64, 116]], elbows: [[61, 84], [79, 84]], hands: [[63, 97], [81, 97]], hips: [[100, 119], [111, 120]], knees: [[123, 93], [132, 95]], feet: [[143, 127], [150, 129]] }
const pose = (base: Pose, changes: Partial<Pose>): Pose => ({ ...base, ...changes })

const poses: Record<Illustration, [Pose, Pose]> = {
  squat: [closeHands, pose(closeHands, { head: [80, 49], shoulders: [[62, 79], [98, 79]], elbows: [[57, 98], [103, 98]], hands: [[72, 94], [88, 94]], hips: [[66, 132], [94, 132]], knees: [[49, 145], [111, 145]], feet: [[45, 173], [115, 173]] })],
  lunge: [standing, pose(standing, { head: [80, 53], shoulders: [[62, 82], [98, 82]], elbows: [[51, 108], [109, 108]], hands: [[48, 137], [112, 137]], hips: [[68, 129], [92, 129]], knees: [[43, 147], [117, 151]], feet: [[32, 173], [135, 173]] })],
  hinge: [standing, hinge],
  'single-leg-hinge': [standing, pose(hinge, { hips: [[67, 108], [81, 109]], knees: [[61, 141], [113, 132]], feet: [[57, 173], [145, 138]] })],
  'floor-press': [floor, pose(floor, { elbows: [[59, 75], [78, 75]], hands: [[59, 42], [78, 42]] })],
  'overhead-press': [pose(standing, { elbows: [[51, 80], [109, 80]], hands: [[60, 62], [100, 62]] }), pose(standing, { elbows: [[58, 49], [102, 49]], hands: [[61, 24], [99, 24]] })],
  row: [hinge, pose(hinge, { elbows: [[84, 88], [95, 89]], hands: [[73, 101], [89, 101]] })],
  pullover: [pose(floor, { elbows: [[60, 71], [75, 71]], hands: [[63, 45], [78, 45]] }), pose(floor, { elbows: [[43, 75], [54, 75]], hands: [[28, 47], [38, 47]] })],
  'lateral-raise': [standing, pose(standing, { elbows: [[39, 67], [121, 67]], hands: [[22, 65], [138, 65]] })],
  curl: [standing, pose(standing, { elbows: [[51, 91], [109, 91]], hands: [[54, 65], [106, 65]] })],
  'overhead-extension': [pose(standing, { elbows: [[66, 42], [94, 42]], hands: [[71, 55], [89, 55]] }), pose(standing, { elbows: [[68, 38], [92, 38]], hands: [[73, 18], [87, 18]] })],
  'calf-raise': [standing, pose(standing, { head: [80, 20], shoulders: [[62, 50], [98, 50]], elbows: [[51, 83], [109, 83]], hands: [[48, 114], [112, 114]], hips: [[68, 98], [92, 98]], knees: [[66, 132], [94, 132]], feet: [[62, 164], [98, 164]] })],
  carry: [standing, pose(standing, { hips: [[68, 106], [92, 106]], knees: [[66, 140], [108, 131]], feet: [[62, 173], [119, 146]] })],
  'dead-bug': [pose(floor, { elbows: [[60, 72], [80, 72]], hands: [[62, 45], [81, 45]], knees: [[123, 82], [137, 84]], feet: [[126, 54], [140, 56]] }), pose(floor, { elbows: [[60, 72], [80, 72]], hands: [[62, 45], [81, 45]], knees: [[125, 88], [135, 114]], feet: [[127, 61], [153, 139]] })],
  'reverse-fly': [hinge, pose(hinge, { elbows: [[69, 79], [124, 88]], hands: [[50, 75], [142, 87]] })],
  'skull-crusher': [pose(floor, { elbows: [[61, 71], [79, 71]], hands: [[42, 66], [55, 66]] }), pose(floor, { elbows: [[61, 71], [79, 71]], hands: [[63, 41], [80, 41]] })],
  'sumo-deadlift': [pose(standing, { hips: [[58, 106], [102, 106]], knees: [[47, 140], [113, 140]], feet: [[38, 173], [122, 173]], hands: [[72, 129], [88, 129]] }), pose(standing, { hips: [[58, 106], [102, 106]], knees: [[47, 140], [113, 140]], feet: [[38, 173], [122, 173]], hands: [[72, 108], [88, 108]] })],
}

const segment = (a: Point, b: Point) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
function Figure({ body, oneWeight, centerWeight, label }: { body: Pose; oneWeight: boolean; centerWeight: boolean; label: string }) {
  const center: Point = [(body.hands[0][0] + body.hands[1][0]) / 2, (body.hands[0][1] + body.hands[1][1]) / 2]
  return <svg viewBox="0 0 160 188" role="img" aria-label={label}>
    <path d="M12 178H150" className="guide-ground" />
    <g className="guide-limbs">{segment(body.hips[0], body.knees[0])}{segment(body.knees[0], body.feet[0])}{segment(body.hips[1], body.knees[1])}{segment(body.knees[1], body.feet[1])}</g>
    <path d={`M${body.shoulders[0][0]} ${body.shoulders[0][1]} L${body.shoulders[1][0]} ${body.shoulders[1][1]} L${body.hips[1][0]} ${body.hips[1][1]} L${body.hips[0][0]} ${body.hips[0][1]} Z`} className="guide-torso" />
    <g className="guide-limbs">{segment(body.shoulders[0], body.elbows[0])}{segment(body.elbows[0], body.hands[0])}{segment(body.shoulders[1], body.elbows[1])}{segment(body.elbows[1], body.hands[1])}</g>
    <circle cx={body.head[0]} cy={body.head[1]} r="15" className="guide-head" />
    <g className="guide-weights">{centerWeight ? <rect x={center[0] - 12} y={center[1] - 5} width="24" height="10" rx="3" /> : <>{!oneWeight && <rect x={body.hands[0][0] - 11} y={body.hands[0][1] - 5} width="22" height="10" rx="3" />}<rect x={body.hands[1][0] - 11} y={body.hands[1][1] - 5} width="22" height="10" rx="3" /></>}</g>
  </svg>
}

export function ExerciseGuide({ exercise, compact = false }: { exercise: Exercise; compact?: boolean }) {
  const guide = exerciseGuides[exercise.id]
  if (!guide) return null
  const variant = getExerciseVariant(exercise.id, exercise.variantId)
  const [start, finish] = poses[guide.illustration]
  const centerWeight = ['squat', 'sumo-deadlift', 'pullover', 'overhead-extension', 'skull-crusher', 'dead-bug'].includes(guide.illustration) && exercise.dumbbellCount === 1
  return <div className={`exercise-guide ${compact ? 'compact' : ''}`} aria-label={`How to do ${exercise.name}`}>
    <div className="exercise-guide-frames"><figure><Figure body={start} oneWeight={exercise.dumbbellCount === 1} centerWeight={centerWeight} label={`${exercise.name}: starting position illustration`} /><figcaption>START</figcaption></figure><span className="guide-motion" aria-hidden="true">→</span><figure><Figure body={finish} oneWeight={exercise.dumbbellCount === 1} centerWeight={centerWeight} label={`${exercise.name}: finishing position illustration`} /><figcaption>MOVE</figcaption></figure></div>
    {variant && variant.level > 0 && <div className="exercise-guide-variation"><strong>{variant.name}</strong><span>DIFFICULTY {variant.level + 1} / {getExerciseFamily(exercise.id)?.variantIds.length}</span></div>}
    <div className="exercise-guide-cues"><p><b>1 · SET UP</b>{guide.setup}</p><p><b>2 · MOVE</b>{guide.movement}</p>{variant && variant.level > 0 && <p><b>3 · MODIFIER</b>{variant.modifierCue}</p>}</div>
  </div>
}
