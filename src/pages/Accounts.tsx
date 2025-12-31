import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Eye, EyeOff, Lock, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Account = {
  id: string;
  label: string;
  accountNumber: string;
};

const sampleAccounts: Account[] = [
  { id: "1", label: "Bills: Housing Loan", accountNumber: "1234-5678-9012-3456" },
];

const Accounts = () => {
  const { user } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleUnlock = async () => {
    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    setIsVerifying(true);
    
    try {
      // Re-authenticate with current password
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Accounts</h1>
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
                Enter your password to view account details.
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
            {sampleAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No accounts added yet.
              </p>
            ) : (
              <div className="space-y-4">
                {sampleAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium text-sm md:text-base">{account.label}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-13 sm:ml-0">
                      {isUnlocked ? (
                        <span className="font-mono text-sm text-foreground">
                          {account.accountNumber}
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground">
                          {maskAccountNumber(account.accountNumber)}
                        </span>
                      )}
                      {isUnlocked ? (
                        <Eye className="h-4 w-4 text-primary" />
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
    </div>
  );
};

export default Accounts;
