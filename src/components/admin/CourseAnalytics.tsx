import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAppData } from '@/contexts/AppDataContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Users,
  Euro,
  TrendingUp,
  Calendar,
  Star,
  Clock
} from 'lucide-react';

interface CourseAnalyticsProps {
  courseId: string;
}

export const CourseAnalytics: React.FC<CourseAnalyticsProps> = ({ courseId }) => {
  const { getCourseById, bookings, getAllUsers } = useAppData();
  const course = getCourseById(courseId);
  const users = getAllUsers();

  if (!course) return null;

  // Mock analytics data
  const weeklyAttendance = [
    { week: 'Sett 1', partecipanti: 18, prenotazioni: 20 },
    { week: 'Sett 2', partecipanti: 22, prenotazioni: 24 },
    { week: 'Sett 3', partecipanti: 19, prenotazioni: 22 },
    { week: 'Sett 4', partecipanti: 25, prenotazioni: 26 },
  ];

  const revenueData = [
    { month: 'Gen', ricavi: 450 },
    { month: 'Feb', ricavi: 520 },
    { month: 'Mar', ricavi: 480 },
    { month: 'Apr', ricavi: 600 },
  ];

  const subscriptionTypes = [
    { name: 'Basic', value: 35, color: '#8884d8' },
    { name: 'Premium', value: 45, color: '#82ca9d' },
    { name: 'VIP', value: 20, color: '#ffc658' },
  ];

  const occupancyRate = Math.round((course.currentParticipants / course.maxParticipants) * 100);
  const avgRating = 4.6;
  const totalRevenue = course.price * course.currentParticipants;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analytics Corso</CardTitle>
        </CardHeader>
        <CardContent>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tasso Occupazione</p>
                  <p className="text-2xl font-bold text-success">{occupancyRate}%</p>
                </div>
                <Users className="h-8 w-8 text-success" />
              </div>
              <Progress value={occupancyRate} className="mt-2" />
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ricavi Mensili</p>
                  <p className="text-2xl font-bold text-primary">€{totalRevenue}</p>
                </div>
                <Euro className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">+12% vs mese scorso</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rating Medio</p>
                  <p className="text-2xl font-bold text-warning">{avgRating}</p>
                </div>
                <Star className="h-8 w-8 text-warning" />
              </div>
              <div className="flex mt-2">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-3 w-3 ${i < Math.floor(avgRating) ? 'text-warning fill-warning' : 'text-muted-foreground'}`} 
                  />
                ))}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Presenze</p>
                  <p className="text-2xl font-bold">89%</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Media settimanale</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Attendance Chart */}
            <div>
              <h4 className="font-medium mb-4">Andamento Presenze</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyAttendance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="partecipanti" fill="hsl(var(--primary))" />
                  <Bar dataKey="prenotazioni" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue Chart */}
            <div>
              <h4 className="font-medium mb-4">Ricavi Mensili</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="ricavi" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subscription Distribution */}
          <div className="mt-6">
            <h4 className="font-medium mb-4">Distribuzione Abbonamenti</h4>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="200" height={200}>
                <PieChart>
                  <Pie
                    data={subscriptionTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {subscriptionTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {subscriptionTypes.map((type, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-sm">{type.name}: {type.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};