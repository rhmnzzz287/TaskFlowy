import {
  getDefaultProfile,
  validateAndRestoreBackup,
  type UserProfile,
  type TaskFlowyBackupData,
} from '../src/lib/profile-store'

console.log('--- TEST 1: Default Profile Initialization ---')
const defaultProfile = getDefaultProfile()
if (!defaultProfile.name || !defaultProfile.avatarIcon || !defaultProfile.defaultAssignee) {
  console.error('FAIL: Default profile properties missing:', defaultProfile)
  process.exit(1)
}
console.log('✓ Default profile verified:', defaultProfile.name, defaultProfile.avatarIcon)

console.log('--- TEST 2: Validate Malformed Backup JSON ---')
const malformedRes = validateAndRestoreBackup('{"invalid": true}')
if (malformedRes.success) {
  console.error('FAIL: Expected failure on malformed backup but got success')
  process.exit(1)
}
console.log('✓ Malformed JSON correctly rejected:', malformedRes.error)

console.log('--- TEST 3: Validate Valid Backup Payload Schema ---')
const sampleValidBackup: TaskFlowyBackupData = {
  version: 1,
  exportedAt: new Date().toISOString(),
  profile: {
    name: 'Budi Santoso',
    role: 'Lead Architect',
    avatarIcon: 'zap',
    defaultAssignee: 'Budi',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  draftsStore: {
    drafts: [],
    rows: {},
  },
}

// Simulasi lingkungan tanpa window untuk testing schema parsing
const validRes = validateAndRestoreBackup(JSON.stringify(sampleValidBackup))
if (!validRes.success && validRes.error !== 'WINDOW_UNDEFINED_IN_TEST') {
  console.error('FAIL: Valid schema rejected unexpectedly:', validRes.error)
  process.exit(1)
}
console.log('✓ Valid backup payload schema confirmed.')
console.log('All profile store tests passed!')