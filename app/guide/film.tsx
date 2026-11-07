"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { ease, gsap, reducedMotion } from "@/lib/motion";
import { habitVars, PALETTE } from "@/lib/palette";
import { CAP, SECTIONS } from "./copy";
import { Bar, BLUE, Box, Btn, Fields, Hair, hue, Mark } from "./parts";

// The guide's film: one stage (a sticker sheet, a water bottle, a phone) and one GSAP timeline
// whose chapters are the sections below. The server draws the frame at POSTER, so the page reads
// before any script runs and under reduced motion.

const GREEN = hue("Green");
const TEAL = hue("Teal");
const CHAPTERS = SECTIONS.map((s) => s.title);
// A scene's chapter is the section its step sits in, so the film and the stills can't disagree.
const chapterOf = (key: string) => SECTIONS.find((s) => [...s.steps, s.warn].some((step) => step?.key === key))!.title;
const POSTER = "tLogged"; // Tap: the coil has wound from 5 to 6 on the Logged page
const OPEN = 1.8; // the sticker sheet has drawn in and every sticker sits on it
const f = (...names: string[]) => names.map((n) => `[data-f="${n}"]`).join(", ");
const PARTS = ["coil__edge", "coil__lead", "coil__bridge", "coil__insulation", "coil__chip"];
const parts = (n: string) => PARTS.map((c) => `${f(n)} .${c}`).join(", ");

const Layer = ({ f, poster, children }: { f: string; poster?: boolean; children: ReactNode }) => (
  <g data-f={f} data-poster={poster || undefined}>
    {children}
  </g>
);
const Grid = ({ gap }: { gap?: number }) => (
  <>
    {Array.from({ length: 20 }, (_, k) => k !== gap && <rect key={k} className="g-e" x={4 + (k % 4) * 28} y={36 + Math.floor(k / 4) * 34} width={22} height={22} rx={5} strokeWidth={1.4} />)}
  </>
);
const Addr = ({ share }: { share?: boolean }) => (
  <>
    <Box x={0} y={0} w={116} h={22} />
    <Bar x={8} y={11} l={share ? 50 : 60} />
    {share && <path className="g-i" strokeWidth={1.8} d="M104 14v-9m-4 4l4-4 4 4M99 11v6h10v-6" />}
  </>
);
const Num = ({ f, poster, x, y, children }: { f?: string; poster?: boolean; x: number; y: number; children: ReactNode }) => (
  <text data-f={f} data-poster={poster || undefined} className="guide__num" x={x} y={y}>
    {children}
  </text>
);
const Of = ({ x, y }: { x: number; y: number }) => (
  <text className="guide__num guide__of" x={x} y={y}>
    / 8
  </text>
);
const ON = { "data-poster": true } as const;

