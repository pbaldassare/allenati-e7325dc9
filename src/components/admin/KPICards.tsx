import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Target,
  Star,
  Activity,
  UserCheck
} from 'lucide-react';
import { AnalyticsData } from '@/hooks/useAnalytics';

interface KPICardsProps {
  data: AnalyticsData;
  loading?: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({ data, loading = false }) => {
  const kpis = [
    {
      title: "Utenti Totali",
      value: data.totalUsers,
      icon: Users,
      trend: "+12%",
      trendUp: true,
      description: "dal mese scorso"
    },
    {
      title: "Abbonamenti Attivi",
      value: data.activeSubscriptions,
      icon: UserCheck,
      trend: "+8%",
      trendUp: true,
      description: "crescita mensile"
    },
    {
      title: "Prenotazioni Oggi",
      value: data.todayBookings,
      icon: Calendar,
      trend: "+15%",
      trendUp: true,
      description: "vs ieri"
    },
    {
      title: "Ricavi Mensili",
      value: `€${data.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: "+22%",
      trendUp: true,
      description: "crescita MoM"
    },
    {
      title: "Tasso Occupazione",
      value: `${data.occupancyRate.toFixed(1)}%`,
      icon: Target,
      trend: data.occupancyRate > 80 ? "Ottimo" : "Buono",
      trendUp: data.occupancyRate > 80,
      description: "capacità utilizzata",
      progress: data.occupancyRate
    },
    {
      title: "Retention Rate",
      value: `${data.retentionRate}%`,
      icon: Activity,
      trend: "+3%",
      trendUp: true,
      description: "ultimi 3 mesi",
      progress: data.retentionRate
    },
    {
      title: "Rating Medio",
      value: data.averageRating.toFixed(1),
      icon: Star,
      trend: "+0.2",
      trendUp: true,
      description: "su 5.0",
      progress: (data.averageRating / 5) * 100
    },
    {
      title: "Prenotazioni Totali",
      value: data.totalBookings,
      icon: TrendingUp,
      trend: "+18%",
      trendUp: true,
      description: "questo mese"
    }
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant={kpi.trendUp ? "default" : "secondary"}
                className={kpi.trendUp ? "bg-green-100 text-green-800" : ""}
              >
                {kpi.trend}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {kpi.description}
              </p>
            </div>

            {kpi.progress !== undefined && (
              <div className="mt-3">
                <Progress 
                  value={kpi.progress} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {kpi.progress.toFixed(1)}% dell'obiettivo
                </p>
              </div>
            )}
          </CardContent>

          {/* Gradient overlay for visual appeal */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/5 to-transparent" />
        </Card>
      ))}
    </div>
  );
};