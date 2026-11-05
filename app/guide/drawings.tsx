import type { CSSProperties, ReactNode } from "react";
import { Bar, Box, Btn, Fields, hue, Mark, Phone, Tap, Touch } from "./parts";

// One drawing per step, in a 160 box. Each reads without its caption: a lit coil works, a broken
// one doesn't, and a touch point marks what to press.
const GREEN = hue("Green");
const TEAL = hue("Teal");

const Plain = ({ x, y, s, r = 9 }: { x: number; y: number; s: number; r?: number }) => <rect className="g-fg" x={x} y={y} width={s} height={s} rx={r} />;

// The Logged page in a phone: meta, title, the coil, the count, and Undo at the bottom.
const LoggedScreen = ({ fresh = true, undo, meta = "e" }: { fresh?: boolean; undo?: boolean; meta?: string }) => (
  <>
    <Bar x={0} y={4} l={18} c={meta} w={2.4} />
    <Bar x={0} y={12} l={26} c="i" w={3.6} />
    <Mark x={8} y={20} size={40} target={8} count={fresh ? 5 : 6} />
    {fresh && <Mark x={8} y={20} size={40} target={8} count={6} only={5} />}
    <Bar x={0} y={70} l={14} c="i" w={4.4} />
    <Bar x={18} y={70} l={8} c="m" w={2.4} />
    <Bar x={0} y={78} l={20} w={2.4} />
    <Btn x={0} y={92} w={56} h={13} />
    {undo && <Tap x={0} y={92} w={56} h={13} />}
  </>
);