// The phone's screens, 116 × 222.
const SCREENS = (
  <>
    <Layer f="sHome">
      <Grid />
    </Layer>
    <Layer f="sHabit">
      <Bar x={2} y={8} l={12} c="m" />
      <Bar x={0} y={24} l={64} c="i" w={7} />
      <Mark x={0} y={38} size={48} target={8} count={5} />
      <Bar x={60} y={56} l={26} c="i" w={9} />
      <Bar x={60} y={72} l={40} />
      <Hair y={102} />
      <Bar x={0} y={116} l={48} c="i" w={4} />
      {[0, 1].map((r) => (
        <g key={r}>
          <Mark x={0} y={126 + r * 20} size={15} target={3} count={3} color={r ? GREEN : undefined} />
          <Bar x={22} y={134 + r * 20} l={50} />
        </g>
      ))}
      <Hair y={172} />
      <Bar x={0} y={184} l={52} c="m" />
      <Box x={0} y={194} w={76} h={22} />
      <Btn x={80} y={194} w={36} h={22} />
    </Layer>
    <Layer f="sPanel">
      <Mark f="mark" x={44} y={0} size={28} target={3} count={3} />
      <Bar x={0} y={44} l={70} c="i" w={5} />
      <Box x={0} y={56} w={116} h={22} />
      <path className="g-m" strokeWidth={3} strokeDasharray="0.1 6" d="M8 67h96" />
      <Btn x={0} y={88} w={116} h={26} />
      <path data-f="copied" data-dw className="g-gs" strokeWidth={3} d="M50 101l6 6 12-12" pathLength={1} />
      {[128, 146, 164].map((y, i) => (
        <g key={y}>
          <circle className="g-fe" cx={3} cy={y} r={2.4} />
          <Bar x={12} y={y} l={80 - i * 14} />
        </g>
      ))}
      <Bar x={0} y={192} l={96} c="m" w={2.6} />
    </Layer>
    <Layer f="sNfc">
      {[0, 40, 80].map((x) => <Box key={x} x={x} y={6} w={36} h={20} />)}
      {[40, 68, 96, 124, 152].map((y) => (
        <g key={y}>
          <Box x={0} y={y} w={116} h={22} sw={1.2} />
          <rect className="g-fe" x={6} y={y + 7} width={8} height={8} rx={2} />
          <Bar x={20} y={y + 11} l={50} w={2.6} />
        </g>
      ))}
    </Layer>
    <Layer f="sRecord">
      <Box x={0} y={6} w={116} h={28} />
      <path className="g-i" strokeWidth={2.4} d="M12 20h12M18 14v12" />
      <Bar x={32} y={20} l={56} />
      {[48, 74, 100, 126, 152].map((y, i) => (
        <g key={y}>
          <Box x={0} y={y} w={116} h={20} sw={1.2} />
          <rect className={i === 1 ? "g-fi" : "g-fe"} x={6} y={y + 6} width={8} height={8} rx={2} />
          <Bar x={20} y={y + 10} l={i === 1 ? 22 : 44} w={2.6} />
        </g>
      ))}
    </Layer>
    <Layer f="sPaste">
      <Bar x={0} y={10} l={50} c="i" w={5} />
      <Box x={0} y={28} w={116} h={24} />
      <clipPath id="guide-type">
        <rect data-f="typerect" x={4} y={28} width={0} height={24} />
      </clipPath>
      <path clipPath="url(#guide-type)" className="g-m" strokeWidth={3} strokeDasharray="0.1 6" d="M8 40h96" />
      <g data-f="pill2">
        <Btn x={28} y={2} w={60} h={20} />
        <Bar x={40} y={12} l={36} c="gs" />
      </g>
      <Btn x={0} y={190} w={116} h={26} />
    </Layer>
    <Layer f="sScan">
      <Bar x={0} y={10} l={50} w={5} />
      <Bar x={0} y={26} l={80} />
      <rect className="g-i g-fg" x={-2} y={104} width={120} height={122} rx={14} strokeWidth={1.6} />
      {[14, 28, 42].map((s, i) => (
        <rect key={s} data-f="scanR" className="g-t" x={58 - s} y={160 - s} width={2 * s} height={2 * s} rx={+(2 * s * 0.22).toFixed(1)} strokeWidth={2} opacity={1 - i * 0.28} />
      ))}
    </Layer>
    <Layer f="sLock">
      <Bar x={0} y={10} l={60} c="i" w={5} />
      {[30, 60, 90, 120].map((y, i) => (
        <g key={y}>
          <Box x={0} y={y} w={116} h={22} sw={1.2} />
          {i === 2 ? (
            <>
              <path className="g-i" strokeWidth={1.8} d={`M9 ${y + 10}v-2a4 4 0 0 1 8 0v2`} />
              <rect className="g-i" x={7} y={y + 10} width={12} height={8} rx={2} strokeWidth={1.8} />
            </>
          ) : (
            <rect className="g-fe" x={7} y={y + 7} width={8} height={8} rx={2} />
          )}
          <Bar x={26} y={y + 11} l={50} w={2.6} />
        </g>
      ))}
      <path data-f="lockX" data-dw className="g-i" strokeWidth={3} d="M-2 118L118 86" pathLength={1} />
    </Layer>
    <Layer f="sCheck">
      <Bar x={0} y={10} l={36} c="m" />
      <Bar x={0} y={24} l={56} c="i" w={6} />
      <Mark x={18} y={44} size={80} target={8} count={0} />
      <Mark f="chkT" x={18} y={44} size={80} target={8} count={1} only={0} />
    </Layer>
    <Layer f="sChat">
      <path className="g-i" strokeWidth={2} d="M6 40c0-6 4-10 10-10h84c6 0 10 4 10 10v86c0 6-4 10-10 10H40l-16 14v-14h-8c-6 0-10-4-10-10z" />
      <Box x={16} y={42} w={84} h={40} />
      <Hair x={16} y={70} l={84} />
      <Bar x={22} y={96} l={60} />
      <Bar x={22} y={108} l={40} />
      <path data-f="chatLink" data-dw className="g-t" strokeWidth={2.4} d="M96 140C104 156 98 166 90 172" pathLength={1} />
      <Mark x={70} y={170} size={40} target={3} count={2} />
      <Mark f="chatT" x={70} y={170} size={40} target={3} count={3} only={2} />
    </Layer>
    <Layer f="sBrowser">
      <Addr />
      <path data-f="load" data-dw className="g-t" strokeWidth={3} d="M0 28h116" pathLength={1} />
      <Bar x={0} y={48} l={30} />
      <Bar x={0} y={62} l={56} w={7} />
      <rect className="g-e" x={18} y={80} width={80} height={80} rx={17} strokeWidth={1.2} strokeDasharray="4 4" />
    </Layer>
    <Layer f="sLogged" poster>
      <Addr />
      <path data-f="lgMeta" {...ON} className="g-m" strokeWidth={3.4} d="M0 40h30" />
      <path data-f="lgMetaInk" className="g-i" strokeWidth={3.4} d="M0 40h52" />
      <Bar x={0} y={54} l={56} c="i" w={7} />
      <Mark x={18} y={64} size={80} target={8} count={5} />
      <g data-f="lgT" {...ON}>
        <Mark x={18} y={64} size={80} target={8} count={6} only={5} />
      </g>
      <Num f="lgA" x={0} y={182}>
        5
      </Num>
      <Num f="lgB" poster x={0} y={182}>
        6
      </Num>
      <Of x={24} y={170} />
      <Btn x={0} y={192} w={116} h={26} />
      <rect data-f="undoClock" data-dw className="g-i" x={-4} y={188} width={124} height={34} rx={10} strokeWidth={2.2} pathLength={1} />
    </Layer>
    <Layer f="sToday">
      <Bar x={0} y={8} l={46} c="i" w={7} />
      <Hair y={26} />
      <Bar x={0} y={44} l={40} c="i" w={4} />
      <Num f="tdA" x={0} y={98}>
        3
      </Num>
      <Num f="tdB" x={0} y={98}>
        4
      </Num>
      <Of x={23} y={86} />
      <Bar x={0} y={112} l={34} c="m" />
      <Mark x={58} y={34} size={58} target={8} count={3} />
      <Mark f="tdT" x={58} y={34} size={58} target={8} count={4} only={3} />
      <rect data-f="tdRing" className="g-t" x={65} y={41} width={44} height={44} rx={9.7} strokeWidth={2} />
      <g data-f="tdHint">
        <Bar x={70} y={108} l={34} c="m" />
      </g>
      <g data-f="tdAdded">
        <Bar x={60} y={108} l={30} c="m" />
        <Bar x={96} y={108} l={18} c="i" />
        <path className="g-i" strokeWidth={1.4} d="M96 113h18" />
      </g>
      <Hair y={130} />
      <Bar x={0} y={150} l={36} c="i" w={4} />
      <Mark x={58} y={138} size={58} target={3} count={1} color={GREEN} />
    </Layer>
    <Layer f="sShare">
      <Addr share />
      <Bar x={0} y={36} l={40} />
      <Bar x={0} y={50} l={70} w={7} />
      <g data-f="sheet2">
        <rect className="g-i g-fg" x={-4} y={96} width={124} height={130} rx={14} strokeWidth={1.6} />
        {[112, 136, 160, 184].map((y, i) => (
          <g key={y}>
            <rect className={i === 2 ? "g-i" : "g-e"} x={4} y={y - 6} width={12} height={12} rx={2.6} strokeWidth={1.4} />
            {i === 2 && <path className="g-i" strokeWidth={1.8} d={`M7 ${y}h6M10 ${y - 3}v6`} />}
            <Bar x={24} y={y} l={i === 2 ? 60 : 44} />
          </g>
        ))}
      </g>
    </Layer>
    <Layer f="sHome2">
      <Grid gap={17} />
      <g data-f="appIcon">
        {/* The app's own icon: ink coil on the light liner in either theme, as on a Home Screen. */}
        <rect x={32} y={172} width={22} height={22} rx={5} fill="#F3F4F1" stroke="#B3B8B1" strokeWidth={1} />
        <Mark x={33} y={173} size={20} target={3} count={3} color="#111311" />
      </g>
    </Layer>
    <Layer f="sSignin">
      <Bar x={0} y={8} l={50} c="i" w={7} />
      <Bar x={0} y={24} l={96} c="m" />
      {[4, 8, 2, 1, 3, 0, 9, 5].map((digit, k) => {
        const x = 1 + (k % 4) * 29;
        const y = 42 + Math.floor(k / 4) * 34;
        return (
          <g key={k}>
            <rect className="g-e" x={x} y={y} width={26} height={26} rx={5.7} strokeWidth={1.2} strokeDasharray="3 3" />
            <g data-f="slotF">
              <Mark x={x} y={y} size={26} target={digit} count={digit} color={PALETTE[k].hex} />
            </g>
          </g>
        );
      })}
      <Btn x={0} y={124} w={116} h={26} />
    </Layer>
    <Layer f="sSwitch">
      <g data-f="cardWeb">
        <rect className="g-e g-fg" x={0} y={0} width={116} height={222} rx={12} strokeWidth={2} />
        <Addr />
        <Bar x={8} y={48} l={50} />
        <Mark x={20} y={70} size={76} target={8} count={6} />
      </g>
      <g data-f="cardApp">
        <rect className="g-i g-fg" x={0} y={0} width={116} height={222} rx={12} strokeWidth={2} />
        <Bar x={8} y={16} l={46} c="i" w={7} />
        <Hair x={8} y={34} l={100} />
        <Bar x={8} y={52} l={40} c="i" w={4} />
        <Mark x={54} y={44} size={56} target={8} count={5} />
        <Mark f="swT" x={54} y={44} size={56} target={8} count={6} only={5} />
        <Bar x={8} y={90} l={26} c="i" w={9} />
      </g>
    </Layer>
    <g data-f="banner">
      <rect className="g-i g-fg" x={-4} y={6} width={124} height={44} rx={12} strokeWidth={2} />
      <rect className="g-fi" x={4} y={14} width={26} height={26} rx={6} />
      <Bar x={38} y={22} l={60} c="i" w={4} />
      <Bar x={38} y={34} l={44} />
    </g>
    <circle data-f="ripple" className="g-t" r={9} strokeWidth={2.4} />
    <g data-f="touch">
      <circle className="guide__touch" r={9} />
    </g>
  </>
);

