import { supabase } from '@/integrations/supabase/client';

export interface Prompt {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string | null;
  starred: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePromptData {
  project_id: string;
  name: string;
  description?: string;
  category?: string;
  starred?: boolean;
}

export interface UpdatePromptData {
  name?: string;
  description?: string;
  category?: string;
  starred?: boolean;
}

export class PromptService {
  // Create a new prompt
  static async createPrompt(data: CreatePromptData): Promise<Prompt> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const promptData: any = {
      project_id: data.project_id,
      user_id: user.id,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      category: data.category?.trim() || null,
      starred: data.starred || false
    };

    const { data: prompt, error } = await supabase
      .from('prompts')
      .insert(promptData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create prompt: ${error.message}`);
    return prompt;
  }

  // Get all prompts for a project
  static async getProjectPrompts(projectId: string): Promise<Prompt[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: prompts, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch prompts: ${error.message}`);
    return prompts || [];
  }

  // Get all prompts for a user
  static async getUserPrompts(): Promise<Prompt[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: prompts, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch user prompts: ${error.message}`);
    return prompts || [];
  }

  // Get prompt by ID
  static async getPromptById(id: string): Promise<Prompt | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: prompt, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch prompt: ${error.message}`);
    }

    return prompt;
  }

  // Update prompt
  static async updatePrompt(id: string, data: UpdatePromptData): Promise<Prompt> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.category !== undefined) updateData.category = data.category?.trim() || null;
    if (data.starred !== undefined) updateData.starred = data.starred;

    const { data: prompt, error } = await supabase
      .from('prompts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update prompt: ${error.message}`);
    return prompt;
  }

  // Delete prompt
  static async deletePrompt(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(`Failed to delete prompt: ${error.message}`);
  }

  // Delete all prompts for a project
  static async deleteProjectPrompts(projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (error) throw new Error(`Failed to delete project prompts: ${error.message}`);
  }

  // Toggle prompt starred status
  static async togglePromptStar(id: string): Promise<Prompt> {
    const prompt = await this.getPromptById(id);
    if (!prompt) throw new Error('Prompt not found');

    return await this.updatePrompt(id, { starred: !prompt.starred });
  }

  // Get starred prompts
  static async getStarredPrompts(): Promise<Prompt[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: prompts, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('user_id', user.id)
      .eq('starred', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch starred prompts: ${error.message}`);
    return prompts || [];
  }

  // Get prompts by category
  static async getPromptsByCategory(category: string): Promise<Prompt[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: prompts, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch prompts by category: ${error.message}`);
    return prompts || [];
  }

  // Get prompt count for a project
  static async getPromptCount(projectId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { count, error } = await supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (error) throw new Error(`Failed to get prompt count: ${error.message}`);
    return count || 0;
  }
}