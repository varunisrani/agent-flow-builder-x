import { supabase } from '@/integrations/supabase/client';

export interface PromptVersion {
  id: string;
  prompt_id: string;
  user_id: string;
  version: number;
  content: string;
  variables: any;
  metadata: any;
  is_active: boolean;
  created_at: string;
}

export interface CreatePromptVersionData {
  prompt_id: string;
  content: string;
  variables?: Record<string, any>;
  metadata?: {
    model_used?: string;
    temperature?: number;
    max_tokens?: number;
    system_prompt?: string;
    [key: string]: any;
  };
}

export interface UpdatePromptVersionData {
  is_active?: boolean;
  metadata?: {
    model_used?: string;
    temperature?: number;
    max_tokens?: number;
    system_prompt?: string;
    [key: string]: any;
  };
}

export class PromptVersionService {
  // Create a new prompt version
  static async createPromptVersion(data: CreatePromptVersionData): Promise<PromptVersion> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the next version number for this prompt
    const { data: nextVersionData, error: versionError } = await supabase
      .rpc('get_next_prompt_version', { p_prompt_id: data.prompt_id });

    if (versionError) throw new Error(`Failed to get next version: ${versionError.message}`);

    const versionData: any = {
      prompt_id: data.prompt_id,
      user_id: user.id,
      version: nextVersionData,
      content: data.content,
      variables: data.variables || null,
      metadata: data.metadata || null
    };

    const { data: version, error } = await supabase
      .from('prompt_versions')
      .insert(versionData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create prompt version: ${error.message}`);
    return version;
  }

  // Get all versions for a prompt
  static async getPromptVersions(promptId: string): Promise<PromptVersion[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: versions, error } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('prompt_id', promptId)
      .eq('user_id', user.id)
      .order('version', { ascending: false });

    if (error) throw new Error(`Failed to fetch prompt versions: ${error.message}`);
    return versions || [];
  }

  // Get specific version by ID
  static async getVersionById(id: string): Promise<PromptVersion | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: version, error } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch prompt version: ${error.message}`);
    }

    return version;
  }

  // Get specific version by prompt and version number
  static async getVersionByNumber(promptId: string, versionNumber: number): Promise<PromptVersion | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: version, error } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('prompt_id', promptId)
      .eq('version', versionNumber)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch prompt version: ${error.message}`);
    }

    return version;
  }

  // Get latest version for a prompt
  static async getLatestVersion(promptId: string): Promise<PromptVersion | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: version, error } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('prompt_id', promptId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch latest prompt version: ${error.message}`);
    }

    return version;
  }

  // Update prompt version
  static async updatePromptVersion(id: string, data: UpdatePromptVersionData): Promise<PromptVersion> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: any = {};
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    const { data: version, error } = await supabase
      .from('prompt_versions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update prompt version: ${error.message}`);
    return version;
  }

  // Delete prompt version
  static async deletePromptVersion(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('prompt_versions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(`Failed to delete prompt version: ${error.message}`);
  }

  // Delete all versions for a prompt
  static async deletePromptVersions(promptId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('prompt_versions')
      .delete()
      .eq('prompt_id', promptId)
      .eq('user_id', user.id);

    if (error) throw new Error(`Failed to delete prompt versions: ${error.message}`);
  }

  // Get version count for a prompt
  static async getVersionCount(promptId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { count, error } = await supabase
      .from('prompt_versions')
      .select('*', { count: 'exact', head: true })
      .eq('prompt_id', promptId)
      .eq('user_id', user.id);

    if (error) throw new Error(`Failed to get version count: ${error.message}`);
    return count || 0;
  }

  // Get active versions for a prompt
  static async getActiveVersions(promptId: string): Promise<PromptVersion[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: versions, error } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('prompt_id', promptId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('version', { ascending: false });

    if (error) throw new Error(`Failed to fetch active versions: ${error.message}`);
    return versions || [];
  }

  // Compare two versions
  static async compareVersions(promptId: string, version1: number, version2: number): Promise<{
    version1: PromptVersion | null;
    version2: PromptVersion | null;
  }> {
    const [v1, v2] = await Promise.all([
      this.getVersionByNumber(promptId, version1),
      this.getVersionByNumber(promptId, version2)
    ]);

    return { version1: v1, version2: v2 };
  }

  // Restore version (create new version with old content)
  static async restoreVersion(promptId: string, versionNumber: number): Promise<PromptVersion> {
    const originalVersion = await this.getVersionByNumber(promptId, versionNumber);
    if (!originalVersion) throw new Error('Version not found');

    return await this.createPromptVersion({
      prompt_id: promptId,
      content: originalVersion.content,
      variables: originalVersion.variables || undefined,
      metadata: {
        ...originalVersion.metadata,
        restored_from_version: versionNumber,
        restored_at: new Date().toISOString()
      }
    });
  }

  // Set active version
  static async setActiveVersion(promptId: string, versionNumber: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First, deactivate all versions for this prompt
    const { error: deactivateError } = await supabase
      .from('prompt_versions')
      .update({ is_active: false })
      .eq('prompt_id', promptId)
      .eq('user_id', user.id);

    if (deactivateError) throw new Error(`Failed to deactivate versions: ${deactivateError.message}`);

    // Then, activate the specific version
    const { error: activateError } = await supabase
      .from('prompt_versions')
      .update({ is_active: true })
      .eq('prompt_id', promptId)
      .eq('version', versionNumber)
      .eq('user_id', user.id);

    if (activateError) throw new Error(`Failed to activate version: ${activateError.message}`);
  }

  // Get all versions for a user across all prompts
  static async getUserVersions(limit?: number): Promise<PromptVersion[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('prompt_versions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: versions, error } = await query;

    if (error) throw new Error(`Failed to fetch user versions: ${error.message}`);
    return versions || [];
  }
}