const Vignette = ({ name, sy, children }: { name: string; sy: number; children: ReactNode }) => (
  <g data-f={name}>
    {children}
    <rect className="g-fg" x={81} y={sy} width={56} height={56} rx={12} />
    <g data-f={`${name}Off`}>
      <Mark x={81} y={sy} size={56} target={3} count={0} />
    </g>
    <g data-f={`${name}B`}>
      <Mark x={81} y={sy} size={56} target={3} count={0} broken />
    </g>
    <g data-f={`${name}R`}>
      <Fields x={81} y={sy} s={56} />
    </g>
  </g>
);

const STAGE = (
  <>
    <g data-f="bottle" {...ON}>
      <path data-f="btlP" {...ON} data-dw className="g-i" strokeWidth={2.6} pathLength={1} d="M272 74v18c0 10-36 14-36 40v236c0 9 7 16 16 16h72c9 0 16-7 16-16V132c0-26-36-30-36-40V74" />
      <path data-f="btlC" {...ON} data-dw className="g-i" strokeWidth={2.6} pathLength={1} d="M266 52h44v22h-44z" />
    </g>
    <g data-f="sheet">
      <rect data-f="sheetEdge" data-dw className="g-i" x={88} y={104} width={184} height={184} rx={22} strokeWidth={1.6} pathLength={1} />
      <path data-f="sep" className="g-e" strokeWidth={1.2} strokeDasharray="3 5" d="M180 112V280M96 196H264" />
      {[[200, 120], [104, 216], [200, 216]].map(([x, y]) => (
        <g key={`${x}${y}`} data-f="slot">
          <Mark x={x} y={y} size={56} target={3} count={0} />
        </g>
      ))}
    </g>
    <Vignette name="metal" sy={207}>
      <clipPath id="guide-plate-film">
        <rect x={24} y={170} width={170} height={130} rx={10} />
      </clipPath>
      <rect className="g-i" x={24} y={170} width={170} height={130} rx={10} strokeWidth={2.4} />
      <g clipPath="url(#guide-plate-film)">
        {Array.from({ length: 18 }, (_, i) => <path key={i} className="g-e" strokeWidth={1.3} d={`M${4 + i * 14} 310L${84 + i * 14} 160`} />)}
      </g>
      {[[34, 180], [184, 180], [34, 290], [184, 290]].map(([x, y]) => <circle key={`${x}${y}`} className="g-i g-fg" cx={x} cy={y} r={3.4} strokeWidth={1.6} />)}
    </Vignette>
    <Vignette name="foil" sy={214}>
      <path className="g-i" strokeWidth={2.4} d="M40 184h138v118c0 5-4 8-8 8H48c-4 0-8-3-8-8z" />
      <path className="g-m" strokeWidth={1.8} d="M44 184l8-14 8 11 8-13 8 12 8-13 8 13 8-12 8 13 8-12 8 12 8-13 8 12 8-12 8 12 6-9" />
      <path className="g-i" strokeWidth={2.4} d="M40 184l-16-22M178 184l16-22" />
    </Vignette>
    <g data-f="kinds">
      <g data-f="pair">
      <Mark x={20} y={34} size={150} target={8} count={0} />
      <Mark f="G8" x={20} y={34} size={150} target={8} count={8} />
      <Mark x={190} y={34} size={150} kind="limit" target={3} count={0} color={TEAL} />
      <Mark f="L3" x={190} y={34} size={150} kind="limit" target={3} count={3} color={TEAL} />
      <Mark f="L4" x={190} y={34} size={150} kind="limit" target={3} count={4} color={TEAL} />
      </g>
      <g data-f="week" className="guide__hc" style={habitVars(GREEN)}>
        <rect data-f="wkFill" className="g-ft" x={40} y={232} width={280} height={40} rx={8.8} />
        <rect className="g-e" x={40} y={232} width={280} height={40} rx={8.8} strokeWidth={1.4} />
        {Array.from({ length: 7 }, (_, i) => <circle key={i} className="g-fe" cx={60 + i * 40} cy={252} r={2.2} />)}
        {[0, 2, 4].map((i) => (
          <g key={i}>
            <circle data-f="wkT" className="g-ft" cx={60 + i * 40} cy={252} r={5.5} />
            <circle data-f="wkC" className="g-fg" cx={60 + i * 40} cy={252} r={4} />
          </g>
        ))}
        <rect className="g-i" x={34} y={226} width={292} height={52} rx={11} strokeWidth={1.8} />
      </g>
      <g data-f="spacing" className="guide__hc" style={habitVars(TEAL)}>
        <path data-f="spLine" data-dw className="g-e" strokeWidth={2} d="M30 334H330" pathLength={1} />
        <rect data-f="spA" className="g-ft" x={62} y={326} width={16} height={16} rx={3.5} />
        <rect data-f="spB" className="g-ft" x={142} y={326} width={16} height={16} rx={3.5} />
        <path data-f="spBr" data-dw className="g-i" strokeWidth={2} d="M150 352v8h100v-8" pathLength={1} />
        <rect data-f="spN" className="g-i g-fg" x={242} y={326} width={16} height={16} rx={3.5} strokeWidth={1.6} strokeDasharray="3 3" />
      </g>
    </g>
    <g data-f="hero" {...ON} transform="translate(260 214)">
      <g data-f="heroRings">
        <Fields x={0} y={0} s={56} />
      </g>
      <rect className="g-fg" width={56} height={56} rx={12} />
      <Mark x={0} y={0} size={56} target={3} count={0} />
      <g data-f="heroOn" {...ON}>
        <Mark x={0} y={0} size={56} target={3} count={3} />
      </g>
      <g data-f="pill">
        <Box x={64} y={16} w={112} h={24} />
        <rect className="g-i" x={72} y={24} width={12} height={9} rx={3.5} strokeWidth={1.8} />
        <rect className="g-i" x={80} y={24} width={12} height={9} rx={3.5} strokeWidth={1.8} />
        <Bar x={100} y={28} l={64} />
      </g>
    </g>
    <g data-f="phone" {...ON} transform="translate(40 64)">
      <rect className="g-i g-fg" width={140} height={272} rx={26} strokeWidth={2.8} />
      <rect className="g-fe" x={52} y={11} width={36} height={10} rx={5} />
      <clipPath id="guide-scr">
        <rect x={-4} y={-2} width={124} height={228} rx={6} />
      </clipPath>
      <g transform="translate(12 34)" clipPath="url(#guide-scr)">
        {SCREENS}
      </g>
    </g>
  </>
);

