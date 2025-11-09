import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Package, CheckCircle2, Truck, Home, Navigation } from "lucide-react";

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
      statusColor: "bg-blue-500",
      progress: 65,
      currentLocation: "Main Street & 5th Avenue",
      estimatedArrival: "15 minutes",
      robotId: "ROBOT-042",
      pickupLocation: "Dining Hall A",
      deliveryLocation: "Residence Hall B, Room 204",
      steps: [
        { 
          label: "Order Confirmed", 
          description: "Your order has been received",
          completed: true,
          timestamp: "10:30 AM",
          icon: CheckCircle2
        },
        { 
          label: "Package Picked Up", 
          description: "Robot has collected your package",
          completed: true,
          timestamp: "10:45 AM",
          icon: Package
        },
        { 
          label: "In Transit", 
          description: "Robot is on the way to your location",
          completed: true,
          timestamp: "10:50 AM",
          icon: Truck
        },
        { 
          label: "Arriving Soon", 
          description: "Robot is approaching your location",
          completed: false,
          timestamp: "11:05 AM (est.)",
          icon: Navigation
        },
        { 
          label: "Delivered", 
          description: "Package has been delivered",
          completed: false,
          timestamp: null,
          icon: Home
        },
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
            {/* Status Overview */}
            <div className="p-4 bg-slate-200 rounded-lg space-y-3 border border-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black">Status:</span>
                <Badge className={`${trackingData.statusColor} text-white`}>
                  {trackingData.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black">Robot ID:</span>
                <span className="text-sm text-black font-mono">{trackingData.robotId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black">Current Location:</span>
                <span className="text-sm text-black">{trackingData.currentLocation}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black">Estimated Arrival:</span>
                <span className="text-sm font-semibold text-black">{trackingData.estimatedArrival}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-black">Delivery Progress</h3>
              <Progress value={trackingData.progress} className="h-3 bg-slate-200" />
            </div>

            {/* Map Placeholder */}
            <div className="relative w-full h-64 bg-blue-50/30 rounded-lg border border-blue-200/30 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 to-cyan-100/40">
                {/* Grid pattern for map-like appearance */}
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: `
                    linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }}></div>
                
                {/* Route line */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 256">
                  <path
                    d="M 50 200 Q 100 150, 150 100 T 250 50 Q 300 30, 350 50"
                    fill="none"
                    stroke="rgba(59, 130, 246, 0.4)"
                    strokeWidth="3"
                    strokeDasharray="5,5"
                  />
                  
                  {/* Pickup marker */}
                  <circle cx="50" cy="200" r="8" fill="#059669" />
                  <circle cx="50" cy="200" r="12" fill="#059669" opacity="0.3" className="animate-pulse" />
                  
                  {/* Current location marker */}
                  <circle cx="200" cy="62.5" r="10" fill="#3b82f6" />
                  <circle cx="200" cy="62.5" r="16" fill="#3b82f6" opacity="0.3" className="animate-pulse" />
                  
                  {/* Delivery marker */}
                  <circle cx="350" cy="50" r="8" fill="#ef4444" />
                </svg>
                
                {/* Map labels */}
                <div className="absolute bottom-4 left-4 text-xs text-white bg-slate-900/70 px-2 py-1 rounded">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {trackingData.pickupLocation}
                </div>
                <div className="absolute top-4 right-4 text-xs text-white bg-slate-900/70 px-2 py-1 rounded">
                  <Home className="h-3 w-3 inline mr-1" />
                  {trackingData.deliveryLocation}
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-white bg-slate-900/70 px-2 py-1 rounded font-semibold">
                  <Truck className="h-3 w-3 inline mr-1" />
                  {trackingData.currentLocation}
                </div>
              </div>
              <div className="absolute top-2 right-2 text-xs text-slate-500 bg-slate-900/50 px-2 py-1 rounded">
                Map View
              </div>
            </div>

            {/* Status Timeline */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-black">Delivery Timeline</h3>
              <div className="relative">
                {/* Timeline line - completed portion in green, active portion in blue */}
                {trackingData.steps.map((step: any, index: number) => {
                  if (index === trackingData.steps.length - 1) return null;
                  
                  const activeIndex = trackingData.steps.findIndex((s: any) => !s.completed);
                  const isLineCompleted = index < activeIndex - 1;
                  const isLineActive = index === activeIndex - 1;
                  
                  return (
                    <div
                      key={`line-${index}`}
                      className={`absolute left-6 w-0.5 transition-colors ${
                        isLineCompleted
                          ? 'bg-green-600'
                          : isLineActive
                          ? 'bg-blue-500'
                          : 'bg-slate-700'
                      }`}
                      style={{
                        top: `${(index * 96) + 48}px`,
                        height: '96px',
                        zIndex: 0,
                      }}
                    />
                  );
                })}
                
                {trackingData.steps.map((step: any, index: number) => {
                  const IconComponent = step.icon;
                  const isActive = trackingData.steps.findIndex((s: any) => !s.completed) === index;
                  
                  return (
                    <div 
                      key={index} 
                      className={`relative flex items-start gap-4 mb-8 last:mb-0 ${
                        isActive ? 'bg-blue-500/10 rounded-lg p-4 -mx-4 border-2 border-blue-500/50' : ''
                      }`}
                    >
                      {/* Icon with enhanced active state */}
                      <div className="relative z-10">
                        <div className={`relative flex items-center justify-center w-12 h-12 rounded-full ${
                          step.completed 
                            ? 'bg-green-600 text-white shadow-lg shadow-green-600/50' 
                            : isActive
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                            : 'bg-slate-700 text-slate-400'
                        } ${isActive ? 'animate-pulse' : ''}`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        {/* Glowing ring for active state */}
                        {isActive && (
                          <>
                            <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"></div>
                            <div className="absolute -inset-2 rounded-full border-2 border-blue-400/50 animate-pulse"></div>
                          </>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold text-base ${
                              step.completed 
                                ? 'text-green-600' 
                                : isActive
                                ? 'text-blue-400'
                                : 'text-slate-400'
                            }`}>
                              {step.label}
                            </p>
                            {isActive && (
                              <Badge className="bg-blue-500 text-white text-xs animate-pulse">
                                CURRENT
                              </Badge>
                            )}
                            {step.completed && (
                              <Badge className="bg-green-600 text-white text-xs">
                                COMPLETE
                              </Badge>
                            )}
                          </div>
                          {step.timestamp && (
                            <span className={`text-xs whitespace-nowrap ${
                              isActive ? 'text-blue-300 font-medium' : 'text-slate-500'
                            }`}>
                              {step.timestamp}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${
                          step.completed 
                            ? 'text-green-600/80' 
                            : isActive
                            ? 'text-blue-300'
                            : 'text-slate-500'
                        }`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackDelivery;
