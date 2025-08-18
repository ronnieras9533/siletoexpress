import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Pill, Heart, Stethoscope, Thermometer, FileText, Snowflake, Plus } from "lucide-react";

const Categories = () => {
  const navigate = useNavigate();

  const categories = [
    { 
      name: "Pain Relief", 
      icon: Pill, 
      description: "Headaches, pain, fever", 
      color: "text-red-600", 
      bgColor: "bg-red-50", 
      borderColor: "border-red-200" 
    },
    { 
      name: "General Meds", 
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
      description: "Cold, flu, allergy", 
      color: "text-cyan-600", 
      bgColor: "bg-cyan-50", 
      borderColor: "border-cyan-200" 
    },
    { 
      name: "Other", 
      icon: Plus, 
      description: "Other products", 
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
    <section className="py-4 bg-gray-50">
      <div className="container mx-auto px-2">
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Shop by Category</h2>
          <p className="text-xs text-gray-600 max-w-xs mx-auto">
            Find medication for your needs
          </p>
        </div>

        {/* Compact categories grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {categories.map((category) => (
            <Card 
              key={category.name}
              className={`cursor-pointer hover:shadow-sm transition-all duration-200 border ${category.borderColor} ${category.bgColor}`}
              onClick={() => handleCategoryClick(category.name)}
            >
              <CardContent className="p-2 text-center">
                <div className={`w-6 h-6 ${category.bgColor} rounded-full flex items-center justify-center mx-auto mb-1`}>
                  <category.icon className={`h-3 w-3 ${category.color}`} />
                </div>
                <h3 className="text-[10px] font-semibold text-gray-900 mb-0.5">
                  {category.name}
                </h3>
                <p className="text-[8px] text-gray-600 leading-tight">
                  {category.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mini special services */}
        <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardContent className="p-2">
              <div className="flex items-center mb-1">
                <FileText className="h-3 w-3 mr-1 text-white" />
                <h3 className="text-xs font-semibold">Upload Rx</h3>
              </div>
              <p className="text-blue-100 text-[8px] mb-1">
                Upload prescription
              </p>
              <Button 
                variant="secondary" 
                className="bg-white text-blue-600 hover:bg-blue-50 text-[8px] p-0 h-6 w-full"
                onClick={handleUploadPrescription}
              >
                Upload
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white">
            <CardContent className="p-2">
              <div className="flex items-center mb-1">
                <Thermometer className="h-3 w-3 mr-1 text-white" />
                <h3 className="text-xs font-semibold">Consultation</h3>
              </div>
              <p className="text-green-100 text-[8px] mb-1">
                Health advice
              </p>
              <Button 
                variant="secondary" 
                className="bg-white text-green-600 hover:bg-green-50 text-[8px] p-0 h-6 w-full"
                onClick={handleWhyChooseUs}
              >
                Learn More
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Categories;
