
import { Button } from "@/components/ui/button";
import { Heart, Baby, Stethoscope, Shield, Thermometer, Pill } from "lucide-react";

const categories = [
  {
    name: "Chronic Care",
    icon: Heart,
    description: "Diabetes, Hypertension, Heart conditions",
    color: "bg-red-50 border-red-200",
    iconColor: "text-red-600"
  },
  {
    name: "Baby & Mother",
    icon: Baby,
    description: "Maternal health, Baby care products",
    color: "bg-pink-50 border-pink-200",
    iconColor: "text-pink-600"
  },
  {
    name: "General Medicine",
    icon: Stethoscope,
    description: "Common ailments, Antibiotics",
    color: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-600"
  },
  {
    name: "First Aid",
    icon: Shield,
    description: "Bandages, Antiseptics, Emergency care",
    color: "bg-green-50 border-green-200",
    iconColor: "text-green-600"
  },
  {
    name: "Pain Relief",
    icon: Thermometer,
    description: "Painkillers, Anti-inflammatory drugs",
    color: "bg-orange-50 border-orange-200",
    iconColor: "text-orange-600"
  },
  {
    name: "Supplements",
    icon: Pill,
    description: "Vitamins, Minerals, Health supplements",
    color: "bg-purple-50 border-purple-200",
    iconColor: "text-purple-600"
  }
];

const Categories = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Shop by Category</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Find the right medication for your needs. All products are sourced from licensed manufacturers 
            and verified by our pharmacists.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <div
                key={index}
                className={`${category.color} rounded-lg p-6 border-2 hover:shadow-lg transition-all duration-300 cursor-pointer group`}
              >
                <div className="flex items-start gap-4">
                  <div className={`${category.iconColor} group-hover:scale-110 transition-transform`}>
                    <IconComponent size={32} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{category.description}</p>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 p-0">
                      View Products →
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Categories;
