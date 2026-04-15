import { Transaction, ShipViaEntry } from '../types';

/**
 * Creates an auto-generated carrier BILL for an inbound shipping cost and
 * updates the source transaction to reference it.
 *
 * Call this after the source transaction (PO / RECEIVE_ITEM / BILL) has been
 * saved so we have a stable source ID to link against.
 *
 * @param sourceTx   The already-saved source transaction (PO, receipt, bill)
 * @param shipViaEntry  The selected ShipViaEntry (must have vendorId set)
 * @param shippingCost  Carrier charge amount
 * @param onSaveTransaction  DataContext save handler (accepts an array for batch)
 */
export async function createShippingBill(
  sourceTx: Transaction,
  shipViaEntry: ShipViaEntry,
  shippingCost: number,
  onSaveTransaction: (tx: Transaction | Transaction[]) => Promise<void>,
  fallbackVendorId?: string
): Promise<void> {
  const resolvedVendorId = shipViaEntry.vendorId || fallbackVendorId;
  if (!resolvedVendorId || shippingCost <= 0) return;

  const shippingBillId = crypto.randomUUID();

  const shippingBill: Transaction = {
    id: shippingBillId,
    type: 'BILL',
    refNo: 'SHIP-' + Date.now().toString().slice(-5),
    date: sourceTx.date,
    entityId: resolvedVendorId,
    items: [
      {
        id: crypto.randomUUID(),
        description: `Shipping (${shipViaEntry.name}) — ${sourceTx.type} #${sourceTx.refNo || sourceTx.id}`,
        quantity: 1,
        rate: shippingCost,
        amount: shippingCost,
        tax: false,
        accountId: shipViaEntry.defaultShippingAccountId || undefined,
      } as any,
    ],
    total: shippingCost,
    status: 'OPEN',
    memo: `Auto-generated shipping bill for ${sourceTx.type} #${sourceTx.refNo || sourceTx.id}`,
    linkedDocumentIds: [sourceTx.id],
    purchaseOrderId:
      sourceTx.type === 'PURCHASE_ORDER' ? sourceTx.id : sourceTx.purchaseOrderId,
    itemReceiptId:
      sourceTx.type === 'RECEIVE_ITEM' ? sourceTx.id : undefined,
  };

  // Patch the source transaction to reference this bill
  const updatedSource: Transaction = {
    ...sourceTx,
    shippingBillId,
    linkedDocumentIds: [
      ...(sourceTx.linkedDocumentIds || []),
      shippingBillId,
    ],
  };

  await onSaveTransaction([updatedSource, shippingBill] as any);
}

/**
 * If a source transaction already has a shippingBillId, updates the existing
 * carrier bill instead of creating a new one.
 */
export async function updateShippingBill(
  sourceTx: Transaction,
  existingBillId: string,
  newCost: number,
  existingBill: Transaction | undefined,
  onSaveTransaction: (tx: Transaction | Transaction[]) => Promise<void>
): Promise<void> {
  if (!existingBill) return;

  const updatedBill: Transaction = {
    ...existingBill,
    total: newCost,
    items: existingBill.items.map((item, idx) =>
      idx === 0 ? { ...item, rate: newCost, amount: newCost } : item
    ),
  };

  await onSaveTransaction(updatedBill);
}

/**
 * Creates an auto-generated carrier BILL for an outbound shipment cost
 * (what we pay the carrier to deliver goods to the customer).
 * Call after the invoice/SO has been saved.
 */
export async function createOutboundShippingBill(
  sourceTx: Transaction,
  shipViaEntry: ShipViaEntry,
  carrierCost: number,
  onSaveTransaction: (tx: Transaction | Transaction[]) => Promise<void>
): Promise<void> {
  if (!shipViaEntry.vendorId || carrierCost <= 0) return;

  const billId = crypto.randomUUID();

  const carrierBill: Transaction = {
    id: billId,
    type: 'BILL',
    refNo: 'SHIP-OUT-' + Date.now().toString().slice(-5),
    date: sourceTx.date,
    entityId: shipViaEntry.vendorId,
    items: [
      {
        id: crypto.randomUUID(),
        description: `Outbound Shipping (${shipViaEntry.name}) — ${sourceTx.type} #${sourceTx.refNo || sourceTx.id}`,
        quantity: 1,
        rate: carrierCost,
        amount: carrierCost,
        tax: false,
        accountId: shipViaEntry.defaultShippingAccountId || undefined,
      } as any,
    ],
    total: carrierCost,
    status: 'OPEN',
    memo: `Auto-generated outbound shipping bill for ${sourceTx.type} #${sourceTx.refNo || sourceTx.id}`,
    linkedDocumentIds: [sourceTx.id],
  };

  const updatedSource: Transaction = {
    ...sourceTx,
    outboundShippingBillId: billId,
    linkedDocumentIds: [...(sourceTx.linkedDocumentIds || []), billId],
  };

  await onSaveTransaction([updatedSource, carrierBill] as any);
}

/**
 * Updates an existing outbound carrier bill when the invoice is re-saved.
 */
export async function updateOutboundShippingBill(
  newCost: number,
  existingBill: Transaction,
  onSaveTransaction: (tx: Transaction | Transaction[]) => Promise<void>
): Promise<void> {
  const updatedBill: Transaction = {
    ...existingBill,
    total: newCost,
    items: existingBill.items.map((item, idx) =>
      idx === 0 ? { ...item, rate: newCost, amount: newCost } : item
    ),
  };
  await onSaveTransaction(updatedBill);
}

/**
 * Builds the list of ShipmentRecord view-models from raw Transaction data.
 * Used by ShippingModule to derive the inbound / outbound views without a
 * dedicated collection.
 */
export function buildInboundShipments(
  transactions: Transaction[]
): Transaction[] {
  const billIds = new Set(
    transactions
      .filter(t => t.shippingBillId)
      .map(t => t.shippingBillId as string)
  );
  return transactions.filter(t => billIds.has(t.id) && t.type === 'BILL');
}

export function buildOutboundShipments(transactions: Transaction[]): Transaction[] {
  return transactions.filter(
    t =>
      (t.type === 'INVOICE' || t.type === 'SALES_ORDER') &&
      (t.shippingCost ?? 0) > 0 &&
      t.status?.toLowerCase() !== 'converted'
  );
}

/** Maps a carrier BILL back to its source transaction (inbound or outbound). */
export function getShippingBillSource(
  bill: Transaction,
  transactions: Transaction[]
): Transaction | undefined {
  return transactions.find(t => t.shippingBillId === bill.id || t.outboundShippingBillId === bill.id);
}
