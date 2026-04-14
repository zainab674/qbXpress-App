import React, { useState, useEffect } from 'react';
import { ViewState, AppWindow, UIPreferences, Item, Customer, Vendor, Lead, Transaction, QBClass, PriceLevel, Term, SalesTaxCode, MileageEntry, FixedAsset } from './types';
import { INITIAL_DATA } from './store';
import PreferencesDialog from './components/PreferencesDialog';
import EntityForm from './components/EntityForm';
import ItemForm from './components/ItemForm';
import ReorderItemsDialog from './components/ReorderItemsDialog';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import ShortcutModal from './components/ShortcutModal';
import IconBar from './components/IconBar';
import { WindowRenderer } from './components/WindowRenderer';
import { AppMenu } from './components/AppMenu';
import { OpenWindowTabBar } from './components/OpenWindowTabBar';
import ErrorBoundary from './components/ErrorBoundary';
import SetupWizard from './components/SetupWizard';
import PrinterSetupDialog from './components/PrinterSetupDialog';
import CompanyFileDialog from './components/CompanyFileDialog';
import CondenseDataDialog from './components/CondenseDataDialog';
import PrintFormsDialog from './components/PrintFormsDialog';
import { useWindow } from './contexts/WindowContext';
import { useData } from './contexts/DataContext';
import { useDialog } from './contexts/DialogContext';
import HomePage from './components/HomePage';
import PayrollConnect from './components/PayrollConnect';
import * as api from './services/api';
import { API_BASE_URL } from './services/api';

const XIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const LayoutIcon = ({ size = 48, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
);

const App: React.FC = () => {
  const { openWindows, activeWindowId, currentView, setCurrentView, focusWindow, openNewWindow, closeWindow, setOpenWindows } = useWindow();
  const {
    accounts, customers, vendors, employees, items, transactions, timeEntries, liabilities, memorizedReports, leads, budgets,
    paymentMethods, salesTaxCodes, priceLevels, terms, customerMessages, shortcuts, shortcutGroups, classes, salesReps, shipVia,
    mileageEntries, currencies, exchangeRates, auditLogs, fixedAssets, vehicles, uoms, uomSets, customFields, customerTypes, vendorTypes, vendorCreditCategories, customerCreditCategories, itemCategories, companyConfig, uiPrefs, homePrefs, accPrefs, billPrefs, checkingPrefs, userRole, closingDate,
    isLoaded, companies, activeCompanyId, switchCompany, refreshData, bankFeeds, handleSaveTransaction, handleDeleteTransaction, handleSaveCustomer, handleSaveVendor, handleSaveEmployee, handleSaveAccount, handleSaveItem,
    handleSaveLead, handleSaveClass, handleSavePriceLevel, handleSaveTerm, handleDeleteTerm, handleSaveVehicle, handleDeleteVehicle, handleSaveSalesTaxCode, handleSaveMileageEntry, handleUpdateReps, handleUpdateShipVia, handleUpdateUOMs, handleSaveUOMSet, handleDeleteUOMSet, handleSaveBudget, handleSaveFixedAsset, handleSaveTimeEntries, handleSaveMemorizedReports, handleDeleteMemorizedReport, handleSaveExchangeRates, handleSaveCurrency, handleSaveSettings, handleCreateNewCompany,
    setCompanyConfig, setUiPrefs, setAccPrefs, setHomePrefs, setBillPrefs, setCheckingPrefs, setUserRole, setClosingDate, setShortcutGroups, setShortcuts, setCustomerMessages, setPaymentMethods, onUpdateVendorCreditCategories, onUpdateCustomerCreditCategories, onUpdateItemCategories
  } = useData();
  const { showAlert, showConfirm } = useDialog();


  // Modal states removed - now managed via window system
  const [condenseOpen, setCondenseOpen] = useState(false);

  const [activeRoute, setActiveRoute] = useState<{ type: ViewState, title: string, params?: any }>({ type: 'HOME', title: 'Dashboard' });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      if (!['LANDING', 'LOGIN', 'SIGNUP'].includes(currentView)) setCurrentView('LANDING');
    }
  }, [currentView, setCurrentView]);

  const handleLogOut = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('activeCompanyId');
    localStorage.removeItem('openWindows');
    localStorage.removeItem('currentView');
    setCurrentView('LANDING');
    setOpenWindows([]);
  };



  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event: any) => {
          try {
            const data = JSON.parse(event.target.result);
            showAlert(`Starting import of ${file.name}...`);
            if (data.customers) for (const c of data.customers) await api.saveCustomer(c);
            if (data.vendors) for (const v of data.vendors) await api.saveVendor(v);
            if (data.items) for (const i of data.items) await api.saveItem(i);
            if (data.transactions) await api.saveTransaction(data.transactions, userRole);
            showAlert("Import completed successfully!", "Success");
            refreshData();
          } catch (error) {
            showAlert("Import failed. Check file format.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const navigateTo = (type: ViewState, title: string, params?: any) => {
    if (type === 'HOME') {
      setCurrentView('HOME');
      // For HOME, we don't necessarily need a "window" if it's the dashboard background, 
      // but the user wants tabs, so let's see. 
      // In many systems, Home is just a tab. 
      // Let's keep HOME as a special state or just a window.
      // If we want it like tabs, openNewWindow('HOME', 'Dashboard') might be better.
    }
    openNewWindow(type, title, params);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        let handled = true;
        const key = e.key.toLowerCase();

        switch (key) {
          case 'i': navigateTo('INVOICE_CENTER', 'Invoices'); break;
          case 'j': navigateTo('CUSTOMER_CENTER', 'Customer Center'); break;
          case 'b': navigateTo('BILL', 'Enter Bills'); break;
          case 'w': navigateTo('BANKING', 'Write Checks'); break;
          case 'a': navigateTo('CHART_OF_ACCOUNTS', 'Chart of Accounts'); break;

          case 'r': navigateTo('ACCOUNT_REGISTER', 'Register'); break;
          case 'v': if (e.shiftKey) navigateTo('VENDOR_CENTER', 'Vendor Center'); else handled = false; break;
          case 'e': if (e.shiftKey) navigateTo('EMPLOYEE_CENTER', 'Employee Center'); else handled = false; break;
          case 'm': if (e.shiftKey) navigateTo('REPORTS_CENTER', 'Reports Center'); else handled = false; break;
          default: handled = false;
        }

        if (handled) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateTo]);

  const fsBody = uiPrefs.fontSizes?.body ?? 12;
  const fsScale = fsBody / 12;

  // Drive the global --fs-scale CSS variable — all text classes in index.css
  // use calc(originalPx * var(--fs-scale)) so no component needs editing.
  useEffect(() => {
    document.documentElement.style.setProperty('--fs-scale', String(fsScale));
  }, [fsScale]);

  const windowHandlers = {
    onOpenWindow: navigateTo,
    onCloseWindow: (id: string) => closeWindow(id),
    onSaveTransaction: handleSaveTransaction,
    onDeleteTransaction: async (id: string) => {
      const confirmed = await showConfirm?.("Are you sure you want to delete this transaction?", "Confirm Delete");
      if (confirmed) {
        await handleDeleteTransaction(id);
        navigateTo('HOME', 'Dashboard');
      }
    },
    onSaveInventoryAdjustment: async (adj: any) => { await handleSaveTransaction(adj); },
    onReconcileFinish: async (accId: string, txIds: Set<string>) => {
      const toUpdate = transactions.filter(t => txIds.has(t.id) && t.status !== 'CLEARED');
      await Promise.all(toUpdate.map(t => handleSaveTransaction({ ...t, status: 'CLEARED' })));
      refreshData();
      navigateTo('HOME', 'Dashboard');
    },
    onUpdateCustomers: async (c: Customer[]) => { const changed = c.find(curr => { const old = customers.find(o => o.id === curr.id); return !old || JSON.stringify(old) !== JSON.stringify(curr); }); if (changed) await handleSaveCustomer(changed); },
    onUpdateVendors: async (v: Vendor[]) => { const changed = v.find(curr => { const old = vendors.find(o => o.id === curr.id); return !old || JSON.stringify(old) !== JSON.stringify(curr); }); if (changed) await handleSaveVendor(changed); },
    onUpdateEmployees: async (e: any[]) => { const changed = e.find(curr => { const old = employees.find(o => o.id === curr.id); return !old || JSON.stringify(old) !== JSON.stringify(curr); }); if (changed) await handleSaveEmployee(changed); },
    onUpdateItems: async (i: Item[]) => { const changed = i.find(curr => { const old = items.find(o => o.id === curr.id); return !old || JSON.stringify(old) !== JSON.stringify(curr); }); if (changed) await handleSaveItem(changed); },
    onUpdateAccounts: async (a: any[]) => { const changed = a.find(curr => { const old = accounts.find(o => o.id === curr.id); return !old || JSON.stringify(old) !== JSON.stringify(curr); }); if (changed) await handleSaveAccount(changed); },
    onUpdateLeads: async (l: Lead[]) => { const changed = l.find(curr => { const old = leads.find(o => o.id === curr.id); return !old || JSON.stringify(old) !== JSON.stringify(curr); }); if (changed) await handleSaveLead(changed); },
    onUpdateFixedAssets: async (a: FixedAsset[]) => { const changed = a.find(curr => { const old = fixedAssets.find(o => o.id === curr.id); return !old || JSON.stringify(old) !== JSON.stringify(curr); }); if (changed) await handleSaveFixedAsset(changed); },
    onUpdateClasses: async (c: QBClass[]) => {
      try {
        const changed = c.find(curr => {
          const old = classes.find(o => o.id === curr.id);
          return !old || JSON.stringify(old) !== JSON.stringify(curr);
        });
        if (changed) await handleSaveClass(changed);
      } catch (err: any) {
        showAlert(err.message || "Failed to save class", "Class Error");
      }
    },
    onUpdatePriceLevels: async (l: PriceLevel[]) => {
      try {
        const changed = l.find(curr => {
          const old = priceLevels.find(o => o.id === curr.id);
          return !old || JSON.stringify(old) !== JSON.stringify(curr);
        });
        if (changed) await handleSavePriceLevel(changed);
      } catch (err: any) {
        showAlert(err.message || "Failed to save price level", "Price Level Error");
      }
    },
    onUpdateTerms: async (t: Term[]) => {
      try {
        const deleted = terms.find(old => !t.find(curr => curr.id === old.id));
        if (deleted) {
          await handleDeleteTerm(deleted.id);
          return;
        }

        const changed = t.find(curr => {
          const old = terms.find(o => o.id === curr.id);
          return !old || JSON.stringify(old) !== JSON.stringify(curr);
        });
        if (changed) await handleSaveTerm(changed);
      } catch (err: any) {
        showAlert(err.message || "Failed to update term", "Terms Error");
      }
    },
    onUpdateSalesTaxCodes: async (c: any[]) => {
      try {
        const changed = c.find(curr => {
          const old = salesTaxCodes.find(o => o.id === curr.id);
          return !old || JSON.stringify(old) !== JSON.stringify(curr);
        });
        if (changed) await handleSaveSalesTaxCode(changed);
      } catch (err: any) {
        showAlert(err.message || "Failed to save tax code", "Sales Tax Error");
      }
    },
    onUpdatePaymentMethods: setPaymentMethods,
    onUpdateCustomerMessages: setCustomerMessages,
    onUpdateReps: (reps: any[]) => handleUpdateReps(reps),
    onUpdateShipVia: (sv: any[]) => handleUpdateShipVia(sv),
    onUpdateUOMs: (u: any[]) => handleUpdateUOMs(u),
    onSaveUOMSet: handleSaveUOMSet,
    onDeleteUOMSet: handleDeleteUOMSet,
    onSaveBudget: handleSaveBudget,
    onUpdateVehicle: handleSaveVehicle,
    onDeleteVehicle: handleDeleteVehicle,
    onUpdateRates: (r: any[]) => handleSaveExchangeRates(r),
    onReportDrillDown: (id: string, context: string) => {
      if (['P&L', 'BS', 'AGING', 'SALES_ITEM', 'INV_VAL'].includes(context)) {
        navigateTo('GENERAL_LEDGER', `GL: ${id}`, { accountId: id });
      } else if (context === 'GL') {
        const tx = transactions.find(t => t.id === id);
        if (tx) navigateTo(tx.type as any, `${tx.type} #${tx.refNo}`, { transactionId: id });
      } else if (context === 'AP_AGING') {
        navigateTo('GENERAL_LEDGER', `GL: ${id}`, { vendorId: id });
      }
    },
    onOpenForm: (type: 'CUSTOMER' | 'VENDOR' | 'EMPLOYEE', initialData?: any) => {
      const title = (initialData ? 'Edit ' : 'New ') + type.charAt(0) + type.slice(1).toLowerCase();
      navigateTo('ENTITY_FORM', title, { type, initialData });
    },
    onOpenItemForm: (initialData?: Item) => {
      const title = (initialData ? 'Edit ' : 'New ') + 'Item';
      navigateTo('ITEM_FORM', title, { initialData });
    },
    onShowReorderDialog: () => navigateTo('REORDER_ITEMS', 'Reorder Items'),
    onShowPrinterSetup: () => navigateTo('PRINTER_SETUP', 'Printer Setup'),
    onShowSetupWizard: () => navigateTo('SETUP_WIZARD', 'Setup Wizard'),
    onShowCompanyFile: (mode: 'OPEN' | 'PREVIOUS') => navigateTo('COMPANY_FILE', 'Company File', { mode }),
    onShowShortcutModal: () => navigateTo('SHORTCUT_MODAL', 'Add Shortcut'),
    onUpdateMileage: async (e: any) => {
      try {
        await handleSaveMileageEntry(e);
      } catch (err: any) {
        showAlert(err.message || "Failed to save mileage entry", "Mileage Error");
      }
    },
    onSaveSalesTaxAdjustment: (adj: any) => {
      handleSaveTransaction({ id: crypto.randomUUID(), type: 'TAX_ADJUSTMENT', date: adj.date, refNo: 'ADJ', entityId: 'Tax Board', bankAccountId: adj.account, total: adj.amount, status: 'CLEARED', items: [] } as any);
    },
    onConvertToCustomer: (lead: Lead) => {
      const newCust: Customer = { id: crypto.randomUUID(), name: lead.name, companyName: lead.companyName, email: lead.email, phone: lead.phone, balance: 0, address: lead.address, isActive: true, jobs: [], contacts: [], notes: [] };
      handleSaveCustomer(newCust).then(() => {
        // Delete the lead from backend
        fetch(`${API_BASE_URL}/leads/${lead.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'X-Company-ID': localStorage.getItem('activeCompanyId') || ''
          }
        }).then(() => {
          refreshData();
          navigateTo('CUSTOMER_CENTER', 'Customer Center');
        });
      });
    },
    setCompanyConfig, handleCreateNewCompany, setTimeEntries: handleSaveTimeEntries, setMemorizedReports: handleSaveMemorizedReports, onDeleteReport: handleDeleteMemorizedReport, handleSaveCurrency, showAlert,
    switchCompany, companies, refreshData, setShortcuts, setShortcutGroups, existingGroups: shortcutGroups,
    handleSaveCustomer, handleSaveVendor, handleSaveEmployee, handleSaveItem,
    onUpdateVendorCreditCategories,
    onUpdateCustomerCreditCategories,
    onUpdateItemCategories,
    setUiPrefs, setAccPrefs, setHomePrefs, setBillPrefs, setCheckingPrefs, setUserRole, setClosingDate
  };

  const windowData = {
    accounts, customers, vendors, employees, items, transactions, timeEntries, liabilities, memorizedReports, leads, budgets,
    paymentMethods, salesTaxCodes, priceLevels, terms, customerMessages, classes, salesReps, mileageEntries, currencies, exchangeRates,
    auditLogs, fixedAssets, vehicles, uoms, uomSets, companyConfig, homePrefs, shipVia, customFields, customerTypes, vendorTypes,
    vendorCreditCategories, customerCreditCategories, itemCategories, uiPrefs, accPrefs, billPrefs, checkingPrefs, userRole, closingDate,
    bankFeeds
  };

  // PRIORITY ROUTE: Payroll Connect (must come before LANDING/LOGIN checks)
  const isPayrollConnect =
    window.location.pathname.includes('payroll-connect') ||
    window.location.search.includes('callback=');

  if (isPayrollConnect) {
    return <PayrollConnect />;
  }

  if (currentView === 'LANDING') return (
    <LandingPage
      onLogin={() => setCurrentView('LOGIN')}
      onGetStarted={() => setCurrentView('SIGNUP')}
      onLaunchApp={() => setCurrentView('HOME')}
    />
  );
  if (currentView === 'LOGIN' || currentView === 'SIGNUP') return (
    <AuthPage
      initialMode={currentView === 'SIGNUP' ? 'signup' : 'login'}
      onLoginSuccess={() => refreshData().then(() => setCurrentView('HOME'))}
      onSignupSuccess={() => refreshData().then(() => {
        setCurrentView('HOME');
        navigateTo('SETUP_WIZARD', 'Setup Wizard');
      })}
      onBackToLanding={() => setCurrentView('LANDING')}
    />
  );


  if (!isLoaded && !['LANDING', 'LOGIN', 'SIGNUP'].includes(currentView)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#54738c] text-white">
        <div className="text-center font-black animate-pulse uppercase tracking-[0.3em] text-sm">
          Loading Company Data...
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden text-gray-900 bg-[#54738c] font-sans">
        {/* DEBUG MARKER: v2.0.1 */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
          <AppMenu
            companies={companies}
            activeCompanyId={activeCompanyId}
            onSwitchCompany={switchCompany}
            handlers={{
            onOpenWindow: navigateTo, onLogOut: handleLogOut, onImport: handleImport,
            setShowPrefs: () => navigateTo('PREFERENCES', 'Preferences'),
            onBackup: async () => {
              try {
                const token = localStorage.getItem('authToken');
                const companyId = localStorage.getItem('activeCompanyId');
                const res = await fetch(`${API_BASE_URL}/backup/create`, {
                  method: 'POST',
                  headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'X-Company-ID': companyId || '',
                  },
                });
                if (!res.ok) throw new Error((await res.json()).message || 'Backup failed');
                const data = await res.json();
                const counts = Object.entries(data.recordCounts).map(([k, v]) => `${k}: ${v}`).join(', ');
                showAlert(`Backup created successfully.\n\nFile: ${data.filename}\n${counts}`, "Back Up Company");
              } catch (err: any) {
                showAlert(err.message || 'Backup failed. Please try again.', 'Backup Error');
              }
            },
            onVerify: async () => {
              try {
                const result = await api.verifyIntegrity();
                if (result.issueCount === 0) {
                  showAlert('QuickBooks found no problems with your data.', 'Verify Data');
                } else {
                  const lines = result.issues.map((i: any) =>
                    `• [${i.severity.toUpperCase()}] ${i.type}: ${typeof i.details === 'string' ? i.details : `${i.count} record(s)`}`
                  ).join('\n');
                  showAlert(`Found ${result.issueCount} issue(s):\n\n${lines}`, 'Verify Data');
                }
              } catch (err: any) {
                showAlert(err.message || 'Verification failed.', 'Verify Error');
              }
            },
            onRebuild: async () => {
              const confirmed = await showConfirm?.('Rebuild will re-create all database indexes. This may take a moment. Continue?', 'Rebuild Data');
              if (!confirmed) return;
              try {
                const result = await api.rebuildIndexes();
                await refreshData();
                showAlert(`Rebuild complete in ${result.durationMs}ms.\n${result.succeeded} index group(s) rebuilt.${result.failed > 0 ? `\n${result.failed} failed (check server logs).` : ''}`, 'Rebuild Data');
              } catch (err: any) {
                showAlert(err.message || 'Rebuild failed.', 'Rebuild Error');
              }
            },
            onCondense: () => setCondenseOpen(true),
            onNewCompany: () => navigateTo('SETUP_WIZARD', 'Setup Wizard'),
            onOpenCompany: () => navigateTo('COMPANY_FILE', 'Open Company', { mode: 'OPEN' }),
            onOpenPrevious: () => navigateTo('COMPANY_FILE', 'Open Previous', { mode: 'PREVIOUS' }),
            onCreateCopy: () => showAlert("Choose copy type: \n- Portable Company File\n- Accountant's Copy\n- Backup Copy\n\n(Feature available in Pro version)", "Create Copy"),
            onExport: async () => {
              try {
                await api.exportCompanyData();
                showAlert('All company data exported to your downloads folder.', 'Export Complete');
              } catch (err: any) {
                showAlert(err.message || 'Export failed. Please try again.', 'Export Error');
              }
            },
            onPrintForms: () => navigateTo('GENERAL_LEDGER', 'Print Forms'), // Fallback to list for now
            onPrinterSetup: () => navigateTo('PRINTER_SETUP', 'Printer Setup'),
            onExit: () => showConfirm("Are you sure you want to exit the application?", () => { window.close(); showAlert("Application closed.", "Exit"); })
          }} />

          {uiPrefs.showIconBar && (
            <IconBar
              onAction={(v, t) => navigateTo(v, t)}
              onLogOut={handleLogOut}
              onShortcuts={() => navigateTo('SHORTCUT_MODAL', 'Add Shortcut')}
            />
          )}

          <OpenWindowTabBar
            openWindows={openWindows}
            activeWindowId={activeWindowId}
            onFocus={focusWindow}
            onClose={closeWindow}
            onOpenHome={() => setCurrentView('HOME')}
          />

          <main className="flex-1 relative bg-[#ccd6e0] overflow-hidden">
            <div className="absolute inset-0 overflow-auto">
              {currentView === 'HOME' ? (
                <div className="h-full">
                  <HomePage
                    transactions={transactions}
                    accounts={accounts}
                    onOpenWindow={navigateTo}
                    prefs={homePrefs}
                  />
                </div>
              ) : (
                <>
                  {openWindows.map(win => (
                    <div
                      key={win.id}
                      className={`absolute inset-0 transition-opacity duration-200 ${win.id === activeWindowId ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                    >
                      <div className="h-full w-full bg-white rounded-t-lg shadow-lg border border-gray-300 flex flex-col">
                        <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center bg-[#f0f2f5]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700 text-sm">{win.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => closeWindow(win.id)}
                              className="p-1 hover:bg-red-500 hover:text-white rounded transition-colors"
                            >
                              <XIcon size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-white">
                          <WindowRenderer
                            win={win}
                            data={windowData}
                            handlers={windowHandlers}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {openWindows.length === 0 && (
                    <div className="max-w-7xl mx-auto h-full flex flex-col items-center justify-center text-gray-400">
                      <LayoutIcon size={48} className="mb-4 opacity-20" />
                      <p className="text-xl font-medium" >No active window</p>
                      <button
                        onClick={() => setCurrentView('HOME')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Go to Dashboard
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
      <CondenseDataDialog
        isOpen={condenseOpen}
        onClose={() => setCondenseOpen(false)}
        onCondense={async (cutoffDate: string) => {
          const result = await api.condenseData(cutoffDate);
          await refreshData();
          showAlert(`Condense complete. ${result.deletedCount} transaction(s) removed before ${cutoffDate}.`, 'Condense Data');
        }}
      />
    </ErrorBoundary>
  );
};

export default App;
