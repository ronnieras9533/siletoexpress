
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook, Twitter, Instagram, MapPin, Phone, Mail, Clock } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Newsletter Section */}
      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-2">Stay Updated</h3>
              <p className="text-gray-400">
                Get the latest health tips, product updates, and exclusive offers
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email address"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
              />
              <Button className="bg-blue-600 hover:bg-blue-700">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-blue-400">SiletoRx</h3>
            <p className="text-gray-400 mb-4">
              Your trusted online pharmacy, licensed by the Pharmacy & Poisons Board of Kenya. 
              Delivering authentic medications with care and reliability.
            </p>
            <div className="flex gap-4">
              <Button size="sm" variant="ghost" className="p-2">
                <Facebook size={18} />
              </Button>
              <Button size="sm" variant="ghost" className="p-2">
                <Twitter size={18} />
              </Button>
              <Button size="sm" variant="ghost" className="p-2">
                <Instagram size={18} />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Upload Prescription</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Track Order</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQs</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-4">Categories</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Prescription Drugs</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Over-the-Counter</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Chronic Care</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Baby & Mother</a></li>
              <li><a href="#" className="hover:text-white transition-colors">First Aid</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Supplements</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <div className="space-y-3 text-gray-400">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="mt-1 flex-shrink-0" />
                <div>
                  <p>Sileto Pharmaceuticals</p>
                  <p>Nairobi, Kenya</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} />
                <p>+254 700 123 456</p>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} />
                <p>info@siletorx.co.ke</p>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={18} className="mt-1" />
                <div>
                  <p>24/7 Customer Support</p>
                  <p className="text-sm">Pharmacist available 8AM-8PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              © 2024 SiletoRx. All rights reserved. Licensed by Pharmacy & Poisons Board of Kenya.
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
