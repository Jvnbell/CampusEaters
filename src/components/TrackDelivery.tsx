import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { MapPin, Package, CheckCircle2 } from "lucide-react";

const TrackDelivery = () => {
  const [trackingId, setTrackingId] = useState("");
  const [trackingData, setTrackingData] = useState<any>(null);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trackingId.trim()) {
      toast.error("Please enter a tracking ID");
      return;
    }

    // Simulated tracking data
    setTrackingData({
      id: trackingId,
      status: "In Transit",
      progress: 65,
      currentLocation: "Main Street & 5th Avenue",
      estimatedArrival: "15 minutes",
      steps: [
        { label: "Package Picked Up", completed: true },
        { label: "In Transit", completed: true },
        { label: "Arriving Soon", completed: false },
        { label: "Delivered", completed: false },
      ],
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-6 w-6 text-primary" />
          <CardTitle>Track Your Delivery</CardTitle>
        </div>
        <CardDescription>Enter your tracking ID to see real-time updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleTrack} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trackingId">Tracking ID</Label>
            <div className="flex gap-2">
              <Input
                id="trackingId"
                placeholder="Enter tracking number"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">Track</Button>
            </div>
          </div>
        </form>

        {trackingData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <span className="text-sm font-semibold text-primary">{trackingData.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Location:</span>
                <span className="text-sm">{trackingData.currentLocation}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Estimated Arrival:</span>
                <span className="text-sm font-semibold text-secondary">{trackingData.estimatedArrival}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span className="font-semibold">{trackingData.progress}%</span>
              </div>
              <Progress value={trackingData.progress} className="h-2" />
            </div>

            <div className="space-y-4">
              {trackingData.steps.map((step: any, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`mt-1 ${step.completed ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Package className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackDelivery;
