/**
 * Approval State Machine
 * Centralized, reusable state machine for Admin Moderation and Approval Workflows.
 * Strictly enforces valid states, allowed transitions, and required payload context.
 */

const APPROVAL_STATES = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  SUSPENDED: 'SUSPENDED'
});

const APPROVAL_ACTIONS = Object.freeze({
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  REQUEST_CHANGES: 'REQUEST_CHANGES',
  RESUBMIT: 'RESUBMIT',
  REOPEN: 'REOPEN',
  REVOKE: 'REVOKE',
  SUSPEND: 'SUSPEND',
  UNSUSPEND: 'UNSUSPEND'
});

// Allowed State Transition Map: currentState -> allowed next states & required conditions
const ALLOWED_TRANSITIONS = Object.freeze({
  [APPROVAL_STATES.PENDING]: [
    { targetState: APPROVAL_STATES.APPROVED, action: APPROVAL_ACTIONS.APPROVE },
    { targetState: APPROVAL_STATES.REJECTED, action: APPROVAL_ACTIONS.REJECT, requireReason: true },
    { targetState: APPROVAL_STATES.CHANGES_REQUESTED, action: APPROVAL_ACTIONS.REQUEST_CHANGES, requireNotes: true },
    { targetState: APPROVAL_STATES.SUSPENDED, action: APPROVAL_ACTIONS.SUSPEND, requireReason: true }
  ],
  [APPROVAL_STATES.CHANGES_REQUESTED]: [
    { targetState: APPROVAL_STATES.PENDING, action: APPROVAL_ACTIONS.RESUBMIT },
    { targetState: APPROVAL_STATES.APPROVED, action: APPROVAL_ACTIONS.APPROVE },
    { targetState: APPROVAL_STATES.REJECTED, action: APPROVAL_ACTIONS.REJECT, requireReason: true },
    { targetState: APPROVAL_STATES.SUSPENDED, action: APPROVAL_ACTIONS.SUSPEND, requireReason: true }
  ],
  [APPROVAL_STATES.REJECTED]: [
    { targetState: APPROVAL_STATES.PENDING, action: APPROVAL_ACTIONS.REOPEN },
    { targetState: APPROVAL_STATES.APPROVED, action: APPROVAL_ACTIONS.APPROVE }
  ],
  [APPROVAL_STATES.APPROVED]: [
    { targetState: APPROVAL_STATES.REJECTED, action: APPROVAL_ACTIONS.REVOKE, requireReason: true },
    { targetState: APPROVAL_STATES.SUSPENDED, action: APPROVAL_ACTIONS.SUSPEND, requireReason: true }
  ],
  [APPROVAL_STATES.SUSPENDED]: [
    { targetState: APPROVAL_STATES.APPROVED, action: APPROVAL_ACTIONS.UNSUSPEND },
    { targetState: APPROVAL_STATES.REJECTED, action: APPROVAL_ACTIONS.REJECT, requireReason: true }
  ]
});

class ApprovalStateMachineError extends Error {
  constructor(message, errorCode = 'INVALID_TRANSITION', details = {}) {
    super(message);
    this.name = 'ApprovalStateMachineError';
    this.errorCode = errorCode;
    this.details = details;
  }
}

/**
 * Normalizes database/external state strings into standard APPROVAL_STATES.
 */
function normalizeState(state) {
  if (!state || typeof state !== 'string') return state;
  const upper = state.trim().toUpperCase();
  switch (upper) {
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
    case 'DRAFT':
    case 'PENDING':
      return APPROVAL_STATES.PENDING;
    case 'APPROVED':
    case 'PUBLISHED':
    case 'LIVE':
      return APPROVAL_STATES.APPROVED;
    case 'REJECTED':
      return APPROVAL_STATES.REJECTED;
    case 'CHANGES_REQUIRED':
    case 'CHANGES_REQUESTED':
      return APPROVAL_STATES.CHANGES_REQUESTED;
    case 'SUSPENDED':
      return APPROVAL_STATES.SUSPENDED;
    default:
      return upper;
  }
}

