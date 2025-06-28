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
  List,
  BarChart3,
  SortAsc,
  SortDesc,
  X,
  Hash,
  Users
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { Badge } from "@/components/ui/badge.js";
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
        <div className="animate-grid [background-image:linear-gradient(to_right,var(--dark-line)_1px,transparent_0),linear-gradient(to_bottom,var(--dark-line)_1px,transparent_0)] [background-repeat:repeat] [background-size:var(--cell-size)_var(--cell-size)] [height:300vh] [inset:0%_0px] [margin-left:-200%] [transform-origin:100%_0_0] [width:600vw]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent to-90%" />
    </div>
  )
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [filterValue, setFilterValue] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'nodes' | 'created'>('recent');
  const [filterBy, setFilterBy] = useState<'all' | 'starred' | 'empty' | 'complex'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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

  const filteredProjects = projects.filter(project => {
    // Search filter - enhanced to include more fields
    const matchesSearch = filterValue === '' || (
      project.name.toLowerCase().includes(filterValue.toLowerCase()) ||
      project.description.toLowerCase().includes(filterValue.toLowerCase()) ||
      // Search within node data if available
      (project.nodes && project.nodes.some(node => 
        node.data.label?.toLowerCase().includes(filterValue.toLowerCase()) ||
        node.data.description?.toLowerCase().includes(filterValue.toLowerCase()) ||
        node.data.instruction?.toLowerCase().includes(filterValue.toLowerCase())
      ))
    );

    // Category filter
    const matchesFilter = (() => {
      switch (filterBy) {
        case 'starred':
          return project.starred;
        case 'empty':
          return !project.nodes || project.nodes.length === 0;
        case 'complex':
          return project.nodes && project.nodes.length >= 5;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesFilter;
  });

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'nodes':
        return (b.nodes?.length || 0) - (a.nodes?.length || 0);
      case 'created':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'recent':
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  const handleBackHome = () => {
    navigate('/');
  };

  const handleViewAnalytics = () => {
    navigate('/analytics');
  };

  const starredProjects = sortedProjects.filter(p => p.starred);
  const regularProjects = sortedProjects.filter(p => !p.starred);

  return (
    <div className="min-h-screen bg-[#0a0b1e] text-white relative overflow-hidden">
      {/* Background matching landing page exactly */}
      <div className="absolute top-0 z-[0] h-full w-full bg-gradient-to-br from-zinc-300/2 via-purple-400/5 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.3),transparent)]" />
      <RetroGrid />
      
      {/* Header - matching landing page style */}
      <header className="relative h-20 z-10 border-b border-white/5 px-4 md:px-6 lg:px-8 flex items-center justify-between bg-gradient-to-tr from-zinc-300/5 via-purple-400/10 to-transparent backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6"
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative rounded-lg text-gray-300 hover:text-gray-100 hover:bg-gradient-to-tr hover:from-zinc-300/10 hover:via-purple-400/10 hover:to-transparent transition-all duration-300 group"
            onClick={handleBackHome}
          >
            <ChevronLeft className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute inset-0 border border-purple-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center group cursor-pointer">
              <div className="relative p-2 rounded-xl bg-gradient-to-tr from-purple-400/20 via-orange-200/20 to-transparent border border-purple-400/30 mr-3 group-hover:scale-105 transition-all duration-300">
                <Sparkles className="w-5 h-5 text-purple-400 group-hover:rotate-12 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/10 to-pink-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-orange-200 group-hover:from-purple-500 group-hover:to-pink-400 transition-all duration-300">
                My Projects
              </h1>
            </div>
            <div className="text-sm text-gray-400 font-medium">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </div>
        </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          {/* Enhanced Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400" />
            <Input 
              placeholder="Search projects, descriptions, nodes..." 
              className="pl-10 w-80 bg-gradient-to-tr from-zinc-300/5 via-purple-400/10 to-transparent border border-white/10 focus:border-purple-400/50 transition-all backdrop-blur-sm"
              value={filterValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterValue(e.target.value)}
            />
            {filterValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-white/10"
                onClick={() => setFilterValue('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Advanced Filters Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`bg-gradient-to-tr from-zinc-300/5 via-purple-400/10 to-transparent border transition-all backdrop-blur-sm ${
              showAdvancedFilters || filterBy !== 'all' || sortBy !== 'recent'
                ? 'border-purple-400/50 text-purple-300'
                : 'border-white/10 text-gray-300 hover:border-purple-400/30'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {(filterBy !== 'all' || sortBy !== 'recent') && (
              <Badge variant="secondary" className="ml-2 bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                Active
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleViewAnalytics}
            className="bg-gradient-to-tr from-zinc-300/5 via-purple-400/10 to-transparent border border-purple-400/20 hover:border-purple-400/40 text-purple-300 hover:text-purple-200 backdrop-blur-sm"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 p-1 bg-gradient-to-tr from-zinc-300/5 via-gray-400/5 to-transparent border border-white/5 rounded-xl backdrop-blur-sm">
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

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="relative z-10 border-b border-white/5 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-transparent backdrop-blur-sm"
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-6 flex-wrap">
              {/* Sort By */}
              <div className="flex items-center gap-3">
                <SortAsc className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Sort by:</span>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-40 bg-gradient-to-tr from-zinc-300/5 via-purple-400/10 to-transparent border border-white/10 focus:border-purple-400/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="nodes">Most Complex</SelectItem>
                    <SelectItem value="created">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filter By */}
              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Show:</span>
                <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                  <SelectTrigger className="w-40 bg-gradient-to-tr from-zinc-300/5 via-purple-400/10 to-transparent border border-white/10 focus:border-purple-400/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    <SelectItem value="starred">Starred Only</SelectItem>
                    <SelectItem value="empty">Empty Projects</SelectItem>
                    <SelectItem value="complex">Complex (5+ nodes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results Count */}
              <div className="flex items-center gap-2 ml-auto">
                <Hash className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">
                  {sortedProjects.length} of {projects.length} projects
                </span>
              </div>

              {/* Clear Filters */}
              {(filterBy !== 'all' || sortBy !== 'recent' || filterValue) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterBy('all');
                    setSortBy('recent');
                    setFilterValue('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        {/* Projects header with CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-start mb-12"
        >
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900/30 rounded-full">
              <FolderPlus className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Agent Projects</span>
            </div>
            <h2 className="text-4xl font-bold text-white md:text-5xl">
              Build amazing{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">
                AI agents
              </span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl">
              Manage your visual agent flows, deploy with confidence, and scale your AI automation.
            </p>
          </div>
          
          <span className="relative inline-block overflow-hidden rounded-full p-[1.5px]">
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
            <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-gray-950 text-xs font-medium backdrop-blur-3xl">
              <button
                onClick={() => setIsCreating(true)} 
                className="inline-flex rounded-full text-center group items-center w-full justify-center bg-gradient-to-tr from-zinc-300/5 via-purple-400/20 to-transparent text-white border-input border-[1px] hover:bg-gradient-to-tr hover:from-zinc-300/10 hover:via-purple-400/30 hover:to-transparent transition-all py-4 px-8 gap-2"
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
            <div className="relative p-8 rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-300/5 via-purple-400/10 to-transparent backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">
                  Create New Project
                </h3>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label htmlFor="name" className="text-sm font-semibold text-gray-300">
                    Project Name
                  </label>
                  <Input
                    id="name"
                    placeholder="Enter an amazing project name"
                    value={newProject.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({ ...newProject, name: e.target.value })}
                    className="bg-gradient-to-tr from-zinc-300/5 via-purple-400/10 to-transparent border border-white/10 focus:border-purple-400/50 h-12 text-lg backdrop-blur-sm"
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
                    className="bg-gradient-to-tr from-zinc-300/10 via-purple-400/10 to-transparent dark:from-zinc-300/5 dark:via-purple-400/10 border border-black/5 dark:border-white/10 focus:border-purple-400/50 h-12 backdrop-blur-sm"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4 mt-8">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreating(false)}
                  className="border border-white/10 bg-gradient-to-tr from-zinc-300/5 via-gray-400/5 to-transparent hover:from-zinc-300/10 hover:to-transparent"
                >
                  Cancel
                </Button>
                <span className="relative inline-block overflow-hidden rounded-full p-[1px]">
                  <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                  <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-gray-950 text-xs font-medium backdrop-blur-3xl">
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
              <div className="p-8 rounded-full bg-purple-900/30 border border-purple-800">
                <FolderPlus className="h-16 w-16 text-purple-400" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-4 text-white">
              No projects yet
            </h3>
            <p className="text-lg text-gray-300 mb-8 max-w-md mx-auto">
              Create your first project to start building AI agents visually with our powerful drag-and-drop interface
            </p>
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white px-8 py-4 gap-2 text-lg"
            >
              <Zap className="h-5 w-5" />
              Create Your First Project
            </Button>
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
              <h3 className="text-2xl font-bold text-white">
                Starred Projects
              </h3>
              <div className="px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full text-sm text-yellow-400 font-medium">
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
                <Folder className="h-6 w-6 text-purple-400" />
                <h3 className="text-2xl font-bold text-white">
                  All Projects
                </h3>
                <div className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full text-sm text-purple-400 font-medium">
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
        {sortedProjects.length === 0 && projects.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="relative inline-block mb-6">
              <div className="p-6 rounded-full bg-gray-800 border border-gray-700">
                <Search className="h-12 w-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">
              No projects found
            </h3>
            <p className="text-gray-300 mb-6">
              {filterValue 
                ? `No projects match "${filterValue}". Try adjusting your search or filters.`
                : filterBy !== 'all' 
                  ? `No projects match the current filter. Try changing the filter or create a new project.`
                  : 'Try adjusting your search or create a new project'
              }
            </p>
            <div className="flex gap-3 justify-center">
              {(filterValue || filterBy !== 'all' || sortBy !== 'recent') && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilterValue('');
                    setFilterBy('all');
                    setSortBy('recent');
                  }}
                  className="border border-gray-600 hover:bg-gray-700"
                >
                  Clear Filters
                </Button>
              )}
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
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
      {/* Clean card wrapper */}
      <Card 
        className={`h-full w-full cursor-pointer overflow-hidden bg-gray-800 border border-gray-700 hover:border-purple-500 hover:shadow-lg transition-all duration-300 group ${viewMode === 'list' ? 'flex flex-row items-center' : 'flex flex-col'}`}
        onClick={() => onOpen(project.id)}
      >
        <div className={`relative z-10 h-full w-full ${viewMode === 'list' ? 'flex flex-row items-center' : 'flex flex-col'}`}>
            
            {/* Purple accent bar */}
            <div className={`${viewMode === 'grid' ? 'h-1 w-full' : 'w-1 h-full'} bg-gradient-to-r from-purple-500 to-pink-500 flex-shrink-0`}></div>
            
            <div className={`relative z-10 ${viewMode === 'grid' ? 'flex-1 flex flex-col p-6' : 'flex-1 flex items-center gap-6 px-6 py-4'}`}>
              {/* Action buttons */}
              <div className="absolute right-4 top-4 flex gap-2">
                {/* Star Button */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-8 w-8 rounded-full ${project.starred ? 'text-yellow-500 bg-yellow-900/20' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-900/20'} transition-all duration-300`}
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
                      className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-300 hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="bg-gray-800 border border-gray-700 shadow-lg"
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
                  <CardTitle className="text-xl font-bold text-gray-100 group-hover:text-purple-400 transition-colors duration-300">
                    {project.name}
                  </CardTitle>
                  {project.description && (
                    <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
                      {project.description}
                    </p>
                  )}
                      </div>
                    </div>
              
              {viewMode === 'grid' && (
                <CardFooter className="text-sm text-gray-400 flex justify-between items-center pt-4 mt-auto px-0 pb-0">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-500" />
                      <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  
                  {/* Node Counter */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-900/30 rounded-full">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-purple-400 font-medium">
                      {project.nodes?.length || 0} nodes
                    </span>
                    </div>
                  </CardFooter>
              )}
              
              {viewMode === 'list' && (
                <div className="flex items-center gap-6 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-500" />
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {/* Node Counter for List View */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-900/30 rounded-full">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-purple-400 font-medium">
                      {project.nodes?.length || 0} nodes
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-purple-400 font-medium">Open</span>
                    <ArrowRight className="h-4 w-4 text-purple-500 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              )}
            </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default Projects;
