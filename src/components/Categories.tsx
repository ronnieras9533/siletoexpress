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

  const handleUploadPrescription = () => {
    navigate('/prescription-upload');
  };

  const handleWhyChooseUs = () => {
    navigate('/why-choose-us');
  };

  return (
    <section className="py-8 bg-gray-50"> {/* Halved py-16 to py-8 */}
      <div className="container mx-auto px-2"> {/* Halved px-4 to px-2 */}
        <div className="text-center mb-6"> {/* Halved mb-12 to mb-6 */}
          <h2 className="text-xl font-bold text-gray-900 mb-2"> {/* Halved text-3xl to text-xl, mb-4 to mb-2 */}
            Shop by Category
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto text-sm"> {/* Halved max-w-2xl to max-w-xl, added text-sm */}
            Find the right medication for your needs from our comprehensive range of healthcare products
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6"> {/* Halved gap-4 to gap-2, mb-12 to mb-6 */}
          {categories.map((category) => (
            <Card 
              key={category.name}
              className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-2 ${category.borderColor} ${category.bgColor}`}
              onClick={() => handleCategoryClick(category.name)}
            >
              <CardContent className="p-2 text-center"> {/* Halved p-4 to p-2 */}
                <div className={`w-6 h-6 ${category.bgColor} rounded-full flex items-center justify-center mx-auto mb-2`}> {/* Halved w-12 h-12 to w-6 h-6, mb-4 to mb-2 */}
                  <category.icon className={`h-3 w-3 ${category.color}`} /> {/* Halved h-6 w-6 to h-3 w-3 */}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1"> {/* Halved text-base to text-sm, mb-2 to mb-1 */}
                  {category.name}
                </h3>
                <p className="text-[0.625rem] text-gray-600"> {/* Halved text-xs (0.75rem) to 0.625rem */}
                  {category.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Special Services */}
        <div className="grid grid-cols-2 gap-2"> {/* Halved gap-4 to gap-2 */}
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardContent className="p-2"> {/* Halved p-4 to p-2 */}
              <div className="flex items-center mb-2"> {/* Halved mb-4 to mb-2 */}
                <FileText className="h-3 w-3 mr-1" /> {/* Halved h-6 w-6 to h-3 w-3, mr-3 to mr-1 */}
                <h3 className="text-base font-semibold"> {/* Halved text-lg to text-base */}
                  Upload Prescription
                </h3>
              </div>
              <p className="text-blue-100 text-xs mb-2"> {/* Halved text-sm to text-xs, mb-4 to mb-2 */}
                Upload your prescription and let our licensed pharmacists verify your medication needs
              </p>
              <Button 
                variant="secondary" 
                className="bg-white text-blue-600 hover:bg-blue-50 text-sm" {/* Halved button text size implicitly with context */}
                onClick={handleUploadPrescription}
              >
                Upload Now
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white">
            <CardContent className="p-2"> {/* Halved p-4 to p-2 */}
              <div className="flex items-center mb-2"> {/* Halved mb-4 to mb-2 */}
                <Thermometer className="h-3 w-3 mr-1" /> {/* Halved h-6 w-6 to h-3 w-3, mr-3 to mr-1 */}
                <h3 className="text-base font-semibold"> {/* Halved text-lg to text-base */}
                  Health Consultation
                </h3>
              </div>
              <p className="text-green-100 text-xs mb-2"> {/* Halved text-sm to text-xs, mb-4 to mb-2 */}
                Get professional health advice from our qualified pharmacists and healthcare experts
              </p>
              <Button 
                variant="secondary" 
                className="bg-white text-green-600 hover:bg-green-50 text-sm" {/* Halved button text size implicitly with context */}
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

export default Categories;              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white">
            <CardContent className="p-4">
              <div className="flex items-center mb-4">
                <Thermometer className="h-6 w-6 mr-3" />
                <h3 className="text-lg font-semibold">Health Consultation</h3>
              </div>
              <p className="text-green-100 text-sm mb-4">
                Get professional health advice from our qualified pharmacists and healthcare experts
              </p>
              <Button 
                variant="secondary" 
                className="bg-white text-green-600 hover:bg-green-50"
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
