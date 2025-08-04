
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Clock, Truck, Users, Award, Phone } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const WhyChooseUs = () => {
  const features = [
    {
      icon: Shield,
      title: "Authentic Medicines",
      description: "All our medicines are sourced from licensed distributors and verified for authenticity to ensure your safety."
    },
    {
      icon: Clock,
      title: "24/7 Service",
      description: "Round-the-clock availability for urgent medical needs. We're here when you need us most."
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "Quick and reliable delivery across Kenya. Get your medicines delivered to your doorstep."
    },
    {
      icon: Users,
      title: "Expert Consultation",
      description: "Professional pharmacists available for consultation and guidance on medication usage."
    },
    {
      icon: Award,
      title: "Quality Assured",
      description: "Rigorous quality checks and proper storage conditions maintain medicine effectiveness."
    },
    {
      icon: Phone,
      title: "Easy Ordering",
      description: "Simple online ordering process with multiple payment options including M-PESA."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Why Choose SiletoExpress?</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your health is our priority. We're committed to providing safe, authentic medicines 
            with exceptional service across Kenya.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="bg-white rounded-lg p-8 shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Commitment</h2>
            <p className="text-lg text-gray-600 max-w-4xl mx-auto mb-8">
              At SiletoExpress, we understand that access to quality healthcare and medicines 
              is fundamental. That's why we've built a platform that prioritizes safety, 
              authenticity, and convenience. Our team of qualified pharmacists ensures every 
              order meets the highest standards of pharmaceutical care.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">5000+</div>
                <div className="text-gray-600">Happy Customers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
                <div className="text-gray-600">Customer Support</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
                <div className="text-gray-600">Authentic Products</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default WhyChooseUs;
