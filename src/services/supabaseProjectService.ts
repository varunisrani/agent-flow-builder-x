import { Node, Edge } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { BaseNodeData } from '@/components/nodes/BaseNode';

export interface SupabaseProject {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  starred: boolean;
  flow_data: {
    nodes: Node<BaseNodeData>[];
    edges: Edge[];
  } | null;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  nodes?: Node<BaseNodeData>[];
  edges?: Edge[];
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  starred?: boolean;
  nodes?: Node<BaseNodeData>[];
  edges?: Edge[];
}

export class SupabaseProjectService {
  // Create a new project
  static async createProject(data: CreateProjectData): Promise<SupabaseProject> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const projectData: any = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      user_id: user.id,
      flow_data: data.nodes && data.edges ? {
        nodes: data.nodes,
        edges: data.edges
      } : null
    };

    const { data: project, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create project: ${error.message}`);
    return project;
  }

  // Get all projects for the current user
  static async getAllProjects(): Promise<SupabaseProject[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch projects: ${error.message}`);
    return projects || [];
  }

  // Get project by ID
  static async getProjectById(id: string): Promise<SupabaseProject | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    return project;
  }

  // Update project
  static async updateProject(id: string, data: UpdateProjectData): Promise<SupabaseProject> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.starred !== undefined) updateData.starred = data.starred;
    if (data.nodes && data.edges) {
      updateData.flow_data = {
        nodes: data.nodes,
        edges: data.edges
      };
    }

    const { data: project, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update project: ${error.message}`);
    return project;
  }

  // Save project nodes and edges
  static async saveProjectFlow(
    projectId: string,
    nodes: Node<BaseNodeData>[],
    edges: Edge[]
  ): Promise<void> {
    await this.updateProject(projectId, { nodes, edges });
  }

  // Delete project
  static async deleteProject(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(`Failed to delete project: ${error.message}`);
  }

  // Toggle project starred status
  static async toggleProjectStar(id: string): Promise<SupabaseProject> {
    const project = await this.getProjectById(id);
    if (!project) throw new Error('Project not found');

    return await this.updateProject(id, { starred: !project.starred });
  }

  // Get starred projects
  static async getStarredProjects(): Promise<SupabaseProject[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .eq('starred', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch starred projects: ${error.message}`);
    return projects || [];
  }
}