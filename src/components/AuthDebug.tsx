import { useAuth } from "@/contexts/AuthContext";

export const AuthDebug = () => {
  const { user, isAdmin, isGymOwner, isInstructor, hasOwnerPrivileges } = useAuth();
  
  return (
    <div className="fixed top-4 left-4 bg-card p-4 rounded-lg shadow-lg border text-xs z-50">
      <div className="font-bold mb-2">Auth Debug</div>
      <div>User ID: {user?.id || 'None'}</div>
      <div>Role: {user?.role || 'None'}</div>
      <div>isAdmin: {isAdmin.toString()}</div>
      <div>isGymOwner: {isGymOwner.toString()}</div>
      <div>isInstructor: {isInstructor.toString()}</div>
      <div>hasOwnerPrivileges: {hasOwnerPrivileges.toString()}</div>
    </div>
  );
};