/**
 * Validates if a state string is a recognized approval state.
 */
function isValidState(state) {
  const norm = normalizeState(state);
  return Object.values(APPROVAL_STATES).includes(norm);
}

/**
 * Gets allowed target states and actions from a current state.
 */
function getAllowedTransitions(currentState) {
  const normCurrent = normalizeState(currentState);
  if (!isValidState(normCurrent)) {
    throw new ApprovalStateMachineError(
      `Unknown initial state: '${currentState}'`,
      'UNKNOWN_STATE',
      { state: currentState }
    );
  }
  return ALLOWED_TRANSITIONS[normCurrent] || [];
}

/**
 * Checks whether a transition from currentState to targetState is valid.
 */
function canTransition(currentState, targetState) {
  const normCurrent = normalizeState(currentState);
  const normTarget = normalizeState(targetState);
  if (!isValidState(normCurrent) || !isValidState(normTarget)) {
    return false;
  }
  const allowed = ALLOWED_TRANSITIONS[normCurrent] || [];
  return allowed.some(t => t.targetState === normTarget);
}

/**
 * Executes a transition, performing strict validations.
 *
 * @param {string} currentState
 * @param {string} targetState
 * @param {Object} [payload={}] - { rejection_reason, notes, admin_id, listing_id }
 * @returns {Object} transitionResult
 */
function transition(currentState, targetState, payload = {}) {
  const normCurrent = normalizeState(currentState);
  const normTarget = normalizeState(targetState);

  if (!isValidState(normCurrent)) {
    throw new ApprovalStateMachineError(
      `Invalid starting state '${currentState}'`,
      'INVALID_CURRENT_STATE',
      { currentState }
    );
  }

  if (!isValidState(normTarget)) {
    throw new ApprovalStateMachineError(
      `Invalid target state '${targetState}'`,
      'INVALID_TARGET_STATE',
      { targetState }
    );
  }

  if (normCurrent === normTarget) {
    throw new ApprovalStateMachineError(
      `Cannot transition to identical state '${normCurrent}'`,
      'SAME_STATE_TRANSITION',
      { currentState: normCurrent, targetState: normTarget }
    );
  }

  const allowedRule = (ALLOWED_TRANSITIONS[normCurrent] || []).find(
    t => t.targetState === normTarget
  );

  if (!allowedRule) {
    throw new ApprovalStateMachineError(
      `Forbidden state transition from '${currentState}' to '${targetState}'. Transition skipped or disallowed.`,
      'DISALLOWED_TRANSITION',
      { currentState, targetState, allowedTransitions: getAllowedTransitions(normCurrent) }
    );
  }

  // Validate payload requirements for specific transitions
  if (allowedRule.requireReason && (!payload.rejection_reason || !payload.rejection_reason.trim())) {
    throw new ApprovalStateMachineError(
      `Transition from '${currentState}' to '${targetState}' requires a non-empty 'rejection_reason'`,
      'MISSING_REJECTION_REASON',
      { currentState, targetState }
    );
  }

  if (allowedRule.requireNotes && (!payload.notes || !payload.notes.trim())) {
    throw new ApprovalStateMachineError(
      `Transition from '${currentState}' to '${targetState}' requires non-empty 'notes' explaining required changes`,
      'MISSING_NOTES',
      { currentState, targetState }
    );
  }

  return {
    success: true,
    previous_status: normCurrent,
    new_status: normTarget,
    action: allowedRule.action,
    rejection_reason: payload.rejection_reason || null,
    notes: payload.notes || null,
    action_at: new Date().toISOString()
  };
}

module.exports = {
  APPROVAL_STATES,
  APPROVAL_ACTIONS,
  ApprovalStateMachineError,
  normalizeState,
  isValidState,
  getAllowedTransitions,
  canTransition,
  transition
};
