
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleBasedApp } from "@/components/RoleBasedApp";

const Index = () => {
  return (
    <ProtectedRoute>
      <RoleBasedApp />
    </ProtectedRoute>
  );
};

export default Index;
