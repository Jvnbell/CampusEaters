import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Shield, Activity, Gauge, RotateCw, RotateCcw, Play, Square } from "lucide-react";

interface MotorData {
  id: string;
  name: string;
  speed: number; // 0-100%
  direction: "forward" | "backward" | "stop";
  pwm: number; // 0-255
  enabled: boolean;
}

const AdminPage = () => {
  const [motors, setMotors] = useState<MotorData[]>([
    {
      id: "left",
      name: "Left Motor",
      speed: 75,
      direction: "forward",
      pwm: 191,
      enabled: true,
    },
    {
      id: "right",
      name: "Right Motor",
      speed: 75,
      direction: "forward",
      pwm: 191,
      enabled: true,
    },
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMotors((prev) =>
        prev.map((motor) => ({
          ...motor,
          speed: Math.max(0, Math.min(100, motor.speed + (Math.random() - 0.5) * 2)),
          pwm: Math.round((motor.speed / 100) * 255),
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case "forward":
        return <RotateCw className="h-5 w-5 text-green-600" />;
      case "backward":
        return <RotateCcw className="h-5 w-5 text-red-600" />;
      default:
        return <Square className="h-5 w-5 text-slate-400" />;
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case "forward":
        return "bg-green-600";
      case "backward":
        return "bg-red-600";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Button 
                variant="ghost" 
                className="text-slate-300 hover:text-white hover:bg-slate-800/50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-300" />
              <h1 className="text-xl font-semibold text-slate-200">Admin Dashboard</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text text-transparent">
              Motor Control Dashboard
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Real-time monitoring of robot motor speed, direction, and PWM control
            </p>
          </div>

          {/* System Status */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-400" />
                  <CardTitle className="text-slate-200">System Status</CardTitle>
                </div>
                <Badge className="bg-green-600 text-white">Active</Badge>
              </div>
              <CardDescription className="text-slate-400">
                Arduino and Motor Driver Connection Status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-slate-300">Arduino Status</span>
                  </div>
                  <p className="text-lg font-semibold text-green-400">Connected</p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-slate-300">Motor Driver</span>
                  </div>
                  <p className="text-lg font-semibold text-green-400">Operational</p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Play className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-slate-300">Control Mode</span>
                  </div>
                  <p className="text-lg font-semibold text-cyan-400">PWM Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Motor Data Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {motors.map((motor) => (
              <Card key={motor.id} className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-200">{motor.name}</CardTitle>
                    <Badge className={motor.enabled ? "bg-green-600 text-white" : "bg-slate-600 text-slate-300"}>
                      {motor.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-400">
                    Real-time motor performance data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Direction */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">Direction</span>
                      <div className="flex items-center gap-2">
                        {getDirectionIcon(motor.direction)}
                        <Badge className={`${getDirectionColor(motor.direction)} text-white capitalize`}>
                          {motor.direction}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Speed */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">Speed</span>
                      <span className="text-lg font-semibold text-cyan-400">{Math.round(motor.speed)}%</span>
                    </div>
                    <Progress value={motor.speed} className="h-3 bg-slate-200" />
                  </div>

                  {/* PWM Value */}
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">PWM Value</span>
                      <span className="text-2xl font-bold text-slate-200 font-mono">{motor.pwm}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Range: 0-255</p>
                  </div>

                  {/* Motor Status Details */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Enable Pin</p>
                      <p className="text-sm font-semibold text-slate-200">
                        {motor.enabled ? "HIGH" : "LOW"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Direction Pin</p>
                      <p className="text-sm font-semibold text-slate-200">
                        {motor.direction === "forward" ? "HIGH" : motor.direction === "backward" ? "LOW" : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Differential Control Info */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-slate-200">Differential Control Status</CardTitle>
              <CardDescription className="text-slate-400">
                Independent wheel control for turns and straight motion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-300">Current Motion</span>
                    <Badge className="bg-blue-600 text-white">Straight Forward</Badge>
                  </div>
                  <p className="text-sm text-slate-400">
                    Both motors running at {Math.round(motors[0].speed)}% speed in forward direction
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Left Motor Speed</p>
                    <p className="text-2xl font-bold text-cyan-400">{Math.round(motors[0].speed)}%</p>
                  </div>
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Right Motor Speed</p>
                    <p className="text-2xl font-bold text-cyan-400">{Math.round(motors[1].speed)}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-20 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-slate-400">
            © 2024 CampusEats. Admin Dashboard - Authorized Personnel Only
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AdminPage;

