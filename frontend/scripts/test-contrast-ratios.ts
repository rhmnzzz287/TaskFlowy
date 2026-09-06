function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

function contrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const lum1 = luminance(...rgb1)
  const lum2 = luminance(...rgb2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  return (brightest + 0.05) / (darkest + 0.05)
}

function check(label: string, fg: [number, number, number], bg: [number, number, number], min: number) {
  const ratio = contrastRatio(fg, bg)
  console.log(`${label}: ${ratio.toFixed(2)}:1 (min ${min}:1)`)
  if (ratio < min) {
    console.error(`FAIL: ${label} under ${min}:1 (${ratio.toFixed(2)})`)
    process.exit(1)
  }
  console.log(`✓ ${label} meets WCAG AA.`)
}

console.log('--- TEST 1: Dark Mode Primary Contrast ---')
// Canvas tokens must match globals.css `.dark` block.
const obsidian: [number, number, number] = [11, 15, 25] // #0B0F19 --bg-background
const darkPrimary: [number, number, number] = [129, 140, 248] // #818CF8 Indigo-400
check('Dark Primary on obsidian', darkPrimary, obsidian, 4.5)

console.log('--- TEST 2: Dark Mode Muted Text Contrast ---')
const darkMuted: [number, number, number] = [180, 195, 215] // #B4C3D7 --text-muted
check('Dark Muted on obsidian', darkMuted, obsidian, 4.5)

console.log('--- TEST 3: Dark Button Text on Primary ---')
// White on Indigo-400 fails AA (~3.0:1) → .btn-primary must use dark ink in dark mode.
const darkInk: [number, number, number] = [15, 23, 42] // #0F172A
check('Dark ink on Indigo-400', darkInk, darkPrimary, 4.5)

console.log('--- TEST 4: Light Mode Primary Contrast (no regression) ---')
const lightBg: [number, number, number] = [248, 250, 252] // #F8FAFC --bg-background
const lightPrimary: [number, number, number] = [79, 70, 229] // #4F46E5 Indigo-600
check('Light Primary on paper', lightPrimary, lightBg, 4.5)

console.log('All contrast tests passed!')
