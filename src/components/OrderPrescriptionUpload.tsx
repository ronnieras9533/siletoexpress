
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, CheckCircle, X } from 'lucide-react';

interface OrderPrescriptionUploadProps {
  onPrescriptionUploaded: (prescriptionId: string) => void;
  onCancel: () => void;
  prescriptionItems: Array<{ id: string; name: string }>;
}

const OrderPrescriptionUpload: React.FC<OrderPrescriptionUploadProps> = ({
  onPrescriptionUploaded,
  onCancel,
  prescriptionItems
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      
      if (!selectedFile.type.startsWith('image/') && selectedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please select an image file or PDF",
          variant: "destructive"
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a prescription file to upload",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/order_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('prescriptions')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(fileName);

      // Create prescription record for this order
      const { data: prescription, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          status: 'pending',
          admin_notes: `Prescription for items: ${prescriptionItems.map(item => item.name).join(', ')}`
        })
        .select()
        .single();

      if (prescriptionError) throw prescriptionError;

      toast({
        title: "Prescription uploaded successfully!",
        description: "You can now proceed with your order.",
      });

      onPrescriptionUploaded(prescription.id);
    } catch (error) {
      console.error('Error uploading prescription:', error);
      toast({
        title: "Upload failed",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Prescription for Order
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Items requiring prescription:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            {prescriptionItems.map(item => (
              <li key={item.id}>• {item.name}</li>
            ))}
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-2">Important Information</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Ensure your prescription covers all the items above</li>
            <li>• Prescription must be clear and readable</li>
            <li>• Include doctor's name, signature, and date</li>
            <li>• Maximum file size: 10MB</li>
            <li>• Supported formats: JPG, PNG, PDF</li>
          </ul>
        </div>

        <div className="space-y-4">
          <Label htmlFor="order-prescription">Select Prescription File</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              id="order-prescription"
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="order-prescription"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-600">
                Click to upload prescription
              </p>
              <p className="text-sm text-gray-500">
                or drag and drop your file here
              </p>
            </label>
          </div>

          {file && (
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Selected file:</p>
                  <p className="text-sm text-gray-600">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1"
          >
            {uploading ? 'Uploading...' : 'Upload & Continue'}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderPrescriptionUpload;
