
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download, Eye } from 'lucide-react';

interface Prescription {
  id: string;
  image_url: string;
  status: string;
  created_at: string;
  admin_notes?: string;
}

interface PrescriptionViewerProps {
  prescription: Prescription | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (prescriptionId: string, status: string, notes?: string) => void;
}

const PrescriptionViewer: React.FC<PrescriptionViewerProps> = ({
  prescription,
  isOpen,
  onClose,
  onStatusUpdate
}) => {
  if (!prescription) return null;

  const handleDownload = () => {
    if (prescription.image_url) {
      window.open(prescription.image_url, '_blank');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Prescription Details
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Prescription Info */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Prescription ID:</span>
                  <p className="font-mono text-xs">{prescription.id}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Status:</span>
                  <Badge 
                    className={`ml-2 ${getStatusColor(prescription.status)}`}
                    variant="secondary"
                  >
                    {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Submitted:</span>
                  <p>{new Date(prescription.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Actions:</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownload}
                    className="ml-2"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
              
              {prescription.admin_notes && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium text-gray-600">Admin Notes:</span>
                  <p className="text-sm mt-1">{prescription.admin_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prescription Image */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Prescription Image</h3>
              <div className="border rounded-lg overflow-hidden bg-gray-50">
                {prescription.image_url ? (
                  <img
                    src={prescription.image_url}
                    alt="Prescription"
                    className="w-full h-auto max-h-[600px] object-contain"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                      e.currentTarget.alt = 'Failed to load prescription image';
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No image available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Admin Actions */}
          {onStatusUpdate && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">Admin Actions</h3>
                <div className="flex gap-2">
                  {prescription.status !== 'approved' && (
                    <Button
                      onClick={() => onStatusUpdate(prescription.id, 'approved')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve Prescription
                    </Button>
                  )}
                  {prescription.status !== 'rejected' && (
                    <Button
                      onClick={() => onStatusUpdate(prescription.id, 'rejected')}
                      variant="destructive"
                    >
                      Reject Prescription
                    </Button>
                  )}
                  {prescription.status !== 'pending' && (
                    <Button
                      onClick={() => onStatusUpdate(prescription.id, 'pending')}
                      variant="outline"
                    >
                      Mark as Pending
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionViewer;
