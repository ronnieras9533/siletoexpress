
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Pill, 
  Heart, 
  Stethoscope, 
  Pill as PillIcon, 
  FileText, 
  Thermometer 
} from "lucide-react";

const Categories = () => {
  const navigate = useNavigate();

  const categories = [
    {
      name: "Pain Relief",
      icon: Pill,
      description: "Headaches, muscle pain, fever relief",
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    },
    {
      name: "General Medicine",
      icon: Stethoscope,
      description: "Antibiotics, prescription medications",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      name: "Chronic Care",
      icon: Heart,
      description: "Diabetes, hypertension, heart health",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      name: "Supplements",
      icon: PillIcon,
      description: "Vitamins, minerals, wellness products",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    }
  ];

  const handleCategoryClick = (categoryName: string) => {
    // Navigate to products page with category filter
    navigate(`/products?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Shop by Category</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Find the right medication for your needs from our comprehensive range of healthcare products
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {categories.map((category) => (
            <Card 
              key={category.name}
              className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-2 ${category.borderColor} ${category.bgColor}`}
              onClick={() => handleCategoryClick(category.name)}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 ${category.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <category.icon className={`h-8 w-8 ${category.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {category.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Special Services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <FileText className="h-8 w-8 mr-3" />
                <h3 className="text-xl font-semibold">Upload Prescription</h3>
              </div>
              <p className="text-blue-100 mb-4">
                Upload your prescription and let our licensed pharmacists verify your medication needs
              </p>
              <Button 
                variant="secondary" 
                className="bg-white text-blue-600 hover:bg-blue-50"
                onClick={() => navigate('/prescription-upload')}
              >
                Upload Now
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <Thermometer className="h-8 w-8 mr-3" />
                <h3 className="text-xl font-semibold">Health Consultation</h3>
              </div>
              <p className="text-green-100 mb-4">
                Get professional health advice from our qualified pharmacists and healthcare experts
              </p>
              <Button 
                variant="secondary" 
                className="bg-white text-green-600 hover:bg-green-50"
                onClick={() => navigate('/why-choose-us')}
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
