
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
  order_id: string | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

const AdminPrescriptionsTable = () => {
  const { toast } = useToast();
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: prescriptions, isLoading, refetch } = useQuery({
    queryKey: ['adminGeneralPrescriptions'],
    queryFn: async () => {
      console.log('Fetching general prescriptions (not associated with orders)...');
      
      // Only fetch prescriptions that are NOT associated with orders (general prescriptions)
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .is('order_id', null)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching general prescriptions:', error);
        throw error;
      }

      console.log('General prescriptions data:', data);

      // Fetch profiles separately
      const userIds = data.map(prescription => prescription.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Combine prescriptions with profiles
      const prescriptionsWithProfiles = data.map(prescription => ({
        ...prescription,
        profiles: profiles?.find(profile => profile.id === prescription.user_id) || null
      }));

      console.log('General prescriptions with profiles:', prescriptionsWithProfiles);
      return prescriptionsWithProfiles as PrescriptionWithProfile[];
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

  const viewPrescription = async (imageUrl: string) => {
    try {
      // Extract the file path from the URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const folderPath = urlParts[urlParts.length - 2];
      const filePath = `${folderPath}/${fileName}`;
      
      // Get signed URL for viewing
      const { data, error } = await supabase.storage
        .from('prescriptions')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) {
        console.error('Error creating signed URL:', error);
        // If signed URL fails, try to use the original URL
        window.open(imageUrl, '_blank');
        return;
      }
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        // Fallback to original URL
        window.open(imageUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing prescription:', error);
      // Fallback to original URL
      window.open(imageUrl, '_blank');
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
        <CardTitle>General Prescription Management</CardTitle>
        <p className="text-sm text-gray-600">
          Prescriptions uploaded independently from the homepage (not associated with specific orders)
        </p>
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
                      {prescription.profiles?.full_name || 'Unknown User'} ({prescription.profiles?.email || 'No email'})
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
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewPrescription(prescription.image_url)}
                    >
                      View Prescription
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Click to view prescription image</p>
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
            No general prescriptions found.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPrescriptionsTable;
