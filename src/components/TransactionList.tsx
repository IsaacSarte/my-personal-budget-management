import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Clock, Edit2, Trash2 } from "lucide-react";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";

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

type TransactionListProps = {
  transactions: Transaction[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const TransactionList = ({ transactions, categories, onEdit, onDelete, currentPage, totalPages, onPageChange }: TransactionListProps) => {
  const getCategoryById = (id: string | null) => {
    return categories.find(cat => cat.id === id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No transactions yet. Add your first transaction to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => {
            const category = getCategoryById(transaction.category_id);
            const isIncome = transaction.transaction_type === "income";
            
            return (
              <div key={transaction.id} className="flex flex-col gap-3 p-4 border rounded-lg sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isIncome ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    {isIncome ? (
                      <ArrowUp className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{transaction.description}</p>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-2">
                      <span className="whitespace-nowrap">{formatDate(transaction.transaction_date)}</span>
                      {category && (
                        <>
                          <span className="hidden sm:block">•</span>
                          <div className="flex items-center gap-1">
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="truncate">{category.name}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end lg:flex-row lg:items-center">
                  <div className="flex items-center gap-2">
                    {!transaction.synced && (
                      <div title="Pending sync">
                        <Clock className="h-4 w-4 text-warning" />
                      </div>
                    )}
                    <span className={`font-semibold text-lg sm:text-base ${isIncome ? 'text-success' : 'text-destructive'}`}>
                      {isIncome ? '+' : '-'}Php{transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(transaction)}
                      className="h-9 w-9 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(transaction.id)}
                      className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => onPageChange(page)}
                      isActive={page === currentPage}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionList;