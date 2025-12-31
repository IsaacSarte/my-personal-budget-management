import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, TrendingDown, TrendingUp, AlertTriangle, History, LogOut, User, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TransactionForm from "./TransactionForm";
import TransactionList from "./TransactionList";
import CategoryList from "./CategoryList";
import CategoryForm from "./CategoryForm";
import BouncingDots from './BouncingDots';

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
  parent_id: string | null;
};

const BudgetDashboard = () => {
  const { user, signOut } = useAuth();
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingStartingAmount, setEditingStartingAmount] = useState(false);
  const [newStartingAmount, setNewStartingAmount] = useState<string>("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [visibleTransactionCount, setVisibleTransactionCount] = useState(10);
  const itemsPerPage = 10;

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
          { name: "Food & Dining", color: "#ef4444", icon: "utensils", user_id: user.id, parent_id: null },
          { name: "Transportation", color: "#3b82f6", icon: "car", user_id: user.id, parent_id: null },
          { name: "Shopping", color: "#8b5cf6", icon: "shopping-bag", user_id: user.id, parent_id: null },
          { name: "Entertainment", color: "#f59e0b", icon: "film", user_id: user.id, parent_id: null },
          { name: "Bills & Utilities", color: "#ef4444", icon: "zap", user_id: user.id, parent_id: null },
          { name: "Healthcare", color: "#10b981", icon: "heart", user_id: user.id, parent_id: null },
          { name: "Salary", color: "#22c55e", icon: "dollar-sign", user_id: user.id, parent_id: null },
          { name: "Other", color: "#6b7280", icon: "more-horizontal", user_id: user.id, parent_id: null }
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

    // Sync pending starting amount if any
    if (isOnline && user) {
      const pending = localStorage.getItem("pending_starting_amount");
      if (pending && budgetSettings) {
        try {
          const { amount } = JSON.parse(pending) as { amount: number };
          const { error } = await supabase
            .from("budget_settings")
            .update({ starting_amount: amount })
            .eq("id", budgetSettings.id)
            .eq("user_id", user.id);
          if (!error) {
            localStorage.removeItem("pending_starting_amount");
          }
        } catch (error) {
          console.error("Failed to sync starting amount:", error);
        }
      }
    }
    
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
    // If offline, queue this update for later sync
    if (!isOnline) {
      localStorage.setItem("pending_starting_amount", JSON.stringify({
        amount,
        updated_at: new Date().toISOString()
      }));
    }
  
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

  const addCategory = async (category: Omit<Category, "id">) => {
    console.log("Adding category:", category);
    
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID(),
    };
    
    console.log("New category object:", newCategory);

    const updatedCategories = [...categories, newCategory];
    setCategories(updatedCategories);
    localStorage.setItem("categories", JSON.stringify(updatedCategories));

    if (isOnline && user) {
      try {
        const { error } = await supabase.from("categories").insert({
          ...newCategory,
          user_id: user.id
        });
        if (error) {
          console.error("Failed to insert category:", error);
          toast.error("Failed to save category to database");
          return;
        }
      } catch (error) {
        console.error("Database error:", error);
        toast.error("Database connection error");
        return;
      }
    }

    setShowCategoryForm(false);
    setEditingCategory(null);
    toast.success(editingCategory ? "Category updated!" : "Category added!");
  };

  const updateCategory = async (updatedData: Omit<Category, "id">) => {
    if (!editingCategory || !user) return;
    
    console.log("Updating category:", editingCategory.id, updatedData);
    
    const updatedCategory: Category = {
      ...editingCategory,
      ...updatedData,
    };
    
    const updatedCategories = categories.map(c => 
      c.id === editingCategory.id ? updatedCategory : c
    );
    setCategories(updatedCategories);
    localStorage.setItem("categories", JSON.stringify(updatedCategories));

    if (isOnline) {
      try {
        const { error } = await supabase
          .from("categories")
          .update({
            name: updatedData.name,
            color: updatedData.color,
            icon: updatedData.icon,
            parent_id: updatedData.parent_id,
            user_id: user.id
          })
          .eq("id", editingCategory.id)
          .eq("user_id", user.id);
          
        if (error) {
          console.error("Failed to update category:", error);
          toast.error("Failed to update category in database");
          return;
        }
      } catch (error) {
        console.error("Database error:", error);
        toast.error("Database connection error");
        return;
      }
    }

    setShowCategoryForm(false);
    setEditingCategory(null);
    toast.success("Category updated!");
  };

  const deleteCategory = async (categoryId: string) => {
    if (!user) return;
    
    console.log("Deleting category:", categoryId);
    
    // Check if category has sub-categories
    const hasSubCategories = categories.some(c => c.parent_id === categoryId);
    if (hasSubCategories) {
      toast.error("Cannot delete category with sub-categories. Delete sub-categories first.");
      return;
    }

    // Check if category is used in transactions
    const categoryInUse = transactions.some(t => t.category_id === categoryId);
    if (categoryInUse) {
      toast.error("Cannot delete category that is used in transactions.");
      return;
    }
    
    const updatedCategories = categories.filter(c => c.id !== categoryId);
    setCategories(updatedCategories);
    localStorage.setItem("categories", JSON.stringify(updatedCategories));

    if (isOnline) {
      try {
        const { error } = await supabase
          .from("categories")
          .delete()
          .eq("id", categoryId)
          .eq("user_id", user.id);
          
        if (error) {
          console.error("Failed to delete category:", error);
          toast.error("Failed to delete category from database");
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

    toast.success("Category deleted!");
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleAddTransaction = async (transaction: Omit<Transaction, "id" | "synced">) => {
    console.log("Adding transaction:", transaction);
    
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      synced: isOnline
    };
    
    console.log("New transaction object:", newTransaction);

    const updatedTransactions = [newTransaction, ...transactions];
    setTransactions(updatedTransactions);
    setVisibleTransactionCount(10); // Reset to show initial amount
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

  const handleLoadMoreTransactions = () => {
    setVisibleTransactionCount(prev => Math.min(prev + itemsPerPage, transactions.length));
  };

  const hasMoreTransactions = visibleTransactionCount < transactions.length;

  const isNegativeBalance = budgetSettings && budgetSettings.current_balance < 0;

  if (!budgetSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BouncingDots text="Setting up your budget..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">MyDailyLife Budget</h1>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
            {!isOnline && (
              <p className="text-sm text-muted-foreground hidden sm:block">Changes will sync when back online</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground order-2 sm:order-1">
            <User className="h-4 w-4" />
            <span className="truncate max-w-[200px]">{user?.email}</span>
          </div>
          <div className="flex gap-2 order-1 sm:order-2">
            <Button onClick={() => setShowTransactionForm(true)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Transaction</span>
              <span className="sm:hidden">Add</span>
            </Button>
            <Button variant="outline" onClick={signOut} className="flex-1 sm:flex-none">
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Balance Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      <CategoryList 
        categories={categories}
        onAdd={() => setShowCategoryForm(true)}
        onEdit={handleEditCategory}
        onDelete={deleteCategory}
      />

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Link to="/monthly-history">
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <History className="h-4 w-4" />
            View Monthly History
          </Button>
        </Link>
        <Link to="/accounts">
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <CreditCard className="h-4 w-4" />
            My Accounts
          </Button>
        </Link>
      </div>

      {/* Transactions */}
      <TransactionList 
        transactions={transactions} 
        categories={categories}
        onEdit={handleEditTransaction}
        onDelete={deleteTransaction}
        visibleCount={visibleTransactionCount}
        onLoadMore={handleLoadMoreTransactions}
        hasMore={hasMoreTransactions}
      />

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <TransactionForm
          categories={categories}
          editingTransaction={editingTransaction}
          onSubmit={editingTransaction ? updateTransaction : handleAddTransaction}
          onClose={() => {
            setShowTransactionForm(false);
            setEditingTransaction(null);
          }}
        />
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <CategoryForm
          categories={categories}
          editingCategory={editingCategory}
          onSubmit={editingCategory ? updateCategory : addCategory}
          onClose={() => {
            setShowCategoryForm(false);
            setEditingCategory(null);
          }}
        />
      )}
    </div>
  );
};

export default BudgetDashboard;
