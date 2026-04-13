import { AppStore } from '../types';

/** Single source of truth: from env VITE_API_URL so frontend and server connect in deployed env */
export const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5001/api';

const getHeaders = () => {
    const token = localStorage.getItem('authToken');
    const companyId = localStorage.getItem('activeCompanyId');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Company-ID': companyId || '',
    };
};

// Generic Fetcher
const get = async (path: string) => {
    const res = await fetch(`${API_BASE_URL}/${path}`, {
        headers: getHeaders(),
    });
    if (!res.ok) {
        if (res.status === 401) {
            localStorage.removeItem('authToken');
            window.location.reload(); // Force re-auth
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Fetch failed: ${path}`);
    }
    return res.json();
};

// Generic Saver
const post = async (path: string, data: any) => {
    const res = await fetch(`${API_BASE_URL}/${path}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const err = new Error(errorData.message || errorData.error || `Save failed: ${path}`) as any;
        Object.assign(err, errorData);
        throw err;
    }
    return res.json();
};

const put = async (path: string, data: any) => {
    const res = await fetch(`${API_BASE_URL}/${path}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Update failed: ${path}`);
    }
    return res.json();
};

const patch = async (path: string, data: any) => {
    const res = await fetch(`${API_BASE_URL}/${path}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Patch failed: ${path}`);
    }
    return res.json();
};

const remove = async (path: string) => {
    const res = await fetch(`${API_BASE_URL}/${path}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Delete failed: ${path}`);
    }
    return res.json();
};

// ─── Report Export ──────────────────────────────────────────────────────────────
export const exportReportToExcel = async (reportType: string, params: any = {}): Promise<Blob> => {
    const res = await fetch(`${API_BASE_URL}/report-exports/excel`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reportType, params }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Excel export failed');
    }
    return res.blob();
};

export const fetchReportSchedules = () => get('report-exports/schedules');
export const createReportSchedule = (data: any) => post('report-exports/schedules', data);
export const updateReportSchedule = (id: string, data: any) => put(`report-exports/schedules/${id}`, data);
export const deleteReportSchedule = (id: string) => remove(`report-exports/schedules/${id}`);

export const login = async (credentials: any) => {
    const data = await post('auth/login', credentials);
    if (data.token) localStorage.setItem('authToken', data.token);
    return data;
};

export const fetchCompanies = () => get('companies');
export const createCompany = (data: any) => post('companies', data);
export const updateCompany = (id: string, data: any) => put(`companies/${id}`, data);

export const signup = async (userData: any) => {
    const data = await post('auth/signup', userData);
    if (data.token) localStorage.setItem('authToken', data.token);
    return data;
};

export const fetchFullStore = async (): Promise<Partial<AppStore>> => {
    try {
        const [
            accounts, customers, vendors, transactions, items, employees, leads, classes, salesReps, terms,
            timeEntries, mileageEntries, priceLevels, salesTaxCodes, budgets, memorizedReports,
            liabilities, customFields, currencies, auditLogs, fixedAssets, settings, uomSets
        ] = await Promise.all([
            get('accounts'), get('customers'), get('vendors'), get('transactions'), get('items'),
            get('employees'), get('leads'), get('classes'), get('sales-reps'), get('terms'),
            get('time-entries'), get('mileage-entries'), get('price-levels'), get('sales-tax-codes'),
            get('budgets'), get('memorized-reports'), get('liabilities'), get('custom-fields'),
            get('currencies'), get('audit-logs'), get('fixed-assets'), get('settings'), get('uom-sets')
        ]);

        return {
            accounts, customers, vendors,
            transactions: transactions.items || transactions,
            items, employees, leads, classes, salesReps, terms,
            timeEntries, mileageEntries, priceLevels, salesTaxCodes, budgets, memorizedReports,
            liabilities, customFields, currencies,
            auditLogs: auditLogs.items || auditLogs,
            fixedAssets, uomSets,
            ...settings
        };
    } catch (error) {
        console.error('Error fetching full store:', error);
        // Fallback to legacy if available or return empty
        const legacy = await get('store').catch(() => null);
        return legacy || {};
    }
};

export const syncEntity = async (entity: string, data: any[]) => {
    try {
        await post(`${entity}/bulk`, { items: data });
    } catch (error) {
        console.error(`Error syncing ${entity}:`, error);
    }
};

