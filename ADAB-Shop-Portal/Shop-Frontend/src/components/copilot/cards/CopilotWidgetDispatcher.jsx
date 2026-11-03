import React from 'react';
import OrderPackCard from './OrderPackCard';
import OrderListCard from './OrderListCard';
import OrderStatusUpdatedCard from './OrderStatusUpdatedCard';
import SalesSummaryCard from './SalesSummaryCard';
import LowStockCard from './LowStockCard';
import B2BRestockCard from './B2BRestockCard';
import PurchaseOrderDraftedCard from './PurchaseOrderDraftedCard';
import GstrTaxCard from './GstrTaxCard';
import StoreStatusCard from './StoreStatusCard';
import InventoryMutationCard from './InventoryMutationCard';

/**
 * Dispatcher component that selects and renders the appropriate Generative UI card.
 */
export default function CopilotWidgetDispatcher({
  widget,
  messageId,
  actionLoading,
  onPackOrder,
  onPackAll,
  onSelectOrder,
  onToggleStore,
  onToggleSoundbox,
  onDraftPO,
  onFindSuppliers
}) {
  if (!widget || !widget.type) return null;

  switch (widget.type) {
    case 'ORDER_LIST_CARD':
      return (
        <OrderListCard
          widget={widget}
          messageId={messageId}
          actionLoading={actionLoading}
          onPackOrder={onPackOrder}
          onPackAll={onPackAll}
          onSelectOrder={onSelectOrder}
        />
      );

    case 'ORDER_PACK_CARD':
      return (
        <OrderPackCard
          widget={widget}
          messageId={messageId}
          actionLoading={actionLoading}
          onPackOrder={onPackOrder}
          onPackAll={onPackAll}
          onSelectOrder={onSelectOrder}
        />
      );

    case 'ORDER_STATUS_UPDATED_CARD':
      return <OrderStatusUpdatedCard widget={widget} />;

    case 'SALES_SUMMARY_CARD':
      return <SalesSummaryCard widget={widget} />;

    case 'LOW_STOCK_CARD':
      return <LowStockCard widget={widget} onFindSuppliers={onFindSuppliers} />;

    case 'B2B_RESTOCK_CARD':
      return (
        <B2BRestockCard
          widget={widget}
          messageId={messageId}
          actionLoading={actionLoading}
          onDraftPO={onDraftPO}
        />
      );

    case 'PURCHASE_ORDER_DRAFTED_CARD':
      return <PurchaseOrderDraftedCard widget={widget} />;

    case 'GSTR_TAX_CARD':
      return <GstrTaxCard widget={widget} />;

    case 'STORE_STATUS_CARD':
      return (
        <StoreStatusCard
          widget={widget}
          messageId={messageId}
          actionLoading={actionLoading}
          onToggleStore={onToggleStore}
          onToggleSoundbox={onToggleSoundbox}
        />
      );

    case 'INVENTORY_MUTATION_CARD':
      return <InventoryMutationCard widget={widget} />;

    default:
      return null;
  }
}
