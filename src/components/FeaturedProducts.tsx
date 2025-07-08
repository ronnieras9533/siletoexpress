
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star } from "lucide-react";

const products = [
  {
    id: 1,
    name: "Panadol Extra",
    brand: "GlaxoSmithKline",
    price: 180,
    originalPrice: 200,
    rating: 4.8,
    reviews: 124,
    image: "/placeholder.svg",
    isPrescriptionRequired: false,
    isInStock: true,
    description: "Fast relief from headaches and fever"
  },
  {
    id: 2,
    name: "Metformin 500mg",
    brand: "Cosmic Pharma",
    price: 850,
    originalPrice: null,
    rating: 4.9,
    reviews: 89,
    image: "/placeholder.svg",
    isPrescriptionRequired: true,
    isInStock: true,
    description: "Type 2 diabetes management"
  },
  {
    id: 3,
    name: "Amoxicillin 500mg",
    brand: "Beta Healthcare",
    price: 320,
    originalPrice: 380,
    rating: 4.7,
    reviews: 67,
    image: "/placeholder.svg",
    isPrescriptionRequired: true,
    isInStock: true,
    description: "Antibiotic for bacterial infections"
  },
  {
    id: 4,
    name: "Vitamin D3",
    brand: "Nature's Best",
    price: 1200,
    originalPrice: null,
    rating: 4.6,
    reviews: 203,
    image: "/placeholder.svg",
    isPrescriptionRequired: false,
    isInStock: true,
    description: "Bone health supplement"
  },
  {
    id: 5,
    name: "Lisinopril 10mg",
    brand: "Dawa Limited",
    price: 450,
    originalPrice: 500,
    rating: 4.8,
    reviews: 156,
    image: "/placeholder.svg",
    isPrescriptionRequired: true,
    isInStock: false,
    description: "Blood pressure medication"
  },
  {
    id: 6,
    name: "Cetirizine 10mg",
    brand: "Shelys Pharma",
    price: 95,
    originalPrice: null,
    rating: 4.5,
    reviews: 78,
    image: "/placeholder.svg",
    isPrescriptionRequired: false,
    isInStock: true,
    description: "Allergy relief tablets"
  }
];

const ProductCard = ({ product }: { product: typeof products[0] }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-lg transition-all duration-300 overflow-hidden group">
      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.originalPrice && (
          <Badge className="absolute top-2 left-2 bg-red-500">
            Save KES {product.originalPrice - product.price}
          </Badge>
        )}
        {product.isPrescriptionRequired && (
          <Badge variant="secondary" className="absolute top-2 right-2 bg-blue-100 text-blue-800">
            Rx Required
          </Badge>
        )}
        {!product.isInStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2">
          <p className="text-sm text-gray-500">{product.brand}</p>
          <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
          <p className="text-sm text-gray-600">{product.description}</p>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{product.rating}</span>
          </div>
          <span className="text-sm text-gray-500">({product.reviews} reviews)</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-blue-600">KES {product.price}</span>
            {product.originalPrice && (
              <span className="text-sm text-gray-500 line-through">KES {product.originalPrice}</span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1"
            disabled={!product.isInStock}
          >
            <ShoppingCart size={16} className="mr-2" />
            {product.isInStock ? 'Add to Cart' : 'Notify Me'}
          </Button>
          <Button size="sm" variant="outline">
            View
          </Button>
        </div>
      </div>
    </div>
  );
};

const FeaturedProducts = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Popular medications and health products trusted by thousands of customers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" variant="outline">
            View All Products
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
