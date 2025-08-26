import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';

export interface UserFilters {
  search: string;
  role: string;
  status: string;
  gym: string;
  city: string;
}

interface AdminUserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  gyms: Array<{ id: string; name: string }>;
  cities: string[];
  onClearFilters: () => void;
}

export const AdminUserFilters: React.FC<AdminUserFiltersProps> = ({
  filters,
  onFiltersChange,
  gyms,
  cities,
  onClearFilters
}) => {
  const updateFilter = (key: keyof UserFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, cognome, email o telefono..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-9"
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="shrink-0"
          >
            <X className="h-4 w-4 mr-1" />
            Pulisci
          </Button>
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        <Select
          value={filters.role}
          onValueChange={(value) => updateFilter('role', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tutti i ruoli" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tutti i ruoli</SelectItem>
            <SelectItem value="admin">Amministratori</SelectItem>
            <SelectItem value="gym_owner">Proprietari Palestre</SelectItem>
            <SelectItem value="instructor">Istruttori</SelectItem>
            <SelectItem value="basic_user">Utenti Base</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value) => updateFilter('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tutti gli stati" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tutti gli stati</SelectItem>
            <SelectItem value="active">Attivi</SelectItem>
            <SelectItem value="inactive">Inattivi</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.gym}
          onValueChange={(value) => updateFilter('gym', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tutte le palestre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tutte le palestre</SelectItem>
            {gyms.map(gym => (
              <SelectItem key={gym.id} value={gym.id}>
                {gym.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.city}
          onValueChange={(value) => updateFilter('city', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tutte le città" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tutte le città</SelectItem>
            {cities.map(city => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};