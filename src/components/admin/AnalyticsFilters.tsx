import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Download, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnalyticsFilters as Filters } from '@/hooks/useAnalytics';

interface AnalyticsFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onRefresh: () => void;
  onExport: () => void;
  loading?: boolean;
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  loading = false
}) => {
  const periodOptions = [
    { value: 'week', label: 'Ultima settimana' },
    { value: 'month', label: 'Ultimo mese' },
    { value: 'quarter', label: 'Ultimo trimestre' },
    { value: 'year', label: 'Ultimo anno' }
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Periodo:</span>
            </div>
            
            <Select 
              value={filters.period} 
              onValueChange={(period: 'week' | 'month' | 'quarter' | 'year') => 
                onFiltersChange({ ...filters, period })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Badge variant="outline" className="font-normal">
              Aggiornato in tempo reale
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Aggiorna
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Esporta
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};