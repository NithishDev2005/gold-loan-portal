import { useState, useEffect } from "react";

interface Quote {
  schemeId: string;
  schemeName: string;
  interestRatePa: number;
  maxLtv: number;
  tenureMonths: number;
  pureGoldGrams: number;
  goldValue: number;
  eligibleLoan: number;
}

interface Lead {
  id: string;
  fullName: string;
  mobileNumber: string;
  grossWeightGrams: number;
  netWeightGrams: number;
  karat: number;
  schemeId: string;
  eligibleLoan: number;
  status: string;
  createdAt: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"intake" | "admin">("intake");
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Form State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [grossWeight, setGrossWeight] = useState<string>("");
  const [netWeight, setNetWeight] = useState<string>("");
  const [karat, setKarat] = useState<18 | 22 | 24>(22);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>("PLAN_EMI_01");

  // Quotes & Status State
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin Leads State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [planFilter, setPlanFilter] = useState("ALL");
  const [loadingLeads, setLoadingLeads] = useState(false);

  // AI Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "agent"; text: string; toolCalled?: string }>>([
    { sender: "agent", text: "Hello! I am your AI Gold Loan Assistant. Ask me about our loan schemes or say: \"I have 45 grams of 22 karat jewellery, how much can I get?\"" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Live Debounced Quote Fetcher (~300ms)
  useEffect(() => {
    const gross = parseFloat(grossWeight);
    const net = parseFloat(netWeight);

    const errors: Record<string, string> = {};
    if (grossWeight && isNaN(gross)) errors.grossWeight = "Must be a valid number";
    if (netWeight && isNaN(net)) errors.netWeight = "Must be a valid number";
    if (gross && net && net > gross) errors.netWeight = "Net weight cannot exceed gross weight";

    setFieldErrors(errors);

    if (gross > 0 && net > 0 && net <= gross) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch("/api/v1/quotes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grossWeightGrams: gross, netWeightGrams: net, karat })
          });
          const data = await res.json();
          if (res.ok && data.quotes) {
            setQuotes(data.quotes);
          }
        } catch (err) {
          console.error(err);
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setQuotes([]);
    }
  }, [grossWeight, netWeight, karat]);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch("/api/v1/leads");
      const data = await res.json();
      if (Array.isArray(data)) setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (activeTab === "admin") fetchLeads();
  }, [activeTab]);

  const handleApply = async () => {
    setIsSubmitting(true);
    setDuplicateError(null);

    try {
      const res = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          mobileNumber,
          grossWeightGrams: parseFloat(grossWeight),
          netWeightGrams: parseFloat(netWeight),
          karat,
          schemeId: selectedSchemeId
        })
      });

      const data = await res.json();

      if (res.status === 201) {
        setApplicationId(data.applicationId);
        setStep(3);
      } else if (res.status === 409) {
        setDuplicateError(data.error?.message || "You already submitted an application within 7 days.");
      } else if (data.error?.fields) {
        const errors: Record<string, string> = {};
        data.error.fields.forEach((f: any) => { errors[f.field] = f.message; });
        setFieldErrors(errors);
        setStep(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: userText }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { 
        sender: "agent", 
        text: data.reply, 
        toolCalled: data.toolCalled 
      }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: "agent", text: "Service temporarily unavailable." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const selectedQuote = quotes.find(q => q.schemeId === selectedSchemeId) || quotes[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🏆</span>
            <h1 className="font-bold text-lg md:text-xl tracking-tight">TGlobal Gold Loan</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab("intake")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === "intake" ? "bg-emerald-700 text-white" : "text-emerald-100 hover:bg-emerald-700/50"}`}
            >
              Intake Portal
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === "admin" ? "bg-emerald-700 text-white" : "text-emerald-100 hover:bg-emerald-700/50"}`}
            >
              Admin View
            </button>
            <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="ml-2 bg-yellow-400 hover:bg-yellow-300 text-emerald-950 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center shadow"
            >
              <span className="mr-1">✨</span>
              AI Assist
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto w-full px-4 py-6 flex-1">
        {activeTab === "intake" ? (
          <div>
            <div className="flex justify-between items-center mb-6 px-2">
              {[
                { s: 1, label: "Details" },
                { s: 2, label: "Live Quote" },
                { s: 3, label: "Status" }
              ].map(st => (
                <div key={st.s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    step >= st.s ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                  }`}>
                    {st.s}
                  </div>
                  <span className={`ml-2 text-xs font-medium hidden sm:inline ${step >= st.s ? "text-emerald-800" : "text-slate-400"}`}>
                    {st.label}
                  </span>
                </div>
              ))}
            </div>

            {duplicateError && (
              <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg flex items-start">
                <span className="text-amber-600 mr-2 text-lg">⚠️</span>
                <div>
                  <h4 className="text-sm font-bold text-amber-800">Duplicate Application Detected</h4>
                  <p className="text-xs text-amber-700 mt-1">{duplicateError}</p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                  <span className="mr-2">👤</span> Borrower & Gold Details
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    />
                    {fieldErrors.fullName && <p className="text-xs text-red-600 mt-1">{fieldErrors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Mobile Number (Indian 10-digit)</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[6-9][0-9]{9}"
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={mobileNumber}
                      onChange={e => setMobileNumber(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    />
                    {fieldErrors.mobileNumber && <p className="text-xs text-red-600 mt-1">{fieldErrors.mobileNumber}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Gross Weight (g)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="e.g. 50"
                        value={grossWeight}
                        onChange={e => setGrossWeight(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                      />
                      {fieldErrors.grossWeight && <p className="text-xs text-red-600 mt-1">{fieldErrors.grossWeight}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Net Weight (g)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="e.g. 45"
                        value={netWeight}
                        onChange={e => setNetWeight(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                      />
                      {fieldErrors.netWeight && <p className="text-xs text-red-600 mt-1">{fieldErrors.netWeight}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Gold Karat (Purity)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[18, 22, 24].map(k => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setKarat(k as any)}
                          className={`py-2 text-sm font-semibold rounded-lg border transition ${
                            karat === k ? "bg-emerald-50 border-emerald-600 text-emerald-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {k}K Gold
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!fullName.trim() || !mobileNumber.trim() || !grossWeight || !netWeight) {
                        alert("Please fill in all borrower and gold details.");
                        return;
                      }
                      if (parseFloat(netWeight) > parseFloat(grossWeight)) {
                        setFieldErrors({ netWeight: "Net weight cannot exceed gross weight" });
                        return;
                      }
                      setStep(2);
                    }}
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg flex items-center justify-center space-x-2 transition"
                  >
                    <span>View Loan Quotes →</span>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Select Loan Scheme</h2>
                  <button onClick={() => setStep(1)} className="text-xs font-medium text-emerald-600 hover:underline">
                    Edit weights
                  </button>
                </div>

                {selectedQuote && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Pure Gold:</span>
                        <p className="font-bold text-sm text-emerald-900">{selectedQuote.pureGoldGrams} g</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Market Value (₹7,000/g):</span>
                        <p className="font-bold text-sm text-emerald-900">₹{selectedQuote.goldValue.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  {quotes.map(q => (
                    <div
                      key={q.schemeId}
                      onClick={() => setSelectedSchemeId(q.schemeId)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                        selectedSchemeId === q.schemeId ? "border-emerald-600 bg-emerald-50/50 shadow-sm" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900">{q.schemeName}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{q.interestRatePa}% p.a. • Up to {q.maxLtv * 100}% LTV • 12 Months</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-500">Eligible Loan</span>
                          <p className="font-bold text-lg text-emerald-700">₹{q.eligibleLoan.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setStep(1)}
                    className="w-1/3 py-3 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleApply}
                    className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg flex items-center justify-center space-x-2 transition disabled:opacity-50"
                  >
                    <span>{isSubmitting ? "Submitting..." : "Confirm & Apply"}</span>
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                <span className="text-5xl block mb-2">✅</span>
                <h2 className="text-2xl font-bold text-slate-900">Application Submitted!</h2>
                <p className="text-sm text-slate-600 mt-1">Our field agent will verify physical jewellery soon.</p>

                <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-xl inline-block max-w-xs w-full">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Application ID</span>
                  <p className="text-2xl font-mono font-bold text-emerald-700 mt-1">{applicationId}</p>
                </div>

                <div>
                  <button
                    onClick={() => {
                      setStep(1);
                      setFullName("");
                      setMobileNumber("");
                      setGrossWeight("");
                      setNetWeight("");
                      setApplicationId(null);
                    }}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
                  >
                    Start New Application
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Submitted Leads</h2>
                <p className="text-xs text-slate-500">Masked mobiles and latest applications</p>
              </div>
              <button 
                onClick={fetchLeads} 
                className="p-2 text-slate-500 hover:text-emerald-600 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                ⟳
              </button>
            </div>

            <div className="mb-4 flex items-center space-x-2">
              <span className="text-xs text-slate-500">Filter Plan:</span>
              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Schemes</option>
                <option value="PLAN_EMI_01">Monthly EMI</option>
                <option value="PLAN_BULLET_01">Bullet Repayment</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                    <th className="py-2 px-3">App ID</th>
                    <th className="py-2 px-3">Borrower</th>
                    <th className="py-2 px-3">Mobile (Masked)</th>
                    <th className="py-2 px-3">Net Wt</th>
                    <th className="py-2 px-3">Loan Amount</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads
                    .filter(l => planFilter === "ALL" || l.schemeId === planFilter)
                    .map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-emerald-800">{lead.id}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{lead.fullName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{lead.mobileNumber}</td>
                        <td className="py-2.5 px-3">{lead.netWeightGrams}g ({lead.karat}K)</td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-700">₹{lead.eligibleLoan.toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            {lead.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        No leads found. Submit one via the Intake portal!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {isChatOpen && (
        <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-30 overflow-hidden h-[480px]">
          <div className="bg-emerald-800 text-white p-3 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span>✨</span>
              <span className="font-semibold text-sm">Loan Assist AI</span>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="text-xs hover:text-slate-300">✕</button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            {chatMessages.map((m, idx) => (
              <div key={idx} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
                {m.toolCalled && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded mb-1 font-mono">
                    🔧 called {m.toolCalled}()
                  </span>
                )}
                <div className={`p-2.5 rounded-xl max-w-[85%] whitespace-pre-line ${
                  m.sender === "user" ? "bg-emerald-600 text-white rounded-br-none" : "bg-slate-100 text-slate-800 rounded-bl-none"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && <div className="text-xs text-slate-400 italic">Calculating with backend tools...</div>}
          </div>

          <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-200 flex space-x-2 bg-slate-50">
            <input
              type="text"
              placeholder="Ask plans or say 'I have 45g 22k'..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button type="submit" className="bg-emerald-700 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-800">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
