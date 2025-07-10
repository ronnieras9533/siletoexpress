
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { X, Upload } from 'lucide-react';

const categories = [
  'Pain Relief',
  'Chronic Care',
  'General Medicine',
  'Supplements',
  'First Aid',
  'Personal Care',
  'Baby Care',
  'Vitamins'
];

interface AdminProductFormProps {
  product?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const AdminProductForm: React.FC<AdminProductFormProps> = ({ product, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    brand: '',
    prescription_required: false,
    image_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        stock: product.stock?.toString() || '',
        category: product.category || '',
        brand: product.brand || '',
        prescription_required: product.prescription_required || false,
        image_url: product.image_url || ''
      });
    }
  }, [product]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      
      toast({
        title: "Image uploaded successfully!",
        description: "Product image has been uploaded.",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        category: formData.category,
        brand: formData.brand,
        prescription_required: formData.prescription_required,
        image_url: formData.image_url
      };

      let error;
      if (product) {
        // Update existing product
        const result = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
        error = result.error;
      } else {
        // Create new product
        const result = await supabase
          .from('products')
          .insert(productData);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Product ${product ? 'updated' : 'created'} successfully.`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: "Failed to save product. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{product ? 'Edit Product' : 'Add New Product'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="price">Price (KES)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  value={formData.stock}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
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
                id="prescription_required"
                checked={formData.prescription_required}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, prescription_required: checked }))}
              />
              <Label htmlFor="prescription_required">Prescription Required</Label>
            </div>

            <div>
              <Label htmlFor="image">Product Image</Label>
              <div className="space-y-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {formData.image_url && (
                  <img 
                    src={formData.image_url} 
                    alt="Product preview"
                    className="w-32 h-32 object-cover rounded border"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading || uploading} className="flex-1">
                {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
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
