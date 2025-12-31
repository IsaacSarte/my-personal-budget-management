import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, Lock, CreditCard, Plus, Pencil, Trash2, X } from "lucide-react";
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

type Account = {
  id: string;
  label: string;
  account_number: string;
  user_id: string;
};

const Accounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formAccountNumber, setFormAccountNumber] = useState("");
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
      setAccounts(data || []);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      toast.error("Failed to load accounts");
    } finally {
      setIsLoading(false);
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
        toast.success("Accounts unlocked");
      }
    } catch (error) {
      toast.error("Failed to verify password");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setPassword("");
  };

  const maskAccountNumber = (accountNumber: string) => {
    return accountNumber.replace(/./g, "•");
  };

  const openAddForm = () => {
    setEditingAccount(null);
    setFormLabel("");
    setFormAccountNumber("");
    setShowForm(true);
  };

  const openEditForm = (account: Account) => {
    setEditingAccount(account);
    setFormLabel(account.label);
    setFormAccountNumber(account.account_number);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingAccount(null);
    setFormLabel("");
    setFormAccountNumber("");
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
        // Update existing account
        const { error } = await supabase
          .from("accounts")
          .update({
            label: formLabel.trim(),
            account_number: formAccountNumber.trim(),
          })
          .eq("id", editingAccount.id)
          .eq("user_id", user.id);

        if (error) throw error;

        setAccounts(prev =>
          prev.map(a =>
            a.id === editingAccount.id
              ? { ...a, label: formLabel.trim(), account_number: formAccountNumber.trim() }
              : a
          )
        );
        toast.success("Account updated!");
      } else {
        // Create new account
        const { data, error } = await supabase
          .from("accounts")
          .insert({
            label: formLabel.trim(),
            account_number: formAccountNumber.trim(),
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        setAccounts(prev => [data, ...prev]);
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
          {isUnlocked && (
            <Button onClick={openAddForm} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          )}
        </div>

        {/* Unlock Card */}
        {!isUnlocked && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Lock className="h-5 w-5 text-muted-foreground" />
                Account Details Protected
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your password to view and manage account details.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleUnlock} 
                  disabled={isVerifying}
                  className="w-full sm:w-auto"
                >
                  {isVerifying ? "Verifying..." : "Unlock"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accounts List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <CreditCard className="h-5 w-5" />
              My Accounts
            </CardTitle>
            {isUnlocked && (
              <Button variant="ghost" size="sm" onClick={handleLock}>
                <EyeOff className="h-4 w-4 mr-2" />
                Lock
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Loading accounts...
              </p>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {isUnlocked ? "No accounts added yet. Click 'Add Account' to create one." : "No accounts added yet."}
              </p>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-sm md:text-base block truncate">
                          {account.label}
                        </span>
                        <span className="font-mono text-xs md:text-sm text-muted-foreground">
                          {isUnlocked ? account.account_number : maskAccountNumber(account.account_number)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-13 sm:ml-0">
                      {isUnlocked ? (
                        <>
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
                        </>
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                placeholder="e.g., Bills: Housing Loan"
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