export const saveSettings = async (settings: any) => {
    try {
        await post('settings', settings);
    } catch (error) {
        console.error('Error saving settings:', error);
    }
};

export const saveTransaction = async (tx: any) => {
    try {
        const res = await fetch(`${API_BASE_URL}/transactions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(tx),
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || (errorData.errors ? JSON.stringify(errorData.errors) : 'Failed to save transaction'));
        }
        return res.json();
    } catch (error: any) {
        console.error('Error saving transaction:', error);
        throw error;
    }
};

export const deleteTransaction = (id: string) => remove(`transactions/${id}`);

export const fetchNextRefNo = (type: string): Promise<{ refNo: string }> =>
    get(`transactions/next-ref-no?type=${encodeURIComponent(type)}`);

// Allocation: assign/unassign products from a Manufacturing/Work Order
export const assignAllocation = (moId: string, data: {
    targetTransactionId: string;
    targetType: 'DELIVERY_ORDER' | 'WORK_ORDER';
    itemId?: string;
    lineItemId?: string;
    quantity: number;
}) => post(`transactions/${moId}/allocations`, data);

export const unassignAllocation = (moId: string, allocationId: string) =>
    remove(`transactions/${moId}/allocations/${allocationId}`);

// Work Orders — stored as WORK_ORDER transactions; convenience helpers
export const fetchWorkOrders = () =>
    get('transactions').then((data: any) => {
        const txs = data.items || data;
        return txs.filter((t: any) => t.type === 'WORK_ORDER');
    });
export const cancelWorkOrder = (woId: string) =>
    put(`transactions/${woId}`, { workOrderStatus: 'CANCELLED', status: 'CLOSED' });

export const saveCustomer = (customer: any) => post('customers', customer);
export const saveVendor = (vendor: any) => post('vendors', vendor);
export const saveEmployee = (employee: any) => post('employees', employee);
export const saveItem = (item: any) => post('items', item);
export const deleteItem = (id: string) => remove(`items/${id}`);
export const fetchItemByBarcode = (barcode: string) => get(`items/barcode/${encodeURIComponent(barcode)}`);
export const fetchBOMHistory = (itemId: string) => get(`items/${itemId}/bom-history`);
export const saveAccount = (account: any) => post('accounts', account);
export const saveLead = (lead: any) => post('leads', lead);
export const saveClass = (cls: any) => post('classes', cls);
export const saveSalesRep = (rep: any) => post('sales-reps', rep);
export const saveTerm = (term: any) => post('terms', term);
export const deleteTerm = (id: string) => remove(`terms/${id}`);
export const deleteCustomer = (id: string) => remove(`customers/${id}`);
export const bulkDeleteCustomers = (ids: string[]) => post('customers/bulk-delete', { ids });
export const makeCustomerInactive = (id: string, isActive: boolean) => patch(`customers/${id}/status`, { isActive });
export const addCustomerNote = (id: string, text: string, author?: string) => post(`customers/${id}/notes`, { text, author });
export const getCustomerStatement = (id: string) => post(`customers/${id}/statement`, {});

// UOM Sets (QB Enterprise)
export const getUOMSets = () => get('uom-sets');
export const createUOMSet = (data: any) => post('uom-sets', data);
export const updateUOMSet = (id: string, data: any) => put(`uom-sets/${id}`, data);
export const deleteUOMSet = (id: string) => remove(`uom-sets/${id}`);
export const getVendor = (id: string) => get(`vendors/${id}`);
export const deleteVendor = (id: string) => remove(`vendors/${id}`);
export const bulkDeleteVendors = (ids: string[]) => post('vendors/bulk-delete', { ids });
export const makeVendorInactive = (id: string, isActive: boolean) => patch(`vendors/${id}/status`, { isActive });
export const mergeVendors = (sourceId: string, targetId: string) => post(`vendors/${sourceId}/merge`, { targetId });
export const addVendorNote = (id: string, text: string, author?: string) => post(`vendors/${id}/notes`, { text, author });
export const importCustomers = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('authToken');
    const companyId = localStorage.getItem('activeCompanyId');
    const res = await fetch(`${API_BASE_URL}/customers/import`, {
        method: 'POST',
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'X-Company-ID': companyId || '',
        },
        body: formData,
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Import failed');
    }
    return res.json();
};

export const importVendors = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('authToken');
    const companyId = localStorage.getItem('activeCompanyId');
    const res = await fetch(`${API_BASE_URL}/vendors/import`, {
        method: 'POST',
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'X-Company-ID': companyId || '',
        },
        body: formData,
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Import failed');
    }
    return res.json();
};

export const importEmployees = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('authToken');
    const companyId = localStorage.getItem('activeCompanyId');
    const res = await fetch(`${API_BASE_URL}/employees/import`, {
        method: 'POST',
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'X-Company-ID': companyId || '',
        },
        body: formData,
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Import failed');
    }
    return res.json();
};

export const importTransactions = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('authToken');
    const companyId = localStorage.getItem('activeCompanyId');
    const res = await fetch(`${API_BASE_URL}/transactions/import`, {
        method: 'POST',
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'X-Company-ID': companyId || '',
        },
        body: formData,
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Import failed');
    }
    return res.json();
};

export const importItems = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('authToken');
    const companyId = localStorage.getItem('activeCompanyId');
    const res = await fetch(`${API_BASE_URL}/items/import`, {
        method: 'POST',
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'X-Company-ID': companyId || '',
        },
        body: formData,
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Import failed');
    }
    return res.json();
};
export const saveTimeEntry = (entry: any) => post('time-entries', entry);
export const saveMileageEntry = (entry: any) => post('mileage-entries', entry);
export const savePriceLevel = (level: any) => post('price-levels', level);
export const saveSalesTaxCode = (code: any) => post('sales-tax-codes', code);
export const saveBudget = (budget: any) => post('budgets', budget);
export const saveMemorizedReport = (report: any) => post('memorized-reports', report);
export const deleteMemorizedReport = (id: string) => remove(`memorized-reports/${id}`);
export const saveLiability = (liability: any) => post('liabilities', liability);
export const saveCurrency = (currency: any) => post('currencies', currency);
export const saveFixedAsset = (asset: any) => post('fixed-assets', asset);
export const saveRecurringTemplate = (template: any) => post('recurring-templates', template);
export const deleteRecurringTemplate = (id: string) => remove(`recurring-templates/${id}`);
export const fetchBankFeeds = () => get('bank-feeds');
export const saveBankFeed = (feed: any) => post('bank-feeds', feed);
export const deleteBankFeed = (id: string) => remove(`bank-feeds/${id}`);
export const bulkDeleteBankFeeds = (ids: string[]) => post('bank-feeds/bulk-delete', { ids });
export const deleteAllExcludedBankFeeds = () => post('bank-feeds/delete-all-excluded', {});
export const uploadBankFeedAttachment = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('attachment', file);
    const token = localStorage.getItem('authToken');
    const companyId = localStorage.getItem('activeCompanyId');
    const res = await fetch(`${API_BASE_URL}/bank-feeds/${id}/attachments`, {
        method: 'POST',
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'X-Company-ID': companyId || '',
        },
        body: formData,
    });
    if (!res.ok) throw new Error('Attachment upload failed');
    return res.json();
};

export const deleteBankFeedAttachment = async (id: string, fileName: string) => {
    const token = localStorage.getItem('authToken');
    const companyId = localStorage.getItem('activeCompanyId');
    const res = await fetch(`${API_BASE_URL}/bank-feeds/${id}/attachments`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'X-Company-ID': companyId || '',
        },
        body: JSON.stringify({ fileName }),
    });
    if (!res.ok) throw new Error('Attachment deletion failed');
    return res.json();
};

export const uploadBankFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('authToken');
    const companyId = localStorage.getItem('activeCompanyId');
    const res = await fetch(`${API_BASE_URL}/bank-feeds/upload`, {
        method: 'POST',
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'X-Company-ID': companyId || '',
        },
        body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
};

export const processBankImport = (data: { mapping: any; bankAccountId: string; rows: any[] }) => post('bank-feeds/process', data);

export const categorizeBankTransaction = (data: {
    transactionId: string;
    categoryId?: string;
    action: 'ADD' | 'EXCLUDE' | 'TRANSFER' | 'MATCH';
    entityId?: string;
    toAccountId?: string;
}) => post('bank-feeds/categorize', data);

export const condenseData = (cutoffDate: string) => post('utilities/condense', { cutoffDate });
export const verifyIntegrity = () => get('utilities/verify-integrity');
export const rebuildIndexes = () => post('utilities/rebuild-indexes', {});
export const exportCompanyData = async (): Promise<void> => {
    const headers = getHeaders();
    const res = await fetch(`${API_BASE_URL}/utilities/export`, { headers });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const contentDisposition = res.headers.get('Content-Disposition') || '';
    const match = contentDisposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : `qbxpress_export_${Date.now()}.json`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};
export const fetchAvailableLots = (itemId: string, warehouseId?: string) =>
    get(`inventory/lots/${itemId}${warehouseId ? `?warehouseId=${warehouseId}` : ''}`);

export const assignLot = (itemId: string, data: { lotNumber: string; quantity: number; unitCost?: number; expirationDate?: string; manufacturingDate?: string; warehouseId?: string; notes?: string; vendorName?: string }) =>
    post(`inventory/lots/${itemId}/assign`, data);

// QB Enterprise: lot expiration alerts — lots expiring within N days
export const fetchExpiringLots = (days: number = 30) =>
    get(`inventory/lots/expiring-soon?days=${days}`);

// Serial Numbers
export const fetchSerialNumbers = (itemId: string, status?: string) =>
    get(`inventory/serials/${itemId}${status ? `?status=${status}` : ''}`);
export const createSerialNumbers = (itemId: string, data: { serialNumbers: string[]; unitCost?: number; dateReceived?: string; purchaseOrderId?: string; receiptId?: string; vendorName?: string; warehouseId?: string; binLocation?: string; lotNumber?: string; notes?: string }) =>
    post(`inventory/serials/${itemId}/batch`, data);
export const fetchSerialHistory = (serialNumber: string) =>
    get(`inventory/serials/history/${encodeURIComponent(serialNumber)}`);

// Lot traceability
export const fetchLotForwardTrace = (lotNumber: string) =>
    get(`inventory/lots/trace/forward/${encodeURIComponent(lotNumber)}`);
export const fetchLotBackwardTrace = (lotNumber: string) =>
    get(`inventory/lots/trace/backward/${encodeURIComponent(lotNumber)}`);
export const fetchLotDetails = (lotNumber: string) =>
    get(`inventory/lots/details/${encodeURIComponent(lotNumber)}`);

// QC workflow
export const fetchLotsForQC = (status?: string, itemId?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (itemId) params.set('itemId', itemId);
    const qs = params.toString();
    return get(`inventory/lots/qc${qs ? '?' + qs : ''}`);
};
export const quarantineLot = (lotId: string, reason: string, status: 'on-hold' | 'quarantine' = 'quarantine') =>
    post(`inventory/lots/${lotId}/quarantine`, { reason, status });
export const releaseLot = (lotId: string, notes: string, releasedBy?: string) =>
    post(`inventory/lots/${lotId}/release`, { notes, releasedBy });

export const fetchReport = async (type: string, params: any = {}) => {
    const query = new URLSearchParams(params).toString();
    const path = `reports/${type}${query ? '?' + query : ''}`;
    return get(path);
};

export const addCustomColumn = (data: { reportType: string; columnName: string; formula: string }) => post('reports/custom-columns', data);
export const updateCustomColumn = (data: { reportType: string; columnName: string; formula: string }) => put('reports/custom-columns', data);
export const fetchCustomColumns = (reportType: string) => get(`reports/custom-columns?reportType=${reportType}`);
export const deleteCustomColumn = (id: string) => remove(`reports/custom-columns/${id}`);

// ── Carrier API ───────────────────────────────────────────────────────────────

export interface CarrierPackage {
    weight: number;
    weightUnit: 'lb' | 'kg';
    length: number;
    width: number;
    height: number;
    dimUnit: 'in' | 'cm';
}

export interface CarrierRate {
    carrier: string;
    serviceCode: string;
    serviceName: string;
    totalCharges: number;
    currency: string;
    deliveryDays: number | null;
    deliveryDate: string | null;
}

export interface CarrierRatesResponse {
    results: Record<string, CarrierRate[]>;
    allRates: CarrierRate[];
    errors: Record<string, string>;
    configuredCarriers: string[];
    message?: string;
}

export interface CarrierTrackingEvent {
    timestamp: string;
    description: string;
    location: string;
}

export interface CarrierTrackingResult {
    status: string;
    statusCode: string;
    estimatedDelivery: string | null;
    events: CarrierTrackingEvent[];
}

/** Get live shipping rates from configured carrier APIs */
export const fetchCarrierRates = (payload: {
    carriers?: string[];
    originZip: string;
    destZip: string;
    destCountry?: string;
    packages: CarrierPackage[];
}): Promise<CarrierRatesResponse> => post('carrier/rates', payload);

/** Look up live tracking status for a shipment */
export const fetchCarrierTracking = (carrier: string, trackingNumber: string): Promise<CarrierTrackingResult> =>
    get(`carrier/track/${encodeURIComponent(carrier)}/${encodeURIComponent(trackingNumber)}`);

/** Validate tracking number format (no external API call) */
export const validateCarrierTracking = (carrier: string, trackingNumber: string): Promise<{ valid: boolean; error?: string }> =>
    get(`carrier/validate/${encodeURIComponent(carrier)}/${encodeURIComponent(trackingNumber)}`);

/** Check which carrier APIs are configured on the server */
export const fetchCarrierStatus = (): Promise<{ status: Array<{ carrier: string; apiEnabled: boolean; apiSupported: boolean }>; sandbox: boolean }> =>
    get('carrier/status');

// Legacy support
export const fetchStore = fetchFullStore;
export const saveStore = async (store: AppStore) => {
    // This is the old way, but we can map it to granular updates for now if we want to avoid breaking App.tsx immediately
    console.warn('saveStore is deprecated. Use syncEntity for specific updates.');
};

// ── Warehouse API ────────────────────────────────────────────────────────────
export const fetchWarehouses = () => get('warehouses');
export const createWarehouse = (data: any) => post('warehouses', data);
export const updateWarehouse = (id: string, data: any) => put(`warehouses/${id}`, data);
export const deleteWarehouse = (id: string) => remove(`warehouses/${id}`);
export const fetchWarehouseInventorySnapshot = () => get('warehouses/inventory-snapshot');
export const fetchTransferHistory = (params?: { warehouseId?: string; itemId?: string; fromDate?: string; toDate?: string }) => {
    const qs = params ? '?' + Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&') : '';
    return get(`warehouses/transfer-history${qs}`);
};
export const transferWarehouseStock = (data: {
    itemId: string;
    fromWarehouseId: string;
    fromBinId?: string;
    toWarehouseId: string;
    toBinId?: string;
    quantity: number;
    lotNumber?: string;
}) => post('warehouses/transfer', data);

// ── Bin API ──────────────────────────────────────────────────────────────────
export const fetchBins = (warehouseId?: string) =>
    get(`bins${warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : ''}`);
export const createBin = (data: any) => post('bins', data);
export const updateBin = (id: string, data: any) => put(`bins/${id}`, data);
export const deleteBin = (id: string) => remove(`bins/${id}`);
export const fetchBinInventorySnapshot = (warehouseId?: string) =>
    get(`bins/inventory-snapshot${warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : ''}`);
export const transferBinStock = (data: {
    itemId: string;
    fromWarehouseId: string;
    fromBinId?: string;
    toWarehouseId: string;
    toBinId?: string;
    quantity: number;
    lotNumber?: string;
}) => post('bins/transfer', data);

// ── User Management (Admin only) ─────────────────────────────────────────────
export const fetchUsers = () => get('users');
export const createUser = (data: { username: string; email: string; password: string; role?: string }) => post('users', data);
export const updateUser = (id: string, data: { role?: string; username?: string; email?: string }) => put(`users/${id}`, data);
export const resetUserPassword = (id: string, password: string) => put(`users/${id}/password`, { password });
export const deleteUser = (id: string) => remove(`users/${id}`);

export const sendEmail = async (formData: FormData) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE_URL}/email/send-pdf`, {
        method: 'POST',
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
    });
    if (!res.ok) throw new Error('Failed to send email');
    return res.json();
};
