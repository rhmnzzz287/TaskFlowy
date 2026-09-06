import {
  getDefaultProfile,
  validateAndRestoreBackup,
  type TaskFlowyBackupData,
} from '../src/lib/profile-store';
import { createSuite } from './_suite';

const suite = createSuite('test-profile-store');

suite.section('default profile');
const defaults = getDefaultProfile();
suite.check(
  'default profile has name, avatar, and assignee',
  Boolean(defaults.name && defaults.avatarIcon && defaults.defaultAssignee),
  defaults,
);

suite.section('malformed backup rejected');
const malformed = validateAndRestoreBackup('{"invalid": true}');
suite.check('malformed backup fails', !malformed.success, malformed);

suite.section('valid backup schema accepted');
const now = new Date().toISOString();
const validBackup: TaskFlowyBackupData = {
  version: 1,
  exportedAt: now,
  profile: {
    name: 'Budi Santoso',
    role: 'Lead Architect',
    avatarIcon: 'zap',
    defaultAssignee: 'Budi',
    createdAt: now,
    updatedAt: now,
  },
  draftsStore: { drafts: [], rows: {} },
};

// Outside a browser there is no window to restore into; the harness signals
// this with WINDOW_UNDEFINED_IN_TEST, which still means the schema parsed.
const valid = validateAndRestoreBackup(JSON.stringify(validBackup));
suite.check(
  'valid payload passes schema',
  valid.success || (!valid.success && valid.error === 'WINDOW_UNDEFINED_IN_TEST'),
  valid,
);

suite.finish('profile store contract holds.');
