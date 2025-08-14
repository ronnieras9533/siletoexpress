import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import AdminOrdersTable from "../components/AdminOrdersTable";
import AdminPrescriptionOrdersTable from "../components/AdminPrescriptionOrdersTable";

export default function AdminDashboard() {
  const [tab, setTab] = useState<"0" | "1">("0");
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "ok" | "error">("checking");

  // Test Supabase connection once when component mounts
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .limit(1);

        if (error) {
          console.error("Supabase connection error:", error.message);
          setConnectionStatus("error");
        } else {
          console.log("Supabase connection OK. Sample order:", data);
          setConnectionStatus("ok");
        }
      } catch (err) {
        console.error("Unexpected error testing Supabase:", err);
        setConnectionStatus("error");
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      {connectionStatus === "checking" && (
        <p className="text-gray-500 mb-4">Checking database connection...</p>
      )}
      {connectionStatus === "error" && (
        <p className="text-red-500 mb-4">
          ⚠ Could not connect to Supabase. Please check API keys and network.
        </p>
      )}

      <Tabs value={tab} onValueChange={(val) => setTab(val as "0" | "1")}>
        <TabsList>
          <TabsTrigger value="0">Orders</TabsTrigger>
          <TabsTrigger value="1">Prescription Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="0">
          <AdminOrdersTable filter={{ type: "regular" }} />
        </TabsContent>

        <TabsContent value="1">
          <AdminPrescriptionOrdersTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
