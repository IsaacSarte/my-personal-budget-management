import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";

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

type MonthlyData = {
  month: string;
  year: number;
  transactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  endingBalance: number;
};

const MonthlyHistory = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch transactions and categories
      const [transactionsResult, categoriesResult, budgetResult] = await Promise.all([
        supabase.from("transactions").select("*").order("transaction_date", { ascending: false }),
        supabase.from("categories").select("*"),
        supabase.from("budget_settings").select("starting_amount").single()
      ]);

      if (transactionsResult.error) throw transactionsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      if (budgetResult.error) throw budgetResult.error;

      const transactions = (transactionsResult.data || []).map(t => ({
        ...t,
        transaction_type: t.transaction_type as "income" | "expense"
      }));
      const categories = categoriesResult.data || [];
      const startingAmount = budgetResult.data?.starting_amount || 0;

      setCategories(categories);

      // Group transactions by month
      const monthlyGroups = transactions.reduce((groups: { [key: string]: Transaction[] }, transaction) => {
        const date = parseISO(transaction.transaction_date);
        const monthKey = format(date, "yyyy-MM");
        
        if (!groups[monthKey]) {
          groups[monthKey] = [];
        }
        groups[monthKey].push(transaction);
        
        return groups;
      }, {});

      // Calculate monthly data with running balance
      let runningBalance = Number(startingAmount);
      const monthlyDataArray: MonthlyData[] = [];

      // Sort months chronologically
      const sortedMonths = Object.keys(monthlyGroups).sort();

      sortedMonths.forEach(monthKey => {
        const [year, month] = monthKey.split("-");
        const monthTransactions = monthlyGroups[monthKey];
        
        const totalIncome = monthTransactions
          .filter(t => t.transaction_type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const totalExpenses = monthTransactions
          .filter(t => t.transaction_type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const netAmount = totalIncome - totalExpenses;
        runningBalance += netAmount;

        monthlyDataArray.push({
          month: format(new Date(parseInt(year), parseInt(month) - 1), "MMMM"),
          year: parseInt(year),
          transactions: monthTransactions.sort((a, b) => 
            new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
          ),
          totalIncome,
          totalExpenses,
          netAmount,
          endingBalance: runningBalance
        });
      });

      // Reverse to show most recent months first
      setMonthlyData(monthlyDataArray.reverse());
      setLoading(false);
    } catch (error) {
      console.error("Error fetching monthly data:", error);
      setLoading(false);
    }
  };

  const getCategoryById = (categoryId: string | null) => {
    return categories.find(cat => cat.id === categoryId);
  };

  const formatCurrency = (amount: number) => {
    return `Php${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold">Monthly History</h1>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading monthly data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">Monthly History</h1>
        </div>

        {monthlyData.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No transaction history available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {monthlyData.map((monthData, index) => (
              <Card key={`${monthData.year}-${monthData.month}`} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {monthData.month} {monthData.year}
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <Badge variant={monthData.netAmount >= 0 ? "default" : "destructive"}>
                        {monthData.netAmount >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {formatCurrency(Math.abs(monthData.netAmount))}
                      </Badge>
                      <div className="text-left sm:text-right">
                        <p className="text-sm text-muted-foreground">Ending Balance</p>
                        <p className="font-semibold">{formatCurrency(monthData.endingBalance)}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="text-center sm:text-center">
                      <p className="text-sm text-muted-foreground mb-1">Income</p>
                      <p className="font-semibold text-green-600 text-lg sm:text-base">{formatCurrency(monthData.totalIncome)}</p>
                    </div>
                    <div className="text-center sm:text-center">
                      <p className="text-sm text-muted-foreground mb-1">Expenses</p>
                      <p className="font-semibold text-red-600 text-lg sm:text-base">{formatCurrency(monthData.totalExpenses)}</p>
                    </div>
                    <div className="text-center sm:text-center">
                      <p className="text-sm text-muted-foreground mb-1">Transactions</p>
                      <p className="font-semibold text-lg sm:text-base">{monthData.transactions.length}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">Transactions</h4>
                    {monthData.transactions.map((transaction) => {
                      const category = getCategoryById(transaction.category_id);
                      return (
                        <div
                          key={transaction.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              {category && (
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: category.color }}
                                />
                              )}
                              <span className="font-medium truncate">{transaction.description}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(parseISO(transaction.transaction_date), "MMM dd")}
                              </span>
                              {category && (
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  {category.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-left sm:text-right flex-shrink-0">
                            <span
                              className={`font-semibold text-base ${
                                transaction.transaction_type === "income"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {transaction.transaction_type === "income" ? "+" : "-"}
                              {formatCurrency(Number(transaction.amount))}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyHistory;