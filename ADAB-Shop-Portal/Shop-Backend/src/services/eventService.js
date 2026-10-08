const pool = require('../../db');

module.exports = {
  emitEvent: async (aggregateType, aggregateId, eventType, payload, client = pool) => {
    try {
      await client.query(
        `INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload) VALUES ($1, $2, $3, $4)`,
        [aggregateType, aggregateId, eventType, JSON.stringify(payload)]
      );
      console.log(`[Event] Emitted ${eventType} for ${aggregateType}:${aggregateId}`);
    } catch (e) {
      console.error('Failed to emit event to outbox:', e);
      throw e;
    }
  }
};
