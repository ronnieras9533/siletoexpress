
import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">SiletoExpress</h3>
            <p className="text-gray-300 text-sm">
              Your trusted online pharmacy delivering quality healthcare products 
              across Kenya with fast, reliable service.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products" className="text-gray-300 hover:text-white transition-colors">All Products</Link></li>
              <li><Link to="/prescription-upload" className="text-gray-300 hover:text-white transition-colors">Upload Prescription</Link></li>
              <li><Link to="/track-order" className="text-gray-300 hover:text-white transition-colors">Track Order</Link></li>
              <li><Link to="/why-choose-us" className="text-gray-300 hover:text-white transition-colors">Why Choose Us</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Contact Us</h4>
            <div className="space-y-2 text-sm text-gray-300">
              <p>Email: info@siletoexpress.com</p>
              <p>Working Hours: Every Day 8AM - 9PM</p>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Follow Us</h4>
            <div className="flex space-x-4">
              <a
                href="https://www.facebook.com/profile.php?id=61578190423738"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={24} />
              </a>
              <a
                href="https://www.instagram.com/siletoexpress/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={24} />
              </a>
              <a
                href="https://x.com/siletoexpress"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors"
                aria-label="Twitter/X"
              >
                <Twitter size={24} />
              </a>
              <a
                href="https://www.tiktok.com/@siletoexpress"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors"
                aria-label="TikTok"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.849-1.242-1.783-1.289-2.838h-3.063v13.5c0 2.071-1.679 3.75-3.75 3.75s-3.75-1.679-3.75-3.75 1.679-3.75 3.75-3.75c.414 0 .815.067 1.188.191v-3.23a6.975 6.975 0 0 0-1.188-.101c-3.863 0-7 3.137-7 7s3.137 7 7 7 7-3.137 7-7V8.562c1.348.932 2.977 1.438 4.625 1.438v-3.25c-1.062 0-2.063-.329-2.875-.938-.325-.244-.616-.518-.875-.825z"/>
                </svg>
              </a>
            </div>
            <div className="text-sm text-gray-300">
              <p>Stay connected for health tips and updates!</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>&copy; 2025 SiletoExpress. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
