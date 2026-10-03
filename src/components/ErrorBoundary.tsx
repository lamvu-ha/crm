import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRM Uncaught Error Boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleResetAndReload = () => {
    try {
      localStorage.removeItem('crm_bds_is_logged_in_v1');
      localStorage.removeItem('crm_bds_current_user_v1');
      localStorage.removeItem('crm_bds_leads_v1');
      localStorage.removeItem('crm_bds_appointments_v1');
      localStorage.removeItem('crm_bds_sales_v1');
    } catch (e) {
      console.warn('Cannot clear localStorage', e);
    }
    window.location.reload();
  };

  private handleSoftReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-100">
          <div className="max-w-lg w-full bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-6 sm:p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Khôi Phục Giao Diện CRM SALEPRO HCM_E05
            </h1>

            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Hệ thống phát hiện xung đột dữ liệu tạm thời trong trình duyệt. Nhấn nút bên dưới để khôi phục phiên làm việc và vào thẳng bảng điều khiển:
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                ⚡ Làm Mới Bộ Nhớ & Vào Ngay
              </button>

              <button
                type="button"
                onClick={this.handleSoftReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-sm transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Tải Lại Trang
              </button>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 font-mono overflow-auto max-h-48">
                <p className="font-semibold text-rose-400 mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="whitespace-pre-wrap text-[10px] text-slate-400 mb-2">
                    {this.state.error.stack}
                  </pre>
                )}
                {this.state.errorInfo?.componentStack && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-amber-300">
                    <p className="font-bold mb-0.5">Component Stack:</p>
                    <pre className="whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Hệ thống CRM SALEPRO HCM_E05</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
