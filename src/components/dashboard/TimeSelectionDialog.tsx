import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Clock } from "lucide-react";

interface TimeSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDuration: number;
  onSave: (duration: number) => void;
  taskTitle: string;
}

const TimeSelectionDialog = ({
  open,
  onOpenChange,
  initialDuration,
  onSave,
  taskTitle,
}: TimeSelectionDialogProps) => {
  const [duration, setDuration] = useState(initialDuration || 30);

  // Reset duration when dialog opens
  useEffect(() => {
    if (open) {
      setDuration(initialDuration || 30);
    }
  }, [open, initialDuration]);

  const handleSave = () => {
    onSave(duration);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Set Task Duration</DialogTitle>
          <DialogDescription>
            Adjust the time needed for "{taskTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Duration</Label>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div className="flex-1">
                <Slider
                  value={[duration]}
                  min={15}
                  max={240}
                  step={15}
                  onValueChange={(value) => {
                    setDuration(value[0]);
                  }}
                />
              </div>
              <span className="text-sm font-medium w-16 text-right">
                {duration} min
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TimeSelectionDialog; 