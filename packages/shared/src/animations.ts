// ── Builder animation system ─────────────────────────────────────────────
// Single source of truth for animation presets, keyframes, and initial states.
// Imported by builder-renderer (runtime) and builder-react (editor preview).

export interface AnimationPreset {
  value: string;
  label: string;
}

export interface AnimationGroup {
  label: string;
  options: AnimationPreset[];
}

export type AnimationInitialStyle = {
  opacity?: number;
  transform?: string;
};

// ── Grouped presets (used in PropertyPanel) ──────────────────────────────

export const ANIMATION_PRESETS_GROUPED: AnimationGroup[] = [
  {
    label: "Attention",
    options: [
      { value: "bounce",     label: "Bounce" },
      { value: "flash",      label: "Flash" },
      { value: "heartBeat",  label: "Heart Beat" },
      { value: "jello",      label: "Jello" },
      { value: "pulse",      label: "Pulse" },
      { value: "rubberBand", label: "Rubber Band" },
      { value: "shakeX",     label: "Shake" },
      { value: "swing",      label: "Swing" },
      { value: "tada",       label: "Tada" },
      { value: "wobble",     label: "Wobble" },
    ],
  },
  {
    label: "Fade In",
    options: [
      { value: "fadeIn",            label: "Fade In" },
      { value: "fadeInDown",        label: "Fade In Down" },
      { value: "fadeInUp",          label: "Fade In Up" },
      { value: "fadeInLeft",        label: "Fade In Left" },
      { value: "fadeInRight",       label: "Fade In Right" },
      { value: "fadeInTopLeft",     label: "Fade In Top Left" },
      { value: "fadeInTopRight",    label: "Fade In Top Right" },
      { value: "fadeInBottomLeft",  label: "Fade In Bottom Left" },
      { value: "fadeInBottomRight", label: "Fade In Bottom Right" },
    ],
  },
  {
    label: "Fade Out",
    options: [
      { value: "fadeOut",      label: "Fade Out" },
      { value: "fadeOutDown",  label: "Fade Out Down" },
      { value: "fadeOutUp",    label: "Fade Out Up" },
      { value: "fadeOutLeft",  label: "Fade Out Left" },
      { value: "fadeOutRight", label: "Fade Out Right" },
    ],
  },
  {
    label: "Bounce In",
    options: [
      { value: "bounceIn",      label: "Bounce In" },
      { value: "bounceInDown",  label: "Bounce In Down" },
      { value: "bounceInUp",    label: "Bounce In Up" },
      { value: "bounceInLeft",  label: "Bounce In Left" },
      { value: "bounceInRight", label: "Bounce In Right" },
    ],
  },
  {
    label: "Zoom In",
    options: [
      { value: "zoomIn",      label: "Zoom In" },
      { value: "zoomInDown",  label: "Zoom In Down" },
      { value: "zoomInUp",    label: "Zoom In Up" },
      { value: "zoomInLeft",  label: "Zoom In Left" },
      { value: "zoomInRight", label: "Zoom In Right" },
    ],
  },
  {
    label: "Slide In",
    options: [
      { value: "slideInDown",  label: "Slide In Down" },
      { value: "slideInUp",    label: "Slide In Up" },
      { value: "slideInLeft",  label: "Slide In Left" },
      { value: "slideInRight", label: "Slide In Right" },
    ],
  },
  {
    label: "Rotate In",
    options: [
      { value: "rotateIn",          label: "Rotate In" },
      { value: "rotateInDownLeft",  label: "Rotate In Down Left" },
      { value: "rotateInDownRight", label: "Rotate In Down Right" },
    ],
  },
  {
    label: "Flip",
    options: [
      { value: "flipInX", label: "Flip In X" },
      { value: "flipInY", label: "Flip In Y" },
    ],
  },
  {
    label: "Special",
    options: [
      { value: "jackInTheBox", label: "Jack In The Box" },
      { value: "rollIn",       label: "Roll In" },
    ],
  },
  {
    label: "Exit",
    options: [
      { value: "bounceOut",    label: "Bounce Out" },
      { value: "zoomOut",      label: "Zoom Out" },
      { value: "slideOutDown", label: "Slide Out Down" },
      { value: "slideOutUp",   label: "Slide Out Up" },
      { value: "slideOutLeft", label: "Slide Out Left" },
      { value: "slideOutRight",label: "Slide Out Right" },
    ],
  },
];

