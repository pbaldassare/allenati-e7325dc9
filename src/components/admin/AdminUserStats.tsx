import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, UserCheck, UserX } from 'lucide-react';

interface AdminUserStatsProps {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalGyms: number;
  roleDistribution: Record<string, number>;
  gymDistribution: Record<string, number>;
}

export const AdminUserStats: React.FC<AdminUserStatsProps> = ({
  totalUsers,
  activeUsers,
  inactiveUsers,
  totalGyms,
  roleDistribution,
  gymDistribution
}) => {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utenti Totali</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Utenti registrati nel sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utenti Attivi</CardTitle>
            <UserCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {((activeUsers / totalUsers) * 100).toFixed(1)}% del totale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utenti Inattivi</CardTitle>
            <UserX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{inactiveUsers}</div>
            <p className="text-xs text-muted-foreground">
              {((inactiveUsers / totalUsers) * 100).toFixed(1)}% del totale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Palestre Attive</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalGyms}</div>
            <p className="text-xs text-muted-foreground">
              Palestre registrate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuzione Ruoli</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(roleDistribution).map(([role, count]) => {
                const percentage = ((count / totalUsers) * 100).toFixed(1);
                const roleLabel = {
                  admin: 'Amministratori',
                  gym_owner: 'Proprietari Palestre',
                  instructor: 'Istruttori',
                  basic_user: 'Utenti Base'
                }[role] || role;

                return (
                  <div key={role} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{roleLabel}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">{percentage}%</span>
                      <span className="text-sm font-bold">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membri per Palestra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(gymDistribution).map(([gymName, count]) => (
                <div key={gymName} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{gymName}</span>
                  <span className="text-sm font-bold">{count} membri</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};