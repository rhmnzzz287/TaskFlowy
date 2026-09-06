/**
 * Landing playground presets — generated dynamically from a reference date so
 * the demo never goes stale. Dates are explicit ISO (the only guaranteed-valid
 * start-column syntax); task relations ride in the 6th pipe column (dependsOn),
 * which the workbench renders as dependency arrows + critical path.
 *
 * NOTE: `after X` in the START column is NOT valid parser syntax (it yields
 * "Unrecognized date" and the row is dropped from the workbench chart).
 * `after`/`setelah` is only understood in freeform lines (→ dependsOn).
 */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return toISODate(dt)
}

export function buildUmkmPreset(refDateISO: string): string {
  const t1 = addDays(refDateISO, 1)
  const t2 = addDays(refDateISO, 3)
  const t3 = addDays(refDateISO, 7)
  const t4 = addDays(refDateISO, 9)
  return [
    `Beli Bahan Baku | Bu Siti | ${t1} | 2 hari`,
    `Produksi Kue Kering | Tim Dapur | ${t2} | 4 hari |  | Beli Bahan Baku`,
    `Packaging & Label | Mas Doni | ${t3} | 2 hari |  | Produksi Kue Kering`,
    `Pengiriman Pelanggan | Kurir Toko | ${t4} | 1 hari |  | Packaging & Label`,
  ].join('\n')
}

export function buildPmPreset(refDateISO: string): string {
  const t1 = addDays(refDateISO, 1)
  const t2 = addDays(refDateISO, 4)
  const t3 = addDays(refDateISO, 8)
  const t4 = addDays(refDateISO, 12)
  return [
    `Desain Wireframe UI | Designer | ${t1} | 3 hari`,
    `Backend API & DB | Budi | ${t2} | 4 hari |  | Desain Wireframe UI`,
    `Integrasi Frontend | Siti | ${t3} | 4 hari |  | Backend API & DB`,
    `QA Regression Test | Tim QA | ${t4} | 2 hari |  | Integrasi Frontend`,
  ].join('\n')
}

export function buildMarketingPreset(refDateISO: string): string {
  const t1 = addDays(refDateISO, 1)
  const t2 = addDays(refDateISO, 3)
  const t3 = addDays(refDateISO, 6)
  const t4 = addDays(refDateISO, 9)
  return [
    `Riset Target & Brief | Rian | ${t1} | 2 hari`,
    `Produksi Video & Desain | Maya | ${t2} | 3 hari |  | Riset Target & Brief`,
    `Review & Approval Klien | Pak Hendra | ${t3} | 3 hari |  | Produksi Video & Desain`,
    `Launch Ads Campaign | Tim Growth | ${t4} | 4 hari |  | Review & Approval Klien`,
  ].join('\n')
}

export function buildEventPreset(refDateISO: string): string {
  const t1 = addDays(refDateISO, 2)
  const t2 = addDays(refDateISO, 4)
  const t3 = addDays(refDateISO, 8)
  const t4 = addDays(refDateISO, 11)
  return [
    `Booking Venue & Perizinan | Diana | ${t1} | 2 hari`,
    `Vendor Stage & Audio | Eko | ${t2} | 4 hari |  | Booking Venue & Perizinan`,
    `Rehearsal & Soundcheck | Tim Acara | ${t3} | 3 hari |  | Vendor Stage & Audio`,
    `Pelaksanaan Hari-H | All Crew | ${t4} | 1 hari |  | Rehearsal & Soundcheck`,
  ].join('\n')
}

export function buildUmkmPresetEn(refDateISO: string): string {
  const t1 = addDays(refDateISO, 1)
  const t2 = addDays(refDateISO, 3)
  const t3 = addDays(refDateISO, 7)
  const t4 = addDays(refDateISO, 9)
  return [
    `Order Ingredients | Alice | ${t1} | 2 days`,
    `Bake Cookie Batch | Kitchen Team | ${t2} | 4 days |  | Order Ingredients`,
    `Packaging & Labeling | Dave | ${t3} | 2 days |  | Bake Cookie Batch`,
    `Customer Deliveries | Courier | ${t4} | 1 day |  | Packaging & Labeling`,
  ].join('\n')
}

export function buildPmPresetEn(refDateISO: string): string {
  const t1 = addDays(refDateISO, 1)
  const t2 = addDays(refDateISO, 4)
  const t3 = addDays(refDateISO, 8)
  const t4 = addDays(refDateISO, 12)
  return [
    `UI Wireframes | Designer | ${t1} | 3 days`,
    `Backend API & DB | Alex | ${t2} | 4 days |  | UI Wireframes`,
    `Frontend Integration | Sarah | ${t3} | 4 days |  | Backend API & DB`,
    `QA Regression Testing | QA Team | ${t4} | 2 days |  | Frontend Integration`,
  ].join('\n')
}

export function buildMarketingPresetEn(refDateISO: string): string {
  const t1 = addDays(refDateISO, 1)
  const t2 = addDays(refDateISO, 3)
  const t3 = addDays(refDateISO, 6)
  const t4 = addDays(refDateISO, 9)
  return [
    `Target Research & Brief | Ryan | ${t1} | 2 days`,
    `Video & Visual Assets | Maya | ${t2} | 3 days |  | Target Research & Brief`,
    `Client Review & Approval | Henry | ${t3} | 3 days |  | Video & Visual Assets`,
    `Paid Ads Campaign Launch | Growth Team | ${t4} | 4 days |  | Client Review & Approval`,
  ].join('\n')
}

export function buildEventPresetEn(refDateISO: string): string {
  const t1 = addDays(refDateISO, 2)
  const t2 = addDays(refDateISO, 4)
  const t3 = addDays(refDateISO, 8)
  const t4 = addDays(refDateISO, 11)
  return [
    `Venue Booking & Permits | Diana | ${t1} | 2 days`,
    `Stage & Audio Setup | Alex | ${t2} | 4 days |  | Venue Booking & Permits`,
    `Rehearsal & Soundcheck | Event Team | ${t3} | 3 days |  | Stage & Audio Setup`,
    `Event Showtime | All Crew | ${t4} | 1 day |  | Rehearsal & Soundcheck`,
  ].join('\n')
}

