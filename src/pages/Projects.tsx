import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from '@/components/nodes/BaseNode.js';
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
  Sparkles,
  FolderPlus,
  ArrowRight,
  Zap,
  Filter,
  Grid3X3,
  List
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.js';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";
import { Input } from '@/components/ui/input.js';
import { useToast } from '@/hooks/use-toast.js';
import { useAuth } from '@/hooks/useAuth.js';
import { UserMenu } from '@/components/UserMenu.js';

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  nodes?: Node<BaseNodeData>[];
  edges?: Edge[];
  userId?: string;
}

const RetroGrid = ({
  angle = 65,
  cellSize = 60,
  opacity = 0.3,
  lightLineColor = "rgba(120,119,198,0.1)",
  darkLineColor = "rgba(120,119,198,0.2)",
}) => {
  const gridStyles = {
    "--grid-angle": `${angle}deg`,
    "--cell-size": `${cellSize}px`,
    "--opacity": opacity,
    "--light-line": lightLineColor,
    "--dark-line": darkLineColor,
  } as React.CSSProperties

  return (
    <div
      className="pointer-events-none absolute size-full overflow-hidden [perspective:200px] opacity-30"
      style={gridStyles}
    >
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div className="animate-grid [background-image:linear-gradient(to_right,var(--light-line)_1px,transparent_0),linear-gradient(to_bottom,var(--light-line)_1px,transparent_0)] [background-repeat:repeat] [background-size:var(--cell-size)_var(--cell-size)] [height:300vh] [inset:0%_0px] [margin-left:-200%] [transform-origin:100%_0_0] [width:600vw] dark:[background-image:linear-gradient(to_right,var(--dark-line)_1px,transparent_0),linear-gradient(to_bottom,var(--dark-line)_1px,transparent_0)]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent to-90% dark:from-black" />
    </div>
  )
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [filterValue, setFilterValue] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Load projects from local storage
      const savedProjects = localStorage.getItem('cogentx-projects');
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
    const savedProjects = localStorage.getItem('cogentx-projects');
    let allProjects: Project[] = [];
    
    if (savedProjects) {
      allProjects = JSON.parse(savedProjects);
      // Replace user projects with updated ones
      allProjects = allProjects.filter(p => p.userId !== user?.id);
    }
    
    // Add the updated user projects
    allProjects = [...allProjects, ...updatedProjects];
    
    localStorage.setItem('cogentx-projects', JSON.stringify(allProjects));
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
    localStorage.setItem('cogentx-current-project-id', id);
    navigate('/editor');
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

  const handleBackHome = () => {
    navigate('/');
  };

  const starredProjects = filteredProjects.filter(p => p.starred);
  const regularProjects = filteredProjects.filter(p => !p.starred);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 text-foreground relative overflow-hidden">
      {/* Enhanced background with purple gradients */}
      <div className="absolute top-0 z-[0] h-full w-full bg-purple-950/10 dark:bg-purple-950/10 bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      <RetroGrid />
      
      {/* Premium Header */}
      <header className="relative h-20 z-10 border-b border-black/5 dark:border-white/5 px-4 md:px-6 lg:px-8 flex items-center justify-between backdrop-blur-xl bg-gradient-to-tr from-zinc-300/10 via-purple-400/20 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6"
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative overflow-hidden rounded-full p-[1px] group"
            onClick={handleBackHome}
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-white dark:bg-gray-950 text-xs font-medium backdrop-blur-3xl">
              <div className="rounded-full bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 p-2 group-hover:from-zinc-300/30 group-hover:via-purple-400/40 transition-all">
            <ChevronLeft className="h-5 w-5" />
              </div>
            </div>
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-tr from-zinc-300/20 via-purple-400/20 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 border-[2px] border-black/5 dark:border-white/5 rounded-2xl">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-[linear-gradient(180deg,_#000_0%,_rgba(0,_0,_0,_0.75)_100%)] dark:bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
                My Projects
              </h1>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </div>
        </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-600 dark:text-purple-400" />
            <Input 
              placeholder="Search projects..." 
              className="pl-10 w-72 bg-gradient-to-tr from-zinc-300/10 via-purple-400/10 to-transparent dark:from-zinc-300/5 dark:via-purple-400/10 border-[2px] border-black/5 dark:border-white/5 focus:border-purple-400/50 transition-all"
              value={filterValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterValue(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 p-1 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 border-[2px] border-black/5 dark:border-white/5 rounded-xl">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white' : ''}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <UserMenu />
        </motion.div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        {/* Projects header with CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-start mb-12"
        >
          <div className="space-y-4">
            <h1 className="text-sm text-gray-600 dark:text-gray-400 group font-geist px-5 py-2 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 border-[2px] border-black/5 dark:border-white/5 rounded-3xl w-fit">
              Agent Projects
              <FolderPlus className="inline w-4 h-4 ml-2 group-hover:translate-x-1 duration-300" />
            </h1>
            <h2 className="text-4xl tracking-tighter font-geist bg-clip-text text-transparent md:text-6xl bg-[linear-gradient(180deg,_#000_0%,_rgba(0,_0,_0,_0.75)_100%)] dark:bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
              Build amazing{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200">
                AI agents
              </span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
              Manage your visual agent flows, deploy with confidence, and scale your AI automation.
            </p>
          </div>
          
          <span className="relative inline-block overflow-hidden rounded-full p-[1.5px]">
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
            <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-white dark:bg-gray-950 text-xs font-medium backdrop-blur-3xl">
              <button
            onClick={() => setIsCreating(true)} 
                className="inline-flex rounded-full text-center group items-center w-full justify-center bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 text-gray-900 dark:text-white border-input border-[1px] hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/30 transition-all py-4 px-8 gap-2"
          >
                <PlusCircle className="h-5 w-5" />
            New Project
              </button>
        </div>
          </span>
        </motion.div>

        {/* Create new project form */}
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="mb-12"
          >
            <div className="relative p-8 rounded-2xl border-[2px] border-black/5 dark:border-white/5 bg-gradient-to-br from-zinc-300/10 via-purple-400/10 to-transparent dark:from-zinc-300/5 dark:via-purple-400/10 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-[linear-gradient(180deg,_#000_0%,_rgba(0,_0,_0,_0.75)_100%)] dark:bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
                  Create New Project
                </h3>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Project Name
                  </label>
                  <Input
                    id="name"
                    placeholder="Enter an amazing project name"
                    value={newProject.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({ ...newProject, name: e.target.value })}
                    className="bg-gradient-to-tr from-zinc-300/10 via-purple-400/10 to-transparent dark:from-zinc-300/5 dark:via-purple-400/10 border-[2px] border-black/5 dark:border-white/5 focus:border-purple-400/50 h-12 text-lg"
                    autoFocus
                  />
                </div>
                <div className="space-y-3">
                  <label htmlFor="description" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <Input
                    id="description"
                    placeholder="Describe what your agent will do"
                    value={newProject.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({ ...newProject, description: e.target.value })}
                    className="bg-gradient-to-tr from-zinc-300/10 via-purple-400/10 to-transparent dark:from-zinc-300/5 dark:via-purple-400/10 border-[2px] border-black/5 dark:border-white/5 focus:border-purple-400/50 h-12"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4 mt-8">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreating(false)}
                  className="border-[2px] border-black/10 dark:border-white/10 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 hover:from-zinc-300/30 hover:to-transparent"
                >
                  Cancel
                </Button>
                <span className="relative inline-block overflow-hidden rounded-full p-[1px]">
                  <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                  <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-white dark:bg-gray-950 text-xs font-medium backdrop-blur-3xl">
                    <button
                      onClick={handleCreateProject}
                      className="inline-flex rounded-full text-center group items-center w-full justify-center bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 text-gray-900 dark:text-white border-input border-[1px] hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/30 transition-all py-3 px-6"
                    >
                  Create Project
                    </button>
                  </div>
                </span>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Empty state */}
        {projects.length === 0 && !isCreating && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full blur-xl opacity-30"></div>
              <div className="relative p-8 rounded-full bg-gradient-to-br from-zinc-300/20 via-purple-400/20 to-transparent dark:from-zinc-300/10 dark:via-purple-400/10 border-[2px] border-black/5 dark:border-white/5">
                <FolderPlus className="h-16 w-16 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-[linear-gradient(180deg,_#000_0%,_rgba(0,_0,_0,_0.75)_100%)] dark:bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
              No projects yet
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
              Create your first project to start building AI agents visually with our powerful drag-and-drop interface
            </p>
            <span className="relative inline-block overflow-hidden rounded-full p-[1.5px]">
              <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
              <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-white dark:bg-gray-950 text-xs font-medium backdrop-blur-3xl">
                <button
                  onClick={() => setIsCreating(true)}
                  className="inline-flex rounded-full text-center group items-center w-full justify-center bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 text-gray-900 dark:text-white border-input border-[1px] hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/30 transition-all py-4 px-8 gap-2"
                >
                  <Zap className="h-5 w-5" />
              Create Your First Project
                </button>
              </div>
            </span>
          </motion.div>
        )}
        
        {/* Starred Projects Section */}
        {starredProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <Star className="h-6 w-6 text-yellow-500 fill-current" />
              <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-[linear-gradient(180deg,_#000_0%,_rgba(0,_0,_0,_0.75)_100%)] dark:bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
                Starred Projects
              </h3>
              <div className="px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                {starredProjects.length}
              </div>
            </div>
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-4"}>
              {starredProjects.map((project, index) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  index={index} 
                  viewMode={viewMode}
                  onOpen={handleOpenProject}
                  onDelete={handleDeleteProject}
                  onToggleStar={handleToggleStar}
                />
              ))}
          </div>
          </motion.div>
        )}
        
        {/* Regular Projects Section */}
        {regularProjects.length > 0 && (
              <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: starredProjects.length > 0 ? 0.2 : 0 }}
          >
            {starredProjects.length > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <Folder className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-[linear-gradient(180deg,_#000_0%,_rgba(0,_0,_0,_0.75)_100%)] dark:bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
                  All Projects
                </h3>
                <div className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full text-sm text-purple-700 dark:text-purple-400 font-medium">
                  {regularProjects.length}
                </div>
              </div>
            )}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-4"}>
              {regularProjects.map((project, index) => (
                <ProjectCard 
                key={project.id}
                  project={project} 
                  index={starredProjects.length + index} 
                  viewMode={viewMode}
                  onOpen={handleOpenProject}
                  onDelete={handleDeleteProject}
                  onToggleStar={handleToggleStar}
                />
              ))}
            </div>
          </motion.div>
        )}
        
        {/* No results */}
        {filteredProjects.length === 0 && projects.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="relative inline-block mb-6">
              <div className="p-6 rounded-full bg-gradient-to-br from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/10 dark:via-gray-400/10 border-[2px] border-black/5 dark:border-white/5">
                <Search className="h-12 w-12 text-gray-500 dark:text-gray-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-3 bg-clip-text text-transparent bg-[linear-gradient(180deg,_#000_0%,_rgba(0,_0,_0,_0.75)_100%)] dark:bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
              No projects found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Try adjusting your search or create a new project
            </p>
            <Button 
              variant="outline" 
              onClick={() => setFilterValue('')}
              className="border-[2px] border-black/10 dark:border-white/10 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent"
            >
              Clear Search
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
};

