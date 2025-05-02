
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  PlusCircle, 
  Folder, 
  MoreVertical, 
  Edit, 
  Trash, 
  ChevronLeft,
  Clock, 
  Star,
  Search,
  Grid3X3,
  List as ListIcon,
  SortDesc
} from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';
import { UserMenu } from '@/components/UserMenu';

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  nodes?: any[];
  edges?: any[];
  userId?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [filterValue, setFilterValue] = useState('');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'starred'>('date');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Load projects from local storage
      const savedProjects = localStorage.getItem('agent-flow-projects');
      if (savedProjects) {
        const allProjects = JSON.parse(savedProjects);
        // Filter projects for the current user
        const userProjects = allProjects.filter((project: Project) => 
          !project.userId || project.userId === user.id
        );
        setProjects(userProjects);
      }
    }
  }, [user]);

  const saveProjects = (updatedProjects: Project[]) => {
    // Get all existing projects
    const savedProjects = localStorage.getItem('agent-flow-projects');
    let allProjects: Project[] = [];
    
    if (savedProjects) {
      allProjects = JSON.parse(savedProjects);
      // Replace user projects with updated ones
      allProjects = allProjects.filter(p => p.userId !== user?.id);
    }
    
    // Add the updated user projects
    allProjects = [...allProjects, ...updatedProjects];
    
    localStorage.setItem('agent-flow-projects', JSON.stringify(allProjects));
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
      edges: [],
      userId: user?.id // Associate project with user
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
    navigate('/editor');
  };

  const handleToggleStar = (id: string) => {
    const updatedProjects = projects.map(project => 
      project.id === id ? { ...project, starred: !project.starred } : project
    );
    saveProjects(updatedProjects);
  };

  const filteredProjects = projects
    .filter(project => 
      project.name.toLowerCase().includes(filterValue.toLowerCase()) ||
      project.description.toLowerCase().includes(filterValue.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'starred') return (b.starred ? 1 : 0) - (a.starred ? 1 : 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleBackHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 text-foreground animated-grid">
      {/* Glowing circles for premium effect */}
      <div className="fixed top-20 right-20 w-80 h-80 bg-premium/10 rounded-full blur-3xl opacity-20"></div>
      <div className="fixed bottom-20 left-20 w-60 h-60 bg-futuristic-blue/10 rounded-full blur-3xl opacity-20"></div>

      {/* Header */}
      <header className="h-16 border-b backdrop-blur-md border-white/10 px-4 md:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-10 bg-background/70">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full hover:bg-white/5 hover:text-primary transition-colors"
            onClick={handleBackHome}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold premium-text-gradient">My Projects</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex gap-2 mr-2">
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${viewType === 'grid' ? 'bg-secondary' : 'hover:bg-white/5'}`}
              onClick={() => setViewType('grid')}
              title="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${viewType === 'list' ? 'bg-secondary' : 'hover:bg-white/5'}`}
              onClick={() => setViewType('list')}
              title="List view"
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 hover:bg-white/5">
                <SortDesc className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="premium-glass">
              <DropdownMenuItem onClick={() => setSortBy('date')} className={sortBy === 'date' ? 'bg-primary/20' : ''}>
                Date created
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('name')} className={sortBy === 'name' ? 'bg-primary/20' : ''}>
                Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('starred')} className={sortBy === 'starred' ? 'bg-primary/20' : ''}>
                Starred
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects..." 
              className="pl-10 bg-secondary/50 border-white/10 focus:ring-1 focus:ring-primary"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            />
          </div>
          <UserMenu />
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
            className="flex items-center gap-2 bg-gradient-premium hover:shadow-premium transition-all"
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
            <Card className="premium-glass border border-white/10">
              <CardHeader>
                <CardTitle className="premium-text-gradient">Create New Project</CardTitle>
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
                    className="bg-secondary/50 border-white/10 focus:ring-1 focus:ring-primary"
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
                    className="bg-secondary/50 border-white/10 focus:ring-1 focus:ring-primary"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsCreating(false)} className="border-white/10 hover:bg-white/5">
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} className="bg-gradient-premium hover:shadow-premium transition-all">
                  Create Project
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
        
        {/* Empty state */}
        {projects.length === 0 && !isCreating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-24"
          >
            <div className="inline-block p-8 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/10 backdrop-blur-sm mb-4 border border-white/5 shadow-premium">
              <Folder className="h-14 w-14 text-premium-light" />
            </div>
            <h3 className="text-2xl font-medium mb-2 premium-text-gradient">No projects yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first project to start building AI agents visually
            </p>
            <Button 
              onClick={() => setIsCreating(true)}
              className="bg-gradient-premium hover:shadow-premium transition-all"
            >
              Create Your First Project
            </Button>
          </motion.div>
        )}
        
        {/* Projects grid */}
        {filteredProjects.length > 0 && viewType === 'grid' && (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                variants={item}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Card 
                  className="premium-card overflow-hidden group"
                  onClick={() => handleOpenProject(project.id)}
                >
                  <div className="h-1.5 bg-gradient-premium"></div>
                  <CardHeader className="relative">
                    <div className="absolute right-4 top-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/5">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="premium-glass">
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
                      className={`absolute left-4 top-4 h-8 w-8 ${project.starred ? 'text-yellow-400' : 'text-muted-foreground opacity-0 group-hover:opacity-100'} transition-opacity hover:bg-white/5`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar(project.id);
                      }}
                    >
                      <Star className="h-4 w-4" fill={project.starred ? "currentColor" : "none"} />
                    </Button>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="p-2 rounded-md bg-premium/20 text-premium-light">
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
          </motion.div>
        )}

        {/* Projects list */}
        {filteredProjects.length > 0 && viewType === 'list' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                variants={item}
                whileHover={{ x: 5, transition: { duration: 0.2 } }}
              >
                <Card
                  className="premium-card overflow-hidden group"
                  onClick={() => handleOpenProject(project.id)}
                >
                  <div className="flex items-center p-4">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-8 w-8 mr-3 ${project.starred ? 'text-yellow-400' : 'text-muted-foreground'} hover:bg-white/5`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar(project.id);
                      }}
                    >
                      <Star className="h-4 w-4" fill={project.starred ? "currentColor" : "none"} />
                    </Button>
                    
                    <div className="p-2 mr-3 rounded-md bg-premium/20 text-premium-light">
                      <Folder className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-medium">{project.name}</h3>
                      {project.description && (
                        <p className="text-muted-foreground text-sm truncate max-w-md">{project.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-muted-foreground hidden md:block">
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                      
                      <div className="text-xs text-muted-foreground border border-white/5 px-2 py-1 rounded-full bg-white/5">
                        {project.nodes?.length || 0} nodes
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="premium-glass">
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
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
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {/* No results */}
        {filteredProjects.length === 0 && projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <h3 className="text-xl font-medium mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
            <Button 
              variant="outline" 
              onClick={() => setFilterValue('')}
              className="border-white/10 hover:bg-white/5"
            >
              Clear Search
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Projects;
