import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, CreditCard, Plus, Pencil, Trash2, Wallet, Landmark, Smartphone, PiggyBank, Receipt, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AccountType = "savings" | "credit_card" | "e_wallet" | "checking" | "bills" | "other";

type Account = {
  id: string;
  label: string;
  account_number: string;
  account_type: AccountType;
  user_id: string;
};

const accountTypes: { value: AccountType; label: string; icon: typeof CreditCard; color: string }[] = [
  { value: "savings", label: "Savings", icon: PiggyBank, color: "bg-emerald-500" },
  { value: "credit_card", label: "Credit Card", icon: CreditCard, color: "bg-blue-500" },
  { value: "e_wallet", label: "E-Wallet", icon: Smartphone, color: "bg-purple-500" },
  { value: "checking", label: "Checking", icon: Landmark, color: "bg-amber-500" },
  { value: "bills", label: "Bills", icon: Receipt, color: "bg-rose-500" },
  { value: "other", label: "Other", icon: MoreHorizontal, color: "bg-slate-500" },
];

const getAccountTypeConfig = (type: AccountType) => {
  return accountTypes.find(t => t.value === type) || accountTypes[accountTypes.length - 1];
};

const Accounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formAccountNumber, setFormAccountNumber] = useState("");
  const [formAccountType, setFormAccountType] = useState<AccountType>("other");
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete state
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts((data as Account[]) || []);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      toast.error("Failed to load accounts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowClick = () => {
    if (isUnlocked) {
      setIsUnlocked(false);
    } else {
      setShowPasswordModal(true);
    }
  };

  const handleUnlock = async () => {
    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    setIsVerifying(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: password,
      });

      if (error) {
        toast.error("Incorrect password");
        setPassword("");
      } else {
        setIsUnlocked(true);
        setShowPasswordModal(false);
        setPassword("");
        toast.success("Accounts unlocked");
      }
    } catch (error) {
      toast.error("Failed to verify password");
    } finally {
      setIsVerifying(false);
    }
  };

  const maskAccountNumber = (accountNumber: string) => {
    return accountNumber.replace(/./g, "•");
  };

  const openAddForm = () => {
    setEditingAccount(null);
    setFormLabel("");
    setFormAccountNumber("");
    setFormAccountType("other");
    setShowForm(true);
  };

  const openEditForm = (account: Account) => {
    setEditingAccount(account);
    setFormLabel(account.label);
    setFormAccountNumber(account.account_number);
    setFormAccountType(account.account_type || "other");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingAccount(null);
    setFormLabel("");
    setFormAccountNumber("");
    setFormAccountType("other");
  };

  const handleSubmit = async () => {
    if (!formLabel.trim() || !formAccountNumber.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setIsSaving(true);

    try {
      if (editingAccount) {
        const { error } = await supabase
          .from("accounts")
          .update({
            label: formLabel.trim(),
            account_number: formAccountNumber.trim(),
            account_type: formAccountType,
          })
          .eq("id", editingAccount.id)
          .eq("user_id", user.id);

        if (error) throw error;

        setAccounts(prev =>
          prev.map(a =>
            a.id === editingAccount.id
              ? { ...a, label: formLabel.trim(), account_number: formAccountNumber.trim(), account_type: formAccountType }
              : a
          )
        );
        toast.success("Account updated!");
      } else {
        const { data, error } = await supabase
          .from("accounts")
          .insert({
            label: formLabel.trim(),
            account_number: formAccountNumber.trim(),
            account_type: formAccountType,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        setAccounts(prev => [data as Account, ...prev]);
        toast.success("Account added!");
      }

      closeForm();
    } catch (error) {
      console.error("Failed to save account:", error);
      toast.error("Failed to save account");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAccount || !user) return;

    try {
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", deletingAccount.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setAccounts(prev => prev.filter(a => a.id !== deletingAccount.id));
      toast.success("Account deleted!");
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Failed to delete account");
    } finally {
      setDeletingAccount(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Accounts</h1>
          </div>
          <Button onClick={openAddForm} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>

        {/* Accounts List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Wallet className="h-5 w-5" />
              My Accounts
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleShowClick}>
              {isUnlocked ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Loading accounts...
              </p>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No accounts added yet. Click 'Add Account' to create one.
              </p>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => {
                  const typeConfig = getAccountTypeConfig(account.account_type);
                  const IconComponent = typeConfig.icon;
                  
                  return (
                    <div
                      key={account.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full ${typeConfig.color} flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm md:text-base truncate">
                              {account.label}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {typeConfig.label}
                            </span>
                          </div>
                          <span className="font-mono text-xs md:text-sm text-muted-foreground">
                            {isUnlocked ? account.account_number : maskAccountNumber(account.account_number)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-13 sm:ml-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditForm(account)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingAccount(account)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Password Verification Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Enter your password to view account details.
            </p>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => {
                setShowPasswordModal(false);
                setPassword("");
              }}>
                Cancel
              </Button>
              <Button onClick={handleUnlock} disabled={isVerifying}>
                {isVerifying ? "Verifying..." : "Unlock"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Account" : "Add Account"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type</Label>
              <Select value={formAccountType} onValueChange={(value) => setFormAccountType(value as AccountType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div className={`h-5 w-5 rounded-full ${type.color} flex items-center justify-center`}>
                            <IconComponent className="h-3 w-3 text-white" />
                          </div>
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                placeholder="e.g., Housing Loan"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="e.g., 1234-5678-9012-3456"
                value={formAccountNumber}
                onChange={(e) => setFormAccountNumber(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? "Saving..." : editingAccount ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingAccount} onOpenChange={() => setDeletingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAccount?.label}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Accounts;