// Flat list for quick lookup
export const ANIMATION_PRESETS_FLAT: AnimationPreset[] = ANIMATION_PRESETS_GROUPED.flatMap(
  (g) => g.options,
);

// ── Preset → CSS keyframe name ───────────────────────────────────────────

export const PRESET_KEYFRAME: Record<string, string> = {
  // Attention
  bounce:     "rb-bounce",
  flash:      "rb-flash",
  heartBeat:  "rb-heartBeat",
  jello:      "rb-jello",
  pulse:      "rb-pulse",
  rubberBand: "rb-rubberBand",
  shakeX:     "rb-shakeX",
  swing:      "rb-swing",
  tada:       "rb-tada",
  wobble:     "rb-wobble",
  // Fade In
  fadeIn:            "rb-fadeIn",
  fadeInDown:        "rb-fadeInDown",
  fadeInUp:          "rb-fadeInUp",
  fadeInLeft:        "rb-fadeInLeft",
  fadeInRight:       "rb-fadeInRight",
  fadeInTopLeft:     "rb-fadeInTopLeft",
  fadeInTopRight:    "rb-fadeInTopRight",
  fadeInBottomLeft:  "rb-fadeInBottomLeft",
  fadeInBottomRight: "rb-fadeInBottomRight",
  // Fade Out
  fadeOut:      "rb-fadeOut",
  fadeOutDown:  "rb-fadeOutDown",
  fadeOutUp:    "rb-fadeOutUp",
  fadeOutLeft:  "rb-fadeOutLeft",
  fadeOutRight: "rb-fadeOutRight",
  // Bounce In
  bounceIn:      "rb-bounceIn",
  bounceInDown:  "rb-bounceInDown",
  bounceInUp:    "rb-bounceInUp",
  bounceInLeft:  "rb-bounceInLeft",
  bounceInRight: "rb-bounceInRight",
  // Zoom In
  zoomIn:      "rb-zoomIn",
  zoomInDown:  "rb-zoomInDown",
  zoomInUp:    "rb-zoomInUp",
  zoomInLeft:  "rb-zoomInLeft",
  zoomInRight: "rb-zoomInRight",
  // Slide In
  slideInDown:  "rb-slideInDown",
  slideInUp:    "rb-slideInUp",
  slideInLeft:  "rb-slideInLeft",
  slideInRight: "rb-slideInRight",
  // Rotate In
  rotateIn:          "rb-rotateIn",
  rotateInDownLeft:  "rb-rotateInDownLeft",
  rotateInDownRight: "rb-rotateInDownRight",
  // Flip
  flipInX: "rb-flipInX",
  flipInY: "rb-flipInY",
  // Special
  jackInTheBox: "rb-jackInTheBox",
  rollIn:       "rb-rollIn",
  // Exit
  bounceOut:    "rb-bounceOut",
  zoomOut:      "rb-zoomOut",
  slideOutDown: "rb-slideOutDown",
  slideOutUp:   "rb-slideOutUp",
  slideOutLeft: "rb-slideOutLeft",
  slideOutRight:"rb-slideOutRight",
};

// ── Initial CSS state applied before animation fires (prevents flash) ────
// Attention seekers play from the element's existing visual state → no hiding needed.
// Entrances start transparent/offset. Exits start visible.

export const PRESET_INITIAL: Record<string, AnimationInitialStyle> = {
  // Attention — no initial hiding
  bounce: {}, flash: {}, heartBeat: {}, jello: {}, pulse: {},
  rubberBand: {}, shakeX: {}, swing: {}, tada: {}, wobble: {},
  // Fade In
  fadeIn:            { opacity: 0 },
  fadeInDown:        { opacity: 0, transform: "translateY(-40px)" },
  fadeInUp:          { opacity: 0, transform: "translateY(40px)" },
  fadeInLeft:        { opacity: 0, transform: "translateX(-40px)" },
  fadeInRight:       { opacity: 0, transform: "translateX(40px)" },
  fadeInTopLeft:     { opacity: 0, transform: "translate(-40px,-40px)" },
  fadeInTopRight:    { opacity: 0, transform: "translate(40px,-40px)" },
  fadeInBottomLeft:  { opacity: 0, transform: "translate(-40px,40px)" },
  fadeInBottomRight: { opacity: 0, transform: "translate(40px,40px)" },
  // Fade Out — start visible
  fadeOut: {}, fadeOutDown: {}, fadeOutUp: {}, fadeOutLeft: {}, fadeOutRight: {},
  // Bounce In
  bounceIn:      { opacity: 0, transform: "scale(0.3)" },
  bounceInDown:  { opacity: 0, transform: "translateY(-200px)" },
  bounceInUp:    { opacity: 0, transform: "translateY(200px)" },
  bounceInLeft:  { opacity: 0, transform: "translateX(-200px)" },
  bounceInRight: { opacity: 0, transform: "translateX(200px)" },
  // Zoom In
  zoomIn:      { opacity: 0, transform: "scale(0.1)" },
  zoomInDown:  { opacity: 0, transform: "scale(0.1) translateY(-200px)" },
  zoomInUp:    { opacity: 0, transform: "scale(0.1) translateY(200px)" },
  zoomInLeft:  { opacity: 0, transform: "scale(0.1) translateX(-200px)" },
  zoomInRight: { opacity: 0, transform: "scale(0.1) translateX(200px)" },
  // Slide In
  slideInDown:  { opacity: 0, transform: "translateY(-40px)" },
  slideInUp:    { opacity: 0, transform: "translateY(40px)" },
  slideInLeft:  { opacity: 0, transform: "translateX(-40px)" },
  slideInRight: { opacity: 0, transform: "translateX(40px)" },
  // Rotate In
  rotateIn:          { opacity: 0, transform: "rotate(-200deg)" },
  rotateInDownLeft:  { opacity: 0, transform: "rotate(-45deg)" },
  rotateInDownRight: { opacity: 0, transform: "rotate(45deg)" },
  // Flip
  flipInX: { opacity: 0 },
  flipInY: { opacity: 0 },
  // Special
  jackInTheBox: { opacity: 0, transform: "scale(0.1) rotate(30deg)" },
  rollIn:       { opacity: 0, transform: "translateX(-100%) rotate(-120deg)" },
  // Exit — start visible
  bounceOut: {}, zoomOut: {},
  slideOutDown: {}, slideOutUp: {}, slideOutLeft: {}, slideOutRight: {},
};

// ── CSS @keyframes string (injected at runtime) ──────────────────────────

