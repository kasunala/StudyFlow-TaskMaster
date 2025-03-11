import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const { currentUser } = useAuth();
  const { userTier, upgradeToPaid, isLoading } = useUser();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading profile information...</p>
      </div>
    );
  }

  const handleUpgradeClick = async () => {
    try {
      await upgradeToPaid();
    } catch (error) {
      console.error("Error upgrading plan:", error);
    }
  };

  const handleBackClick = () => {
    navigate("/");
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button 
        variant="ghost" 
        onClick={handleBackClick} 
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage 
                  src={currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.email}`} 
                  alt={currentUser?.displayName || currentUser?.email || "User"} 
                />
                <AvatarFallback>
                  {currentUser?.email ? currentUser.email[0].toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">
                  {currentUser?.displayName || "User"}
                </CardTitle>
                <CardDescription>{currentUser?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Account Information</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your account details and preferences
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Account Created</p>
                  <p className="text-sm text-muted-foreground">
                    {currentUser?.metadata?.creationTime 
                      ? new Date(currentUser.metadata.creationTime).toLocaleDateString() 
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Your current plan details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Plan</span>
                {userTier === "paid" ? (
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600">
                    <Crown className="mr-1 h-3 w-3" />
                    Premium
                  </Badge>
                ) : (
                  <Badge variant="outline">Free</Badge>
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Features</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <span className="mr-2">✓</span>
                    <span>{userTier === "paid" ? "Unlimited" : "Up to 5"} assignments</span>
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">✓</span>
                    <span>{userTier === "paid" ? "Unlimited" : "Basic"} calendar features</span>
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">{userTier === "paid" ? "✓" : "✗"}</span>
                    <span className={userTier !== "paid" ? "text-muted-foreground" : ""}>
                      Priority support
                    </span>
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">{userTier === "paid" ? "✓" : "✗"}</span>
                    <span className={userTier !== "paid" ? "text-muted-foreground" : ""}>
                      Advanced analytics
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {userTier === "free" && (
              <Button 
                onClick={handleUpgradeClick} 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              >
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Premium
              </Button>
            )}
            {userTier === "paid" && (
              <p className="text-sm text-center w-full text-muted-foreground">
                You're enjoying all premium features
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage; 