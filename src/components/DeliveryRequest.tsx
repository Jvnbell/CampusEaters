import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Package } from "lucide-react";

const DeliveryRequest = () => {
  const [formData, setFormData] = useState({
    pickupLocation: "",
    deliveryLocation: "",
    recipientName: "",
    recipientEmail: "",
    packageDetails: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pickupLocation || !formData.deliveryLocation || !formData.recipientName) {
      toast.error("Please fill in all required fields");
      return;
    }

    toast.success("Delivery request submitted! A robot will be dispatched shortly.");
    setFormData({
      pickupLocation: "",
      deliveryLocation: "",
      recipientName: "",
      recipientEmail: "",
      packageDetails: "",
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Package className="h-6 w-6 text-primary" />
          <CardTitle>New Delivery Request</CardTitle>
        </div>
        <CardDescription>Fill in the details below to request a robot delivery</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pickupLocation">Pickup Location *</Label>
            <Input
              id="pickupLocation"
              placeholder="Enter pickup address"
              value={formData.pickupLocation}
              onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryLocation">Delivery Location *</Label>
            <Input
              id="deliveryLocation"
              placeholder="Enter delivery address"
              value={formData.deliveryLocation}
              onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name *</Label>
              <Input
                id="recipientName"
                placeholder="Full name"
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="Email address"
                value={formData.recipientEmail}
                onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="packageDetails">Package Details</Label>
            <Textarea
              id="packageDetails"
              placeholder="Describe the package (size, contents, special instructions)"
              value={formData.packageDetails}
              onChange={(e) => setFormData({ ...formData, packageDetails: e.target.value })}
              rows={4}
            />
          </div>

          <Button type="submit" className="w-full">
            Request Delivery
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default DeliveryRequest;
