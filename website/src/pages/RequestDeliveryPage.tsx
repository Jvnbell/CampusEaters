import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import DeliveryRequest from "@/components/DeliveryRequest";

const RequestDeliveryPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header with back button */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button 
              variant="ghost" 
              className="text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text text-transparent">
              Request a Delivery
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Fill out the form below to request a robot delivery. Our autonomous fleet will handle your package with care.
            </p>
          </div>
          
          <DeliveryRequest />
        </div>
      </main>

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

export default RequestDeliveryPage;

