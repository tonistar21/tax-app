import React, { useState, useEffect } from "react";
import { OrdersList } from "./components/OrdersList";
import { ImportCsv } from "./components/ImportCsv";
import { CreateOrder } from "./components/CreateOrder";
import { FilingDashboard } from "./components/FilingDashboard";
import { LayoutDashboard, Upload, PlusCircle, ClipboardList, LogOut } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getToken, clearToken, me } from "./api";
import { Login } from "./components/Login";

type Tab = "orders" | "import" | "create" | "filing";

export function App() {
  const [tab, setTab] = useState<Tab>("orders");
  const [authed, setAuthed] = useState<boolean>(!!getToken());
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        if (!getToken()) {
          setAuthed(false);
          return;
        }
        await me(); // verify token
        setAuthed(true);
      } catch {
        clearToken();
        setAuthed(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return <div className="min-h-screen bg-[#0B101E]" />;
  }

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#0B101E] text-slate-300 selection:bg-indigo-500/30 selection:text-indigo-200">
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[580px] px-4">
        <nav className="flex items-center justify-between p-1.5 bg-[#0B101E]/80 backdrop-blur-xl border border-slate-800/80 rounded-full shadow-2xl">
          <TabButton active={tab === "orders"} onClick={() => setTab("orders")} icon={<LayoutDashboard className="w-4 h-4" />}>
            Ledger
          </TabButton>
          <TabButton active={tab === "filing"} onClick={() => setTab("filing")} icon={<ClipboardList className="w-4 h-4" />}>
            Tax Filing
          </TabButton>
          <TabButton active={tab === "import"} onClick={() => setTab("import")} icon={<Upload className="w-4 h-4" />}>
            Import
          </TabButton>
          <TabButton active={tab === "create"} onClick={() => setTab("create")} icon={<PlusCircle className="w-4 h-4" />}>
            Create
          </TabButton>
          
          <button
            onClick={() => { 
              clearToken(); 
              setAuthed(false); 
            }}
            className="px-3 py-2 rounded-full text-slate-500 hover:text-slate-200 hover:bg-slate-800/30 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </nav>
      </header>

      <main className="pt-32 pb-16 max-w-6xl mx-auto px-6">
        <AnimatePresence mode="wait">
          <motion.div 
            key={tab} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            transition={{ duration: 0.2 }}
          >
            {tab === "orders" && <OrdersList />}
            {tab === "filing" && <FilingDashboard />}
            {tab === "import" && <ImportCsv />}
            {tab === "create" && <CreateOrder />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-xs tracking-wide uppercase font-medium rounded-full transition-all duration-300 ${
        active
          ? "bg-slate-800 text-white shadow-md border border-slate-700/50"
          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border border-transparent"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}
