
import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from '@/components/nodes/BaseNode';

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  nodes: Node<BaseNodeData>[];
  edges: Edge[];
}

// Create a new project
export const createProject = (name: string, description: string = ''): Project => {
  const newProject: Project = {
    id: `project_${Date.now()}`,
    name: name.trim(),
    description: description.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    starred: false,
    nodes: [],
    edges: []
  };
  
  return newProject;
};

// Get all projects
export const getAllProjects = (): Project[] => {
  const projects = localStorage.getItem('agent-flow-projects');
  return projects ? JSON.parse(projects) : [];
};

// Get project by ID
export const getProjectById = (id: string): Project | null => {
  const projects = getAllProjects();
  return projects.find(project => project.id === id) || null;
};

// Get current project
export const getCurrentProject = (): Project | null => {
  const currentProjectId = localStorage.getItem('current-project-id');
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
  
  localStorage.setItem('agent-flow-projects', JSON.stringify(updatedProjects));
};

// Save all projects
export const saveProjects = (projects: Project[]): void => {
  localStorage.setItem('agent-flow-projects', JSON.stringify(projects));
};

// Delete project
export const deleteProject = (id: string): void => {
  const projects = getAllProjects();
  const updatedProjects = projects.filter(project => project.id !== id);
  saveProjects(updatedProjects);
  
  // If the deleted project was the current one, clear the current project
  const currentProjectId = localStorage.getItem('current-project-id');
  if (currentProjectId === id) {
    localStorage.removeItem('current-project-id');
  }
};
