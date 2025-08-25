import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, TrendingDown, TrendingUp, AlertTriangle, History, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  const { user, signOut } = useAuth();
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
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
    if (user) {
      fetchData();
    }
    
    // Set up real-time subscription for budget_settings changes
    const channel = supabase
      .channel('budget-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_settings'
        },
        (payload) => {
          console.log('Budget settings updated:', payload);
          if (payload.new) {
            setBudgetSettings(payload.new as BudgetSettings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (isOnline) {
      syncOfflineData();
    }
  }, [isOnline]);

  const fetchData = async () => {
    console.log("=== FETCHDATA STARTED ===");
    if (!user) return;
    
    try {
      console.log("Making API calls...");
      const [settingsRes, transactionsRes, categoriesRes] = await Promise.all([
        supabase.from("budget_settings").select("*").maybeSingle(),
        supabase.from("transactions").select("*").order("transaction_date", { ascending: false }),
        supabase.from("categories").select("*").order("name")
      ]);

      console.log("=== API RESPONSES ===");
      console.log("Settings response:", settingsRes);
      console.log("Settings data:", settingsRes.data);
      console.log("Settings error:", settingsRes.error);
      console.log("Transactions response:", transactionsRes);
      console.log("Categories response:", categoriesRes);

      if (settingsRes.data) {
        console.log("Setting budget settings to:", settingsRes.data);
        setBudgetSettings(settingsRes.data);
        localStorage.setItem("budget_settings", JSON.stringify(settingsRes.data));
      } else {
        console.log("No budget settings found, creating default for user");
        // Create default budget settings for this user
        const { data: newSettings, error } = await supabase
          .from("budget_settings")
          .insert({
            starting_amount: 0,
            current_balance: 0,
            user_id: user.id
          })
          .select()
          .single();
          
        if (error) {
          console.error("Failed to create budget settings:", error);
          toast.error("Failed to initialize budget settings");
          return;
        }
        
        console.log("Created budget settings:", newSettings);
        setBudgetSettings(newSettings);
        localStorage.setItem("budget_settings", JSON.stringify(newSettings));
      }
      
      if (transactionsRes.data) {
        console.log("Setting transactions:", transactionsRes.data.length, "items");
        setTransactions(transactionsRes.data as Transaction[]);
        localStorage.setItem("transactions", JSON.stringify(transactionsRes.data));
      }
      if (categoriesRes.data) {
        console.log("Setting categories:", categoriesRes.data.length, "items");
        setCategories(categoriesRes.data);
        localStorage.setItem("categories", JSON.stringify(categoriesRes.data));
      } else if (user) {
        // Create default categories for new users
        const defaultCategories = [
          { name: "Food & Dining", color: "#ef4444", icon: "utensils", user_id: user.id },
          { name: "Transportation", color: "#3b82f6", icon: "car", user_id: user.id },
          { name: "Shopping", color: "#8b5cf6", icon: "shopping-bag", user_id: user.id },
          { name: "Entertainment", color: "#f59e0b", icon: "film", user_id: user.id },
          { name: "Bills & Utilities", color: "#ef4444", icon: "zap", user_id: user.id },
          { name: "Healthcare", color: "#10b981", icon: "heart", user_id: user.id },
          { name: "Salary", color: "#22c55e", icon: "dollar-sign", user_id: user.id },
          { name: "Other", color: "#6b7280", icon: "more-horizontal", user_id: user.id }
        ];
        
        try {
          const { data: createdCategories, error } = await supabase
            .from("categories")
            .insert(defaultCategories)
            .select();
            
          if (!error && createdCategories) {
            console.log("Created default categories:", createdCategories);
            setCategories(createdCategories);
            localStorage.setItem("categories", JSON.stringify(createdCategories));
          }
        } catch (error) {
          console.error("Failed to create default categories:", error);
        }
      }
      console.log("=== FETCHDATA COMPLETED ===");
    } catch (error) {
      console.error("=== FETCH DATA ERROR ===", error);
      // If offline, load from localStorage
      const offlineSettings = localStorage.getItem("budget_settings");
      const offlineTransactions = localStorage.getItem("transactions");
      const offlineCategories = localStorage.getItem("categories");

      console.log("Loading offline data...");
      console.log("Offline settings:", offlineSettings);

      if (offlineSettings) {
        const parsedSettings = JSON.parse(offlineSettings);
        console.log("Setting offline budget settings:", parsedSettings);
        setBudgetSettings(parsedSettings);
      } else if (user) {
        console.log("No offline settings, creating default");
        // Create default budget settings if none exist  
        const defaultSettings = {
          id: crypto.randomUUID(),
          starting_amount: 0,
          current_balance: 0,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          user_id: user.id
        };
        console.log("Default offline settings:", defaultSettings);
        setBudgetSettings(defaultSettings);
      }
      
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
          .upsert({ ...transaction, synced: true, user_id: user?.id });
        
        if (!error) {
          setTransactions(prev => 
            prev.map(t => t.id === transaction.id ? { ...t, synced: true } : t)
          );
        }
      } catch (error) {
        console.error("Failed to sync transaction:", error);
      }
    }
    
    // Refresh data from server after syncing
    await fetchData();
    toast.success("Data synced successfully!");
  };

  const calculateNewBalance = (currentTransactions: Transaction[], startingAmount: number) => {
    const totalChange = currentTransactions.reduce((sum, t) => {
      return sum + (t.transaction_type === 'income' ? t.amount : -t.amount);
    }, 0);
    return startingAmount + totalChange;
  };

  const updateStartingAmount = async () => {
    const amount = parseFloat(newStartingAmount);
    if (isNaN(amount)) return;

    const newBalance = calculateNewBalance(transactions, amount);
    const updatedSettings = {
      ...budgetSettings!,
      starting_amount: amount,
      current_balance: newBalance
    };

    setBudgetSettings(updatedSettings);
    localStorage.setItem("budget_settings", JSON.stringify(updatedSettings));

  if (isOnline && user) {
    try {
      const { error } = await supabase
        .from("budget_settings")
        .update({ 
          starting_amount: amount,
          current_balance: newBalance 
        })
        .eq("id", budgetSettings!.id)
        .eq("user_id", user.id);
        
      if (error) {
        console.error("Failed to update starting amount:", error);
        toast.error("Failed to save starting amount");
        return;
      }
    } catch (error) {
      console.error("Failed to update starting amount:", error);
      toast.error("Failed to save starting amount");
      return;
    }
  }

    setEditingStartingAmount(false);
    setNewStartingAmount("");
    toast.success("Starting amount updated!");
  };

  const addTransaction = async (transaction: Omit<Transaction, "id" | "synced">) => {
    console.log("Adding transaction:", transaction);
    
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      synced: isOnline
    };
    
    console.log("New transaction object:", newTransaction);

    const updatedTransactions = [newTransaction, ...transactions];
    setTransactions(updatedTransactions);
    localStorage.setItem("transactions", JSON.stringify(updatedTransactions));

    // Update balance locally for immediate feedback
    if (budgetSettings) {
      const newBalance = calculateNewBalance(updatedTransactions, budgetSettings.starting_amount);
      const updatedBudgetSettings = {
        ...budgetSettings,
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      };
      setBudgetSettings(updatedBudgetSettings);
      localStorage.setItem("budget_settings", JSON.stringify(updatedBudgetSettings));
    }

    if (isOnline && user) {
      try {
        const { error } = await supabase.from("transactions").insert({
          ...newTransaction,
          user_id: user.id
        });
        if (error) {
          console.error("Failed to insert transaction:", error);
          toast.error("Failed to save transaction to database");
          return;
        }
        // Note: The real-time subscription will handle updating the budget settings
        // when the database trigger recalculates the balance
      } catch (error) {
        console.error("Database error:", error);
        toast.error("Database connection error");
        return;
      }
    }

    setShowTransactionForm(false);
    setEditingTransaction(null);
    toast.success(editingTransaction ? "Transaction updated!" : "Transaction added!");
  };

  const updateTransaction = async (updatedData: Omit<Transaction, "id" | "synced">) => {
    if (!editingTransaction || !user) return;
    
    console.log("Updating transaction:", editingTransaction.id, updatedData);
    
    const updatedTransaction: Transaction = {
      ...editingTransaction,
      ...updatedData,
      synced: isOnline
    };
    
    const updatedTransactions = transactions.map(t => 
      t.id === editingTransaction.id ? updatedTransaction : t
    );
    setTransactions(updatedTransactions);
    localStorage.setItem("transactions", JSON.stringify(updatedTransactions));

    // Update balance locally for immediate feedback
    if (budgetSettings) {
      const newBalance = calculateNewBalance(updatedTransactions, budgetSettings.starting_amount);
      const updatedBudgetSettings = {
        ...budgetSettings,
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      };
      setBudgetSettings(updatedBudgetSettings);
      localStorage.setItem("budget_settings", JSON.stringify(updatedBudgetSettings));
    }

    if (isOnline) {
      try {
        const { error } = await supabase
          .from("transactions")
          .update({
            amount: updatedData.amount,
            description: updatedData.description,
            category_id: updatedData.category_id,
            transaction_type: updatedData.transaction_type,
            transaction_date: updatedData.transaction_date,
            user_id: user.id
          })
          .eq("id", editingTransaction.id)
          .eq("user_id", user.id);
          
        if (error) {
          console.error("Failed to update transaction:", error);
          toast.error("Failed to update transaction in database");
          return;
        }
      } catch (error) {
        console.error("Database error:", error);
        toast.error("Database connection error");
        return;
      }
    }

    setShowTransactionForm(false);
    setEditingTransaction(null);
    toast.success("Transaction updated!");
  };

  const deleteTransaction = async (transactionId: string) => {
    if (!user) return;
    
    console.log("Deleting transaction:", transactionId);
    
    const updatedTransactions = transactions.filter(t => t.id !== transactionId);
    setTransactions(updatedTransactions);
    localStorage.setItem("transactions", JSON.stringify(updatedTransactions));

    // Update balance locally for immediate feedback
    if (budgetSettings) {
      const newBalance = calculateNewBalance(updatedTransactions, budgetSettings.starting_amount);
      const updatedBudgetSettings = {
        ...budgetSettings,
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      };
      setBudgetSettings(updatedBudgetSettings);
      localStorage.setItem("budget_settings", JSON.stringify(updatedBudgetSettings));
    }

    if (isOnline) {
      try {
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("id", transactionId)
          .eq("user_id", user.id);
          
        if (error) {
          console.error("Failed to delete transaction:", error);
          toast.error("Failed to delete transaction from database");
          // Revert local changes
          fetchData();
          return;
        }
      } catch (error) {
        console.error("Database error:", error);
        toast.error("Database connection error");
        // Revert local changes
        fetchData();
        return;
      }
    }

    toast.success("Transaction deleted!");
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionForm(true);
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{user?.email}</span>
          </div>
          <Button onClick={() => setShowTransactionForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
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
                  Php{budgetSettings.starting_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              Php{budgetSettings.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* Navigation */}
      <div className="flex justify-center">
        <Link to="/monthly-history">
          <Button variant="outline" className="gap-2">
            <History className="h-4 w-4" />
            View Monthly History
          </Button>
        </Link>
      </div>

      {/* Transactions */}
      <TransactionList 
        transactions={transactions} 
        categories={categories}
        onEdit={handleEditTransaction}
        onDelete={deleteTransaction}
      />

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <TransactionForm
          categories={categories}
          editingTransaction={editingTransaction}
          onSubmit={editingTransaction ? updateTransaction : addTransaction}
          onClose={() => {
            setShowTransactionForm(false);
            setEditingTransaction(null);
          }}
        />
      )}
    </div>
  );
};

export default BudgetDashboard;
