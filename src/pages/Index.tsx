import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, MapPin, Shield, Zap, Globe, Cpu, ArrowRight } from "lucide-react";

const Index = () => {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="text-center space-y-8">
            {/* Main Title */}
            <div className="space-y-4">
              <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text text-transparent leading-tight">
                CampusEats
              </h1>
              <div className="flex items-center justify-center gap-2 text-cyan-400">
                <Cpu className="h-6 w-6" />
                <span className="text-lg font-medium">AI-Powered Delivery Network</span>
                <Cpu className="h-6 w-6" />
              </div>
            </div>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Experience the future of autonomous delivery. Our intelligent robotic fleet delivers your packages with precision, speed, and reliability.
            </p>
            
            {/* Main Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
              <Link to="/request-delivery">
                <Button 
                  className="group bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-12 py-6 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-110 border-2 border-blue-400/30 hover:border-blue-300/50 min-w-[200px]"
                >
                  <Package className="h-8 w-8 mr-3" />
                  Request Delivery
                  <ArrowRight className="h-6 w-6 ml-3 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
              
              <Link to="/track-package">
                <Button 
                  variant="outline"
                  className="group border-3 border-cyan-400 text-cyan-300 hover:bg-cyan-400/20 hover:text-cyan-200 px-12 py-6 text-xl font-bold rounded-2xl backdrop-blur-sm transition-all duration-300 transform hover:scale-110 bg-slate-800/30 hover:bg-slate-700/40 min-w-[200px] shadow-xl hover:shadow-cyan-500/20"
                >
                  <MapPin className="h-8 w-8 mr-3" />
                  Track Package
                  <ArrowRight className="h-6 w-6 ml-3 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
              
              <Link to="/admin">
                <Button 
                  variant="outline"
                  className="group border-3 border-slate-300 text-slate-200 hover:bg-slate-300/20 hover:text-white px-12 py-6 text-xl font-bold rounded-2xl backdrop-blur-sm transition-all duration-300 transform hover:scale-110 bg-slate-800/30 hover:bg-slate-700/40 min-w-[200px] shadow-xl hover:shadow-slate-400/20"
                >
                  <Shield className="h-8 w-8 mr-3" />
                  Admin Portal
                  <ArrowRight className="h-6 w-6 ml-3 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
            </div>
            
            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 max-w-4xl mx-auto">
              <div className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50">
                <div className="p-3 rounded-full bg-blue-500/20">
                  <Zap className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Lightning Fast</h3>
                <p className="text-sm text-slate-400 text-center">Average delivery time under 30 minutes</p>
              </div>
              
              <div className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50">
                <div className="p-3 rounded-full bg-cyan-500/20">
                  <Globe className="h-8 w-8 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">24/7 Service</h3>
                <p className="text-sm text-slate-400 text-center">Round-the-clock autonomous delivery</p>
              </div>
              
              <div className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50">
                <div className="p-3 rounded-full bg-green-500/20">
                  <Cpu className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">AI Powered</h3>
                <p className="text-sm text-slate-400 text-center">Smart routing and optimization</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-20 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-slate-400">
            © 2024 CampusEats. Delivering the future, today.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
