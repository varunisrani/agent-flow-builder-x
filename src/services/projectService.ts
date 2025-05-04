import { Node, Edge } from '@xyflow/react';

// Define the BaseNodeData type locally since the import is failing
export interface BaseNodeData {
  id: string;
  type: string;
  label: string;
  [key: string]: any;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
  userId?: string;
}

// Create a new project
export const createProject = (name: string, description: string = '', userId?: string): Project => {
  const newProject: Project = {
    id: `project_${Date.now()}`,
    name: name.trim(),
    description: description.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    starred: false,
    nodes: [],
    edges: [],
    userId
  };
  
  return newProject;
};

// Get all projects
export const getAllProjects = (): Project[] => {
  const projects = localStorage.getItem('cogentx-projects');
  return projects ? JSON.parse(projects) : [];
};

// Get project by ID
export const getProjectById = (id: string): Project | null => {
  const projects = getAllProjects();
  return projects.find(project => project.id === id) || null;
};

// Get current project
export const getCurrentProject = (): Project | null => {
  const currentProjectId = localStorage.getItem('cogentx-current-project-id');
  return currentProjectId ? getProjectById(currentProjectId) : null;
};

// Save project nodes and edges
export const saveProjectNodesAndEdges = (
  projectId: string, 
  nodes: Node<BaseNodeData>[], 
  edges: Edge[]
): void => {
  const projects = getAllProjects();
  const updatedProjects = projects.map(project => {
    if (project.id === projectId) {
      return {
        ...project,
        nodes,
        edges,
        updatedAt: new Date().toISOString()
      };
    }
    return project;
  });
  
  localStorage.setItem('cogentx-projects', JSON.stringify(updatedProjects));
};

// Save all projects
export const saveProjects = (projects: Project[]): void => {
  localStorage.setItem('cogentx-projects', JSON.stringify(projects));
};

// Delete project
export const deleteProject = (id: string): void => {
  const projects = getAllProjects();
  const updatedProjects = projects.filter(project => project.id !== id);
  saveProjects(updatedProjects);
  
  // If the deleted project was the current one, clear the current project
  const currentProjectId = localStorage.getItem('cogentx-current-project-id');
  if (currentProjectId === id) {
    localStorage.removeItem('cogentx-current-project-id');
  }
};
