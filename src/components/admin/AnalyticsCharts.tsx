import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend,
  ResponsiveContainer
} from 'recharts';
import { AnalyticsData } from '@/hooks/useAnalytics';

interface AnalyticsChartsProps {
  data: AnalyticsData;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ data }) => {
  const chartConfig = {
    bookings: {
      label: "Prenotazioni",
      color: "hsl(var(--primary))",
    },
    attendees: {
      label: "Presenze",
      color: "hsl(var(--secondary))",
    },
    revenue: {
      label: "Ricavi",
      color: "hsl(var(--primary))",
    }
  };

  return (
    <div className="grid gap-6">
      {/* Weekly Attendance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Presenze Settimanali</CardTitle>
          <CardDescription>
            Andamento delle prenotazioni e presenze negli ultimi 7 giorni
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-80 w-full">
            <BarChart data={data.weeklyAttendance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar 
                dataKey="bookings" 
                fill="var(--color-bookings)" 
                name="Prenotazioni"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="attendees" 
                fill="var(--color-attendees)" 
                name="Presenze"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ricavi Mensili</CardTitle>
            <CardDescription>
              Trend dei ricavi negli ultimi 6 mesi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <LineChart data={data.monthlyRevenueChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--color-revenue)" 
                  strokeWidth={3}
                  dot={{ fill: "var(--color-revenue)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Course Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuzione Corsi</CardTitle>
            <CardDescription>
              Ripartizione corsi per categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <PieChart>
                <Pie
                  data={data.courseDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.courseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};