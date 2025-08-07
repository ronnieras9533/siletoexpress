import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  brand: string;
  prescription_required: boolean;
  image_url?: string;
}

interface AdminProductFormProps {
  product?: Product;
  onSave: () => void;
  onCancel: () => void;
}

const categories = [
  'Pain Relief',
  'Antibiotics',
  'Vitamins & Supplements',
  'Heart & Blood Pressure',
  'Diabetes Care',
  'Digestive Health',
  'Respiratory',
  'Skin Care',
  'General Medicine',
  'First Aid',
  'Baby & Child Care',
  'Supplements',
  'Other'
];

const AdminProductForm: React.FC<AdminProductFormProps> = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Product>({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    stock: product?.stock || 0,
    category: product?.category || '',
    brand: product?.brand || '',
    prescription_required: product?.prescription_required || false,
    image_url: product?.image_url || ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(product?.image_url || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleInputChange = (field: keyof Product, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `product-images/${timestamp}_${sanitizedFileName}`;

      console.log('Uploading image to:', fileName);

      // First, ensure the bucket exists and create it if it doesn't
      const { data: buckets } = await supabase.storage.listBuckets();
      const productImagesBucket = buckets?.find(bucket => bucket.name === 'product-images');
      
      if (!productImagesBucket) {
        console.log('Creating product-images bucket...');
        const { error: bucketError } = await supabase.storage.createBucket('product-images', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        });
        
        if (bucketError) {
          console.error('Error creating bucket:', bucketError);
          // Try to continue anyway, bucket might already exist
        }
      }

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // If upload fails, try using the existing prescriptions bucket
        const fallbackFileName = `products/${timestamp}_${sanitizedFileName}`;
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from('prescriptions')
          .upload(fallbackFileName, file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (fallbackError) {
          throw new Error(`Upload failed: ${fallbackError.message}`);
        }
        
        // Get public URL from prescriptions bucket
        const { data: urlData } = supabase.storage
          .from('prescriptions')
          .getPublicUrl(fallbackFileName);
          
        if (!urlData.publicUrl) {
          throw new Error('Failed to get public URL');
        }

        console.log('Fallback upload successful, Public URL:', urlData.publicUrl);

        // Update form data and preview
        setImagePreview(urlData.publicUrl);
        setFormData(prev => ({
          ...prev,
          image_url: urlData.publicUrl
        }));
      } else {
        console.log('Upload successful:', uploadData);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        if (!urlData.publicUrl) {
          throw new Error('Failed to get public URL');
        }

        console.log('Public URL:', urlData.publicUrl);

        // Update form data and preview
        setImagePreview(urlData.publicUrl);
        setFormData(prev => ({
          ...prev,
          image_url: urlData.publicUrl
        }));
      }

      toast({
        title: "Image uploaded successfully!",
        description: "The product image has been uploaded."
      });

    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    setImagePreview('');
    setFormData(prev => ({
      ...prev,
      image_url: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a product name.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Category required",
        description: "Please select a category.",
        variant: "destructive"
      });
      return;
    }

    if (formData.price <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price.",
        variant: "destructive"
      });
      return;
    }

    if (formData.stock < 0) {
      toast({
        title: "Invalid stock",
        description: "Stock cannot be negative.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        stock: Number(formData.stock),
        category: formData.category,
        brand: formData.brand.trim(),
        prescription_required: formData.prescription_required,
        image_url: formData.image_url || null
      };

      let result;
      if (product?.id) {
        // Update existing product
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id)
          .select()
          .single();
      } else {
        // Create new product
        result = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Database error:', result.error);
        throw new Error(result.error.message);
      }

      toast({
        title: "Success!",
        description: `Product ${product?.id ? 'updated' : 'created'} successfully.`
      });

      onSave();

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save product. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>{product?.id ? 'Edit Product' : 'Add New Product'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-4">
              <Label>Product Image</Label>
              
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full sm:w-auto"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Product Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  placeholder="Enter brand name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter product description"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (KES) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity *</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => handleInputChange('category', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="prescription"
                checked={formData.prescription_required}
                onCheckedChange={(checked) => handleInputChange('prescription_required', checked)}
              />
              <Label htmlFor="prescription" className="flex items-center space-x-2">
                <span>Prescription Required</span>
                {formData.prescription_required && (
                  <Badge variant="destructive" className="text-xs">
                    Rx Required
                  </Badge>
                )}
              </Label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading || isUploading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  `${product?.id ? 'Update' : 'Create'} Product`
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProductForm;
