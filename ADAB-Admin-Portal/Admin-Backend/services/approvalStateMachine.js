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
    { targetState: APPROVAL_STATES.PENDING, action: APPROVAL_ACTIONS.REOPEN }
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
 * Validates if a state string is a recognized approval state.
 */
function isValidState(state) {
  return Object.values(APPROVAL_STATES).includes(state);
}

/**
 * Gets allowed target states and actions from a current state.
 */
function getAllowedTransitions(currentState) {
  if (!isValidState(currentState)) {
    throw new ApprovalStateMachineError(
      `Unknown initial state: '${currentState}'`,
      'UNKNOWN_STATE',
      { state: currentState }
    );
  }
  return ALLOWED_TRANSITIONS[currentState] || [];
}

/**
 * Checks whether a transition from currentState to targetState is valid.
 */
function canTransition(currentState, targetState) {
  if (!isValidState(currentState) || !isValidState(targetState)) {
    return false;
  }
  const allowed = ALLOWED_TRANSITIONS[currentState] || [];
  return allowed.some(t => t.targetState === targetState);
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
  if (!isValidState(currentState)) {
    throw new ApprovalStateMachineError(
      `Invalid starting state '${currentState}'`,
      'INVALID_CURRENT_STATE',
      { currentState }
    );
  }

  if (!isValidState(targetState)) {
    throw new ApprovalStateMachineError(
      `Invalid target state '${targetState}'`,
      'INVALID_TARGET_STATE',
      { targetState }
    );
  }

  if (currentState === targetState) {
    throw new ApprovalStateMachineError(
      `Cannot transition to identical state '${currentState}'`,
      'SAME_STATE_TRANSITION',
      { currentState, targetState }
    );
  }

  const allowedRule = (ALLOWED_TRANSITIONS[currentState] || []).find(
    t => t.targetState === targetState
  );

  if (!allowedRule) {
    throw new ApprovalStateMachineError(
      `Forbidden state transition from '${currentState}' to '${targetState}'. Transition skipped or disallowed.`,
      'DISALLOWED_TRANSITION',
      { currentState, targetState, allowedTransitions: getAllowedTransitions(currentState) }
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
    previous_status: currentState,
    new_status: targetState,
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
  isValidState,
  getAllowedTransitions,
  canTransition,
  transition
};