export const DRAW: Record<string, () => ReactNode> = {
  ntag: () => (
    <>
      <rect className="g-e" x={16} y={16} width={128} height={128} rx={12} strokeWidth={1.2} />
      <path className="g-e" strokeWidth={1} strokeDasharray="2 4" d="M80 22V138M22 80H138" />
      {[[24, 24], [86, 24], [24, 86], [86, 86]].map(([x, y]) => <Mark key={`${x}${y}`} x={x} y={y} size={50} target={3} count={0} />)}
    </>
  ),
  onelink: () => (
    <>
      {([[24, hue("Blue"), 54], [92, GREEN, 40]] as const).map(([y, c, l]) => (
        <g key={y}>
          <Mark x={10} y={y - 18} size={40} target={3} count={3} color={c} />
          <path className="g-t guide__hc" style={{ "--habit": c } as CSSProperties} strokeWidth={2.4} d={`M50 ${y + 2}H70`} />
          <Box x={70} y={y - 8} w={80} h={20} />
          <rect className="g-i" x={77} y={y - 2} width={10} height={8} rx={3} strokeWidth={1.6} />
          <rect className="g-i" x={85} y={y - 2} width={10} height={8} rx={3} strokeWidth={1.6} />
          <Bar x={102} y={y + 2} l={l - 10} w={2.6} />
        </g>
      ))}
    </>
  ),
  bottle: () => (
    <>
      <path className="g-i" strokeWidth={2.2} d="M70 14h20v12h-20zM72 26v10c0 8-20 10-20 26v80c0 6 4 10 10 10h36c6 0 10-4 10-10V62c0-16-20-18-20-26V26" />
      <Plain x={58} y={80} s={44} />
      <Mark x={58} y={80} size={44} target={3} count={3} />
    </>
  ),
  metal: () => (
    <>
      <defs>
        <clipPath id="guide-plate">
          <rect x={20} y={34} width={120} height={96} rx={8} />
        </clipPath>
      </defs>
      <rect className="g-i" x={20} y={34} width={120} height={96} rx={8} strokeWidth={2.2} />
      <g clipPath="url(#guide-plate)">
        {Array.from({ length: 16 }, (_, i) => <path key={i} className="g-e" strokeWidth={1.2} d={`M${10 + i * 12} 140L${70 + i * 12} 20`} />)}
      </g>
      {[[28, 42], [132, 42], [28, 122], [132, 122]].map(([x, y]) => <circle key={`${x}${y}`} className="g-i g-fg" cx={x} cy={y} r={2.6} strokeWidth={1.4} />)}
      <Plain x={56} y={58} s={48} r={10} />
      <Mark x={56} y={58} size={48} target={3} count={0} broken />
    </>
  ),
  foil: () => (
    <>
      <path className="g-i" strokeWidth={2.2} d="M34 56h92v80c0 4-3 6-6 6H40c-3 0-6-2-6-6z" />
      <path className="g-m" strokeWidth={1.6} d="M38 56l6-10 6 8 6-9 6 8 6-9 6 9 6-8 6 9 6-8 6 8 6-9 6 8 4-6" />
      <path className="g-i" strokeWidth={2.2} d="M34 56l-12-16M126 56l12-16" />
      <Plain x={56} y={74} s={48} r={10} />
      <Mark x={56} y={74} size={48} target={3} count={0} broken />
    </>
  ),

  wAdd: () => (
    <Phone>
      <Bar x={0} y={6} l={30} c="i" w={4} />
      <Mark x={0} y={14} size={24} target={3} count={3} />
      <Bar x={0} y={50} l={40} />
      <Bar x={0} y={58} l={28} />
      <Bar x={0} y={74} l={26} c="m" w={2.4} />
      <Box x={0} y={82} w={37} h={13} />
      <Btn x={40} y={82} w={16} h={13} />
      <Tap x={40} y={82} w={16} h={13} />
    </Phone>
  ),
  wCopy: () => (
    <Phone>
      <Mark x={17} y={0} size={22} target={3} count={3} />
      <Bar x={0} y={32} l={34} c="i" />
      <Box x={0} y={40} w={56} h={13} />
      <path className="g-m" strokeWidth={2.4} strokeDasharray="0.1 4.5" d="M6 46.5h44" />
      <Btn x={0} y={60} w={56} h={13} />
      <Tap x={0} y={60} w={56} h={13} />
      {[82, 90, 98].map((y) => (
        <g key={y}>
          <circle className="g-fe" cx={2} cy={y} r={1.6} />
          <Bar x={7} y={y} l={38} w={2.4} />
        </g>
      ))}
    </Phone>
  ),
  wWrite: () => (
    <Phone>
      {[0, 20, 40].map((x) => <Box key={x} x={x} y={4} w={16} h={10} />)}
      <Tap x={20} y={4} w={16} h={10} />
      {[30, 46, 62, 78].map((y) => <Box key={y} x={0} y={y} w={56} h={11} sw={1.2} />)}
    </Phone>
  ),
  wRecord: () => (
    <Phone>
      <Box x={0} y={4} w={56} h={14} />
      <path className="g-i" strokeWidth={2} d="M8 11h8M12 7v8" />
      <Bar x={22} y={11} l={26} />
      <Tap x={0} y={4} w={56} h={14} />
      {[34, 50, 66, 82].map((y, i) => (
        <g key={y}>
          <Box x={0} y={y} w={56} h={11} sw={1.2} />
          <rect className={i === 1 ? "g-fi" : "g-fe"} x={4} y={y + 3} width={5} height={5} rx={1} />
          <Bar x={14} y={y + 5.5} l={i === 1 ? 14 : 24} w={2.2} />
        </g>
      ))}
      <rect className="g-i" x={-3} y={47} width={62} height={17} rx={5.4} strokeWidth={1.6} />
    </Phone>
  ),
  wPaste: () => (
    <Phone>
      <rect className="g-fi" x={12} y={2} width={30} height={11} rx={3} />
      <path className="g-fi" d="M24 13l3 4 3-4z" />
      <path className="g-gs" strokeWidth={2} d="M17 7.5h20" />
      <Box x={0} y={22} w={56} h={13} />
      <path className="g-m" strokeWidth={2.4} strokeDasharray="0.1 4.5" d="M6 28.5h30" />
      <path className="g-i" strokeWidth={1.6} d="M40 25v7" />
      <Btn x={0} y={90} w={56} h={13} />
      <Tap x={0} y={90} w={56} h={13} />
    </Phone>
  ),
  wHold: () => (
    <>
      <Fields x={56} y={92} s={48} />
      <Plain x={56} y={92} s={48} r={10} />
      <Mark x={56} y={92} size={48} target={3} count={3} />
      <Phone x={50} y={4} w={60} h={98}>
        <Bar x={0} y={30} l={40} />
        <Bar x={0} y={38} l={28} />
      </Phone>
      <path className="g-t" strokeWidth={2} strokeDasharray="1 5" d="M80 104v-8" />
    </>
  ),
  wLock: () => (
    <>
      <path className="g-i" strokeWidth={3} d="M62 72V58a18 18 0 0 1 36 0v14" />
      <rect className="g-i g-fg" x={52} y={72} width={56} height={48} rx={10} strokeWidth={3} />
      <path className="g-i" strokeWidth={3} d="M80 90v10" />
      <path className="g-i" strokeWidth={3.2} d="M40 132L120 40" />
    </>
  ),
  wCheck: () => (
    <>
      <Fields x={66} y={104} s={34} />
      <Plain x={66} y={104} s={34} r={7} />
      <Mark x={66} y={104} size={34} target={3} count={3} />
      <Phone x={46} y={6} w={68} h={92}>
        <Bar x={0} y={4} l={18} w={2.4} />
        <Mark x={8} y={12} size={40} target={8} count={1} />
      </Phone>
    </>
  ),
  chat: () => (
    <>
      <path className="g-i" strokeWidth={2} d="M14 30c0-6 4-10 10-10h76c6 0 10 4 10 10v52c0 6-4 10-10 10H40l-14 12v-12h-2c-6 0-10-4-10-10z" />
      <Box x={24} y={30} w={76} h={28} />
      <path className="g-e" strokeWidth={1} d="M24 50h76" />
      <Bar x={30} y={66} l={56} w={2.6} />
      <Bar x={30} y={76} l={36} w={2.6} />
      <path className="g-t" strokeWidth={2} strokeDasharray="1 5" d="M112 60h14" />
      <Mark x={118} y={74} size={36} target={3} count={3} />
    </>
  ),

  tHold: () => (
    <>
      <path className="g-i" strokeWidth={2.2} d="M30 22h20v10h-20zM32 32v8c0 6-16 8-16 20v80c0 5 3 8 8 8h32c5 0 8-3 8-8V60c0-12-16-14-16-20v-8" />
      <Fields x={28} y={84} s={32} />
      <Plain x={28} y={84} s={32} r={7} />
      <Mark x={28} y={84} size={32} target={3} count={3} />
      <Phone x={66} y={34} w={64} h={118}>
        <Bar x={0} y={30} l={40} />
        <Bar x={0} y={38} l={28} />
      </Phone>
    </>
  ),
  tBanner: () => (
    <Phone>
      <rect className="g-i g-fg" x={-2} y={2} width={60} height={22} rx={7} strokeWidth={1.6} />
      <rect className="g-fi" x={3} y={7} width={12} height={12} rx={3} />
      <Bar x={19} y={10} l={30} c="i" w={2.6} />
      <Bar x={19} y={17} l={22} w={2.4} />
      <Touch cx={44} cy={14} />
      {[40, 58, 76].map((y) => [0, 15, 30, 45].map((x) => <rect key={`${x}${y}`} className="g-e" x={x} y={y} width={11} height={11} rx={2.6} strokeWidth={1.2} />))}
    </Phone>
  ),
  tBrowser: () => (
    <Phone>
      <Box x={0} y={0} w={56} h={11} sw={1.2} />
      <Bar x={6} y={5.5} l={34} w={2.2} />
      <path className="g-t" strokeWidth={2} d="M0 15h34" />
      <Bar x={0} y={28} l={20} />
      <Bar x={0} y={36} l={34} w={4} />
      <rect className="g-e" x={8} y={46} width={40} height={40} rx={9} strokeWidth={1.2} strokeDasharray="3 3" />
    </Phone>
  ),
  tLogged: () => (
    <Phone>
      <LoggedScreen />
    </Phone>
  ),
  tUndo: () => (
    <>
      <Phone>
        <LoggedScreen fresh={false} undo />
      </Phone>
      <circle className="g-e" cx={132} cy={36} r={13} strokeWidth={1.6} />
      <path className="g-i" strokeWidth={2.2} d="M132 23a13 13 0 1 1-13 13" />
      <path className="g-i" strokeWidth={1.8} d="M132 29v7l4 3" />
    </>
  ),
  tDup: () => (
    <>
      <rect className="g-e" x={52} y={6} width={70} height={136} rx={13} strokeWidth={1.4} strokeDasharray="3 3" />
      <Phone x={42} y={16}>
        <LoggedScreen fresh={false} meta="i" />
      </Phone>
    </>
  ),

  hHold: () => (
    <>
      <rect className="g-i" x={22} y={10} width={116} height={116} rx={22} strokeWidth={1.6} />
      <Mark x={18} y={6} size={124} target={8} count={3} />
      <Touch cx={80} cy={68} />
      <Bar x={56} y={146} l={48} c="m" />
    </>
  ),
  hAdded: () => (
    <>
      <Mark x={18} y={6} size={124} target={8} count={3} />
      <Mark x={18} y={6} size={124} target={8} count={4} only={3} />
      <Bar x={42} y={146} l={52} c="m" />
      <Bar x={100} y={146} l={18} c="i" />
      <path className="g-i" strokeWidth={1.4} d="M100 152h18" />
    </>
  ),

  goal: () => <Mark x={10} y={10} size={140} target={8} count={8} />,
  limit: () => <Mark x={10} y={10} size={140} kind="limit" target={3} count={4} color={TEAL} />,
  week: () => (
    <>
      <Mark x={36} y={4} size={88} target={3} count={2} color={GREEN} />
      <g className="guide__hc" style={{ "--habit": GREEN } as CSSProperties}>
        <rect className="g-e" x={18} y={118} width={124} height={24} rx={5.3} strokeWidth={1.4} />
        {Array.from({ length: 7 }, (_, i) => (
          <circle key={i} className={[1, 4].includes(i) ? "g-ft" : "g-fe"} cx={30 + i * 16.7} cy={130} r={[1, 4].includes(i) ? 3.2 : 1.6} />
        ))}
        <rect className="g-i" x={14} y={114} width={132} height={32} rx={7} strokeWidth={1.6} />
      </g>
    </>
  ),
  spacing: () => (
    <>
      <Mark x={45} y={2} size={70} kind="limit" target={5} count={2} color={TEAL} />
      <path className="g-e" strokeWidth={1.6} d="M10 116H150" />
      <g className="guide__hc" style={{ "--habit": TEAL } as CSSProperties}>
        <rect className="g-ft" x={26} y={110} width={12} height={12} rx={2.6} />
        <rect className="g-ft" x={62} y={110} width={12} height={12} rx={2.6} />
      </g>
      <path className="g-i" strokeWidth={1.6} d="M68 132v6h50v-6" />
      <rect className="g-i g-fg" x={112} y={110} width={12} height={12} rx={2.6} strokeWidth={1.4} strokeDasharray="2 2" />
    </>
  ),

  aShare: () => (
    <>
      <Phone browser>
        <Bar x={0} y={4} l={30} />
        <Bar x={0} y={12} l={44} />
        <rect className="g-i g-fg" x={-7} y={44} width={70} height={66} rx={10} strokeWidth={1.6} />
        {[56, 72, 88].map((y, i) => (
          <g key={y}>
            <rect className={i === 1 ? "g-i" : "g-e"} x={1} y={y - 4} width={9} height={9} rx={2} strokeWidth={1.4} />
            {i === 1 && <path className="g-i" strokeWidth={1.6} d={`M3.5 ${y + 0.5}h4M5.5 ${y - 1.5}v4`} />}
            <Bar x={15} y={y + 0.5} l={i === 1 ? 30 : 22} w={2.4} />
          </g>
        ))}
        <rect className="g-i" x={-4} y={63} width={64} height={18} rx={5} strokeWidth={1.6} />
        <Touch cx={42} cy={74} />
      </Phone>
      <path className="g-i" strokeWidth={1.8} d="M75 138v-9m-4 4l4-4 4 4M70 134v6h10v-6" />
    </>
  ),
  aSignin: () => (
    <Phone>
      <Bar x={0} y={4} l={24} c="i" w={4} />
      {[24, 40].map((y) =>
        [0, 15, 30, 45].map((x, i) => <rect key={`${x}${y}`} className={y === 24 && i === 0 ? "g-i" : "g-e"} x={x} y={y} width={11} height={13} rx={2.4} strokeWidth={1.2} strokeDasharray="2.2 2.2" />),
      )}
      <Box x={0} y={64} w={56} h={12} />
      <Btn x={0} y={82} w={56} h={13} />
    </Phone>
  ),
  aTap: () => (
    <>
      <Fields x={16} y={112} s={30} />
      <Plain x={16} y={112} s={30} r={6.6} />
      <Mark x={16} y={112} size={30} target={3} count={3} />
      <Phone x={54} y={10} w={70} h={120} browser>
        <Mark x={8} y={6} size={40} target={8} count={6} />
        <Bar x={0} y={56} l={14} c="i" w={4.4} />
        <Bar x={0} y={66} l={22} w={2.4} />
      </Phone>
    </>
  ),
  aBack: () => (
    <>
      <rect className="g-e g-fg" x={18} y={20} width={62} height={118} rx={12} strokeWidth={1.4} />
      <Bar x={26} y={40} l={30} />
      <Bar x={26} y={48} l={40} />
      <Phone x={66} y={16} w={74} h={128}>
        <Bar x={0} y={4} l={22} c="i" />
        <Mark x={30} y={0} size={26} target={8} count={4} />
        <Mark x={30} y={0} size={26} target={8} count={5} only={4} />
        <path className="g-m" strokeWidth={1} d="M0 38h60" />
        <Bar x={0} y={50} l={22} c="i" />
        <Mark x={30} y={46} size={26} target={8} count={2} color={GREEN} />
      </Phone>
    </>
  ),
};