export const ANIMATION_KEYFRAMES_CSS = `
@keyframes rb-bounce {
  0%,100%{transform:translateY(0);animation-timing-function:cubic-bezier(.215,.61,.355,1)}
  40%{transform:translateY(-30px);animation-timing-function:cubic-bezier(.755,.05,.855,.06)}
  70%{transform:translateY(-15px);animation-timing-function:cubic-bezier(.755,.05,.855,.06)}
  80%{transform:translateY(4px)} 90%{transform:translateY(-8px)}
}
@keyframes rb-flash { 0%,50%,100%{opacity:1} 25%,75%{opacity:0} }
@keyframes rb-heartBeat { 0%{transform:scale(1)} 14%{transform:scale(1.3)} 28%{transform:scale(1)} 42%{transform:scale(1.3)} 70%{transform:scale(1)} }
@keyframes rb-jello {
  0%,11.1%,100%{transform:none}
  22.2%{transform:skewX(-12.5deg) skewY(-12.5deg)} 33.3%{transform:skewX(6.25deg) skewY(6.25deg)}
  44.4%{transform:skewX(-3.125deg) skewY(-3.125deg)} 55.5%{transform:skewX(1.5625deg) skewY(1.5625deg)}
  66.6%{transform:skewX(-.78125deg) skewY(-.78125deg)} 77.7%{transform:skewX(.390625deg) skewY(.390625deg)}
  88.8%{transform:skewX(-.1953125deg) skewY(-.1953125deg)}
}
@keyframes rb-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
@keyframes rb-rubberBand {
  0%{transform:scale3d(1,1,1)} 30%{transform:scale3d(1.25,.75,1)} 40%{transform:scale3d(.75,1.25,1)}
  50%{transform:scale3d(1.15,.85,1)} 65%{transform:scale3d(.95,1.05,1)} 75%{transform:scale3d(1.05,.95,1)} 100%{transform:scale3d(1,1,1)}
}
@keyframes rb-shakeX { 0%,100%{transform:translateX(0)} 10%,30%,50%,70%,90%{transform:translateX(-10px)} 20%,40%,60%,80%{transform:translateX(10px)} }
@keyframes rb-swing { 20%{transform:rotate(15deg)} 40%{transform:rotate(-10deg)} 60%{transform:rotate(5deg)} 80%{transform:rotate(-5deg)} 100%{transform:rotate(0)} }
@keyframes rb-tada {
  0%{transform:scale(1)} 10%,20%{transform:scale(.9) rotate(-3deg)}
  30%,50%,70%,90%{transform:scale(1.1) rotate(3deg)} 40%,60%,80%{transform:scale(1.1) rotate(-3deg)} 100%{transform:scale(1) rotate(0)}
}
@keyframes rb-wobble {
  0%{transform:none} 15%{transform:translateX(-25%) rotate(-5deg)} 30%{transform:translateX(20%) rotate(3deg)}
  45%{transform:translateX(-15%) rotate(-3deg)} 60%{transform:translateX(10%) rotate(2deg)}
  75%{transform:translateX(-5%) rotate(-1deg)} 100%{transform:none}
}
@keyframes rb-fadeIn        { from{opacity:0}                                      to{opacity:1} }
@keyframes rb-fadeInDown    { from{opacity:0;transform:translateY(-40px)}          to{opacity:1;transform:none} }
@keyframes rb-fadeInUp      { from{opacity:0;transform:translateY(40px)}           to{opacity:1;transform:none} }
@keyframes rb-fadeInLeft    { from{opacity:0;transform:translateX(-40px)}          to{opacity:1;transform:none} }
@keyframes rb-fadeInRight   { from{opacity:0;transform:translateX(40px)}           to{opacity:1;transform:none} }
@keyframes rb-fadeInTopLeft    { from{opacity:0;transform:translate(-40px,-40px)}  to{opacity:1;transform:none} }
@keyframes rb-fadeInTopRight   { from{opacity:0;transform:translate(40px,-40px)}   to{opacity:1;transform:none} }
@keyframes rb-fadeInBottomLeft { from{opacity:0;transform:translate(-40px,40px)}   to{opacity:1;transform:none} }
@keyframes rb-fadeInBottomRight{ from{opacity:0;transform:translate(40px,40px)}    to{opacity:1;transform:none} }
@keyframes rb-fadeOut       { from{opacity:1}                                      to{opacity:0} }
@keyframes rb-fadeOutDown   { from{opacity:1;transform:none}                       to{opacity:0;transform:translateY(40px)} }
@keyframes rb-fadeOutUp     { from{opacity:1;transform:none}                       to{opacity:0;transform:translateY(-40px)} }
@keyframes rb-fadeOutLeft   { from{opacity:1;transform:none}                       to{opacity:0;transform:translateX(-40px)} }
@keyframes rb-fadeOutRight  { from{opacity:1;transform:none}                       to{opacity:0;transform:translateX(40px)} }
@keyframes rb-bounceIn {
  0%{opacity:0;transform:scale(.3)} 20%{transform:scale(1.1)} 40%{transform:scale(.9)}
  60%{opacity:1;transform:scale(1.03)} 80%{transform:scale(.97)} 100%{opacity:1;transform:scale(1)}
}
@keyframes rb-bounceInDown {
  0%{opacity:0;transform:translateY(-200px)}
  60%{opacity:1;transform:translateY(25px)} 75%{transform:translateY(-10px)}
  90%{transform:translateY(5px)} 100%{transform:none}
}
@keyframes rb-bounceInUp {
  0%{opacity:0;transform:translateY(200px)}
  60%{opacity:1;transform:translateY(-25px)} 75%{transform:translateY(10px)}
  90%{transform:translateY(-5px)} 100%{transform:none}
}
@keyframes rb-bounceInLeft {
  0%{opacity:0;transform:translateX(-200px)}
  60%{opacity:1;transform:translateX(25px)} 75%{transform:translateX(-10px)}
  90%{transform:translateX(5px)} 100%{transform:none}
}
@keyframes rb-bounceInRight {
  0%{opacity:0;transform:translateX(200px)}
  60%{opacity:1;transform:translateX(-25px)} 75%{transform:translateX(10px)}
  90%{transform:translateX(-5px)} 100%{transform:none}
}
@keyframes rb-zoomIn        { from{opacity:0;transform:scale(.1)}                  to{opacity:1;transform:none} }
@keyframes rb-zoomInDown    { 0%{opacity:0;transform:scale(.1) translateY(-200px)} 60%{opacity:1;transform:scale(.475) translateY(60px)} 100%{transform:none} }
@keyframes rb-zoomInUp      { 0%{opacity:0;transform:scale(.1) translateY(200px)}  60%{opacity:1;transform:scale(.475) translateY(-60px)} 100%{transform:none} }
@keyframes rb-zoomInLeft    { 0%{opacity:0;transform:scale(.1) translateX(-200px)} 60%{opacity:1;transform:scale(.475) translateX(10px)}  100%{transform:none} }
@keyframes rb-zoomInRight   { 0%{opacity:0;transform:scale(.1) translateX(200px)}  60%{opacity:1;transform:scale(.475) translateX(-10px)} 100%{transform:none} }
@keyframes rb-slideInDown   { from{opacity:0;transform:translateY(-40px)}          to{opacity:1;transform:none} }
@keyframes rb-slideInUp     { from{opacity:0;transform:translateY(40px)}           to{opacity:1;transform:none} }
@keyframes rb-slideInLeft   { from{opacity:0;transform:translateX(-40px)}          to{opacity:1;transform:none} }
@keyframes rb-slideInRight  { from{opacity:0;transform:translateX(40px)}           to{opacity:1;transform:none} }
@keyframes rb-rotateIn      { from{opacity:0;transform:rotate(-200deg)}            to{opacity:1;transform:none} }
@keyframes rb-rotateInDownLeft  { from{opacity:0;transform:rotate(-45deg)}         to{opacity:1;transform:none} }
@keyframes rb-rotateInDownRight { from{opacity:0;transform:rotate(45deg)}          to{opacity:1;transform:none} }
@keyframes rb-flipInX {
  0%{opacity:0;transform:perspective(400px) rotateX(90deg)}
  40%{transform:perspective(400px) rotateX(-20deg)} 60%{opacity:1;transform:perspective(400px) rotateX(10deg)}
  80%{transform:perspective(400px) rotateX(-5deg)} 100%{transform:perspective(400px) rotateX(0)}
}
@keyframes rb-flipInY {
  0%{opacity:0;transform:perspective(400px) rotateY(90deg)}
  40%{transform:perspective(400px) rotateY(-20deg)} 60%{opacity:1;transform:perspective(400px) rotateY(10deg)}
  80%{transform:perspective(400px) rotateY(-5deg)} 100%{transform:perspective(400px) rotateY(0)}
}
@keyframes rb-jackInTheBox {
  0%{opacity:0;transform:scale(.1) rotate(30deg);transform-origin:center bottom}
  50%{transform:rotate(-10deg)} 70%{transform:rotate(3deg)} 100%{opacity:1;transform:scale(1)}
}
@keyframes rb-rollIn { from{opacity:0;transform:translateX(-100%) rotate(-120deg)} to{opacity:1;transform:none} }
@keyframes rb-bounceOut {
  20%{transform:scale3d(.9,.9,.9)} 50%,55%{opacity:1;transform:scale3d(1.1,1.1,1.1)}
  100%{opacity:0;transform:scale3d(.3,.3,.3)}
}
@keyframes rb-zoomOut { 0%{opacity:1;transform:scale(1)} 50%{opacity:0;transform:scale(.3)} 100%{opacity:0;transform:scale(.3)} }
@keyframes rb-slideOutDown  { from{opacity:1;transform:none} to{opacity:0;transform:translateY(100%)} }
@keyframes rb-slideOutUp    { from{opacity:1;transform:none} to{opacity:0;transform:translateY(-100%)} }
@keyframes rb-slideOutLeft  { from{opacity:1;transform:none} to{opacity:0;transform:translateX(-100%)} }
@keyframes rb-slideOutRight { from{opacity:1;transform:none} to{opacity:0;transform:translateX(100%)} }
`;
