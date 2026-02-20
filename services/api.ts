import { AppStore } from '../types';

/** Single source of truth: from env VITE_API_URL so frontend and server connect in deployed env */
export const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';

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
        throw new Error(errorData.message || errorData.error || `Save failed: ${path}`);
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
            liabilities, customFields, currencies, auditLogs, fixedAssets, settings
        ] = await Promise.all([
            get('accounts'), get('customers'), get('vendors'), get('transactions'), get('items'),
            get('employees'), get('leads'), get('classes'), get('sales-reps'), get('terms'),
            get('time-entries'), get('mileage-entries'), get('price-levels'), get('sales-tax-codes'),
            get('budgets'), get('memorized-reports'), get('liabilities'), get('custom-fields'),
            get('currencies'), get('audit-logs'), get('fixed-assets'), get('settings')
        ]);

        return {
            accounts, customers, vendors,
            transactions: transactions.items || transactions,
            items, employees, leads, classes, salesReps, terms,
            timeEntries, mileageEntries, priceLevels, salesTaxCodes, budgets, memorizedReports,
            liabilities, customFields, currencies,
            auditLogs: auditLogs.items || auditLogs,
            fixedAssets,
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

export const saveTransaction = async (tx: any, userRole: string = 'Admin') => {
    try {
        const res = await fetch(`${API_BASE_URL}/transactions`, {
            method: 'POST',
            headers: {
                ...getHeaders(),
                'X-User-Role': userRole
            },
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

export const saveCustomer = (customer: any) => post('customers', customer);
export const saveVendor = (vendor: any) => post('vendors', vendor);
export const saveEmployee = (employee: any) => post('employees', employee);
export const saveItem = (item: any) => post('items', item);
export const saveAccount = (account: any) => post('accounts', account);
export const saveLead = (lead: any) => post('leads', lead);
export const saveClass = (cls: any) => post('classes', cls);
export const saveSalesRep = (rep: any) => post('sales-reps', rep);
export const saveTerm = (term: any) => post('terms', term);
export const deleteTerm = (id: string) => remove(`terms/${id}`);
export const saveTimeEntry = (entry: any) => post('time-entries', entry);
export const saveMileageEntry = (entry: any) => post('mileage-entries', entry);
export const savePriceLevel = (level: any) => post('price-levels', level);
export const saveSalesTaxCode = (code: any) => post('sales-tax-codes', code);
export const saveBudget = (budget: any) => post('budgets', budget);
export const saveMemorizedReport = (report: any) => post('memorized-reports', report);
export const saveLiability = (liability: any) => post('liabilities', liability);
export const saveCurrency = (currency: any) => post('currencies', currency);
export const saveFixedAsset = (asset: any) => post('fixed-assets', asset);
export const saveRecurringTemplate = (template: any) => post('recurring-templates', template);
export const deleteRecurringTemplate = (id: string) => remove(`recurring-templates/${id}`);
export const fetchBankFeeds = () => get('bank-feeds');
export const saveBankFeed = (feed: any) => post('bank-feeds', feed);
export const deleteBankFeed = (id: string) => remove(`bank-feeds/${id}`);
export const condenseData = (cutoffDate: string) => post('utilities/condense', { cutoffDate });
export const fetchAvailableLots = (itemId: string) => get(`inventory/lots/${itemId}`);

export const fetchReport = async (type: string, params: any = {}) => {
    const query = new URLSearchParams(params).toString();
    const path = `reports/${type}${query ? '?' + query : ''}`;
    return get(path);
};

// Legacy support
export const fetchStore = fetchFullStore;
export const saveStore = async (store: AppStore) => {
    // This is the old way, but we can map it to granular updates for now if we want to avoid breaking App.tsx immediately
    console.warn('saveStore is deprecated. Use syncEntity for specific updates.');
};

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
