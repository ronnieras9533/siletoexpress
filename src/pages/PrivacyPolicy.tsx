
import React, { useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = "Privacy Policy - SiletoExpress";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
          
          <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Data Protection & Privacy</h2>
              
              <p className="text-gray-600 leading-7 mb-4">
                At SiletoExpress, we respect and protect your privacy. We collect only essential personal data 
                (e.g., name, contact, prescription info) for order fulfillment, legal compliance, and improving 
                your experience.
              </p>
              
              <p className="text-gray-600 leading-7 mb-4">
                All health-related data is handled in strict confidence and in accordance with the{' '}
                <strong>Pharmacy and Poisons Board (PPB)</strong> of Kenya and{' '}
                <strong>Data Protection Act 2019</strong>.
              </p>
              
              <p className="text-gray-600 leading-7 mb-4">
                We never share or sell personal data to third parties. Users may request to access or delete 
                their data by contacting us at{' '}
                <a href="mailto:support@siletoexpress.com" className="text-blue-600 hover:underline">
                  support@siletoexpress.com
                </a>.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Information We Collect</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Personal identification information (Name, email address, phone number)</li>
                <li>Delivery address and location information</li>
                <li>Prescription and medical information (when applicable)</li>
                <li>Payment and transaction data</li>
                <li>Website usage data and analytics</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">How We Use Your Information</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Processing and fulfilling your orders</li>
                <li>Communicating with you about your orders and services</li>
                <li>Complying with legal and regulatory requirements</li>
                <li>Improving our services and user experience</li>
                <li>Sending relevant health information and promotions (with consent)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Data Security</h3>
              <p className="text-gray-600 leading-7">
                We implement appropriate technical and organizational measures to protect your personal data 
                against unauthorized access, alteration, disclosure, or destruction. All sensitive information 
                is encrypted and stored securely.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Your Rights</h3>
              <p className="text-gray-600 leading-7">
                Under the Data Protection Act 2019, you have the right to access, correct, delete, or port 
                your personal data. You may also withdraw consent for data processing at any time. 
                Contact us to exercise these rights.
              </p>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
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

export default PrivacyPolicy;
