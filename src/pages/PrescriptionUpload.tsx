// src/pages/PrescriptionUpload.tsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Image as ImageIcon, UploadCloud, Loader2 } from "lucide-react";

const MAX_FILE_MB = 8; // keep small for mobile uploads
const ACCEPTED_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
];

const PrescriptionUpload: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const onPick = () => fileInputRef.current?.click();

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!ACCEPTED_MIME.includes(f.type)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a JPG, PNG, WEBP or HEIC image.",
        variant: "destructive"
      });
      e.target.value = "";
      return;
    }

    const sizeMb = f.size / (1024 * 1024);
    if (sizeMb > MAX_FILE_MB) {
      toast({
        title: "File too large",
        description: `Max allowed size is ${MAX_FILE_MB} MB. Your file is ${sizeMb.toFixed(1)} MB.`,
        variant: "destructive"
      });
      e.target.value = "";
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const resetForm = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!file) {
      toast({ title: "No image selected", description: "Choose a prescription image before submitting.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;

      // 1) Upload to Storage bucket: 'prescriptions'
      const { error: uploadError } = await supabase
        .storage
        .from("prescriptions")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      // 2) Get public URL (assumes bucket is public). If not, switch to signed URL flow
      const { data: pub } = supabase.storage.from("prescriptions").getPublicUrl(path);
      const imageUrl = pub?.publicUrl;
      if (!imageUrl) throw new Error("Failed to resolve public URL for uploaded image");

      // 3) Insert DB record
      const { error: insertError } = await supabase.from("prescriptions").insert({
        user_id: user.id,
        image_url: imageUrl,
        status: "pending", // enum default, but set explicitly for clarity
        order_id: null,
        admin_notes: null
      });

      if (insertError) throw insertError;

      toast({ title: "Prescription uploaded", description: "We'll review it shortly and get back to you." });
      resetForm();

      // Optional: take user to their prescriptions page
      navigate("/my-orders-and-prescriptions");
    } catch (err: any) {
      console.error("Prescription upload failed:", err);
      toast({
        title: "Upload failed",
        description: err?.message ?? "Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Prescription</h1>
          <p className="text-gray-600">Securely upload a clear photo of your doctor’s prescription. Supported: JPG, PNG, WEBP, HEIC (max {MAX_FILE_MB}MB).</p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Prescription Image</CardTitle>
            <CardDescription>Only one image is required per upload.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="file">Choose an image</Label>
                <div
                  className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50"
                  onClick={onPick}
                  role="button"
                  aria-label="Pick prescription image"
                >
                  {preview ? (
                    <img src={preview} alt="Preview" className="max-h-56 rounded-xl object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-600">
                      <UploadCloud className="h-10 w-10" />
                      <span className="text-sm">Click to select an image from your device</span>
                    </div>
                  )}
                </div>
                <Input
                  id="file"
                  type="file"
                  accept={ACCEPTED_MIME.join(",")}
                  className="hidden"
                  ref={fileInputRef}
                  onChange={onFileChange}
                />
                {file && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <ImageIcon className="h-4 w-4" />
                    <span className="truncate">{file.name}</span>
                    <span>· {(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                    <Button type="button" variant="ghost" className="ml-auto" onClick={resetForm}>Remove</Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={submitting || !file}>
                  {submitting ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</span>
                  ) : (
                    "Submit Prescription"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/products")}>Continue Shopping</Button>
              </div>

              <p className="text-xs text-gray-500">By uploading, you confirm the image is clear and readable. Avoid sensitive personal info beyond what appears on the prescription.</p>
            </form>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default PrescriptionUpload;
