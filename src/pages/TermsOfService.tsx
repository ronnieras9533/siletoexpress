
import React, { useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const TermsOfService = () => {
  useEffect(() => {
    document.title = "Terms of Service - Sileto Pharmaceuticals";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
          
          <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Agreement to Terms</h2>
              
              <p className="text-gray-600 leading-7 mb-4">
                By using Sileto Pharmaceuticals, you agree to comply with Kenyan laws and PPB regulations. 
                Prescription drugs require a valid prescription. Orders may be reviewed or declined 
                if prescription requirements are not met.
              </p>
              
              <p className="text-gray-600 leading-7 mb-4">
                We deliver across Kenya with due care, but are not liable for misuse of medication. 
                For any issues, contact support within 7 days.
              </p>
              
              <p className="text-gray-600 leading-7 mb-4">
                Use of our site and services indicates acceptance of these terms.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Pharmaceutical Services</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>All pharmaceutical products are dispensed in compliance with PPB regulations</li>
                <li>Prescription medications require a valid prescription from a licensed practitioner</li>
                <li>We reserve the right to verify prescriptions and refuse service if requirements are not met</li>
                <li>Products are dispensed by qualified pharmaceutical professionals</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Ordering and Delivery</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Orders are processed within 24 hours of receipt and verification</li>
                <li>Delivery times may vary based on location and product availability</li>
                <li>Customers must provide accurate delivery information</li>
                <li>Age verification may be required for certain products</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Payment Terms</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Payment is required at the time of order placement</li>
                <li>We accept M-PESA, card payments, and other approved methods</li>
                <li>All prices are in Kenyan Shillings (KES) unless otherwise stated</li>
                <li>Refunds are processed according to our refund policy</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Liability and Disclaimer</h3>
              <p className="text-gray-600 leading-7">
                Sileto Pharmaceuticals provides pharmaceutical products and health information for informational 
                purposes. We are not liable for any adverse effects from product misuse or failure to 
                follow medical advice. Consult healthcare professionals for medical guidance.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Contact Information</h3>
              <p className="text-gray-600 leading-7">
                For questions about these terms or our services, contact us at{' '}
                <a href="mailto:info@sileto-pharmaceuticals.com" className="text-blue-600 hover:underline">
                  info@sileto-pharmaceuticals.com
                </a>{' '}
                or through our customer support channels.
              </p>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> These terms are subject to change. Continued use of our services 
                  constitutes acceptance of any modifications.
                </p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Last updated:</strong> January 2025
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default TermsOfService;
