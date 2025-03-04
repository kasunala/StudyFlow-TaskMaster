import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, ChevronDown, Crown, LogOut, Settings, User } from "lucide-react";

interface DashboardHeaderProps {
  userEmail?: string;
  userImage?: string;
  isFreeTier?: boolean;
  notificationCount?: number;
  onUpgradeClick?: () => void;
  onLogout?: () => void;
  onSettingsClick?: () => void;
}

const DashboardHeader = ({
  userEmail = "user@example.com",
  userImage = "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
  isFreeTier = true,
  notificationCount = 3,
  onUpgradeClick = () => {},
  onLogout = () => {},
  onSettingsClick = () => {},
}: DashboardHeaderProps) => {
  return (
    <header className="w-full h-[72px] px-6 bg-white border-b border-gray-200 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center">
        <h1 className="text-2xl font-bold text-primary">TaskMaster</h1>
      </div>

      {/* Right side controls */}
      <div className="flex items-center space-x-4">
        {/* Upgrade Button (shown only for free tier) */}
        {isFreeTier && (
          <Button
            onClick={onUpgradeClick}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade Now
          </Button>
        )}

        {/* Notifications */}
        <Button variant="ghost" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userImage} alt={userEmail} />
                <AvatarFallback>{userEmail[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline-block">{userEmail}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onSettingsClick}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSettingsClick}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default DashboardHeader;
