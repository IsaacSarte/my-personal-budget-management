import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TransactionForm from "./TransactionForm";
import TransactionList from "./TransactionList";
import CategoryList from "./CategoryList";

type BudgetSettings = {
  id: string;
  starting_amount: number;
  current_balance: number;
  updated_at: string;
};

type Transaction = {
  id: string;
  amount: number;
  description: string;
  category_id: string | null;
  transaction_type: "income" | "expense";
  transaction_date: string;
  synced: boolean;
};

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

const BudgetDashboard = () => {
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingStartingAmount, setEditingStartingAmount] = useState(false);
  const [newStartingAmount, setNewStartingAmount] = useState<string>("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isOnline) {
      syncOfflineData();
    }
  }, [isOnline]);

  const fetchData = async () => {
    try {
      const [settingsRes, transactionsRes, categoriesRes] = await Promise.all([
        supabase.from("budget_settings").select("*").single(),
        supabase.from("transactions").select("*").order("transaction_date", { ascending: false }),
        supabase.from("categories").select("*").order("name")
      ]);

      if (settingsRes.data) setBudgetSettings(settingsRes.data);
      if (transactionsRes.data) setTransactions(transactionsRes.data as Transaction[]);
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } catch (error) {
      // If offline, load from localStorage
      const offlineSettings = localStorage.getItem("budget_settings");
      const offlineTransactions = localStorage.getItem("transactions");
      const offlineCategories = localStorage.getItem("categories");

      if (offlineSettings) setBudgetSettings(JSON.parse(offlineSettings));
      if (offlineTransactions) setTransactions(JSON.parse(offlineTransactions));
      if (offlineCategories) setCategories(JSON.parse(offlineCategories));
    }
  };

  const syncOfflineData = async () => {
    const unsyncedTransactions = transactions.filter(t => !t.synced);
    
    for (const transaction of unsyncedTransactions) {
      try {
        const { error } = await supabase
          .from("transactions")
          .upsert({ ...transaction, synced: true });
        
        if (!error) {
          setTransactions(prev => 
            prev.map(t => t.id === transaction.id ? { ...t, synced: true } : t)
          );
        }
      } catch (error) {
        console.error("Failed to sync transaction:", error);
      }
    }
    
    fetchData(); // Refresh data from server
    toast.success("Data synced successfully!");
  };

  const updateStartingAmount = async () => {
    const amount = parseFloat(newStartingAmount);
    if (isNaN(amount)) return;

    const updatedSettings = {
      ...budgetSettings!,
      starting_amount: amount
    };

    setBudgetSettings(updatedSettings);
    localStorage.setItem("budget_settings", JSON.stringify(updatedSettings));

    if (isOnline) {
      try {
        await supabase
          .from("budget_settings")
          .update({ starting_amount: amount })
          .eq("id", budgetSettings!.id);
      } catch (error) {
        console.error("Failed to update starting amount:", error);
      }
    }

    setEditingStartingAmount(false);
    setNewStartingAmount("");
    toast.success("Starting amount updated!");
  };

  const addTransaction = (transaction: Omit<Transaction, "id" | "synced">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      synced: isOnline
    };

    setTransactions(prev => [newTransaction, ...prev]);
    localStorage.setItem("transactions", JSON.stringify([newTransaction, ...transactions]));

    if (isOnline) {
      supabase.from("transactions").insert(newTransaction);
    }

    setShowTransactionForm(false);
    toast.success("Transaction added!");
  };

  const isNegativeBalance = budgetSettings && budgetSettings.current_balance < 0;

  if (!budgetSettings) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">MyDailyLife Budget</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
            {!isOnline && (
              <p className="text-sm text-muted-foreground">Changes will sync when back online</p>
            )}
          </div>
        </div>
        <Button onClick={() => setShowTransactionForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Balance Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Starting Amount</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {editingStartingAmount ? (
              <div className="space-y-2">
                <Input
                  type="number"
                  value={newStartingAmount}
                  onChange={(e) => setNewStartingAmount(e.target.value)}
                  placeholder="Enter amount"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={updateStartingAmount}>
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setEditingStartingAmount(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-bold">
                  ${budgetSettings.starting_amount.toFixed(2)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingStartingAmount(true);
                    setNewStartingAmount(budgetSettings.starting_amount.toString());
                  }}
                  className="mt-1"
                >
                  Edit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            {isNegativeBalance ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <TrendingUp className="h-4 w-4 text-success" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isNegativeBalance ? 'text-destructive' : 'text-success'}`}>
              ${budgetSettings.current_balance.toFixed(2)}
            </div>
            {isNegativeBalance && (
              <Badge variant="destructive" className="mt-2">
                Negative Balance!
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.filter(t => !t.synced).length} pending sync
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <CategoryList categories={categories} />

      {/* Transactions */}
      <TransactionList transactions={transactions} categories={categories} />

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <TransactionForm
          categories={categories}
          onSubmit={addTransaction}
          onClose={() => setShowTransactionForm(false)}
        />
      )}
    </div>
  );
};

export default BudgetDashboard;