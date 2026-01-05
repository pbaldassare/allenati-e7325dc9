import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, Users, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useInstructorHoursWorked } from '@/hooks/useInstructorHoursWorked';

interface InstructorHoursDashboardProps {
  gymId: string | undefined;
}

export const InstructorHoursDashboard: React.FC<InstructorHoursDashboardProps> = ({ gymId }) => {
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(today));
  const [endDate, setEndDate] = useState<Date>(today);

  const { data, loading, error } = useInstructorHoursWorked(gymId, startDate, endDate);

  const setPreset = (preset: 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear') => {
    const now = new Date();
    switch (preset) {
      case 'thisMonth':
        setStartDate(startOfMonth(now));
        setEndDate(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      case 'last3Months':
        setStartDate(startOfMonth(subMonths(now, 2)));
        setEndDate(now);
        break;
      case 'thisYear':
        setStartDate(startOfYear(now));
        setEndDate(now);
        break;
    }
  };

  const totalHours = data.reduce((sum, i) => sum + i.totalHours, 0);
  const totalSessions = data.reduce((sum, i) => sum + i.sessionCount, 0);

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  if (!gymId) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Ore Lavorate Istruttori
          </CardTitle>
          
          {/* Date filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Start Date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {format(startDate, 'dd/MM/yy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => d && setStartDate(d)}
                  disabled={(date) => date > endDate || date > today}
                  locale={it}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground text-sm">-</span>

            {/* End Date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {format(endDate, 'dd/MM/yy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(d) => d && setEndDate(d)}
                  disabled={(date) => date < startDate || date > today}
                  locale={it}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Presets */}
            <div className="flex gap-1 ml-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs px-2"
                onClick={() => setPreset('thisMonth')}
              >
                Questo mese
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs px-2"
                onClick={() => setPreset('lastMonth')}
              >
                Mese scorso
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs px-2 hidden sm:inline-flex"
                onClick={() => setPreset('thisYear')}
              >
                Anno
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-destructive text-center py-4">{error}</p>
        ) : data.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nessun dato disponibile per il periodo selezionato
          </p>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">{formatHours(totalHours)}</p>
                <p className="text-xs text-muted-foreground">Ore Totali</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{totalSessions}</p>
                <p className="text-xs text-muted-foreground">Sessioni</p>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Istruttore</TableHead>
                    <TableHead className="text-right">Ore</TableHead>
                    <TableHead className="text-right">Sessioni</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Media</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((instructor) => (
                    <TableRow key={instructor.instructorId}>
                      <TableCell className="font-medium">
                        {instructor.firstName} {instructor.lastName}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatHours(instructor.totalHours)}
                      </TableCell>
                      <TableCell className="text-right">
                        {instructor.sessionCount}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                        {instructor.sessionCount > 0 
                          ? formatHours(instructor.totalHours / instructor.sessionCount)
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