// Enhanced Project Card Component
const ProjectCard = ({ 
  project, 
  index, 
  viewMode, 
  onOpen, 
  onDelete, 
  onToggleStar 
}: { 
  project: Project; 
  index: number; 
  viewMode: 'grid' | 'list';
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
}) => {
  return (
    <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={viewMode === 'grid' ? 'h-full' : 'w-full'}
              >
      {/* Premium animated border wrapper */}
      <div className="relative overflow-hidden rounded-2xl p-[1px] group cursor-pointer h-full w-full">
        <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_25%,#E2CBFF_50%,#393BB2_75%,#E2CBFF_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
                <Card 
          className={`relative h-full w-full cursor-pointer overflow-hidden bg-white dark:bg-gray-900 backdrop-blur-sm border-0 shadow-lg ${viewMode === 'list' ? 'flex flex-row items-center' : 'flex flex-col'}`}
          onClick={() => onOpen(project.id)}
                >
          {/* Inner content with clean background */}
          <div className={`relative z-10 h-full w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 group-hover:border-purple-300 dark:group-hover:border-purple-600 transition-all duration-300 ${viewMode === 'list' ? 'flex flex-row items-center' : 'flex flex-col'}`}>
            
            {/* Top bar */}
            <div className={`${viewMode === 'grid' ? 'h-1' : 'w-1'} bg-purple-500 flex-shrink-0 ${viewMode === 'grid' ? 'rounded-t-2xl' : 'rounded-l-2xl'}`}></div>
            
            <div className={`relative z-10 ${viewMode === 'grid' ? 'flex-1 flex flex-col p-6' : 'flex-1 flex items-center gap-6 px-6 py-4'}`}>
              {/* Action buttons */}
              <div className="absolute right-4 top-4 flex gap-2">
                {/* Star Button */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-8 w-8 rounded-full ${project.starred ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'} transition-all duration-300`}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    onToggleStar(project.id);
                  }}
                >
                  <Star className="h-4 w-4" fill={project.starred ? "currentColor" : "none"} />
                </Button>
                
                {/* Menu Button */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
                  >
                          <DropdownMenuItem onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                            e.stopPropagation();
                            // Implement edit functionality
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                      className="text-red-500 focus:text-red-600"
                            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                              e.stopPropagation();
                        onDelete(project.id);
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
              
              {/* Project info */}
              <div className={`${viewMode === 'grid' ? 'space-y-3' : 'flex items-center gap-4'}`}>
                <div className={viewMode === 'grid' ? 'space-y-2' : 'flex-1'}>
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                    {project.name}
                  </CardTitle>
                  {project.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-2">
                      {project.description}
                    </p>
                  )}
                      </div>
                    </div>
              
              {viewMode === 'grid' && (
                <CardFooter className="text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center pt-4 mt-auto px-0 pb-0">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-500" />
                      <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  
                  {/* Node Counter */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-purple-700 dark:text-purple-400 font-medium">
                      {project.nodes?.length || 0} nodes
                    </span>
                    </div>
                  </CardFooter>
              )}
              
              {viewMode === 'list' && (
                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-500" />
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {/* Node Counter for List View */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-purple-700 dark:text-purple-400 font-medium">
                      {project.nodes?.length || 0} nodes
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-purple-600 dark:text-purple-400 font-medium">Open</span>
                    <ArrowRight className="h-4 w-4 text-purple-500 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
          </div>
        )}
            </div>
          </div>
        </Card>
    </div>
    </motion.div>
  );
};

export default Projects;
