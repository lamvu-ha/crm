import React, { useState } from 'react';
import { 
  Sparkles, 
  Bot, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  Copy, 
  Check, 
  MessageSquare, 
  RefreshCw, 
  Target, 
  ShieldCheck, 
  Send,
  Zap,
  ArrowRight,
  UserCheck,
  Compass
} from 'lucide-react';
import { CustomerAnalysisResult, Lead } from '../types';
import { analyzeCustomerDemand } from '../services/aiCustomerAnalysisService';

interface CustomerAiAnalysisCardProps {
  lead: Lead;
  onUpdateLead: (updatedLead: Lead) => void;
  onOpenMessageModal?: (lead: Lead) => void;
}

export const CustomerAiAnalysisCard: React.FC<CustomerAiAnalysisCardProps> = ({
  lead,
  onUpdateLead,
  onOpenMessageModal
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [actionDone, setActionDone] = useState<Record<number, boolean>>({});

  const analysis: CustomerAnalysisResult | undefined = lead.aiAnalysis;

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeCustomerDemand(lead);
      const updatedLead: Lead = {
        ...lead,
        aiAnalysis: result
      };
      onUpdateLead(updatedLead);
    } catch (err) {
      console.error('Error analyzing customer demand:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyScript = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const getLevelBadge = (level: CustomerAnalysisResult['closingLevel'], prob: number) => {
    if (prob >= 80 || level === 'Rất cao') {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
        text: 'text-emerald-400',
        border: 'border-emerald-500/40',
        label: 'Khả năng chốt: RẤT CAO'
      };
    }
    if (prob >= 65 || level === 'Tiềm năng cao') {
      return {
        bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
        bar: 'bg-gradient-to-r from-blue-500 to-indigo-400',
        text: 'text-blue-400',
        border: 'border-blue-500/40',
        label: 'Khả năng chốt: TIỀM NĂNG CAO'
      };
    }
    if (prob >= 45 || level === 'Trung bình') {
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        bar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
        text: 'text-amber-400',
        border: 'border-amber-500/40',
        label: 'Khả năng chốt: TRUNG BÌNH'
      };
    }
    if (prob >= 25 || level === 'Cần nuôi dưỡng') {
      return {
        bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
        bar: 'bg-gradient-to-r from-orange-500 to-amber-500',
        text: 'text-orange-400',
        border: 'border-orange-500/40',
        label: 'Khả năng chốt: CẦN NUÔI DƯỠNG'
      };
    }
    return {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      bar: 'bg-gradient-to-r from-rose-500 to-pink-500',
      text: 'text-rose-400',
      border: 'border-rose-500/40',
      label: 'Khả năng chốt: NGUY CƠ TỪ CHỐI'
    };
  };

  return (
    <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 text-slate-100 shadow-xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0">
            <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                <span>Phân Tích Nhu Cầu & Khả Năng Chốt</span>
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Hệ thống AI tự động đọc hồ sơ, tài chính và toàn bộ lịch sử chăm sóc để đưa ra chiến thuật chốt khách
            </p>
          </div>
        </div>

        {/* Trigger button */}
        <button
          type="button"
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-98 transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Đang phân tích...' : analysis ? 'Phân tích lại với AI' : 'Bắt đầu phân tích AI'}</span>
        </button>
      </div>

      {/* Loading State */}
      {isAnalyzing && (
        <div className="py-8 text-center space-y-3 relative z-10 animate-in fade-in duration-200">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 animate-pulse">
            <Bot className="w-6 h-6 text-indigo-300" />
          </div>
          <p className="text-sm font-bold text-indigo-200">Gemini 3.8 Flash đang phân tích hồ sơ và lịch sử khách hàng...</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Đang tổng hợp nhu cầu phân khúc {lead.productType}, dự án {lead.project}, ngân sách {lead.budget || 'chưa ghi'}, và {lead.history?.length || 0} lần tương tác.
          </p>
        </div>
      )}

      {/* Empty State before first analysis */}
      {!analysis && !isAnalyzing && (
        <div className="py-6 text-center space-y-3 relative z-10">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
            <Compass className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h5 className="text-xs sm:text-sm font-bold text-slate-200">
              Chưa có phân tích nhu cầu chuyên sâu cho khách hàng này
            </h5>
            <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
              Bấm nút <strong>"Bắt đầu phân tích AI"</strong> để Gemini đọc toàn bộ dữ liệu, phân loại chân dung, tính tỷ lệ khả năng chốt và gợi ý các bước chăm sóc tiếp theo!
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunAnalysis}
            className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Phân tích ngay với Gemini AI</span>
          </button>
        </div>
      )}

      {/* Analysis Content Display */}
      {analysis && !isAnalyzing && (
        <div className="mt-4 space-y-4 relative z-10">
          {(() => {
            const badgeMeta = getLevelBadge(analysis.closingLevel, analysis.closingProbability);
            return (
              <>
                {/* Top Row: Closing Probability Gauge & Executive Summary */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                  {/* Gauge Card */}
                  <div className="md:col-span-4 bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Dự Báo Khả Năng Chốt</span>
                      </span>
                      <div className="flex items-baseline space-x-2 mt-1">
                        <span className="text-3xl font-black text-white">
                          {analysis.closingProbability}%
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeMeta.bg}`}>
                          {analysis.closingLevel}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="w-full bg-slate-700/80 h-2.5 rounded-full overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${badgeMeta.bar}`}
                          style={{ width: `${Math.max(5, Math.min(100, analysis.closingProbability))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold pt-0.5">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="md:col-span-8 bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-300 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>Tóm tắt khả năng chốt & chân dung khách hàng</span>
                      </span>
                      <p className="text-xs sm:text-[13px] text-slate-200 mt-1 font-medium leading-relaxed">
                        {analysis.closingSummary}
                      </p>
                    </div>

                    {analysis.customerPersona && (
                      <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2 text-xs text-indigo-200">
                        <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="font-semibold">{analysis.customerPersona}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Demands & Barriers Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Demands */}
                  <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/70 space-y-2">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Nhu Cầu Cốt Lõi Của Khách:</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {analysis.keyDemands?.map((d, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Barriers */}
                  <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/70 space-y-2">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Rào Cản / Điểm Đang Băn Khoăn:</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {analysis.barriersOrRisks?.map((b, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-400 font-bold">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Next Action Recommendations (Checklist) */}
                <div className="bg-gradient-to-br from-indigo-950/60 via-slate-800/70 to-slate-800/90 rounded-xl p-3.5 border border-indigo-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-300" />
                      <span>Gợi Ý Hướng Chăm Sóc Tiếp Theo (Action Plan):</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Bấm vào từng mục để đánh dấu hoàn thành
                    </span>
                  </div>

                  <div className="space-y-2">
                    {analysis.nextActionRecommendations?.map((rec, index) => {
                      const isDone = actionDone[index];
                      return (
                        <div
                          key={index}
                          onClick={() => setActionDone((prev) => ({ ...prev, [index]: !prev[index] }))}
                          className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                            isDone
                              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200 line-through opacity-70'
                              : 'bg-slate-900/80 hover:bg-slate-900 border-slate-700 text-slate-200 hover:border-indigo-400/50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                            isDone ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-500'
                          }`}>
                            {isDone && <Check className="w-3 h-3" />}
                          </div>
                          <span className="leading-relaxed">{rec}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Suggested Script with 1-click Copy & Zalo Open */}
                {analysis.suggestedScript && (
                  <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                        <span>Kịch Bản Tin Nhắn / Cuộc Gọi Gợi Ý Tiếp Theo:</span>
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyScript(analysis.suggestedScript)}
                          className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          {copiedScript ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Đã copy!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>

                        {onOpenMessageModal && (
                          <button
                            type="button"
                            onClick={() => onOpenMessageModal(lead)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Mở Zalo</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-300 italic leading-relaxed select-all">
                      "{analysis.suggestedScript}"
                    </div>
                  </div>
                )}

                {/* Footer Metadata */}
                <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800">
                  <span>
                    Mô hình: <strong className="text-slate-400">{analysis.source === 'gemini-3.8-flash' ? 'Google Gemini 3.8 Flash' : 'Phân tích thông minh BĐS'}</strong>
                  </span>
                  <span>
                    Thời gian phân tích: {new Date(analysis.analyzedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
