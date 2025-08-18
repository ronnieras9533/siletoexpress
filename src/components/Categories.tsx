import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Pill, Heart, Stethoscope, Thermometer, FileText, Snowflake, Plus } from "lucide-react";

const Categories = () => {
  const navigate = useNavigate();
  
  // Updated categories with 6 items (4 original + 2 new)
  const categories = [
    { 
      name: "Pain Relief", 
      icon: Pill, 
      description: "Headaches, muscle pain, fever", 
      color: "text-red-600", 
      bgColor: "bg-red-50", 
      borderColor: "border-red-200" 
    },
    { 
      name: "General Medicine", 
      icon: Stethoscope, 
      description: "Antibiotics, prescriptions", 
      color: "text-blue-600", 
      bgColor: "bg-blue-50", 
      borderColor: "border-blue-200" 
    },
    { 
      name: "Chronic Care", 
      icon: Heart, 
      description: "Diabetes, hypertension", 
      color: "text-green-600", 
      bgColor: "bg-green-50", 
      borderColor: "border-green-200" 
    },
    { 
      name: "Supplements", 
      icon: Pill, 
      description: "Vitamins, wellness", 
      color: "text-purple-600", 
      bgColor: "bg-purple-50", 
      borderColor: "border-purple-200" 
    },
    { 
      name: "Cold & Flu", 
      icon: Snowflake, 
      description: "Cold, flu, allergy relief", 
      color: "text-cyan-600", 
      bgColor: "bg-cyan-50", 
      borderColor: "border-cyan-200" 
    },
    { 
      name: "Other", 
      icon: Plus, 
      description: "Other healthcare products", 
      color: "text-gray-600", 
      bgColor: "bg-gray-50", 
      borderColor: "border-gray-200" 
    }
  ];

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/products?category=${encodeURIComponent(categoryName)}`);
  };

  const handleUploadPrescription = () => {
    navigate('/prescription-upload');
  };

  const handleWhyChooseUs = () => {
    navigate('/why-choose-us');
  };

  return (
    <section className="py-12 md:py-16 bg-gray-50">
      <div className="container mx-auto px-3 md:px-4">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Shop by Category</h2>
          <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
            Find the right medication for your needs
          </p>
        </div>
        
        {/* Categories grid - 3 columns on mobile, 4 on tablet, 6 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 mb-10 md:mb-12">
          {categories.map((category) => (
            <Card 
              key={category.name}
              className={`cursor-pointer hover:shadow-md transition-all duration-200 border ${category.borderColor} ${category.bgColor}`}
              onClick={() => handleCategoryClick(category.name)}
            >
              <CardContent className="p-3 md:p-4 text-center">
                <div className={`w-10 h-10 ${category.bgColor} rounded-full flex items-center justify-center mx-auto mb-3`}>
                  <category.icon className={`h-5 w-5 ${category.color}`} />
                </div>
                <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">
                  {category.name}
                </h3>
                <p className="text-xs text-gray-600">
                  {category.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Special Services - reduced size */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center mb-3">
                <FileText className="h-5 w-5 mr-2 text-white" />
                <h3 className="text-base font-semibold">Upload Prescription</h3>
              </div>
              <p className="text-blue-100 text-xs mb-3">
                Upload your prescription for verification
              </p>
              <Button 
                variant="secondary" 
                className="bg-white text-blue-600 hover:bg-blue-50 text-xs py-1 h-8"
                onClick={handleUploadPrescription}
              >
                Upload Now
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center mb-3">
                <Thermometer className="h-5 w-5 mr-2 text-white" />
                <h3 className="text-base font-semibold">Health Consultation</h3>
              </div>
              <p className="text-green-100 text-xs mb-3">
                Professional health advice
              </p>
              <Button 
                variant="secondary" 
                className="bg-white text-green-600 hover:bg-green-50 text-xs py-1 h-8"
                onClick={handleWhyChooseUs}
              >
                Why Choose Us
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Categories;