type Scene = { key: string; chapter: string; cap: string; t: number; dur: number };

// Builds the whole film on one timeline: each scene adds its tweens at its start time.
function build(T: gsap.core.Timeline) {
  const scenes: Scene[] = [];
  let cur = 0;
  let screen: string | null = null;
  const scene = (key: string, dur: number, fn: (t: number) => void) => {
    scenes.push({ key, chapter: chapterOf(key), cap: CAP[key], t: cur, dur });
    fn(cur);
    cur += dur;
  };
  const P = { off: { x: 40, y: 440, rotation: 0, scale: 1 }, left: { x: 40, y: 64, rotation: 0, scale: 1 }, tap: { x: 152, y: 100, rotation: -8, scale: 0.9 } };
  const draw = (t: number, sel: string, d = 0.7, st = 0) => T.fromTo(sel, { strokeDashoffset: 1.01 }, { strokeDashoffset: 0, duration: d, stagger: st, ease: ease.out, autoRound: false, immediateRender: false }, t);
  const show = (t: number, id: string) => {
    if (screen) T.to(f(screen), { autoAlpha: 0, y: -14, duration: 0.35, ease: ease.soft }, t);
    T.fromTo(f(id), { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: ease.out, immediateRender: false }, t + 0.12);
    screen = id;
  };
  const move = (t: number, p: keyof typeof P, d = 0.9) => T.to(f("phone"), { ...P[p], duration: d, ease: ease.inOut }, t);
  const pulse = (t: number, sel = f("heroRings")) => T.fromTo(sel, { scale: 0.8, autoAlpha: 1 }, { scale: 1.3, autoAlpha: 0, duration: 0.9, ease: ease.out, immediateRender: false }, t);
  const press = (t: number, x: number, y: number, hold = 0) => {
    T.to(f("touch"), { autoAlpha: 1, x, y, duration: 0.55, ease: ease.soft }, t)
      .to(f("touch"), { scale: 0.72, duration: 0.12, ease: ease.soft }, t + 0.6)
      .fromTo(f("ripple"), { x, y, attr: { r: 8 }, autoAlpha: 0.9 }, { attr: { r: 30 }, autoAlpha: 0, duration: 0.7, ease: ease.out, immediateRender: false }, t + 0.66)
      .to(f("touch"), { scale: 1, duration: 0.18, ease: ease.soft }, t + 0.74 + hold);
  };
  const lift = (t: number) => T.to(f("touch"), { autoAlpha: 0, duration: 0.3, ease: ease.soft }, t);
  const roll = (t: number, a: string, b: string) => {
    T.to(f(a), { autoAlpha: 0, y: -14, duration: 0.45, ease: ease.out }, t);
    T.fromTo(f(b), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: ease.out, immediateRender: false }, t);
  };
  const fade = (t: number, sel: string, on = true, d = 0.45) => T.to(sel, { autoAlpha: on ? 1 : 0, duration: d, ease: ease.soft }, t);

  scene("ntag", 3.2, (t) => {
    draw(t, f("sheetEdge"), 1);
    fade(t + 0.5, f("sep"));
    T.fromTo(f("slot", "hero"), { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.6, stagger: 0.14, ease: ease.out, immediateRender: false }, t + 0.6);
  });
  scene("onelink", 3.0, (t) => {
    T.to(f("sheet"), { autoAlpha: 0.3, duration: 0.5, ease: ease.soft }, t);
    T.to(f("hero"), { x: 30, y: 150, scale: 1.15, duration: 0.9, ease: ease.out }, t);
    fade(t + 0.6, f("pill"), true, 0.4);
  });
  scene("bottle", 3.2, (t) => {
    fade(t, f("sheet"), false, 0.4);
    fade(t, f("pill"), false, 0.3);
    draw(t + 0.1, f("btlP", "btlC"), 1.1);
    T.to(f("hero"), { x: 260, y: 214, scale: 1, duration: 1.2, ease: ease.inOut }, t + 0.3);
    pulse(t + 1.6);
    pulse(t + 2.2);
  });
  const vignette = (t: number, name: string, prev?: string) => {
    if (prev) T.to(f(prev), { autoAlpha: 0, x: -30, duration: 0.4, ease: ease.soft }, t);
    T.fromTo(f(name), { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.7, ease: ease.out, immediateRender: false }, t + 0.2);
    T.fromTo(f(`${name}R`), { scale: 0.8, autoAlpha: 0.9 }, { scale: 1.06, autoAlpha: 0, duration: 0.5, ease: ease.soft, immediateRender: false }, t + 1.1);
    fade(t + 1.5, f(`${name}B`), true, 0.3);
    fade(t + 1.5, f(`${name}Off`), false, 0.3);
  };
  scene("metal", 2.8, (t) => vignette(t, "metal"));
  scene("foil", 2.8, (t) => vignette(t, "foil", "metal"));
  scene("wAdd", 3.4, (t) => {
    fade(t, f("foil"), false, 0.4);
    move(t, "left", 1);
    show(t + 0.3, "sHabit");
    press(t + 1.4, 98, 205);
  });
  scene("wCopy", 3.0, (t) => {
    show(t, "sPanel");
    draw(t + 0.3, `${f("mark")} .coil__turn[data-lit]`, 0.7, 0.06);
    press(t + 1.0, 58, 101);
    draw(t + 1.75, f("copied"), 0.4);
  });
  scene("wWrite", 2.6, (t) => {
    show(t, "sNfc");
    press(t + 0.8, 58, 16);
  });
  scene("wRecord", 3.0, (t) => {
    show(t, "sRecord");
    press(t + 0.6, 58, 20);
    press(t + 1.7, 58, 84);
  });
  scene("wPaste", 4.0, (t) => {
    show(t, "sPaste");
    press(t + 0.5, 58, 40, 0.5);
    T.fromTo(f("pill2"), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: ease.out, immediateRender: false }, t + 1.4);
    press(t + 1.9, 58, 12);
    fade(t + 2.6, f("pill2"), false, 0.2);
    T.to(f("typerect"), { attr: { width: 104 }, duration: 0.6, ease: ease.soft }, t + 2.6);
    press(t + 3.0, 58, 203);
  });
  scene("wHold", 3.6, (t) => {
    show(t, "sScan");
    lift(t);
    move(t + 0.4, "tap", 1);
    T.fromTo(f("scanR"), { scale: 0.9 }, { scale: 1.1, duration: 0.6, repeat: 3, yoyo: true, ease: ease.soft, immediateRender: false }, t + 0.6);
    pulse(t + 1.4);
    pulse(t + 2.0);
    draw(t + 1.6, `${f("heroOn")} .coil__turn[data-lit]`, 0.6, 0.1);
    fade(t + 2.2, parts("heroOn"));
  });
  scene("wLock", 2.8, (t) => {
    move(t, "left", 0.9);
    show(t + 0.2, "sLock");
    draw(t + 1.2, f("lockX"), 0.5);
  });
  scene("wCheck", 3.0, (t) => {
    move(t, "tap", 0.9);
    pulse(t + 0.9);
    show(t + 1.0, "sCheck");
    draw(t + 1.5, `${f("chkT")} .coil__turn`, 0.7);
  });
  scene("chat", 3.6, (t) => {
    move(t, "left", 0.9);
    show(t + 0.3, "sChat");
    draw(t + 1.3, f("chatLink"), 0.5);
    draw(t + 1.8, `${f("chatT")} .coil__turn`, 0.7);
  });
  scene("tHold", 2.8, (t) => {
    show(t, "sHome");
    move(t + 0.3, "tap", 1.1);
    pulse(t + 1.4);
    pulse(t + 2.0);
  });
  scene("tBanner", 2.6, (t) => {
    T.fromTo(f("banner"), { autoAlpha: 0, y: -44 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: ease.out, immediateRender: false }, t + 0.1);
    press(t + 0.9, 58, 28);
  });
  scene("tBrowser", 2.4, (t) => {
    fade(t, f("banner"), false, 0.3);
    lift(t);
    show(t, "sBrowser");
    draw(t + 0.3, f("load"), 1.4);
  });
  scene("tLogged", 3.2, (t) => {
    show(t, "sLogged");
    move(t + 0.2, "left", 0.9);
    draw(t + 1.1, `${f("lgT")} .coil__turn`, 0.7);
    roll(t + 1.3, "lgA", "lgB");
  });
  scene("tUndo", 3.4, (t) => {
    T.fromTo(f("undoClock"), { strokeDashoffset: 0 }, { strokeDashoffset: 1.01, duration: 1.6, ease: "none", autoRound: false, immediateRender: false }, t + 0.3);
    press(t + 1.5, 58, 205);
    T.to(`${f("lgT")} .coil__turn`, { strokeDashoffset: 1.01, duration: 0.7, ease: ease.out, autoRound: false }, t + 2.2);
    roll(t + 2.2, "lgB", "lgA");
    lift(t + 2.8);
  });
  scene("tDup", 3.6, (t) => {
    move(t, "tap", 0.8);
    pulse(t + 0.8);
    draw(t + 1.0, `${f("lgT")} .coil__turn`, 0.6);
    roll(t + 1.0, "lgA", "lgB");
    pulse(t + 1.9);
    fade(t + 2.1, f("lgMeta"), false, 0.2);
    fade(t + 2.1, f("lgMetaInk"), true, 0.2);
    move(t + 2.5, "left", 0.9);
  });
  scene("hHold", 3.4, (t) => {
    show(t, "sToday");
    T.to(f("touch"), { autoAlpha: 1, x: 87, y: 63, duration: 0.55, ease: ease.soft }, t + 0.5);
    T.to(f("touch"), { scale: 0.72, duration: 0.12, ease: ease.soft }, t + 1.1);
    // The hold itself: the ring closes in linearly over 0.45 s, as the coil's own does.
    T.fromTo(f("tdRing"), { scale: 1.3, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: "none", immediateRender: false }, t + 1.1);
    draw(t + 1.55, `${f("tdT")} .coil__turn`, 0.7);
    roll(t + 1.6, "tdA", "tdB");
    T.to(f("tdRing"), { autoAlpha: 0, scale: 1.3, duration: 0.8, ease: ease.out }, t + 1.6);
    T.to(f("touch"), { scale: 1, duration: 0.18, ease: ease.soft }, t + 1.6);
    lift(t + 2.1);
  });
  scene("hAdded", 2.6, (t) => {
    fade(t, f("tdHint"), false, 0.3);
    fade(t + 0.2, f("tdAdded"));
  });
  scene("goal", 3.6, (t) => {
    move(t, "off", 0.8);
    fade(t, f("bottle", "hero"), false, 0.5);
    fade(t + 0.4, f("kinds"));
    draw(t + 0.8, `${f("G8")} .coil__turn[data-lit]`, 0.5, 0.16);
    T.fromTo(`${f("G8")} .coil__pulse`, { strokeDasharray: "0.3 1.4", strokeDashoffset: 0.3 }, { strokeDashoffset: -1, duration: 0.9, ease: ease.inOut, autoRound: false, immediateRender: false }, t + 2.2);
    fade(t + 2.6, parts("G8"), true, 0.5);
  });
  scene("limit", 3.8, (t) => {
    draw(t + 0.2, `${f("L3")} .coil__turn[data-lit]`, 0.5, 0.3);
    fade(t + 1.3, `${f("L3")} .coil__edge`, true, 0.3);
    draw(t + 1.9, `${f("L4")} .coil__turn[data-spill][data-lit]`, 0.6);
    fade(t + 2.2, `${f("L4")} .coil__edge`, true, 0.3);
  });
  scene("week", 3.2, (t) => {
    // The pair sits mid-stage on its own, and makes room when the week comes in under it.
    T.to(f("pair"), { y: 0, duration: 0.8, ease: ease.inOut }, t);
    fade(t + 0.4, f("week"));
    T.fromTo(f("wkT"), { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.5, ease: ease.out, immediateRender: false }, t + 0.4);
    fade(t + 2.0, f("wkFill", "wkC"), true, 0.4);
  });
  scene("spacing", 3.2, (t) => {
    fade(t, f("spacing"), true, 0.3);
    draw(t + 0.1, f("spLine"), 0.8);
    fade(t + 0.6, f("spA"), true, 0.3);
    fade(t + 1.0, f("spB"), true, 0.3);
    draw(t + 1.4, f("spBr"), 0.7);
    fade(t + 1.9, f("spN"), true, 0.3);
  });
  scene("aShare", 3.8, (t) => {
    fade(t, f("kinds"), false, 0.4);
    fade(t + 0.3, f("bottle", "hero"), true, 0.5);
    show(t, "sShare");
    move(t + 0.1, "left", 1);
    press(t + 1.1, 104, 11);
    T.to(f("sheet2"), { y: 0, duration: 0.6, ease: ease.out }, t + 1.9);
    press(t + 2.5, 58, 160);
  });
  scene("aSignin", 4.0, (t) => {
    lift(t);
    show(t, "sHome2");
    T.fromTo(f("appIcon"), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: ease.out, immediateRender: false }, t + 0.4);
    press(t + 0.9, 43, 183);
    T.to(f("appIcon"), { scale: 7, autoAlpha: 0, duration: 0.6, ease: ease.inOut }, t + 1.75);
    lift(t + 1.8);
    show(t + 1.9, "sSignin");
    T.to(f("slotF"), { autoAlpha: 1, duration: 0.3, stagger: 0.12, ease: ease.soft }, t + 2.4);
  });
  scene("aTap", 3.2, (t) => {
    move(t, "tap", 1);
    pulse(t + 1);
    show(t + 1.2, "sBrowser");
    draw(t + 1.4, f("load"), 1);
  });
  scene("aBack", 3.8, (t) => {
    move(t, "left", 0.9);
    show(t + 0.2, "sSwitch");
    T.to(f("cardWeb"), { x: -150, duration: 0.8, ease: ease.inOut }, t + 1.2);
    T.to(f("cardApp"), { x: 0, scale: 1, duration: 0.8, ease: ease.inOut }, t + 1.2);
    draw(t + 2.2, `${f("swT")} .coil__turn`, 0.7);
  });
  return { scenes, end: cur };
}

