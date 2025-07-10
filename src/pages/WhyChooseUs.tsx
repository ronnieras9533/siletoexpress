
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Phone, 
  Truck, 
  Heart, 
  Clock, 
  Award,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';

const WhyChooseUs = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Shield,
      title: "Licensed Pharmacy",
      description: "We are a fully licensed pharmacy with certified pharmacists ensuring all medications meet the highest quality standards.",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: CheckCircle,
      title: "Prescription Verification",
      description: "All prescriptions are carefully verified by our qualified professionals before dispensing any medication.",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: Shield,
      title: "Secure Payments",
      description: "Safe and secure M-PESA payments with fast, reliable delivery to your doorstep across Kenya.",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      icon: Heart,
      title: "Chronic Care Management",
      description: "Comprehensive care for chronic conditions with personalized medication management and monitoring.",
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      icon: Clock,
      title: "24/7 Support",
      description: "Round-the-clock customer support for all your pharmaceutical needs and emergency consultations.",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "Quick and reliable delivery service ensuring your medications reach you when you need them most.",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Button>
          
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose SiletoExpress?
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your trusted online pharmacy committed to providing safe, reliable, and accessible healthcare solutions across Kenya.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className={`w-16 h-16 ${feature.bgColor} rounded-full flex items-center justify-center mb-4`}>
                  <feature.icon className={`h-8 w-8 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Emergency Services Section */}
        <Card className="bg-gradient-to-r from-red-600 to-red-700 text-white mb-12">
          <CardContent className="p-8 text-center">
            <Phone className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Emergency Services</h2>
            <p className="text-xl mb-6">
              Need urgent medication or have a pharmaceutical emergency? 
              Our team is available 24/7 to assist you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a 
                href="tel:+254700123456" 
                className="text-2xl font-bold hover:underline"
              >
                +254 700 123 456
              </a>
              <Button 
                variant="secondary" 
                className="bg-white text-red-600 hover:bg-red-50"
                onClick={() => navigate('/products')}
              >
                Shop Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">5000+</div>
            <div className="text-gray-600">Happy Customers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">24/7</div>
            <div className="text-gray-600">Customer Support</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">99%</div>
            <div className="text-gray-600">Customer Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">Same Day</div>
            <div className="text-gray-600">Delivery Available</div>
          </div>
        </div>

        {/* Call to Action */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-8 text-center">
            <Award className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Experience Better Healthcare?
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Join thousands of satisfied customers who trust SiletoExpress for their pharmaceutical needs. 
              Start shopping today and experience the difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/products')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Browse Products
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/auth')}
              >
                Create Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
};

export default WhyChooseUs;
