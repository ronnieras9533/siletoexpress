
import { Button } from "@/components/ui/button";
import { Upload, Shield, Truck, Clock } from "lucide-react";

const Hero = () => {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Your Health, <br />
              <span className="text-blue-200">Delivered Safely</span>
            </h1>
            <p className="text-lg mb-8 text-blue-100">
              Licensed pharmacy delivering authentic medicines across Kenya. 
              Upload your prescription and get your medications delivered to your door.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                <Upload className="mr-2" size={20} />
                Upload Prescription
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                Browse Products
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
              <Shield className="mx-auto mb-3 text-blue-200" size={32} />
              <h3 className="font-semibold mb-2">PPB Licensed</h3>
              <p className="text-sm text-blue-200">Fully licensed by Kenya's Pharmacy & Poisons Board</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
              <Truck className="mx-auto mb-3 text-blue-200" size={32} />
              <h3 className="font-semibold mb-2">Fast Delivery</h3>
              <p className="text-sm text-blue-200">Same-day delivery in Nairobi, nationwide shipping</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
              <Clock className="mx-auto mb-3 text-blue-200" size={32} />
              <h3 className="font-semibold mb-2">24/7 Support</h3>
              <p className="text-sm text-blue-200">Round-the-clock pharmacist consultation</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
              <Shield className="mx-auto mb-3 text-blue-200" size={32} />
              <h3 className="font-semibold mb-2">Secure Payment</h3>
              <p className="text-sm text-blue-200">M-PESA & secure card payments</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