// The state at t = 0, before the first scene. Everything the server drew for the poster that the
// film's opening doesn't show is hidden here; reverting the context brings the poster back.
function opening() {
  const drawn = [
    "[data-dw]",
    ...["heroOn", "mark", "G8", "L3"].map((n) => `${f(n)} .coil__turn[data-lit]`),
    `${f("L4")} .coil__turn[data-spill][data-lit]`,
    ...["chkT", "chatT", "lgT", "tdT", "swT"].map((n) => `${f(n)} .coil__turn`),
  ].join(", ");
  gsap.set(drawn, { strokeDasharray: "1 2", strokeDashoffset: 1.01 });
  gsap.set(
    f("sHome", "sHabit", "sPanel", "sNfc", "sRecord", "sPaste", "sScan", "sLock", "sCheck", "sChat", "sBrowser", "sLogged", "sToday", "sShare", "sHome2", "sSignin", "sSwitch") +
      ", " +
      f("banner", "touch", "ripple", "lgB", "tdB", "tdAdded", "lgMetaInk", "pill", "sep", "slot", "hero", "metal", "foil", "metalB", "foilB", "metalR", "foilR", "kinds", "week", "spacing", "wkFill", "wkC", "wkT", "spA", "spB", "spN", "appIcon", "slotF", "pill2", "tdRing", "heroRings"),
    { autoAlpha: 0 },
  );
  gsap.set(["G8", "L3", "L4", "heroOn"].map(parts).join(", ") + `, ${f("L4")} .coil__turn:not([data-spill])`, { autoAlpha: 0 });
  gsap.set(f("hero", "heroRings", "touch", "tdRing", "appIcon", "pill2", "cardApp", "cardWeb", "metalR", "foilR", "phone", "wkT", "scanR"), { transformOrigin: "50% 50%" });
  gsap.set(f("hero"), { x: 104, y: 120, scale: 1 });
  gsap.set(f("sheet2"), { y: 140 });
  gsap.set(f("pair"), { y: 90 });
  gsap.set(f("cardWeb"), { x: -62, scale: 0.62 });
  gsap.set(f("cardApp"), { x: 42, scale: 0.62 });
  gsap.set(f("phone"), { x: 40, y: 440, rotation: 0, scale: 1 });
}

