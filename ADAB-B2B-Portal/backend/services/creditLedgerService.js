import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class CreditLedgerService {
  /**
   * Automatically adds a debit entry to the ledger when an order is created
   * and increases the used/outstanding amount in relationship_credits.
   */
  async logOrderDebit(distributorId, manufacturerId, orderTotal, orderId) {
    if (!orderTotal || orderTotal <= 0) return;

    // 1. Fetch relationship credit
    const relationship = await prisma.relationship_credits.findFirst({
      where: {
        debtor_id: distributorId,
        creditor_id: manufacturerId,
        debtor_type: 'distributor'
      }
    });

    if (!relationship) {
      throw new Error("No credit relationship found between distributor and manufacturer.");
    }

    const availableCredit = Number(relationship.credit_limit) - Number(relationship.outstanding_amount);
    
    if (orderTotal > availableCredit) {
      throw new Error("Insufficient trade credit limit.");
    }

    // 2. Add Debit Ledger Entry
    const balance = Number(relationship.outstanding_amount) + Number(orderTotal);
    await prisma.manage_b_to_b_ledger_entries.create({
      data: {
        distributor_id: distributorId,
        type: 'ORDER_DEBIT',
        reference_id: orderId,
        description: `Order placed via B2B Credit: ${orderId}`,
        debit: orderTotal,
        credit: 0,
        balance: balance
      }
    });

    // 3. Update outstanding amount
    await prisma.relationship_credits.update({
      where: { id: relationship.id },
      data: {
        outstanding_amount: balance
      }
    });
  }

  /**
   * Adds a credit entry to the ledger when a payment is made
   * and decreases the used/outstanding amount in relationship_credits.
   */
  async logPaymentCredit(distributorId, manufacturerId, paymentAmount, paymentId) {
    if (!paymentAmount || paymentAmount <= 0) return;

    // 1. Fetch relationship credit
    const relationship = await prisma.relationship_credits.findFirst({
      where: {
        debtor_id: distributorId,
        creditor_id: manufacturerId,
        debtor_type: 'distributor'
      }
    });

    if (!relationship) return;

    // 2. Add Credit Ledger Entry
    const balance = Math.max(0, Number(relationship.outstanding_amount) - Number(paymentAmount));
    await prisma.manage_b_to_b_ledger_entries.create({
      data: {
        distributor_id: distributorId,
        type: 'PAYMENT_CREDIT',
        reference_id: paymentId,
        description: `Payment applied for B2B Credit: ${paymentId}`,
        debit: 0,
        credit: paymentAmount,
        balance: balance
      }
    });

    // 3. Update outstanding amount
    await prisma.relationship_credits.update({
      where: { id: relationship.id },
      data: {
        outstanding_amount: balance
      }
    });
  }
}

export default new CreditLedgerService();
