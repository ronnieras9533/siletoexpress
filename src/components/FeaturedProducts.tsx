import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link } from "react-router-dom"

const products = [
  {
    id: 1,
    name: "Amoxicillin 500mg Capsules",
    price: 12.99,
    description: "Broad-spectrum antibiotic for bacterial infections",
    image: "/images/amoxicillin.jpg",
    category: "Antibiotics",
    stock: 20,
  },
  {
    id: 2,
    name: "Paracetamol 500mg Tablets",
    price: 4.99,
    description: "Pain relief and fever reducer",
    image: "/images/paracetamol.jpg",
    category: "Pain Relief",
    stock: 50,
  },
  {
    id: 3,
    name: "Metformin 500mg Tablets",
    price: 8.99,
    description: "Helps control blood sugar in type 2 diabetes",
    image: "/images/metformin.jpg",
    category: "Diabetes",
    stock: 15,
  },
  {
    id: 4,
    name: "Lisinopril 10mg Tablets",
    price: 14.99,
    description: "ACE inhibitor for high blood pressure",
    image: "/images/lisinopril.jpg",
    category: "Blood Pressure",
    stock: 25,
  },
]

export default function FeaturedProducts() {
  const handleAddToCart = (product: any) => {
    console.log(`Added ${product.name} to cart`)
  }

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-8">Featured Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col h-[200px]"> 
              {/* Reduced height from 400px → 200px */}
              <CardContent className="flex-1 p-2 flex flex-col">
                <div className="flex-1 flex flex-col items-center text-center">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-24 object-contain rounded-md mb-2"
                  />
                  <h3 className="font-semibold text-sm">{product.name}</h3>
                  <p className="text-muted-foreground text-xs mb-1">{product.description}</p>
                  <Badge variant="secondary" className="text-[10px]">{product.category}</Badge>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-1 p-2">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-bold">${product.price}</span>
                  <span className={`text-[10px] ${product.stock > 0 ? "text-green-600" : "text-red-600"}`}>
                    {product.stock > 0 ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
                <div className="flex gap-1 w-full">
                  <Button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock === 0}
                    className="flex-1"
                    size="xs"
                  >
                    <ShoppingCart size={12} className="mr-1" />
                    Add
                  </Button>
                  <Link to={`/product/${product.id}`}>
                    <Button variant="outline" size="xs">View</Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link to="/products">
            <Button variant="outline" size="sm">View All Products</Button>
          </Link>
        </div>
      </div>
    </section>
  )
  }                          size={28}
                          className="mx-auto mb-1 opacity-50"
                        />
                        <span className="text-xs">No Image</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-semibold text-base line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-xs line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-600">
                      KES {product.price.toLocaleString()}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {product.category}
                    </Badge>
                  </div>

                  {product.prescription_required && (
                    <div className="flex items-center gap-1 text-red-600 text-xs">
                      <AlertCircle size={12} />
                      <span>Prescription Required</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="flex-1"
                      size="sm"
                    >
                      <ShoppingCart size={12} className="mr-1" />
                      Add
                    </Button>

                    <Link to={`/product/${product.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link to="/products">
            <Button variant="outline" size="md">
              View All
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;                      <span>Prescription Required</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="flex-1"
                      size="sm"
                    >
                      <ShoppingCart size={14} className="mr-1" />
                      Add to Cart
                    </Button>

                    <Link to={`/product/${product.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link to="/products">
            <Button variant="outline" size="lg">
              View All Products
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