export function Film() {
  const root = useRef<HTMLDivElement>(null);
  const api = useRef<{ toggle: () => void; chapter: (i: number) => void } | null>(null);

  useLayoutEffect(() => {
    const el = root.current!;
    const RM = reducedMotion();
    const play = el.querySelector<HTMLButtonElement>(".guide__play")!;
    const cap = el.querySelector(".guide__cap")!;
    const name = el.querySelector(".guide__now")!;
    const bars = [...el.querySelectorAll<HTMLButtonElement>("[data-ch]")];
    const fills = bars.map((b) => b.querySelector<HTMLElement>(".guide__fill")!);
    const stage = el.querySelector(".guide__stage")!;
    let io: IntersectionObserver | undefined;
    let held = false;
    let begun = false;
    let onScreen = false;
    let prologue: gsap.core.Timeline | null = null;
    let fade: gsap.core.Tween | null = null;
    // What the DOM last got, so a frame of play rewrites only what changed.
    const shown = { chapter: "", current: -1, state: "" };

    // Live before the timeline reads anything: GSAP takes a part the poster CSS still hides as
    // starting at 0, and seeking back would then hide it.
    el.classList.add("is-live");
    const ctx = gsap.context(() => {
      opening();
      const T = gsap.timeline({ paused: true });
      const { scenes, end } = build(T);
      const chapters = CHAPTERS.map((c) => {
        const own = scenes.filter((s) => s.chapter === c);
        return { t: own[0].t, end: own[own.length - 1].t + own[own.length - 1].dur };
      });
      const done = () => T.time() >= end - 0.01;

      // Captions, chapter bars and the button all read the timeline's time, so a seek and a frame
      // of play look the same.
      const ui = () => {
        const t = T.time();
        const s = scenes.findLast((x) => t >= x.t - 0.001) ?? scenes[0];
        // While playing, a caption changes as its new picture comes in, not as the last one leaves.
        const lead = (x: Scene) => (T.paused() ? 0 : Math.min(0.3, x.dur * 0.1));
        const c = scenes.findLast((x) => t >= x.t + lead(x) - 0.001) ?? scenes[0];
        if (cap.textContent !== c.cap) {
          cap.textContent = c.cap;
          if (!RM && !T.paused()) gsap.fromTo(cap, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: ease.out });
        }
        // The opening shows the film's payoff before the film starts, so no chapter is under way.
        const opening = !begun && !RM;
        const chapter = opening ? "" : c.chapter;
        if (chapter !== shown.chapter) {
          name.textContent = chapter;
          shown.chapter = chapter;
        }
        chapters.forEach((ch, i) => {
          const p = opening ? 0 : Math.max(0, Math.min(1, (t - ch.t) / (ch.end - ch.t)));
          fills[i].style.transform = `scaleX(${p})`;
        });
        const current = opening ? -1 : CHAPTERS.indexOf(s.chapter);
        if (current !== shown.current) {
          bars.forEach((b, i) => (i === current ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current")));
          shown.current = current;
        }
        const playing = fade ? !held : prologue ? !prologue.paused() : !T.paused();
        const state = playing ? "pause" : done() ? "again" : "play";
        if (state !== shown.state) {
          play.dataset.state = state;
          play.setAttribute("aria-label", { again: "Play again", play: "Play", pause: "Pause" }[state]);
          shown.state = state;
        }
      };
      T.eventCallback("onUpdate", ui);
      T.eventCallback("onComplete", () => {
        T.pause();
        ui();
      });

      // The film proper fades in on the finished sticker sheet, so the stage never sits empty. It
      // plays on only if nothing paused it or took it off screen while it faded.
      const intoFilm = () => {
        prologue?.kill();
        prologue = null;
        begun = true;
        fade = gsap.to(stage, {
          autoAlpha: 0,
          duration: 0.3,
          ease: ease.soft,
          onComplete: () => {
            fade = null;
            T.seek(OPEN);
            if (!held && onScreen) T.play();
            gsap.to(stage, { autoAlpha: 1, duration: 0.3, ease: ease.soft });
            ui();
          },
        });
        ui();
      };

      api.current = {
        toggle() {
          if (fade) held = !held;
          else {
            held = !(prologue ? prologue.paused() : T.paused());
            if (prologue) prologue.paused(held);
            else if (held) T.pause();
            else if (!begun) intoFilm();
            else if (done()) T.restart();
            else T.play();
          }
          ui();
        },
        // Under reduced motion a chapter shows its last frame, still. Otherwise a pick wins over
        // the opening and over its fade, whichever is under way.
        chapter(i) {
          if (RM) T.pause().seek(chapters[i].end - 0.01);
          else {
            prologue?.kill();
            prologue = null;
            fade = null;
            begun = true;
            gsap.killTweensOf(stage);
            gsap.set(stage, { autoAlpha: 1 });
            T.seek(chapters[i].t);
            if (!held) T.play();
          }
          ui();
        },
      };

      const poster = scenes.find((s) => s.key === POSTER)!;
      T.seek(poster.t + poster.dur - 0.01);
      if (RM) play.hidden = true;
      else {
        // First on screen, the server's frame plays its own moment (the coil winds from 5 to 6),
        // so the idea comes first; then the film starts from the stickers. It pauses off screen.
        io = new IntersectionObserver(([e]) => {
          onScreen = e.isIntersecting;
          if (!onScreen) {
            prologue?.pause();
            T.pause();
          } else if (!held && !fade) {
            // Not during the fade: its own end starts the film.
            if (prologue) prologue.resume();
            else if (begun) {
              if (!done()) T.play();
            } else {
              T.seek(poster.t + 1);
              prologue = gsap
                .timeline({ onComplete: intoFilm })
                .add(T.tweenTo(poster.t + poster.dur - 0.01, { ease: "none" }))
                .to({}, { duration: 1.4 });
            }
          }
          ui();
        });
        io.observe(stage);
      }
      ui();
    }, el);

    return () => {
      io?.disconnect();
      prologue?.kill();
      gsap.killTweensOf([stage, cap]);
      gsap.set([stage, cap], { clearProps: "all" });
      ctx.revert();
      api.current = null;
      play.hidden = false;
      el.classList.remove("is-live");
    };
  }, []);

  return (
    <div ref={root} className="guide__player">
      {/* The bars carry each chapter's name for screen readers; this shows the current one. The
          server's frame opens the film, so no chapter is named or under way until it starts. */}
      <p className="guide__now" aria-hidden="true" />
      <ol className="guide__chapters" aria-label="Chapters">
        {CHAPTERS.map((c, i) => (
          <li key={c}>
            <button type="button" data-ch={i} aria-label={c} onClick={() => api.current?.chapter(i)}>
              <span className="guide__bar">
                <span className="guide__fill" />
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="guide__stagebox">
        <svg
          className="guide__stage guide__hc"
          viewBox="0 30 360 360"
          role="img"
          aria-label="A short film of the steps listed below, from buying stickers to adding taplog to the Home Screen."
          style={habitVars(BLUE)}
        >
          {STAGE}
        </svg>
      </div>
      <div className="guide__sub">
        <button type="button" className="button guide__play" data-state="play" aria-label="Play" onClick={() => api.current?.toggle()}>
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path className="guide__ic-play" d="M6 4l10 6-10 6z" fill="currentColor" />
            <g className="guide__ic-pause" fill="currentColor">
              <rect x="5" y="4" width="3.5" height="12" rx="1" />
              <rect x="11.5" y="4" width="3.5" height="12" rx="1" />
            </g>
            <path className="guide__ic-again" d="M15.5 10A5.5 5.5 0 1 1 10 4.5h2M10.5 2l2.2 2.5L10.5 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className="guide__caption">
          <span className="guide__cap">{CAP[POSTER]}</span>
        </p>
      </div>
    </div>
  );
}

// The steps below the film draw their lines in once as they come on screen, a trace running along
// each one. Coils, fills and dashed lines just appear: they carry no line to run along.
const LINES = ":is(.g-e, .g-i, .g-m, .g-t, .g-gs):not(.coil__svg *, [stroke-dasharray])";

export function DrawIn() {
  useEffect(() => {
    if (reducedMotion()) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const lines = [...e.target.querySelectorAll<SVGGeometryElement>(LINES)];
        lines.forEach((l) => {
          const len = l.getTotalLength();
          gsap.fromTo(l, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.9, ease: ease.out, clearProps: "strokeDasharray,strokeDashoffset" });
        });
      }
    });
    document.querySelectorAll(".guide__art").forEach((a) => io.observe(a));
    return () => io.disconnect();
  }, []);
  return null;
}
