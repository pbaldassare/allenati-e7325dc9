import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Shield, UserX } from 'lucide-react';

interface OwnerUserStatsProps {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  normalUsers: number;
  instructors: number;
}

export const OwnerUserStats: React.FC<OwnerUserStatsProps> = ({
  totalMembers,
  activeMembers,
  inactiveMembers,
  normalUsers,
  instructors
}) => {
  const activePercentage = totalMembers > 0 ? ((activeMembers / totalMembers) * 100).toFixed(1) : '0';
  const instructorPercentage = totalMembers > 0 ? ((instructors / totalMembers) * 100).toFixed(1) : '0';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Totale Membri</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMembers}</div>
          <p className="text-xs text-muted-foreground">
            Membri della palestra
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Membri Attivi</CardTitle>
          <UserCheck className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{activeMembers}</div>
          <p className="text-xs text-muted-foreground">
            {activePercentage}% del totale
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Istruttori</CardTitle>
          <Shield className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{instructors}</div>
          <p className="text-xs text-muted-foreground">
            {instructorPercentage}% del totale
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Membri Inattivi</CardTitle>
          <UserX className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{inactiveMembers}</div>
          <p className="text-xs text-muted-foreground">
            Membri non attivi
          </p>
        </CardContent>
      </Card>
    </div>
  );
};