
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  Folder, 
  MoreVertical, 
  Edit, 
  Trash, 
  ChevronLeft,
  Clock, 
  Star,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  nodes?: any[];
  edges?: any[];
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [filterValue, setFilterValue] = useState('');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Load projects from local storage
    const savedProjects = localStorage.getItem('agent-flow-projects');
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects));
    }
  }, []);

  const saveProjects = (updatedProjects: Project[]) => {
    localStorage.setItem('agent-flow-projects', JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
  };

  const handleCreateProject = () => {
    if (!newProject.name.trim()) {
      toast({
        title: "Project name required",
        description: "Please provide a name for your project",
        variant: "destructive"
      });
      return;
    }

    const newProjectData = {
      id: `project_${Date.now()}`,
      name: newProject.name.trim(),
      description: newProject.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      starred: false,
      nodes: [],
      edges: []
    };

    const updatedProjects = [...projects, newProjectData];
    saveProjects(updatedProjects);
    
    toast({
      title: "Project created",
      description: `${newProject.name} has been created successfully`,
    });
    
    setNewProject({ name: '', description: '' });
    setIsCreating(false);
  };

  const handleDeleteProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    const updatedProjects = projects.filter(p => p.id !== id);
    saveProjects(updatedProjects);
    
    toast({
      title: "Project deleted",
      description: `${project?.name} has been deleted`,
    });
  };

  const handleOpenProject = (id: string) => {
    // Save current project ID to local storage
    localStorage.setItem('current-project-id', id);
    navigate('/');
  };

  const handleToggleStar = (id: string) => {
    const updatedProjects = projects.map(project => 
      project.id === id ? { ...project, starred: !project.starred } : project
    );
    saveProjects(updatedProjects);
  };

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(filterValue.toLowerCase()) ||
    project.description.toLowerCase().includes(filterValue.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 text-foreground">
      {/* Header */}
      <header className="h-16 border-b border-white/10 px-4 md:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => navigate('/')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-gradient">My Projects</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects..." 
              className="pl-10 bg-secondary/50"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Projects header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold">All Projects</h2>
            <p className="text-muted-foreground">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} total
            </p>
          </div>
          <Button 
            onClick={() => setIsCreating(true)} 
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Create new project form */}
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="glass-card border border-white/10">
              <CardHeader>
                <CardTitle>Create New Project</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Project Name
                  </label>
                  <Input
                    id="name"
                    placeholder="Enter project name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="bg-secondary/50"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description (optional)
                  </label>
                  <Input
                    id="description"
                    placeholder="Enter project description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="bg-secondary/50"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject}>
                  Create Project
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
        
        {/* Empty state */}
        {projects.length === 0 && !isCreating && (
          <div className="text-center py-24">
            <div className="inline-block p-6 rounded-full bg-secondary/20 mb-4">
              <Folder className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first project to start building AI agents visually
            </p>
            <Button onClick={() => setIsCreating(true)}>
              Create Your First Project
            </Button>
          </div>
        )}
        
        {/* Projects grid */}
        {filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <Card 
                  className="glass-card border border-white/10 hover:border-primary/30 transition-all cursor-pointer overflow-hidden group"
                  onClick={() => handleOpenProject(project.id)}
                >
                  <div className="h-2 bg-gradient-to-r from-primary to-accent"></div>
                  <CardHeader className="relative">
                    <div className="absolute right-4 top-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            // Implement edit functionality
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`absolute left-4 top-4 h-8 w-8 ${project.starred ? 'text-yellow-400' : 'text-muted-foreground opacity-0 group-hover:opacity-100'} transition-opacity`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar(project.id);
                      }}
                    >
                      <Star className="h-4 w-4" fill={project.starred ? "currentColor" : "none"} />
                    </Button>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/20 text-primary">
                        <Folder className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                    </div>
                    {project.description && (
                      <p className="text-muted-foreground text-sm mt-1">{project.description}</p>
                    )}
                  </CardHeader>
                  <CardFooter className="text-xs text-muted-foreground flex justify-between pt-0">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      {project.nodes?.length || 0} nodes
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
        
        {/* No results */}
        {filteredProjects.length === 0 && projects.length > 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
            <Button variant="outline" onClick={() => setFilterValue('')}>
              Clear Search
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Projects;
