import { Node, Edge } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { BaseNodeData } from '@/components/nodes/BaseNode';

export interface CodeVersion {
  id: string;
  project_id: string;
  user_id: string;
  version: number;
  code_content: string;
  generation_method: 'ai' | 'template' | null;
  flow_snapshot: {
    nodes: Node<BaseNodeData>[];
    edges: Edge[];
  } | null;
  created_at: string;
  is_active: boolean;
  metadata: {
    integrations?: string[];
    model_used?: string;
    template_type?: string;
    [key: string]: any;
  } | null;
}

export interface CreateCodeVersionData {
  project_id: string;
  code_content: string;
  generation_method?: 'ai' | 'template';
  flow_snapshot?: {
    nodes: Node<BaseNodeData>[];
    edges: Edge[];
  };
  metadata?: {
    integrations?: string[];
    model_used?: string;
    template_type?: string;
    [key: string]: any;
  };
}

export interface UpdateCodeVersionData {
  is_active?: boolean;
  metadata?: {
    integrations?: string[];
    model_used?: string;
    template_type?: string;
    [key: string]: any;
  };
}

export class CodeVersionService {
  // Create a new code version
  static async createCodeVersion(data: CreateCodeVersionData): Promise<CodeVersion> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the next version number for this project
    const { data: nextVersionData, error: versionError } = await supabase
      .rpc('get_next_version', { p_project_id: data.project_id });

    if (versionError) throw new Error(`Failed to get next version: ${versionError.message}`);

    const versionData: any = {
      project_id: data.project_id,
      user_id: user.id,
      version: nextVersionData,
      code_content: data.code_content,
      generation_method: data.generation_method || null,
      flow_snapshot: data.flow_snapshot || null,
      metadata: data.metadata || null
    };

    const { data: version, error } = await supabase
      .from('code_versions')
      .insert(versionData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create code version: ${error.message}`);
    return version;
  }

  // Get all versions for a project
  static async getProjectVersions(projectId: string): Promise<CodeVersion[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: versions, error } = await supabase
      .from('code_versions')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('version', { ascending: false });

    if (error) throw new Error(`Failed to fetch code versions: ${error.message}`);
    return versions || [];
  }

  // Get specific version by ID
  static async getVersionById(id: string): Promise<CodeVersion | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: version, error } = await supabase
      .from('code_versions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch code version: ${error.message}`);
    }

    return version;
  }

  // Get specific version by project and version number
  static async getVersionByNumber(projectId: string, versionNumber: number): Promise<CodeVersion | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: version, error } = await supabase
      .from('code_versions')
      .select('*')
      .eq('project_id', projectId)
      .eq('version', versionNumber)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch code version: ${error.message}`);
    }

    return version;
  }

  // Get latest version for a project
  static async getLatestVersion(projectId: string): Promise<CodeVersion | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: version, error } = await supabase
      .from('code_versions')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch latest code version: ${error.message}`);
    }

    return version;
  }

  // Update code version
  static async updateCodeVersion(id: string, data: UpdateCodeVersionData): Promise<CodeVersion> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: any = {};
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    const { data: version, error } = await supabase
      .from('code_versions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update code version: ${error.message}`);
    return version;
  }

  // Delete code version
  static async deleteCodeVersion(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('code_versions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(`Failed to delete code version: ${error.message}`);
  }

  // Delete all versions for a project
  static async deleteProjectVersions(projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('code_versions')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (error) throw new Error(`Failed to delete project versions: ${error.message}`);
  }

  // Get version count for a project
  static async getVersionCount(projectId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { count, error } = await supabase
      .from('code_versions')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (error) throw new Error(`Failed to get version count: ${error.message}`);
    return count || 0;
  }

  // Get active versions for a project
  static async getActiveVersions(projectId: string): Promise<CodeVersion[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: versions, error } = await supabase
      .from('code_versions')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('version', { ascending: false });

    if (error) throw new Error(`Failed to fetch active versions: ${error.message}`);
    return versions || [];
  }

  // Compare two versions
  static async compareVersions(projectId: string, version1: number, version2: number): Promise<{
    version1: CodeVersion | null;
    version2: CodeVersion | null;
  }> {
    const [v1, v2] = await Promise.all([
      this.getVersionByNumber(projectId, version1),
      this.getVersionByNumber(projectId, version2)
    ]);

    return { version1: v1, version2: v2 };
  }

  // Restore version (create new version with old code)
  static async restoreVersion(projectId: string, versionNumber: number): Promise<CodeVersion> {
    const originalVersion = await this.getVersionByNumber(projectId, versionNumber);
    if (!originalVersion) throw new Error('Version not found');

    return await this.createCodeVersion({
      project_id: projectId,
      code_content: originalVersion.code_content,
      generation_method: originalVersion.generation_method || undefined,
      flow_snapshot: originalVersion.flow_snapshot || undefined,
      metadata: {
        ...originalVersion.metadata,
        restored_from_version: versionNumber,
        restored_at: new Date().toISOString()
      }
    });
  }
}