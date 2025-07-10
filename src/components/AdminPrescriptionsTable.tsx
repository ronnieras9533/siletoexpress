
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type PrescriptionStatus = Database['public']['Enums']['prescription_status'];

interface PrescriptionWithProfile {
  id: string;
  created_at: string;
  image_url: string;
  status: PrescriptionStatus;
  admin_notes: string | null;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

const AdminPrescriptionsTable = () => {
  const { toast } = useToast();
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: prescriptions, isLoading, refetch } = useQuery({
    queryKey: ['adminPrescriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          profiles!prescriptions_user_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PrescriptionWithProfile[];
    }
  });

  const updatePrescriptionStatus = async (prescriptionId: string, status: PrescriptionStatus, notes?: string) => {
    const { error } = await supabase
      .from('prescriptions')
      .update({ 
        status,
        admin_notes: notes || null
      })
      .eq('id', prescriptionId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update prescription status",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Prescription status updated successfully"
      });
      refetch();
      setSelectedPrescription(null);
      setAdminNotes('');
    }
  };

  const getStatusColor = (status: PrescriptionStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading prescriptions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prescription Management</CardTitle>
      </CardHeader>
      <CardContent>
        {prescriptions && prescriptions.length > 0 ? (
          <div className="space-y-4">
            {prescriptions.map((prescription) => (
              <div key={prescription.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-medium">Prescription #{prescription.id.slice(0, 8)}</h3>
                    <p className="text-sm text-gray-600">
                      {prescription.profiles?.full_name} ({prescription.profiles?.email})
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(prescription.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <Badge className={getStatusColor(prescription.status)}>
                    {prescription.status}
                  </Badge>
                </div>

                <div className="mb-4">
                  <img 
                    src={prescription.image_url} 
                    alt="Prescription"
                    className="max-w-xs max-h-48 object-contain border rounded cursor-pointer"
                    onClick={() => window.open(prescription.image_url, '_blank')}
                  />
                  <p className="text-xs text-gray-500 mt-1">Click to view full size</p>
                </div>

                {prescription.admin_notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium">Admin Notes:</p>
                    <p className="text-sm text-gray-600">{prescription.admin_notes}</p>
                  </div>
                )}

                {prescription.status === 'pending' && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add notes (optional)"
                      value={selectedPrescription === prescription.id ? adminNotes : ''}
                      onChange={(e) => {
                        setSelectedPrescription(prescription.id);
                        setAdminNotes(e.target.value);
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updatePrescriptionStatus(prescription.id, 'approved', adminNotes)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updatePrescriptionStatus(prescription.id, 'rejected', adminNotes)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No prescriptions found.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPrescriptionsTable;
