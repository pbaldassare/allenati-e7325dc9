import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { it } from 'date-fns/locale';
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
    <Card className="mb-4">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Ore Lavorate
          </CardTitle>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {format(startDate, 'dd/MM')}
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

            <span className="text-muted-foreground text-xs">-</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {format(endDate, 'dd/MM')}
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

            <div className="flex gap-0.5">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-[10px] px-1.5"
                onClick={() => setPreset('thisMonth')}
              >
                Mese
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-[10px] px-1.5"
                onClick={() => setPreset('lastMonth')}
              >
                Scorso
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-[10px] px-1.5 hidden sm:inline-flex"
                onClick={() => setPreset('thisYear')}
              >
                Anno
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3 px-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-destructive text-center py-2 text-sm">{error}</p>
        ) : data.length === 0 ? (
          <p className="text-muted-foreground text-center py-2 text-sm">
            Nessun dato per il periodo selezionato
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-2 text-xs">Istruttore</TableHead>
                  <TableHead className="py-2 text-xs text-right">Ore</TableHead>
                  <TableHead className="py-2 text-xs text-right">Sess.</TableHead>
                  <TableHead className="py-2 text-xs text-right hidden sm:table-cell">Media</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((instructor) => (
                  <TableRow key={instructor.instructorId}>
                    <TableCell className="py-2 text-sm font-medium">
                      {instructor.firstName} {instructor.lastName}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-right">
                      {formatHours(instructor.totalHours)}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-right">
                      {instructor.sessionCount}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-right hidden sm:table-cell text-muted-foreground">
                      {instructor.sessionCount > 0 
                        ? formatHours(instructor.totalHours / instructor.sessionCount)
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/50">
                  <TableCell className="py-2 text-xs font-bold">Totale</TableCell>
                  <TableCell className="py-2 text-xs font-bold text-right">{formatHours(totalHours)}</TableCell>
                  <TableCell className="py-2 text-xs font-bold text-right">{totalSessions}</TableCell>
                  <TableCell className="py-2 hidden sm:table-cell" />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
