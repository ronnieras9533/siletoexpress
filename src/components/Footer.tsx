
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Shield,
  Truck,
  Clock,
  Award
} from "lucide-react";

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-bold text-blue-400 mb-4">SiletoExpress</h3>
            <p className="text-gray-300 mb-4">
              Your trusted online pharmacy in Kenya, providing authentic medications and healthcare products with professional service.
            </p>
            <div className="flex space-x-4">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                <Facebook className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                <Twitter className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                <Instagram className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Button 
                  variant="ghost" 
                  className="text-gray-300 hover:text-white p-0 h-auto font-normal"
                  onClick={() => navigate('/products')}
                >
                  All Products
                </Button>
              </li>
              <li>
                <Button 
                  variant="ghost" 
                  className="text-gray-300 hover:text-white p-0 h-auto font-normal"
                  onClick={() => navigate('/prescription-upload')}
                >
                  Upload Prescription
                </Button>
              </li>
              <li>
                <Button 
                  variant="ghost" 
                  className="text-gray-300 hover:text-white p-0 h-auto font-normal"
                  onClick={() => navigate('/cart')}
                >
                  Shopping Cart
                </Button>
              </li>
              <li>
                <Button 
                  variant="ghost" 
                  className="text-gray-300 hover:text-white p-0 h-auto font-normal"
                  onClick={() => navigate('/auth')}
                >
                  Sign In
                </Button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <div className="space-y-3">
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-blue-400" />
                <span className="text-gray-300">+254 700 123 456</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-blue-400" />
                <span className="text-gray-300">info@siletoexpress.com</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-blue-400" />
                <span className="text-gray-300">Nairobi, Kenya</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-400" />
                <span className="text-gray-300">24/7 Support</span>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Newsletter</h4>
            <p className="text-gray-300 mb-4">
              Stay updated with health tips and special offers
            </p>
            <div className="flex">
              <Input
                type="email"
                placeholder="Enter your email"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Button className="ml-2 bg-blue-600 hover:bg-blue-700">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-400 mr-2" />
              <span className="text-sm text-gray-300">Licensed Pharmacy</span>
            </div>
            <div className="flex items-center justify-center">
              <Truck className="h-6 w-6 text-blue-400 mr-2" />
              <span className="text-sm text-gray-300">Fast Delivery</span>
            </div>
            <div className="flex items-center justify-center">
              <Award className="h-6 w-6 text-blue-400 mr-2" />
              <span className="text-sm text-gray-300">Quality Assured</span>
            </div>
            <div className="flex items-center justify-center">
              <Clock className="h-6 w-6 text-blue-400 mr-2" />
              <span className="text-sm text-gray-300">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 SiletoExpress. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Button variant="ghost" className="text-gray-400 hover:text-white text-sm p-0 h-auto">
                Privacy Policy
              </Button>
              <Button variant="ghost" className="text-gray-400 hover:text-white text-sm p-0 h-auto">
                Terms of Service
              </Button>
              <Button variant="ghost" className="text-gray-400 hover:text-white text-sm p-0 h-auto">
                Return Policy
              </Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
