const {
  APPROVAL_STATES,
  APPROVAL_ACTIONS,
  ApprovalStateMachineError,
  isValidState,
  getAllowedTransitions,
  canTransition,
  transition
} = require('../services/approvalStateMachine');

describe('Approval State Machine Unit Tests', () => {
  describe('State Validation & Queries', () => {
    it('should validate canonical states correctly', () => {
      expect(isValidState(APPROVAL_STATES.PENDING)).toBe(true);
      expect(isValidState(APPROVAL_STATES.APPROVED)).toBe(true);
      expect(isValidState(APPROVAL_STATES.REJECTED)).toBe(true);
      expect(isValidState(APPROVAL_STATES.CHANGES_REQUESTED)).toBe(true);
      expect(isValidState('INVALID_STATE')).toBe(false);
    });

    it('should list allowed transitions from PENDING', () => {
      const allowed = getAllowedTransitions(APPROVAL_STATES.PENDING);
      expect(allowed.length).toBe(3);
      const targetStates = allowed.map(a => a.targetState);
      expect(targetStates).toContain(APPROVAL_STATES.APPROVED);
      expect(targetStates).toContain(APPROVAL_STATES.REJECTED);
      expect(targetStates).toContain(APPROVAL_STATES.CHANGES_REQUESTED);
    });

    it('should correctly evaluate canTransition', () => {
      expect(canTransition(APPROVAL_STATES.PENDING, APPROVAL_STATES.APPROVED)).toBe(true);
      expect(canTransition(APPROVAL_STATES.PENDING, APPROVAL_STATES.REJECTED)).toBe(true);
      expect(canTransition(APPROVAL_STATES.APPROVED, APPROVAL_STATES.CHANGES_REQUESTED)).toBe(false);
    });
  });

  describe('Valid State Transitions', () => {
    it('should execute PENDING -> APPROVED transition', () => {
      const res = transition(APPROVAL_STATES.PENDING, APPROVAL_STATES.APPROVED, { notes: 'Approved after verification' });
      expect(res.success).toBe(true);
      expect(res.previous_status).toBe(APPROVAL_STATES.PENDING);
      expect(res.new_status).toBe(APPROVAL_STATES.APPROVED);
      expect(res.action).toBe(APPROVAL_ACTIONS.APPROVE);
    });

    it('should execute PENDING -> REJECTED transition with rejection reason', () => {
      const res = transition(APPROVAL_STATES.PENDING, APPROVAL_STATES.REJECTED, {
        rejection_reason: 'Invalid GST certificate details'
      });
      expect(res.success).toBe(true);
      expect(res.new_status).toBe(APPROVAL_STATES.REJECTED);
      expect(res.rejection_reason).toBe('Invalid GST certificate details');
    });

    it('should execute PENDING -> CHANGES_REQUESTED transition with notes', () => {
      const res = transition(APPROVAL_STATES.PENDING, APPROVAL_STATES.CHANGES_REQUESTED, {
        notes: 'Please upload higher resolution product image'
      });
      expect(res.success).toBe(true);
      expect(res.new_status).toBe(APPROVAL_STATES.CHANGES_REQUESTED);
      expect(res.notes).toBe('Please upload higher resolution product image');
    });

    it('should execute CHANGES_REQUESTED -> PENDING (resubmit) transition', () => {
      const res = transition(APPROVAL_STATES.CHANGES_REQUESTED, APPROVAL_STATES.PENDING);
      expect(res.success).toBe(true);
      expect(res.action).toBe(APPROVAL_ACTIONS.RESUBMIT);
    });
  });

  describe('Invalid & Skipped Transitions Rejection', () => {
    it('should reject transition to same state', () => {
      expect(() => {
        transition(APPROVAL_STATES.PENDING, APPROVAL_STATES.PENDING);
      }).toThrow(ApprovalStateMachineError);
    });

    it('should reject invalid/skipped transition (APPROVED -> CHANGES_REQUESTED)', () => {
      expect(() => {
        transition(APPROVAL_STATES.APPROVED, APPROVAL_STATES.CHANGES_REQUESTED);
      }).toThrow(ApprovalStateMachineError);
    });

    it('should reject REJECTED transition missing required rejection_reason', () => {
      expect(() => {
        transition(APPROVAL_STATES.PENDING, APPROVAL_STATES.REJECTED, {});
      }).toThrow(ApprovalStateMachineError);
    });

    it('should reject CHANGES_REQUESTED transition missing required notes', () => {
      expect(() => {
        transition(APPROVAL_STATES.PENDING, APPROVAL_STATES.CHANGES_REQUESTED, {});
      }).toThrow(ApprovalStateMachineError);
    });
  });
});
