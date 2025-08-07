import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminLayout } from '@/layouts/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Trash2,
  Users,
  Calendar,
  Euro,
  MoreHorizontal,
  Copy,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const AdminCoursesList = () => {
  const { courses } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const selectAllCourses = () => {
    setSelectedCourses(
      selectedCourses.length === filteredCourses.length 
        ? [] 
        : filteredCourses.map(course => course.id)
    );
  };

  const categories = [...new Set(courses.map(course => course.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Gestione Corsi
          </h1>
          <p className="text-muted-foreground">
            Gestisci tutti i corsi della palestra
          </p>
        </div>
        <Button asChild className="bg-gradient-primary">
          <Link to="/admin/courses/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Corso
          </Link>
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca corsi o istruttori..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filtra per categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedCourses.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedCourses.length} corsi selezionati
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="mr-2 h-4 w-4" />
                    Duplica
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Esporta
                  </Button>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Courses Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Corsi Attivi ({filteredCourses.length})
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedCourses.length === filteredCourses.length && filteredCourses.length > 0}
                onCheckedChange={selectAllCourses}
              />
              <span className="text-sm text-muted-foreground">Seleziona tutto</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCourses.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={selectedCourses.includes(course.id)}
                    onCheckedChange={() => toggleCourseSelection(course.id)}
                  />
                  <img 
                    src={course.image} 
                    alt={course.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div>
                    <h4 className="font-medium">{course.name}</h4>
                    <p className="text-sm text-muted-foreground">{course.instructor}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline">{course.category}</Badge>
                      <Badge variant="secondary">{course.level}</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="mr-1 h-4 w-4" />
                      {course.currentParticipants}/{course.maxParticipants}
                    </div>
                  </div>
                  
                  <div className="text-center">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-1 h-4 w-4" />
                    {course.schedule[0]?.day || 'Non programmato'}
                  </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center text-sm font-medium">
                      <Euro className="mr-1 h-4 w-4" />
                      {course.price}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/admin/courses/${course.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizza
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/admin/courses/${course.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifica
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplica
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Elimina
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

          {filteredCourses.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nessun corso trovato</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCoursesList;