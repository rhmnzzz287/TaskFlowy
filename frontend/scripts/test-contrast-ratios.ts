import { createSuite } from './_suite';

type RGB = [number, number, number];

// Canvas tokens must match globals.css `.dark` block.
const OBSIDIAN: RGB = [11, 15, 25]; // #0B0F19 --bg-background
const DARK_PRIMARY: RGB = [129, 140, 248]; // #818CF8 Indigo-400
const DARK_MUTED: RGB = [180, 195, 215]; // #B4C3D7 --text-muted
const DARK_INK: RGB = [15, 23, 42]; // #0F172A
const LIGHT_BG: RGB = [248, 250, 252]; // #F8FAFC --bg-background
const LIGHT_PRIMARY: RGB = [79, 70, 229]; // #4F46E5 Indigo-600

const WCAG_AA_TEXT = 4.5;

function channelToLinear(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance([r, g, b]: RGB): number {
  return channelToLinear(r) * 0.2126 + channelToLinear(g) * 0.7152 + channelToLinear(b) * 0.0722;
}

function contrastRatio(fg: RGB, bg: RGB): number {
  const brightest = Math.max(luminance(fg), luminance(bg));
  const darkest = Math.min(luminance(fg), luminance(bg));
  return (brightest + 0.05) / (darkest + 0.05);
}

interface ContrastCase {
  label: string;
  fg: RGB;
  bg: RGB;
  min: number;
}

const CASES: ContrastCase[] = [
  { label: 'Dark Primary on obsidian', fg: DARK_PRIMARY, bg: OBSIDIAN, min: WCAG_AA_TEXT },
  { label: 'Dark Muted on obsidian', fg: DARK_MUTED, bg: OBSIDIAN, min: WCAG_AA_TEXT },
  // White on Indigo-400 fails AA (~3.0:1), so .btn-primary uses dark ink in dark mode.
  { label: 'Dark ink on Indigo-400', fg: DARK_INK, bg: DARK_PRIMARY, min: WCAG_AA_TEXT },
  { label: 'Light Primary on paper', fg: LIGHT_PRIMARY, bg: LIGHT_BG, min: WCAG_AA_TEXT },
];

const suite = createSuite('test-contrast-ratios');
for (const { label, fg, bg, min } of CASES) {
  const ratio = contrastRatio(fg, bg);
  console.log(`${label}: ${ratio.toFixed(2)}:1 (min ${min}:1)`);
  suite.check(`${label} meets WCAG AA`, ratio >= min);
}
suite.finish('all contrast ratios meet WCAG AA.');
